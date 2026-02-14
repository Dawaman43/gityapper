import { env } from "@gityap/env/server";

export interface GitHubUserData {
	login: string;
	id: number;
	avatar_url: string;
	name: string | null;
	bio: string | null;
	public_repos: number;
	followers: number;
	following: number;
	created_at: string;
	updated_at: string;
	html_url: string;
	commits_count?: number;
}

export interface GitHubRepo {
	name: string;
	commits_url: string;
}

function getGitHubHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		Accept: "application/vnd.github.v3+json",
		"User-Agent": "Gityap-App",
	};

	// Add authorization token if available
	if (env.GITHUB_TOKEN) {
		headers.Authorization = `token ${env.GITHUB_TOKEN}`;
	}

	return headers;
}

export async function fetchGitHubUser(
	username: string,
): Promise<GitHubUserData> {
	const cleanUsername = username.replace(/^@+/, "").trim();

	const response = await fetch(
		`https://api.github.com/users/${cleanUsername}`,
		{
			headers: getGitHubHeaders(),
		},
	);

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error(`GitHub user "${cleanUsername}" not found`);
		}
		if (response.status === 403) {
			const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
			if (rateLimitRemaining === "0") {
				throw new Error(
					"GitHub API rate limit exceeded. Please try again later or add a GITHUB_TOKEN.",
				);
			}
			throw new Error("GitHub API access denied. Check your GITHUB_TOKEN.");
		}
		throw new Error(`GitHub API error: ${response.statusText}`);
	}

	const userData = (await response.json()) as GitHubUserData;

	// Fetch commit count from repos
	const commitsCount = await fetchGitHubTotalCommits(cleanUsername);

	return {
		...userData,
		commits_count: commitsCount,
	};
}

async function fetchGitHubTotalCommits(username: string): Promise<number> {
	try {
		// Use GitHub Search API to count ALL commits by author across all repos and branches
		// This is more accurate than counting per-repo as it includes all branches
		const headers = {
			...getGitHubHeaders(),
			Accept: "application/vnd.github.cloak-preview+json", // Required for search commits
		};

		const searchResponse = await fetch(
			`https://api.github.com/search/commits?q=author:${encodeURIComponent(username)}`,
			{
				headers,
			},
		);

		if (!searchResponse.ok) {
			// Fallback to repo-by-repo counting if search fails
			return fetchGitHubCommitsByRepo(username);
		}

		const searchData = (await searchResponse.json()) as { total_count: number };
		return searchData.total_count || 0;
	} catch {
		// Fallback to repo-by-repo counting
		return fetchGitHubCommitsByRepo(username);
	}
}

async function fetchGitHubCommitsByRepo(username: string): Promise<number> {
	try {
		// Get all repos with pagination
		const allRepos: Array<{ name: string }> = [];
		let page = 1;
		const perPage = 100;

		// Fetch all pages of repos
		while (true) {
			const reposResponse = await fetch(
				`https://api.github.com/users/${username}/repos?per_page=${perPage}&page=${page}&sort=updated`,
				{
					headers: getGitHubHeaders(),
				},
			);

			if (!reposResponse.ok) {
				break;
			}

			const repos = (await reposResponse.json()) as Array<{ name: string }>;
			if (repos.length === 0) {
				break;
			}

			allRepos.push(...repos);

			if (repos.length < perPage) {
				break;
			}

			page++;
		}

		if (allRepos.length === 0) {
			return 0;
		}

		// Count commits from ALL repos with high concurrency
		let totalCommits = 0;
		const concurrency = 10;

		for (let i = 0; i < allRepos.length; i += concurrency) {
			const batch = allRepos.slice(i, i + concurrency);
			const results = await Promise.all(
				batch.map(async (repo) => {
					try {
						const commitsResponse = await fetch(
							`https://api.github.com/repos/${username}/${repo.name}/commits?author=${username}&per_page=1`,
							{
								headers: getGitHubHeaders(),
							},
						);

						if (commitsResponse.ok) {
							const linkHeader = commitsResponse.headers.get("link");
							if (linkHeader) {
								const match = linkHeader.match(
									/page=(\d+)[^>]*>;\s*rel="last"/,
								);
								if (match && match[1]) {
									return Number.parseInt(match[1], 10);
								}
								return 1;
							}
							const commits = (await commitsResponse.json()) as unknown[];
							return commits.length;
						}
						return 0;
					} catch {
						return 0;
					}
				}),
			);

			totalCommits += results.reduce((sum, count) => sum + count, 0);
		}

		return totalCommits;
	} catch {
		return 0;
	}
}

export async function searchGitHubUsers(
	query: string,
): Promise<GitHubUserData[]> {
	const cleanQuery = query.trim();

	const response = await fetch(
		`https://api.github.com/search/users?q=${encodeURIComponent(cleanQuery)}&per_page=10`,
		{
			headers: getGitHubHeaders(),
		},
	);

	if (!response.ok) {
		if (response.status === 403) {
			throw new Error(
				"GitHub API rate limit exceeded. Please try again later.",
			);
		}
		throw new Error(`GitHub API error: ${response.statusText}`);
	}

	const data = (await response.json()) as { items: Array<{ login: string }> };

	// Fetch detailed info for each user
	const usersWithDetails = await Promise.all(
		data.items.slice(0, 5).map(async (item) => {
			try {
				return await fetchGitHubUser(item.login);
			} catch {
				return null;
			}
		}),
	);

	return usersWithDetails.filter(
		(user): user is GitHubUserData => user !== null,
	);
}

export function compareUsers(githubUser: GitHubUserData, telegramChannel: any) {
	const githubScore = calculateGitHubScore(githubUser);
	const telegramScore = calculateTelegramScore(telegramChannel);

	const commits = githubUser.commits_count || 0;
	const posts = telegramChannel.post_count || 0;
	const totalActivity = commits + posts;

	// Calculate percentage to 100,000
	const TARGET = 100000;
	const commitsPercent = Math.min((commits / TARGET) * 100, 100);
	const postsPercent = Math.min((posts / TARGET) * 100, 100);

	return {
		github: {
			username: githubUser.login,
			avatarUrl: githubUser.avatar_url,
			profileUrl: githubUser.html_url,
			followers: githubUser.followers,
			following: githubUser.following,
			publicRepos: githubUser.public_repos,
			commits: commits,
			score: githubScore,
		},
		telegram: {
			username: telegramChannel.username,
			title: telegramChannel.title,
			avatarUrl: telegramChannel.username
				? `https://unavatar.io/telegram/${telegramChannel.username}`
				: "",
			participants: telegramChannel.participants_count,
			posts: posts,
			score: telegramScore,
		},
		comparison: {
			githubHigher: githubScore > telegramScore,
			score: Math.abs(githubScore - telegramScore),
			winner: githubScore > telegramScore ? "github" : "telegram",
			commitsVsPosts: {
				commits: commits,
				posts: posts,
				total: totalActivity,
				difference: Math.abs(commits - posts),
				winner: commits > posts ? "github" : "telegram",
				// Percentage to 100K
				commitsTo1M: {
					current: commits,
					target: TARGET,
					percent: commitsPercent,
					remaining: Math.max(TARGET - commits, 0),
				},
				postsTo1M: {
					current: posts,
					target: TARGET,
					percent: postsPercent,
					remaining: Math.max(TARGET - posts, 0),
				},
			},
		},
	};
}

export function compareChannels(tg1: any, tg2: any) {
	const tg1Score = calculateTelegramScore(tg1);
	const tg2Score = calculateTelegramScore(tg2);

	const tg1Posts = tg1.post_count || 0;
	const tg2Posts = tg2.post_count || 0;

	return {
		telegram1: {
			username: tg1.username,
			title: tg1.title,
			avatarUrl: tg1.username
				? `https://unavatar.io/telegram/${tg1.username}`
				: "",
			participants: tg1.participants_count,
			posts: tg1Posts,
			score: tg1Score,
		},
		telegram2: {
			username: tg2.username,
			title: tg2.title,
			avatarUrl: tg2.username
				? `https://unavatar.io/telegram/${tg2.username}`
				: "",
			participants: tg2.participants_count,
			posts: tg2Posts,
			score: tg2Score,
		},
		comparison: {
			tg1Higher: tg1Score > tg2Score,
			score: Math.abs(tg1Score - tg2Score),
			winner: tg1Score > tg2Score ? "telegram1" : "telegram2",
		},
	};
}

export function calculateGitHubScore(user: GitHubUserData): number {
	// Simple scoring algorithm based on commits, followers, and repos
	const commitScore = Math.log10((user.commits_count || 0) + 1) * 15;
	const followerScore = Math.log10(user.followers + 1) * 10;
	const repoScore = Math.log10(user.public_repos + 1) * 5;

	return Math.round(commitScore + followerScore + repoScore);
}

export function calculateTelegramScore(channel: any): number {
	// Simple scoring algorithm
	const participantScore =
		Math.log10((channel.participants_count || 0) + 1) * 10;
	const postScore = Math.log10((channel.post_count || 0) + 1) * 15;

	return Math.round(participantScore + postScore);
}
