import { db, githubUsers, telegramSessions } from "@gityap/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
	calculateTelegramScore,
	compareChannels,
	compareUsers,
	fetchGitHubUser,
	searchGitHubUsers,
} from "../github";
import { publicProcedure, router } from "../index";
import {
	findBestMatch,
	getLeaderboardSnapshot,
	getRecentComparisons,
	recordComparison,
	recordHistory,
	recordTelegramEntry,
} from "../leaderboard";
import { fetchChannelInfo, sendLoginCode, signInWithCode } from "../telegram";

function isHighConfidenceGitHubMatch(query: string, login: string): boolean {
	const q = query.toLowerCase().trim();
	const l = login.toLowerCase().trim();
	if (!q || !l) return false;
	if (q === l) return true;
	const diff = Math.abs(q.length - l.length);
	if ((l.startsWith(q) || q.startsWith(l)) && diff <= 2) return true;
	return levenshteinDistance(q, l) <= 1;
}

function levenshteinDistance(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	if (m === 0) return n;
	if (n === 0) return m;

	let prev = new Uint16Array(n + 1);
	let curr = new Uint16Array(n + 1);

	for (let j = 0; j <= n; j++) prev[j] = j;

	for (let i = 1; i <= m; i++) {
		curr[0] = i;
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			const del = (prev[j] ?? 0) + 1;
			const ins = (curr[j - 1] ?? 0) + 1;
			const sub = (prev[j - 1] ?? 0) + cost;
			curr[j] = Math.min(del, ins, sub);
		}
		const tmp = prev;
		prev = curr;
		curr = tmp;
	}

	return prev[n] ?? 0;
}

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	telegramSendCode: publicProcedure
		.input(
			z.object({
				phoneNumber: z.string().min(6).max(32),
			}),
		)
		.mutation(async ({ input }) => {
			return sendLoginCode(input.phoneNumber);
		}),
	telegramSignIn: publicProcedure
		.input(
			z.object({
				phoneNumber: z.string().min(6).max(32),
				phoneCodeHash: z.string().min(1),
				phoneCode: z.string().min(1),
				session: z.string().min(1),
				password: z.string().min(1).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			return signInWithCode({
				phoneNumber: input.phoneNumber,
				phoneCodeHash: input.phoneCodeHash,
				phoneCode: input.phoneCode,
				session: input.session,
				password: input.password ?? null,
			});
		}),
	saveTelegramSession: publicProcedure
		.input(
			z.object({
				deviceId: z.string().min(1).max(255),
				session: z.string().min(1),
			}),
		)
		.mutation(async ({ input }) => {
			await db
				.insert(telegramSessions)
				.values({
					deviceId: input.deviceId,
					session: input.session,
					updatedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: telegramSessions.deviceId,
					set: {
						session: input.session,
						updatedAt: new Date(),
					},
				});

			return { ok: true };
		}),
	getTelegramSession: publicProcedure
		.input(
			z.object({
				deviceId: z.string().min(1).max(255),
			}),
		)
		.query(async ({ input }) => {
			const rows = await db
				.select()
				.from(telegramSessions)
				.where(eq(telegramSessions.deviceId, input.deviceId))
				.limit(1);
			const session = rows[0]?.session ?? null;
			return { session };
		}),
	telegramChannelInfo: publicProcedure
		.input(
			z.object({
				username: z.string().min(1).max(64),
				session: z.string().min(1),
			}),
		)
		.query(async ({ input }) => {
			const channel = await fetchChannelInfo(input.username, input.session);
			recordTelegramEntry(channel);
			return channel;
		}),
	// GitHub endpoints
	githubUser: publicProcedure
		.input(
			z.object({
				username: z.string().min(1).max(255),
			}),
		)
		.query(async ({ input, ctx }) => {
			return fetchGitHubUser(input.username, { authToken: ctx.githubToken });
		}),
	githubSearch: publicProcedure
		.input(
			z.object({
				query: z.string().min(1).max(255),
			}),
		)
		.query(async ({ input, ctx }) => {
			return searchGitHubUsers(input.query, { authToken: ctx.githubToken });
		}),
	compareUsers: publicProcedure
		.input(
			z.object({
				githubUsername: z.string().min(1).max(255),
				telegramUsername: z.string().min(1).max(64),
				session: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const [githubUser, telegramChannel] = await Promise.all([
				fetchGitHubUser(input.githubUsername, { authToken: ctx.githubToken }),
				fetchChannelInfo(input.telegramUsername, input.session),
			]);
			await recordComparison(githubUser, telegramChannel);
			return compareUsers(githubUser, telegramChannel);
		}),
	compareChannels: publicProcedure
		.input(
			z.object({
				telegramUsername1: z.string().min(1).max(64),
				telegramUsername2: z.string().min(1).max(64),
				githubUsername1: z.string().optional(),
				githubUsername2: z.string().optional(),
				session: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const [tg1, tg2] = await Promise.all([
				fetchChannelInfo(input.telegramUsername1, input.session),
				fetchChannelInfo(input.telegramUsername2, input.session),
			]);
			recordTelegramEntry(tg1);
			recordTelegramEntry(tg2);

			const ghLookup1 = input.githubUsername1 ?? tg1.username;
			const ghLookup2 = input.githubUsername2 ?? tg2.username;

			const [tg1DbGitHub, tg2DbGitHub] = await Promise.all([
				ghLookup1
					? db
							.select({ commits: githubUsers.commitsCount })
							.from(githubUsers)
							.where(eq(githubUsers.username, ghLookup1))
							.limit(1)
					: Promise.resolve([]),
				ghLookup2
					? db
							.select({ commits: githubUsers.commitsCount })
							.from(githubUsers)
							.where(eq(githubUsers.username, ghLookup2))
							.limit(1)
					: Promise.resolve([]),
			]);

			let tg1Commits = tg1DbGitHub[0]?.commits ?? 0;
			let tg2Commits = tg2DbGitHub[0]?.commits ?? 0;

			if (ghLookup1 && tg1Commits === 0) {
				try {
					const gh = await fetchGitHubUser(ghLookup1, {
						authToken: ctx.githubToken,
					});
					tg1Commits = gh.commits_count ?? 0;
				} catch {
					tg1Commits = 0;
				}
			}
			if (tg1Commits === 0) {
				try {
					const searchQuery = ghLookup1 || tg1.username;
					if (searchQuery) {
						const candidates = await searchGitHubUsers(searchQuery, {
							authToken: ctx.githubToken,
						});
						const best = candidates.find((candidate) =>
							isHighConfidenceGitHubMatch(searchQuery, candidate.login),
						);
						if (best?.login) {
							const gh = await fetchGitHubUser(best.login, {
								authToken: ctx.githubToken,
							});
							tg1Commits = gh.commits_count ?? 0;
						}
					}
				} catch {
					// Ignore fallback search errors; commit count will remain 0.
				}
			}

			if (ghLookup2 && tg2Commits === 0) {
				try {
					const gh = await fetchGitHubUser(ghLookup2, {
						authToken: ctx.githubToken,
					});
					tg2Commits = gh.commits_count ?? 0;
				} catch {
					tg2Commits = 0;
				}
			}
			if (tg2Commits === 0) {
				try {
					const searchQuery = ghLookup2 || tg2.username;
					if (searchQuery) {
						const candidates = await searchGitHubUsers(searchQuery, {
							authToken: ctx.githubToken,
						});
						const best = candidates.find((candidate) =>
							isHighConfidenceGitHubMatch(searchQuery, candidate.login),
						);
						if (best?.login) {
							const gh = await fetchGitHubUser(best.login, {
								authToken: ctx.githubToken,
							});
							tg2Commits = gh.commits_count ?? 0;
						}
					}
				} catch {
					// Ignore fallback search errors; commit count will remain 0.
				}
			}

			const tg1Score = calculateTelegramScore(tg1);
			const tg2Score = calculateTelegramScore(tg2);

			await recordHistory({
				type: "channel_vs_channel",
				left: {
					username: tg1.username,
					avatarUrl: `https://t.me/i/userpic/320/${tg1.username}.jpg`,
					type: "telegram",
				},
				right: {
					username: tg2.username,
					avatarUrl: `https://t.me/i/userpic/320/${tg2.username}.jpg`,
					type: "telegram",
				},
				leftScore: tg1Score,
				rightScore: tg2Score,
				winner:
					tg1Score > tg2Score ? "left" : tg2Score > tg1Score ? "right" : "draw",
			});

			return compareChannels(tg1, tg2, {
				tg1Commits,
				tg2Commits,
			});
		}),
	matchUsers: publicProcedure
		.input(
			z.object({
				telegramUsername: z.string().min(1).max(64),
				githubUsername: z.string().optional(),
				excludeTelegramUsername: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const match = findBestMatch(
				input.telegramUsername,
				input.githubUsername,
				input.excludeTelegramUsername,
			);
			const resolved = await match;
			let githubUsername: string | null = null;

			if (resolved.username) {
				try {
					const candidates = await searchGitHubUsers(resolved.username, {
						authToken: ctx.githubToken,
					});
					const best = candidates.find((candidate) =>
						isHighConfidenceGitHubMatch(resolved.username ?? "", candidate.login),
					);
					githubUsername = best?.login ?? null;
				} catch {
					githubUsername = null;
				}
			}

			return {
				...resolved,
				githubUsername,
			};
		}),
	leaderboard: publicProcedure.query(() => {
		return getLeaderboardSnapshot();
	}),
	recentComparisons: publicProcedure.query(async () => {
		return await getRecentComparisons();
	}),
});
export type AppRouter = typeof appRouter;
