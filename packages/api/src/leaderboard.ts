import { comparisons, db, githubUsers, telegramChannels } from "@gityap/db";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import {
	calculateGitHubScore,
	calculateTelegramScore,
	type GitHubUserData,
} from "./github";

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
	subscribers: number;
};

type LeaderboardSnapshot = {
	github: GitHubLeaderboardEntry[];
	telegram: TelegramLeaderboardEntry[];
	telegramBySubscribers: TelegramLeaderboardEntry[];
	comparisonsCount: number;
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

function getTelegramAvatar(username: string): string {
	return `https://t.me/i/userpic/320/${username}.jpg`;
}

export async function recordTelegramEntry(channel: {
	telegram_id?: string;
	username?: string;
	title?: string;
	post_count?: number;
	participants_count?: number;
}) {
	const telegramUsername = channel.username ?? "";
	const telegramId = channel.telegram_id ?? "";
	if (!telegramId) return;

	await db
		.insert(telegramChannels)
		.values({
			telegramId,
			username: telegramUsername || null,
			title: channel.title ?? telegramUsername,
			participantsCount: channel.participants_count ?? null,
			postCount: channel.post_count ?? 0,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: telegramChannels.telegramId,
			set: {
				username: telegramUsername || null,
				title: channel.title ?? telegramUsername,
				participantsCount: channel.participants_count ?? null,
				postCount: channel.post_count ?? 0,
				updatedAt: new Date(),
			},
		});
}

export async function recordHistory(
	entry: Omit<RecentComparison, "id" | "timestamp">,
) {
	await db
		.delete(comparisons)
		.where(
			and(
				eq(comparisons.type, entry.type),
				sql`(${comparisons.left} ->> 'username') = ${entry.left.username}`,
				sql`(${comparisons.right} ->> 'username') = ${entry.right.username}`,
			),
		);

	await db.insert(comparisons).values({
		type: entry.type,
		left: entry.left,
		right: entry.right,
		leftScore: entry.leftScore,
		rightScore: entry.rightScore,
		winner: entry.winner,
	});
}

export async function recordComparison(
	githubUser: GitHubUserData,
	telegramChannel: { username?: string; title?: string; post_count?: number },
) {
	const githubUsername = githubUser.login;
	const commits = githubUser.commits_count ?? 0;
	if (githubUsername) {
		await db
			.insert(githubUsers)
			.values({
				username: githubUsername,
				avatarUrl: githubUser.avatar_url,
				name: githubUser.name ?? null,
				bio: githubUser.bio ?? null,
				publicRepos: githubUser.public_repos ?? null,
				commitsCount: commits,
				followers: githubUser.followers ?? null,
				following: githubUser.following ?? null,
				rawData: githubUser,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: githubUsers.username,
				set: {
					avatarUrl: githubUser.avatar_url,
					name: githubUser.name ?? null,
					bio: githubUser.bio ?? null,
					publicRepos: githubUser.public_repos ?? null,
					commitsCount: commits,
					followers: githubUser.followers ?? null,
					following: githubUser.following ?? null,
					rawData: githubUser,
					updatedAt: new Date(),
				},
			});
	}

	await recordTelegramEntry(telegramChannel);

	// Add to history
	if (githubUsername && telegramChannel.username) {
		const ghScore = calculateGitHubScore(githubUser);
		const tgScore = calculateTelegramScore(telegramChannel);

		await recordHistory({
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

export async function getLeaderboardSnapshot(): Promise<LeaderboardSnapshot> {
	const comparisonCountRow = await db
		.select({ count: sql<number>`count(*)` })
		.from(comparisons);
	const comparisonsCount = Number(comparisonCountRow[0]?.count ?? 0);

	const githubRows = await db
		.select({
			username: githubUsers.username,
			avatarUrl: githubUsers.avatarUrl,
			commits: githubUsers.commitsCount,
		})
		.from(githubUsers)
		.orderBy(desc(githubUsers.commitsCount), desc(githubUsers.updatedAt));

	const telegramRows = await db
		.select({
			username: telegramChannels.username,
			title: telegramChannels.title,
			avatarUrl: telegramChannels.username,
			posts: telegramChannels.postCount,
			subscribers: telegramChannels.participantsCount,
		})
		.from(telegramChannels)
		.orderBy(
			desc(telegramChannels.postCount),
			desc(telegramChannels.updatedAt),
		);

	const telegramBySubscribersRows = await db
		.select({
			username: telegramChannels.username,
			title: telegramChannels.title,
			avatarUrl: telegramChannels.username,
			posts: telegramChannels.postCount,
			subscribers: telegramChannels.participantsCount,
		})
		.from(telegramChannels)
		.orderBy(
			desc(telegramChannels.participantsCount),
			desc(telegramChannels.updatedAt),
		);

	const github = githubRows
		.filter((row) => row.username)
		.map((row) => ({
			username: row.username!,
			avatarUrl: row.avatarUrl ?? "",
			commits: row.commits ?? 0,
		}));

	const telegram = telegramRows
		.filter((row) => row.username)
		.map((row) => ({
			username: row.username!,
			title: row.title ?? row.username!,
			avatarUrl: row.avatarUrl
				? getTelegramAvatar(row.avatarUrl)
				: getTelegramAvatar(row.username!),
			posts: row.posts ?? 0,
			subscribers: row.subscribers ?? 0,
		}));

	const telegramBySubscribers = telegramBySubscribersRows
		.filter((row) => row.username)
		.map((row) => ({
			username: row.username!,
			title: row.title ?? row.username!,
			avatarUrl: row.avatarUrl
				? getTelegramAvatar(row.avatarUrl)
				: getTelegramAvatar(row.username!),
			posts: row.posts ?? 0,
			subscribers: row.subscribers ?? 0,
		}));

	return { github, telegram, telegramBySubscribers, comparisonsCount };
}

export async function getRecentComparisons(
	limit = 10,
): Promise<RecentComparison[]> {
	const rows = await db
		.select()
		.from(comparisons)
		.orderBy(desc(comparisons.createdAt), desc(comparisons.id))
		.limit(limit);

	return rows
		.filter(
			(row) =>
				row.type &&
				row.left &&
				row.right &&
				row.leftScore !== null &&
				row.rightScore !== null &&
				row.winner,
		)
		.map((row) => ({
			id: String(row.id),
			type: row.type as RecentComparison["type"],
			left: row.left as RecentComparison["left"],
			right: row.right as RecentComparison["right"],
			leftScore: row.leftScore as number,
			rightScore: row.rightScore as number,
			winner: row.winner as RecentComparison["winner"],
			timestamp: row.createdAt ? row.createdAt.getTime() : Date.now(),
		}));
}

export async function findBestMatch(
	sourceTelegramUsername: string,
	sourceGithubUsername?: string,
	excludeUsername?: string,
): Promise<{
	username: string | null;
	reason: string | null;
}> {
	const cleanSource = sourceTelegramUsername.replace(/^@+/, "").trim();
	const cleanSourceGithub = sourceGithubUsername?.replace(/^@+/, "").trim();
	const cleanExclude = excludeUsername?.replace(/^@+/, "").trim();
	const sourceRow = await db
		.select({
			posts: telegramChannels.postCount,
		})
		.from(telegramChannels)
		.where(eq(telegramChannels.username, cleanSource))
		.limit(1);
	const sourcePosts = sourceRow[0]?.posts ?? 0;
	const sourceGitHub = await db
		.select({ commits: githubUsers.commitsCount })
		.from(githubUsers)
		.where(eq(githubUsers.username, cleanSourceGithub || cleanSource))
		.limit(1);
	const sourceCommits = sourceGitHub[0]?.commits ?? 0;

	const candidates = await db
		.select({
			username: telegramChannels.username,
			posts: telegramChannels.postCount,
		})
		.from(telegramChannels)
		.where(
			and(
				ne(telegramChannels.username, cleanSource),
				cleanExclude ? ne(telegramChannels.username, cleanExclude) : undefined,
			),
		)
		.orderBy(desc(telegramChannels.postCount))
		.limit(5);

	if (candidates.length > 0) {
		const candidateUsernames = candidates
			.map((c) => c.username)
			.filter((u): u is string => Boolean(u));
		const candidateGitHub = candidateUsernames.length
			? await db
					.select({
						username: githubUsers.username,
						commits: githubUsers.commitsCount,
					})
					.from(githubUsers)
					.where(inArray(githubUsers.username, candidateUsernames))
			: [];
		const commitsMap = new Map(
			candidateGitHub.map((row) => [row.username, row.commits ?? 0]),
		);

		const ranked = candidates
			.map((candidate) => {
				const candidatePosts = candidate.posts ?? 0;
				const candidateCommits = candidate.username
					? (commitsMap.get(candidate.username) ?? 0)
					: 0;
				const postsDelta =
					Math.abs(sourcePosts - candidatePosts) /
					Math.max(sourcePosts, candidatePosts, 1);
				const commitsDelta =
					Math.abs(sourceCommits - candidateCommits) /
					Math.max(sourceCommits, candidateCommits, 1);
				const combinedDistance = postsDelta * 0.5 + commitsDelta * 0.5;

				return {
					candidate,
					candidateCommits,
					combinedDistance,
				};
			})
			.sort((a, b) => a.combinedDistance - b.combinedDistance);

		const match = ranked[0];

		if (match?.candidate.username) {
			let reason = "Complementary voices for a unified broadcast strategy.";
			const candidatePosts = match.candidate.posts ?? 0;
			const candidateCommits = match.candidateCommits;
			if (
				sourcePosts > 100 &&
				candidatePosts > 100 &&
				sourceCommits > 100 &&
				candidateCommits > 100
			) {
				reason =
					"Strong in both commits and posts. This team can ship and amplify.";
			} else if (sourcePosts > 100 && candidatePosts > 100) {
				reason =
					"Two power-yappers joining forces. This startup will be heard in the next galaxy.";
			} else if (sourceCommits > 100 && candidateCommits > 100) {
				reason =
					"Two strong builders pairing up. High shipping velocity potential.";
			} else if (sourcePosts > 50 || sourceCommits > 50) {
				reason =
					"You have the momentum, they have the reach. A perfect match for scale.";
			} else if (candidatePosts > 50 || candidateCommits > 50) {
				reason =
					"They provide the volume you've been looking for. Synergy in every post.";
			}

			return { username: match.candidate.username, reason };
		}
	}

	return { username: null, reason: null };
}
