import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModeToggle } from "./mode-toggle";
import { TerminalWindow } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { env } from "@gityap/env/web";

export default function Header() {
	const [githubToken, setGithubToken] = useState<string | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const syncToken = () => {
			setGithubToken(localStorage.getItem("gh_token"));
		};

		syncToken();
		window.addEventListener("gityap:github-token", syncToken as EventListener);
		window.addEventListener("storage", syncToken);
		return () => {
			window.removeEventListener(
				"gityap:github-token",
				syncToken as EventListener,
			);
			window.removeEventListener("storage", syncToken);
		};
	}, []);

	const handleConnect = () => {
		if (typeof window === "undefined") {
			return;
		}
		const authUrl = `${env.VITE_SERVER_URL}/auth/github/start`;
		window.open(authUrl, "github_oauth", "width=520,height=700");
	};

	const handleDisconnect = () => {
		if (typeof window === "undefined") {
			return;
		}
		localStorage.removeItem("gh_token");
		setGithubToken(null);
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/40">
			<div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
				<div className="flex items-center gap-6">
					<Link to="/" className="flex items-center gap-2 group">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 dark:bg-white transition-all group-hover:scale-110 group-active:scale-95 shadow-lg shadow-slate-900/10 dark:shadow-white/5">
							<TerminalWindow weight="bold" className="h-5 w-5 text-white dark:text-slate-950" />
						</div>
						<span className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
							gityap
						</span>
					</Link>
				</div>

				<div className="flex items-center gap-4">
					{githubToken ? (
						<Button
							variant="outline"
							size="sm"
							onClick={handleDisconnect}
						>
							GitHub Connected
						</Button>
					) : (
						<Button variant="outline" size="sm" onClick={handleConnect}>
							Connect GitHub
						</Button>
					)}
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
