import { createContext } from "@gityap/api/context";
import { appRouter } from "@gityap/api/routers/index";
import { env } from "@gityap/env/server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

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
