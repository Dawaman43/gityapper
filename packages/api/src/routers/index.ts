import { z } from "zod";
import { compareUsers, fetchGitHubUser, searchGitHubUsers } from "../github";
import {
	getLeaderboardSnapshot,
	recordComparison,
	findBestMatch,
	recordTelegramEntry,
	getRecentComparisons,
	recordHistory,
} from "../leaderboard";
import { publicProcedure, router } from "../index";
import { fetchChannelInfo, sendLoginCode, signInWithCode } from "../telegram";
import { calculateTelegramScore } from "../github";
import { compareChannels } from "../github";

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
		.query(async ({ input }) => {
			return fetchGitHubUser(input.username);
		}),
	githubSearch: publicProcedure
		.input(
			z.object({
				query: z.string().min(1).max(255),
			}),
		)
		.query(async ({ input }) => {
			return searchGitHubUsers(input.query);
		}),
	compareUsers: publicProcedure
		.input(
			z.object({
				githubUsername: z.string().min(1).max(255),
				telegramUsername: z.string().min(1).max(64),
				session: z.string().min(1),
			}),
		)
		.query(async ({ input }) => {
			const [githubUser, telegramChannel] = await Promise.all([
				fetchGitHubUser(input.githubUsername),
				fetchChannelInfo(input.telegramUsername, input.session),
			]);
			recordComparison(githubUser, telegramChannel);
			return compareUsers(githubUser, telegramChannel);
		}),
	compareChannels: publicProcedure
		.input(
			z.object({
				telegramUsername1: z.string().min(1).max(64),
				telegramUsername2: z.string().min(1).max(64),
				session: z.string().min(1),
			}),
		)
		.query(async ({ input }) => {
			const [tg1, tg2] = await Promise.all([
				fetchChannelInfo(input.telegramUsername1, input.session),
				fetchChannelInfo(input.telegramUsername2, input.session),
			]);
			recordTelegramEntry(tg1);
			recordTelegramEntry(tg2);

			const tg1Score = calculateTelegramScore(tg1);
			const tg2Score = calculateTelegramScore(tg2);

			recordHistory({
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
				winner: tg1Score > tg2Score ? "left" : tg2Score > tg1Score ? "right" : "draw",
			});

			return compareChannels(tg1, tg2);
		}),
	matchUsers: publicProcedure
		.input(
			z.object({
				telegramUsername: z.string().min(1).max(64),
				excludeTelegramUsername: z.string().optional(),
			}),
		)
		.query(({ input }) => {
			const match = findBestMatch(
				input.telegramUsername,
				input.excludeTelegramUsername,
			);
			return match;
		}),
	leaderboard: publicProcedure.query(() => {
		return getLeaderboardSnapshot();
	}),
	recentComparisons: publicProcedure.query(() => {
		return getRecentComparisons();
	}),
});
export type AppRouter = typeof appRouter;
