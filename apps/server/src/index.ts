import { createContext } from "@gityap/api/context";
import { appRouter } from "@gityap/api/routers/index";
import { env } from "@gityap/env/server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import crypto from "node:crypto";

const app = new Hono();
const GITHUB_OAUTH_SCOPE = "read:user";

function buildOAuthState(secret: string) {
	const payload = JSON.stringify({ ts: Date.now() });
	const encoded = Buffer.from(payload).toString("base64url");
	const signature = crypto
		.createHmac("sha256", secret)
		.update(encoded)
		.digest("base64url");
	return `${encoded}.${signature}`;
}

function verifyOAuthState(secret: string, state: string) {
	const [encoded, signature] = state.split(".");
	if (!encoded || !signature) {
		return false;
	}
	const expected = crypto
		.createHmac("sha256", secret)
		.update(encoded)
		.digest("base64url");
	try {
		const sigOk = crypto.timingSafeEqual(
			Buffer.from(signature),
			Buffer.from(expected),
		);
		if (!sigOk) {
			return false;
		}
		const payload = JSON.parse(
			Buffer.from(encoded, "base64url").toString("utf8"),
		) as { ts?: number };
		if (!payload.ts) {
			return false;
		}
		const ageMs = Date.now() - payload.ts;
		return ageMs >= 0 && ageMs < 10 * 60 * 1000;
	} catch {
		return false;
	}
}

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: false,
	}),
);

app.get("/auth/github/start", (c) => {
	if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
		return c.text("GitHub OAuth is not configured.", 500);
	}

	const requestUrl = new URL(c.req.url);
	const redirectUri =
		env.GITHUB_OAUTH_REDIRECT_URL ??
		new URL("/auth/github/callback", requestUrl.origin).toString();
	const state = buildOAuthState(env.GITHUB_CLIENT_SECRET);
	const params = new URLSearchParams({
		client_id: env.GITHUB_CLIENT_ID,
		redirect_uri: redirectUri,
		scope: GITHUB_OAUTH_SCOPE,
		state,
	});

	return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get("/auth/github/callback", async (c) => {
	if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
		return c.text("GitHub OAuth is not configured.", 500);
	}

	const code = c.req.query("code");
	const state = c.req.query("state");
	if (!code || !state || !verifyOAuthState(env.GITHUB_CLIENT_SECRET, state)) {
		return c.text("Invalid OAuth response.", 400);
	}

	const requestUrl = new URL(c.req.url);
	const redirectUri =
		env.GITHUB_OAUTH_REDIRECT_URL ??
		new URL("/auth/github/callback", requestUrl.origin).toString();

	const tokenResponse = await fetch(
		"https://github.com/login/oauth/access_token",
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client_id: env.GITHUB_CLIENT_ID,
				client_secret: env.GITHUB_CLIENT_SECRET,
				code,
				redirect_uri: redirectUri,
			}),
		},
	);

	if (!tokenResponse.ok) {
		return c.text("Failed to exchange OAuth code.", 502);
	}

	const tokenData = (await tokenResponse.json()) as {
		access_token?: string;
		error?: string;
		error_description?: string;
	};
	const accessToken = tokenData.access_token;
	if (!accessToken) {
		return c.text(tokenData.error_description ?? "Missing access token.", 502);
	}

	const webOrigin = new URL(env.CORS_ORIGIN).origin;
	const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>GitHub Connected</title>
  </head>
  <body>
    <script>
      (function () {
        var token = ${JSON.stringify(accessToken)};
        var payload = { type: "github_oauth", token: token };
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, ${JSON.stringify(webOrigin)});
            window.close();
            return;
          }
        } catch (e) {}
        var redirect = ${JSON.stringify(webOrigin)};
        var url = new URL(redirect);
        url.searchParams.set("github_token", token);
        window.location.replace(url.toString());
      })();
    </script>
  </body>
</html>`;

	return c.html(html);
});

app.get("/image-proxy", async (c) => {
	const urlParam = c.req.query("url");
	if (!urlParam) {
		return c.text("Missing url parameter", 400);
	}
	let url: URL;
	try {
		url = new URL(urlParam);
	} catch {
		return c.text("Invalid url", 400);
	}

	const allowedHosts = new Set([
		"t.me",
		"unavatar.io",
		"avatars.githubusercontent.com",
		"github.com",
	]);
	if (!allowedHosts.has(url.hostname)) {
		return c.text("Host not allowed", 403);
	}

	const response = await fetch(url.toString());
	if (!response.ok) {
		return c.text("Failed to fetch image", 502);
	}
	const contentType = response.headers.get("content-type") ?? "image/jpeg";
	const arrayBuffer = await response.arrayBuffer();
	return new Response(arrayBuffer, {
		status: 200,
		headers: {
			"content-type": contentType,
			"cache-control": "public, max-age=86400",
		},
	});
});

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
