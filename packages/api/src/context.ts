import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext({
	context: _context,
}: CreateContextOptions) {
	const authHeader = _context.req.header("authorization") ?? "";
	const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
	const githubToken = tokenMatch?.[1]?.trim() || null;
	// No auth configured
	return {
		githubToken,
		session: null,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
