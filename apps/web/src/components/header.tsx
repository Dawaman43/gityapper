import { TerminalWindow } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 w-full border-slate-200/80 border-b bg-white/70 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/40">
			<div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
				<div className="flex items-center gap-6">
					<Link to="/" className="group flex items-center gap-2">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-lg shadow-slate-900/10 transition-all group-hover:scale-110 group-active:scale-95 dark:bg-white dark:shadow-white/5">
							<TerminalWindow
								weight="bold"
								className="h-5 w-5 text-white dark:text-slate-950"
							/>
						</div>
						<span className="font-bold font-display text-slate-900 text-xl tracking-tight dark:text-white">
							gityap
						</span>
					</Link>
				</div>

				<div className="flex items-center gap-4">
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
