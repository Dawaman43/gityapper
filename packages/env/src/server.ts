import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		CORS_ORIGIN: z
			.string()
			.min(1)
			.refine(
				(value) => {
					const origins = value
						.split(",")
						.map((origin) => origin.trim())
						.filter((origin) => origin.length > 0);
					return origins.length > 0 && origins.every((origin) => URL.canParse(origin));
				},
				{
					message:
						"CORS_ORIGIN must be a URL or comma-separated list of URLs",
				},
			),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		TG_API_ID: z.coerce.number().int().positive(),
		TG_API_HASH: z.string().min(1),
		TG_SESSION: z.string().min(1).optional(),
		GITHUB_TOKEN: z.string().min(1).optional(),
		GITHUB_CLIENT_ID: z.string().min(1).optional(),
		GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
		GITHUB_OAUTH_REDIRECT_URL: z.string().url().optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
