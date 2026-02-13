import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			className="relative h-10 w-10 rounded-xl bg-slate-100/50 hover:bg-slate-200/50 dark:bg-white/5 dark:hover:bg-white/10 transition-colors duration-300"
		>
			<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-slate-900" />
			<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-white" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
