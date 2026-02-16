import { Heart } from "@phosphor-icons/react";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Analytics } from "@vercel/analytics/react";
import { useEffect } from "react";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { trpc } from "@/utils/trpc";
import { env } from "@gityap/env/web";

import "../index.css";

export interface RouterAppContext {
	trpc: typeof trpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "gityap",
			},
			{
				name: "description",
				content: "gityap is a web application",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
});

function RootComponent() {
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const serverOrigin = new URL(env.VITE_SERVER_URL).origin;

		const storeToken = (token: string) => {
			localStorage.setItem("gh_token", token);
			window.dispatchEvent(new Event("gityap:github-token"));
		};

		const handleMessage = (event: MessageEvent) => {
			if (event.origin !== serverOrigin) {
				return;
			}
			const data = event.data as { type?: string; token?: string };
			if (data?.type === "github_oauth" && data.token) {
				storeToken(data.token);
			}
		};

		const handleUrlToken = () => {
			const url = new URL(window.location.href);
			const token = url.searchParams.get("github_token");
			if (!token) {
				return;
			}
			storeToken(token);
			url.searchParams.delete("github_token");
			window.history.replaceState({}, "", url.toString());
		};

		handleUrlToken();
		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<div className="grid h-svh grid-rows-[auto_1fr_auto]">
					<Header />
					<main className="overflow-auto pb-8">
						<Outlet />
					</main>
					<footer className="py-6 text-center font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wider">
						Made with{" "}
						<Heart weight="fill" className="inline h-3 w-3 text-red-500/70" />{" "}
						by Dawit
					</footer>
				</div>
				<Toaster richColors />
				<Analytics />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
