import { type GitHubUserData, calculateGitHubScore, calculateTelegramScore } from "./github";

type GitHubLeaderboardEntry = {
	username: string;
	avatarUrl: string;
	commits: number;
};

type TelegramLeaderboardEntry = {
	username: string;
	title: string;
	avatarUrl: string;
	posts: number;
};

type LeaderboardSnapshot = {
	github: GitHubLeaderboardEntry[];
	telegram: TelegramLeaderboardEntry[];
};

export type RecentComparison = {
	id: string;
	type: "user_vs_channel" | "channel_vs_channel";
	left: {
		username: string;
		avatarUrl: string;
		type: "github" | "telegram";
	};
	right: {
		username: string;
		avatarUrl: string;
		type: "telegram";
	};
	leftScore: number;
	rightScore: number;
	winner: "left" | "right" | "draw";
	timestamp: number;
};

const githubMap = new Map<string, GitHubLeaderboardEntry>();
const telegramMap = new Map<string, TelegramLeaderboardEntry>();
const comparisonHistory: RecentComparison[] = [];

function getTelegramAvatar(username: string): string {
	return `https://t.me/i/userpic/320/${username}.jpg`;
}

export function recordTelegramEntry(channel: {
	username?: string;
	title?: string;
	post_count?: number;
}) {
	const telegramUsername = channel.username ?? "";
	if (telegramUsername) {
		telegramMap.set(telegramUsername, {
			username: telegramUsername,
			title: channel.title ?? telegramUsername,
			avatarUrl: getTelegramAvatar(telegramUsername),
			posts: channel.post_count ?? 0,
		});
	}
}

export function recordHistory(entry: Omit<RecentComparison, "id" | "timestamp">) {
	const id = `${entry.left.username}-${entry.right.username}`;
	
	// Remove existing to avoid duplicates and move to top
	const existingIndex = comparisonHistory.findIndex((h) => h.id === id);
	if (existingIndex !== -1) {
		comparisonHistory.splice(existingIndex, 1);
	}

	comparisonHistory.unshift({
		...entry,
		id,
		timestamp: Date.now(),
	});

	// Keep only last 20
	if (comparisonHistory.length > 20) {
		comparisonHistory.pop();
	}
}

export function recordComparison(
	githubUser: GitHubUserData,
	telegramChannel: { username?: string; title?: string; post_count?: number },
) {
	const githubUsername = githubUser.login;
	const commits = githubUser.commits_count ?? 0;
	if (githubUsername) {
		githubMap.set(githubUsername, {
			username: githubUsername,
			avatarUrl: githubUser.avatar_url,
			commits,
		});
	}

	recordTelegramEntry(telegramChannel);

	// Add to history
	if (githubUsername && telegramChannel.username) {
		const ghScore = calculateGitHubScore(githubUser);
		const tgScore = calculateTelegramScore(telegramChannel);

		recordHistory({
			type: "user_vs_channel",
			left: {
				username: githubUsername,
				avatarUrl: githubUser.avatar_url,
				type: "github",
			},
			right: {
				username: telegramChannel.username,
				avatarUrl: getTelegramAvatar(telegramChannel.username),
				type: "telegram",
			},
			leftScore: ghScore,
			rightScore: tgScore,
			winner: ghScore > tgScore ? "left" : tgScore > ghScore ? "right" : "draw",
		});
	}
}

export function getLeaderboardSnapshot(limit = 5): LeaderboardSnapshot {
	const github = Array.from(githubMap.values())
		.sort((a, b) => b.commits - a.commits)
		.slice(0, limit);
	const telegram = Array.from(telegramMap.values())
		.sort((a, b) => b.posts - a.posts)
		.slice(0, limit);

	return { github, telegram };
}

export function getRecentComparisons(limit = 10): RecentComparison[] {
	return comparisonHistory.slice(0, limit);
}

export function findBestMatch(
	sourceTelegramUsername: string,
	excludeUsername?: string,
): {
	username: string | null;
	reason: string | null;
} {
	const cleanSource = sourceTelegramUsername.replace(/^@+/, "").trim();
	const cleanExclude = excludeUsername?.replace(/^@+/, "").trim();

	const sourceUser = telegramMap.get(cleanSource);
	const sourcePosts = sourceUser?.posts ?? 0;

	// Filter out the source selection and any explicitly excluded username
	const telegram = Array.from(telegramMap.values())
		.filter((t) => {
			const username = t.username.toLowerCase();
			return (
				username !== cleanSource.toLowerCase() &&
				username !== cleanExclude?.toLowerCase()
			);
		})
		.sort((a, b) => b.posts - a.posts);

	if (telegram.length > 0) {
		// Pick a random one from the top 5 candidates to provide variety
		const topCandidates = telegram.slice(0, 5);
		const randomIndex = Math.floor(Math.random() * topCandidates.length);
		const match = topCandidates[randomIndex];

		if (match) {
			let reason = "Complementary voices for a unified broadcast strategy.";

			if (sourcePosts > 100 && match.posts > 100) {
				reason =
					"Two power-yappers joining forces. This startup will be heard in the next galaxy.";
			} else if (sourcePosts > 50) {
				reason =
					"You have the momentum, they have the reach. A perfect match for scale.";
			} else if (match.posts > 50) {
				reason =
					"They provide the volume you've been looking for. Synergy in every post.";
			}

			return { username: match.username, reason };
		}
	}

	return { username: null, reason: null };
}
