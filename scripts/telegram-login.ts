import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function promptSecret(question: string) {
	const rl = createInterface({ input, output });
	try {
		const answer = await rl.question(question);
		return answer.trim();
	} finally {
		rl.close();
	}
}

async function main() {
	// Satisfy server env validation for this CLI-only flow.
	process.env.DATABASE_URL ??=
		"postgresql://user:pass@localhost:5432/gityap";
	process.env.CORS_ORIGIN ??= "http://localhost:3000";

	if (!process.env.TG_API_ID || !process.env.TG_API_HASH) {
		console.error("Missing TG_API_ID or TG_API_HASH in environment.");
		console.error(
			"Set them first: TG_API_ID=... TG_API_HASH=... bun run scripts/telegram-login.ts",
		);
		process.exit(1);
	}

	const { sendLoginCode, signInWithCode } = await import(
		"../packages/api/src/telegram"
	);

	const phoneNumber = await promptSecret("Enter phone number (e.g. +15551234567): ");
	const { phoneCodeHash, session } = await sendLoginCode(phoneNumber);
	if (!phoneCodeHash || !session) {
		throw new Error("Failed to initiate login; missing phoneCodeHash/session.");
	}

	const phoneCode = await promptSecret("Enter the code from Telegram: ");
	try {
		const result = await signInWithCode({
			phoneNumber,
			phoneCodeHash,
			phoneCode,
			session,
		});
		console.log("\nTG_SESSION:\n");
		console.log(result.session);
		console.log("\nSet it on Fly with:");
		console.log(`flyctl secrets set TG_SESSION="${result.session}"`);
	} catch (error) {
		const message = String(error);
		if (message.includes("Two-factor password required")) {
			const password = await promptSecret("Enter Telegram 2FA password: ");
			const result = await signInWithCode({
				phoneNumber,
				phoneCodeHash,
				phoneCode,
				session,
				password,
			});
			console.log("\nTG_SESSION:\n");
			console.log(result.session);
			console.log("\nSet it on Fly with:");
			console.log(`flyctl secrets set TG_SESSION="${result.session}"`);
			return;
		}
		throw error;
	}
}

main().catch((err) => {
	console.error(String(err));
	process.exit(1);
});
