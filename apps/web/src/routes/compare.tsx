import {
	createFileRoute,
	Link,
	useNavigate,
} from "@tanstack/react-router";
import { z } from "zod";
import { trpc, trpcClient } from "@/utils/trpc";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	GithubLogo,
	TelegramLogo,
	Trophy,
	GitCommit,
	Users,
	PaperPlaneTilt,
	ArrowLeft,
	ArrowClockwise,
	Copy,
	ShareNetwork,
} from "@phosphor-icons/react";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { env } from "@gityap/env/web";

const compareSearchSchema = z.object({
	github: z.string().catch(""),
	telegram: z.string().catch(""),
});

export const Route = createFileRoute("/compare")({
	validateSearch: (search) => compareSearchSchema.parse(search),
	component: RouteComponent,
});

function RouteComponent() {
	const { github, telegram } = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient(); // Available for TRPC cache invalidation if needed
	const captureRef = useRef<HTMLDivElement>(null);
	const [isCapturing, setIsCapturing] = useState(false);

	// Check for session in localStorage directly as we need it for the query
	const session =
		typeof window !== "undefined"
			? localStorage.getItem("tg_session") || ""
			: "";

	const compareQuery = useQuery({
		...trpc.compareUsers.queryOptions({
			githubUsername: github || "",
			telegramUsername: telegram || "",
			session,
		}),
		enabled: !!github && !!telegram,
	});

	const recentQuery = useQuery({
		...trpc.recentComparisons.queryOptions(),
		enabled: true,
	});

	const isLoading = compareQuery.isLoading;
	const isRefetching = compareQuery.isRefetching;
	const error = compareQuery.error;
	const data = compareQuery.data;

	// Refresh history when new comparison data arrives
	const prevDataRef = useRef<typeof data>(null);
	useEffect(() => {
		if (data && data !== prevDataRef.current) {
			prevDataRef.current = data;
			recentQuery.refetch();
		}
	}, [data, recentQuery]);


	const handleReload = () => {
		compareQuery.refetch();
		toast.info("Refreshing data...");
	};

	const handleCopyImage = async () => {
		if (!captureRef.current) return;
		setIsCapturing(true);

		try {
			const exportRoot = document.createElement("div");
			exportRoot.id = "export-root";
			exportRoot.style.position = "fixed";
			exportRoot.style.left = "-10000px";
			exportRoot.style.top = "0";
			exportRoot.style.width = "1200px";
			exportRoot.style.padding = "32px";
			exportRoot.style.background = "#f8fafc";
			exportRoot.style.color = "#0f172a";
			exportRoot.style.fontFamily = "Inter, Arial, sans-serif";
			exportRoot.style.boxSizing = "border-box";
			exportRoot.style.display = "block";
			exportRoot.style.setProperty("all", "initial");
			exportRoot.style.position = "fixed";
			exportRoot.style.left = "-10000px";
			exportRoot.style.top = "0";
			exportRoot.style.width = "1200px";
			exportRoot.style.padding = "32px";
			exportRoot.style.background = "#f8fafc";
			exportRoot.style.color = "#0f172a";
			exportRoot.style.fontFamily = "Inter, Arial, sans-serif";
			exportRoot.style.boxSizing = "border-box";
			exportRoot.style.display = "block";

			const exportStyle = document.createElement("style");
			exportStyle.textContent = `
				#export-root, #export-root * {
					box-sizing: border-box !important;
					border-color: #e2e8f0 !important;
					color: #0f172a !important;
					background-color: transparent !important;
					box-shadow: none !important;
					outline: none !important;
				}
				#export-root {
					background-color: #f8fafc !important;
					color: #0f172a !important;
				}
			`;
			exportRoot.appendChild(exportStyle);

			const ghAvatar =
				proxyImageUrl(ghData.avatarUrl) || fallbackAvatar(ghData.username);
			const tgAvatar =
				proxyImageUrl(tgData.avatarUrl) || fallbackAvatar(tgData.username);

			exportRoot.innerHTML = `
				<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:24px;">
					<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
						<div style="font-size:20px;font-weight:700;">Gityap Comparison</div>
						<div style="font-size:12px;color:#64748b;">${new Date().toLocaleDateString()}</div>
					</div>
					<div style="display:grid;grid-template-columns:1fr 120px 1fr;gap:24px;align-items:center;">
						<div style="border:1px solid #e2e8f0;border-radius:20px;padding:20px;">
							<img src="${ghAvatar}" crossorigin="anonymous" style="width:72px;height:72px;border-radius:16px;margin-bottom:12px;border:2px solid #e2e8f0;" />
							<div style="font-weight:700;margin-bottom:12px;">@${ghData.username}</div>
							<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:6px;"><span>Commits</span><span style="color:#0f172a;font-weight:600;">${ghData.commits.toLocaleString()}</span></div>
							<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:6px;"><span>Followers</span><span style="color:#0f172a;font-weight:600;">${ghData.followers.toLocaleString()}</span></div>
							<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;"><span>Signal Score</span><span style="color:#0f172a;font-weight:700;">${ghData.score}</span></div>
						</div>
						<div style="text-align:center;">
							<div style="width:64px;height:64px;border-radius:999px;background:#0f172a;color:#f8fafc;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">VS</div>
							<div style="font-size:12px;color:#64748b;">${comparison.winner === "github" ? "Builders Win" : "Yappers Win"}</div>
						</div>
						<div style="border:1px solid #e2e8f0;border-radius:20px;padding:20px;">
							<img src="${tgAvatar}" crossorigin="anonymous" style="width:72px;height:72px;border-radius:16px;margin-bottom:12px;border:2px solid #e2e8f0;" />
							<div style="font-weight:700;margin-bottom:12px;">@${tgData.username}</div>
							<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:6px;"><span>Posts</span><span style="color:#0f172a;font-weight:600;">${tgData.posts.toLocaleString()}</span></div>
							<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:6px;"><span>Subscribers</span><span style="color:#0f172a;font-weight:600;">${tgData.participants?.toLocaleString() || "N/A"}</span></div>
							<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;"><span>Yap Score</span><span style="color:#0f172a;font-weight:700;">${tgData.score}</span></div>
						</div>
					</div>
				</div>
			`;

			document.body.appendChild(exportRoot);
			const canvas = await html2canvas(exportRoot, {
				useCORS: true,
				allowTaint: true,
				scale: 2,
				backgroundColor: "#f8fafc",
				logging: false,
			});
			exportRoot.remove();

			canvas.toBlob(async (blob: Blob | null) => {
				if (!blob) {
					setIsCapturing(false);
					return;
				}

				try {
					await navigator.clipboard.write([
						new ClipboardItem({ "image/png": blob }),
					]);
					toast.success("Image copied to clipboard!");
				} catch (err) {
					// Fallback to download if clipboard write fails
					saveAs(blob, `gityap-${github}-vs-${telegram}.png`);
					toast.success("Image downloaded!");
				}
				setIsCapturing(false);
			});
		} catch (err) {
			console.error("Capture failed:", err);
			toast.error("Failed to capture image");
			setIsCapturing(false);
		}
	};

	const handleShare = async () => {
		const url = window.location.href;
		const shareData = {
			title: `Gityap: ${github} vs ${telegram}`,
			text: `Check out this comparison on Gityap!`,
			url: url,
		};

		if (navigator.share && navigator.canShare(shareData)) {
			try {
				await navigator.share(shareData);
			} catch (err) {
				// User cancelled or share failed, fallback to copy
				await navigator.clipboard.writeText(url);
				toast.success("Link copied to clipboard!");
			}
		} else {
			await navigator.clipboard.writeText(url);
			toast.success("Link copied to clipboard!");
		}
	};

	const fallbackAvatar = (value?: string) =>
		`data:image/svg+xml;utf8,${encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
        <rect width="100%" height="100%" fill="#e2e8f0"/>
        <text x="50%" y="52%" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="#475569" text-anchor="middle" dominant-baseline="middle">
          ${(value ?? "??").replace(/^@+/, "").slice(0, 2).toUpperCase()}
        </text>
      </svg>`,
		)}`;
	const proxyImageUrl = (url?: string) => {
		if (!url) return "";
		const base = env.VITE_SERVER_URL?.replace(/\/$/, "") ?? "";
		return `${base}/image-proxy?url=${encodeURIComponent(url)}`;
	};

	if (!github || !telegram) {
		return (
			<div className="container mx-auto flex max-w-md flex-col items-center justify-center px-6 py-20 text-center">
				<Card className="w-full border-border bg-card shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-2xl text-foreground">
							Comparison Parameters Missing
						</CardTitle>
						<CardDescription className="text-muted-foreground">
							Please enter both a GitHub username and a Telegram channel to see the comparison.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							className="w-full rounded-2xl bg-primary py-6 text-primary-foreground hover:bg-primary/90 cursor-pointer"
							onClick={() => navigate({ to: "/" })}
						>
							Go to Home
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="container mx-auto flex max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
				<div className="mb-6 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
				<h2 className="font-display text-2xl text-foreground">
					Crunching the numbers...
				</h2>
				<p className="mt-2 text-muted-foreground">
					Analyzing commits vs yaps. This might take a moment.
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto max-w-md px-6 py-20">
				<Card className="border-red-100 bg-red-50/50">
					<CardHeader>
						<CardTitle className="text-red-900">Error</CardTitle>
						<CardDescription className="text-red-700">
							{error.message}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							variant="outline"
							className="w-full border-red-200 bg-white text-red-900 hover:bg-red-50 hover:text-red-950"
							onClick={() => window.history.back()}
						>
							Go Back
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="container mx-auto flex max-w-md flex-col items-center justify-center px-6 py-20 text-center">
				<div className="text-muted-foreground">No data found.</div>
				<Button
					variant="link"
					onClick={() => navigate({ to: "/" })}
					className="mt-4 text-primary hover:text-primary/90"
				>
					Go Home
				</Button>
			</div>
		);
	}

	const { github: ghData, telegram: tgData, comparison } = data;

	return (
		<div className="min-h-screen bg-background pb-20">
			<div className="container mx-auto max-w-6xl px-6 py-10">
				<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft weight="bold" />
						Back to search
					</Link>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleReload}
							disabled={isRefetching}
							className="gap-2 rounded-xl border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
						>
							<ArrowClockwise
								weight="bold"
								className={isRefetching ? "animate-spin" : ""}
							/>
							Reload
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleCopyImage}
							disabled={isCapturing}
							className="gap-2 rounded-xl border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
						>
							{isCapturing ? (
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
							) : (
								<Copy weight="bold" />
							)}
							Copy Image
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleShare}
							className="gap-2 rounded-xl border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
						>
							<ShareNetwork weight="bold" />
							Share
						</Button>
					</div>
				</div>

				<div ref={captureRef} className="rounded-3xl bg-background p-4 sm:p-8">
					<div className="grid gap-8 lg:grid-cols-3">
						{/* GitHub Card */}
						<Card className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md">
							<div className="h-24 bg-linear-to-br from-slate-900 to-slate-800 p-6 dark:from-slate-950 dark:to-slate-900">
								<GithubLogo weight="fill" className="h-8 w-8 text-white/80" />
							</div>
							<CardContent className="relative px-6 pb-6 pt-0">
								<div className="absolute -top-12 left-6">
									<img
										src={ghData.avatarUrl || fallbackAvatar(ghData.username)}
										alt={ghData.username}
										data-fallback={fallbackAvatar(ghData.username)}
										referrerPolicy="no-referrer"
										className="h-24 w-24 rounded-2xl border-4 border-card object-cover shadow-sm bg-card"
										onError={(e) => {
											e.currentTarget.src = fallbackAvatar(ghData.username);
										}}
									/>
								</div>
								<div className="bg-transparent pt-16">
									<h2 className="font-display text-2xl text-foreground">
										@{ghData.username}
									</h2>
									<div className="mt-6 space-y-4">
										<div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<GitCommit weight="bold" className="text-muted-foreground/60" />
												<span className="text-sm font-medium">Commits</span>
											</div>
											<span className="font-display text-lg text-foreground">
												{ghData.commits.toLocaleString()}
											</span>
										</div>
										<div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<Users weight="bold" className="text-muted-foreground/60" />
												<span className="text-sm font-medium">Followers</span>
											</div>
											<span className="font-display text-lg text-foreground">
												{ghData.followers.toLocaleString()}
											</span>
										</div>
										<div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<Trophy weight="bold" className="text-yellow-500" />
												<span className="text-sm font-medium">
													Signal Score
												</span>
											</div>
											<span className="font-display text-lg text-foreground">
												{ghData.score.toLocaleString()}
											</span>
										</div>
									</div>
									<div className="mt-6 pt-6 border-t border-border">
										<Button 
											className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-lg shadow-primary/10 transition-all hover:shadow-primary/20"
											onClick={async () => {
												const match = await trpcClient.matchUsers.query({ 
													telegramUsername: tgData.username,
													excludeTelegramUsername: tgData.username, 
												});
												if (match.username) {
													navigate({ 
														to: "/match", 
														search: { 
															telegram1: tgData.username, 
															telegram2: match.username,
															reason: match.reason ?? undefined
														} 
													});
												} else {
													toast.error("No other cofounding channel found in the system yet.");
												}
											}}
										>
											<Users weight="bold" className="mr-2" />
											Find cofounding channel
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* VS / Result Card */}
						<div className="flex flex-col items-center">
							<div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
								VS
							</div>

							<Card className="w-full flex-1 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_20px_50px_rgba(15,23,42,0.1)] dark:shadow-none">
								<CardHeader className="bg-muted/30 pb-8 text-center">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
										The Verdict
									</div>
									<CardTitle className="mt-2 font-display text-3xl text-foreground">
										{comparison.winner === "github"
											? "Builders Win"
											: "Yappers Win"}
									</CardTitle>
									<CardDescription className="text-base text-muted-foreground">
										{comparison.winner === "github"
											? "Code speaks louder than words."
											: "Noise drowned out the signal."}
									</CardDescription>
								</CardHeader>
								<CardContent className="p-0">
									<div className="grid grid-cols-2 divide-x divide-border border-t border-border">
										<div className="p-6 text-center">
											<div className="text-xs uppercase tracking-wider text-muted-foreground">
												Signal
											</div>
											<div className="mt-1 font-display text-2xl text-foreground">
												{ghData.score}
											</div>
										</div>
										<div className="p-6 text-center">
											<div className="text-xs uppercase tracking-wider text-muted-foreground">
												Noise
											</div>
											<div className="mt-1 font-display text-2xl text-foreground">
												{tgData.score}
											</div>
										</div>
									</div>
									<div className="p-8 text-center bg-primary text-primary-foreground">
										<div className="text-sm font-medium text-primary-foreground/70">
											Signal Ratio
										</div>
										<div className="mt-2 font-display text-4xl font-bold">
											{((ghData.score / (tgData.score || 1)) * 100).toFixed(0)}%
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Telegram Card */}
						<Card className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md">
							<div className="h-24 bg-linear-to-br from-[#229ED9] to-[#0088cc] p-6">
								<TelegramLogo weight="fill" className="h-8 w-8 text-white/80" />
							</div>
							<CardContent className="relative px-6 pb-6 pt-0">
								<div className="absolute -top-12 left-6">
									<img
										src={tgData.avatarUrl || fallbackAvatar(tgData.username)}
										alt={tgData.username}
										data-fallback={fallbackAvatar(tgData.username)}
										referrerPolicy="no-referrer"
										className="h-24 w-24 rounded-2xl border-4 border-card object-cover shadow-sm bg-card"
										onError={(e) => {
											e.currentTarget.src = fallbackAvatar(tgData.username);
										}}
									/>
								</div>
								<div className="bg-transparent pt-16">
									<h2 className="font-display text-2xl text-foreground">
										@{tgData.username}
									</h2>
									<div className="mt-6 space-y-4">
										<div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<PaperPlaneTilt
													weight="bold"
													className="text-muted-foreground/60"
												/>
												<span className="text-sm font-medium">Posts</span>
											</div>
											<span className="font-display text-lg text-foreground">
												{tgData.posts.toLocaleString()}
											</span>
										</div>
										<div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<Users weight="bold" className="text-muted-foreground/60" />
												<span className="text-sm font-medium">Subscribers</span>
											</div>
											<span className="font-display text-lg text-foreground">
												{tgData.participants?.toLocaleString() || "N/A"}
											</span>
										</div>
										<div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<Trophy weight="bold" className="text-yellow-500" />
												<span className="text-sm font-medium">Yap Score</span>
											</div>
											<span className="font-display text-lg text-foreground">
												{tgData.score.toLocaleString()}
											</span>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			{/* Recently Compared Section */}
			<div className="container mx-auto max-w-6xl px-6 py-12 border-t border-border">
				<div className="mb-8">
					<h3 className="font-display text-2xl font-bold text-foreground">Recently Compared</h3>
					<p className="text-muted-foreground">History of builder vs yapper ratios</p>
				</div>
				
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{recentQuery.data?.map((item) => (
						<Link 
							key={item.id}
							to={item.type === "user_vs_channel" ? "/compare" : "/match"}
							search={item.type === "user_vs_channel" 
								? { github: item.left.username, telegram: item.right.username }
								: { telegram1: item.left.username, telegram2: item.right.username }
							}
							className="group block"
						>
							<Card className="h-full overflow-hidden border border-border bg-card transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-border/80">
								<CardContent className="p-4">
									<div className="flex flex-col gap-3">
										<div className="flex items-center justify-between">
											<div className="flex -space-x-3 overflow-hidden">
												<div className="relative">
													<img
														src={item.left.avatarUrl || fallbackAvatar(item.left.username)}
														alt={item.left.username}
														data-fallback={fallbackAvatar(item.left.username)}
														referrerPolicy="no-referrer"
														className="inline-block h-10 w-10 rounded-full border-2 border-card object-cover ring-2 ring-muted"
														onError={(e) => { e.currentTarget.src = fallbackAvatar(item.left.username); }}
													/>
													<div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5 shadow-xs">
														{item.left.type === "github" ? (
															<GithubLogo weight="fill" className="w-2.5 h-2.5 text-foreground" />
														) : (
															<TelegramLogo weight="fill" className="w-2.5 h-2.5 text-[#229ED9]" />
														)}
													</div>
												</div>
												<div className="relative">
													<img
														src={item.right.avatarUrl || fallbackAvatar(item.right.username)}
														alt={item.right.username}
														data-fallback={fallbackAvatar(item.right.username)}
														referrerPolicy="no-referrer"
														className="inline-block h-10 w-10 rounded-full border-2 border-card object-cover ring-2 ring-muted"
														onError={(e) => { e.currentTarget.src = fallbackAvatar(item.right.username); }}
													/>
													<div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5 shadow-xs">
														<TelegramLogo weight="fill" className="w-2.5 h-2.5 text-[#229ED9]" />
													</div>
												</div>
											</div>
											<div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
												{new Date(item.timestamp).toLocaleDateString()}
											</div>
										</div>
										
										<div className="space-y-1">
											<div className="flex items-center justify-between text-sm">
												<span className={`truncate font-medium ${item.winner === "left" ? "text-foreground" : "text-muted-foreground"}`}>
													@{item.left.username}
												</span>
												<span className="font-display font-bold text-foreground">
													{item.leftScore}
												</span>
											</div>
											<div className="flex items-center justify-between text-sm">
												<span className={`truncate font-medium ${item.winner === "right" ? "text-foreground" : "text-muted-foreground"}`}>
													@{item.right.username}
												</span>
												<span className="font-display font-bold text-foreground">
													{item.rightScore}
												</span>
											</div>
										</div>

										<div className={`mt-1 py-1 px-2 rounded-lg text-[10px] font-bold text-center uppercase tracking-widest ${
											item.winner === "left" ? "bg-primary text-primary-foreground" : "bg-[#229ED9] text-white"
										}`}>
											{item.winner === "left" ? (item.left.type === "github" ? "Builder Wins" : "Yap Winner") : "Yap Winner"}
										</div>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
					{(!recentQuery.data || recentQuery.data.length === 0) && (
						<div className="col-span-full py-12 text-center rounded-3xl border-2 border-dashed border-border text-muted-foreground">
							No recent comparisons yet. Start shipping vs yapping!
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
