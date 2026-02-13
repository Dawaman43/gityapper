import { env } from "@gityap/env/server";
import { Api, TelegramClient } from "telegram";
import { computeCheck } from "telegram/Password";
import { StringSession } from "telegram/sessions";

export type ChannelInfo = {
	title: string;
	post_count: number;
	username: string;
	participants_count: number;
};

export type SendCodeResult = {
	phoneCodeHash: string;
	session: string;
};

export type SignInResult = {
	session: string;
};

function normalizeUsername(username: string): string {
	return username.replace(/^@+/, "").trim();
}

function createClient(sessionValue?: string) {
	const apiId = env.TG_API_ID;
	const apiHash = env.TG_API_HASH;
	const session = new StringSession(sessionValue ?? "");

	return new TelegramClient(session, apiId, apiHash, {
		connectionRetries: 2,
	});
}

async function fetchChannelEntity(client: TelegramClient, username: string) {
	const result = await client.invoke(
		new Api.contacts.ResolveUsername({
			username,
		}),
	);

	const channel = result.chats?.[0];
	if (!channel) {
		throw new Error("No channel found for that username");
	}
	if (!(channel instanceof Api.Channel)) {
		throw new Error("Resolved entity is not a channel");
	}

	return channel;
}

export async function sendLoginCode(
	phoneNumber: string,
): Promise<SendCodeResult> {
	const normalized = phoneNumber.trim();
	if (!normalized) {
		throw new Error("phoneNumber is required");
	}

	const client = createClient();
	await client.connect();

	try {
		const sent = await client.invoke(
			new Api.auth.SendCode({
				phoneNumber: normalized,
				apiId: env.TG_API_ID,
				apiHash: env.TG_API_HASH,
				settings: new Api.CodeSettings({
					allowFlashcall: false,
					currentNumber: false,
					allowAppHash: true,
				}),
			}),
		);

		// Type assertion needed as telegram library types may not match runtime
		const phoneCodeHash = (sent as any).phoneCodeHash ?? "";
		const session = client.session.save() ?? "";

		return {
			phoneCodeHash,
			session,
		};
	} finally {
		await client.disconnect();
	}
}

export async function signInWithCode(params: {
	phoneNumber: string;
	phoneCodeHash: string;
	phoneCode: string;
	session: string;
	password?: string | null;
}): Promise<SignInResult> {
	const phoneNumber = params.phoneNumber.trim();
	const phoneCodeHash = params.phoneCodeHash.trim();
	const phoneCode = params.phoneCode.trim();
	const sessionValue = params.session.trim();

	if (!phoneNumber) {
		throw new Error("phoneNumber is required");
	}
	if (!phoneCodeHash) {
		throw new Error("phoneCodeHash is required");
	}
	if (!phoneCode) {
		throw new Error("phoneCode is required");
	}
	if (!sessionValue) {
		throw new Error("session is required");
	}

	const client = createClient(sessionValue);
	await client.connect();

	try {
		try {
			await client.invoke(
				new Api.auth.SignIn({
					phoneNumber,
					phoneCodeHash,
					phoneCode,
				}),
			);
		} catch (error) {
			const message = String(error);
			if (message.includes("SESSION_PASSWORD_NEEDED")) {
				if (!params.password) {
					throw new Error("Two-factor password required");
				}
				// Get password info for SRP
				const passwordInfo = await client.invoke(new Api.account.GetPassword());
				// Compute SRP check
				const passwordSrpCheck = await computeCheck(
					passwordInfo,
					params.password,
				);
				// Sign in with password
				await client.invoke(
					new Api.auth.CheckPassword({
						password: passwordSrpCheck,
					}),
				);
			} else {
				throw error;
			}
		}

		const session = client.session.save() ?? "";
		return {
			session,
		};
	} finally {
		await client.disconnect();
	}
}

export async function fetchChannelInfo(
	channelUsername: string,
	sessionValue: string,
): Promise<ChannelInfo> {
	const username = normalizeUsername(channelUsername);
	if (!username) {
		throw new Error("username is required");
	}

	if (!sessionValue) {
		throw new Error("session is required for channel info requests");
	}

	const client = createClient(sessionValue);

	await client.connect();

	try {
		const channel = await fetchChannelEntity(client, username);

		// Get full channel info to get accurate participant count
		const fullChannel = await client.invoke(
			new Api.channels.GetFullChannel({
				channel,
			}),
		);

		// Get post count using offset to jump near end, then count back
		let postCount = 0;

		try {
			const history = await client.invoke(
				new Api.messages.GetHistory({
					peer: channel,
					limit: 1,
				}),
			);

			if (history && typeof history === "object" && "count" in history) {
				postCount = (history as any).count || 0;
			}
		} catch {
			// Fallback: count messages with a reasonable limit for speed
			const maxMessagesToCount = 1000;
			for await (const _message of client.iterMessages(channel, {
				limit: maxMessagesToCount,
			})) {
				postCount++;
			}
		}

		return {
			title: channel.title ?? username,
			post_count: postCount,
			username: channel.username ?? username,
			participants_count: (fullChannel.fullChat as any).participantsCount || 0,
		};
	} finally {
		await client.disconnect();
	}
}
