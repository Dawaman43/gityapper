import { env } from "@gityap/env/web";
import {
	ArrowClockwise,
	ArrowLeft,
	Copy,
	GitCommit,
	GithubLogo,
	PaperPlaneTilt,
	ShareNetwork,
	TelegramLogo,
	Trophy,
	Users,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { trpc, trpcClient } from "@/utils/trpc";

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

			const tgAvatar =
				proxyImageUrl(tgData.avatarUrl) || fallbackAvatar(tgData.username);
			const githubIconLarge = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" style="display:block"><path fill="#0f172a" d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z"/></svg>`;
			const telegramIconLarge = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" style="display:block"><path fill="#229ED9" d="M228.88,26.19a9,9,0,0,0-9.16-1.57L17.06,103.93a14.22,14.22,0,0,0,2.43,27.21L72,141.45V200a15.92,15.92,0,0,0,10,14.83,15.91,15.91,0,0,0,17.51-3.73l25.32-26.26L165,220a15.88,15.88,0,0,0,10.51,4,16.3,16.3,0,0,0,5-.79,15.85,15.85,0,0,0,10.67-11.63L231.77,35A9,9,0,0,0,228.88,26.19Zm-61.14,36L78.15,126.35l-49.6-9.73ZM88,200V152.52l24.79,21.74Zm87.53,8L92.85,135.5l119-85.29Z"/></svg>`;
			const exportActivityMax = Math.max(ghData.commits, tgData.posts, 1);
			const exportGithubHeight = Math.max(
				Math.round((ghData.commits / exportActivityMax) * 100),
				10,
			);
			const exportTelegramHeight = Math.max(
				Math.round((tgData.posts / exportActivityMax) * 100),
				10,
			);
			const exportCodingDelta =
				tgData.posts > 0
					? Math.round(((ghData.commits - tgData.posts) / tgData.posts) * 100)
					: null;
			const exportSummary =
				exportCodingDelta === null
					? `@${ghData.username} has activity data, but @${tgData.username} has no posts yet.`
					: exportCodingDelta >= 0
						? `@${ghData.username} spends ${exportCodingDelta.toLocaleString()}% more time coding than yapping.`
						: `@${ghData.username} is ${Math.abs(exportCodingDelta).toLocaleString()}% less active in coding than @${tgData.username} is in posting.`;

			exportRoot.innerHTML = `
				<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:28px;">
					<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
						<div style="font-size:20px;font-weight:700;">Gityap Compare</div>
						<div style="font-size:12px;color:#64748b;">${new Date().toLocaleDateString()}</div>
					</div>
						<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:28px;align-items:center;">
							<div>
								<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px;">
									<img src="${tgAvatar}" crossorigin="anonymous" style="width:86px;height:86px;border-radius:16px;border:2px solid #e2e8f0;object-fit:cover;" />
									<div style="display:flex;flex-direction:column;">
										<div style="font-size:36px;line-height:1.08;font-weight:700;margin-bottom:14px;">${tgData.username}</div>
											<div style="display:flex;flex-direction:column;gap:12px;padding-top:4px;padding-left:4px;">
												<div style="display:flex;align-items:center;height:30px;">
													<span style="display:flex;align-items:center;height:30px;line-height:1;font-size:20px;font-weight:500;color:#334155;">${ghData.commits.toLocaleString()} commits</span>
												</div>
												<div style="display:flex;align-items:center;height:30px;">
													<span style="display:flex;align-items:center;height:30px;line-height:1;font-size:20px;font-weight:500;color:#334155;">${tgData.posts.toLocaleString()} posts</span>
												</div>
											</div>
										</div>
								</div>
								<div style="font-size:42px;line-height:1.1;font-weight:600;letter-spacing:-0.03em;margin-top:18px;">${exportSummary}</div>
							</div>
						<div style="display:flex;justify-content:center;gap:18px;align-items:flex-end;padding:8px 0 4px;">
								<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
									<div style="height:300px;width:72px;background:#f1f5f9;border-radius:8px;display:flex;align-items:flex-end;justify-content:center;padding:0 6px;">
										<div style="width:100%;height:${exportGithubHeight}%;background:#16a34a;border-radius:6px 6px 0 0;"></div>
									</div>
										${githubIconLarge}
									</div>
									<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
										<div style="height:300px;width:72px;background:#f1f5f9;border-radius:8px;display:flex;align-items:flex-end;justify-content:center;padding:0 6px;">
											<div style="width:100%;height:${exportTelegramHeight}%;background:#38bdf8;border-radius:6px 6px 0 0;"></div>
										</div>
										${telegramIconLarge}
									</div>
							</div>
					</div>
					<div style="margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;display:flex;justify-content:space-between;">
						<span>Winner: ${comparison.winner === "github" ? "Builders Win" : "Yappers Win"}</span>
						<span>${window.location.href}</span>
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
			text: "Check out this comparison on Gityap!",
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
							Please enter both a GitHub username and a Telegram channel to see
							the comparison.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							className="w-full cursor-pointer rounded-2xl bg-primary py-6 text-primary-foreground hover:bg-primary/90"
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
	const totalScore = Math.max(ghData.score + tgData.score, 1);
	const signalPercent = Math.round((ghData.score / totalScore) * 100);
	const noisePercent = 100 - signalPercent;
	const activityMax = Math.max(ghData.commits, tgData.posts, 1);
	const githubActivityHeight = Math.max(
		Math.round((ghData.commits / activityMax) * 100),
		10,
	);
	const telegramActivityHeight = Math.max(
		Math.round((tgData.posts / activityMax) * 100),
		10,
	);
	const codingRatio =
		tgData.posts > 0 ? Math.round((ghData.commits / tgData.posts) * 100) : null;
	const codingDelta =
		tgData.posts > 0
			? Math.round(((ghData.commits - tgData.posts) / tgData.posts) * 100)
			: null;

	return (
		<div className="min-h-screen bg-background pb-20">
			<div className="container mx-auto max-w-6xl px-6 py-10">
				<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<Link
						to="/"
						className="inline-flex items-center gap-2 font-medium text-muted-foreground text-sm hover:text-foreground"
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
							<CardContent className="relative px-6 pt-0 pb-6">
								<div className="absolute -top-12 left-6">
									<img
										src={ghData.avatarUrl || fallbackAvatar(ghData.username)}
										alt={ghData.username}
										data-fallback={fallbackAvatar(ghData.username)}
										referrerPolicy="no-referrer"
										className="h-24 w-24 rounded-2xl border-4 border-card bg-card object-cover shadow-sm"
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
										<div className="flex items-center justify-between border-border border-b pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<GitCommit
													weight="bold"
													className="text-muted-foreground/60"
												/>
												<span className="font-medium text-sm">Commits</span>
											</div>
											<span className="font-display text-foreground text-lg">
												{ghData.commits.toLocaleString()}
											</span>
										</div>
										<div className="flex items-center justify-between border-border border-b pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<Users
													weight="bold"
													className="text-muted-foreground/60"
												/>
												<span className="font-medium text-sm">Followers</span>
											</div>
											<span className="font-display text-foreground text-lg">
												{ghData.followers.toLocaleString()}
											</span>
										</div>
										<div className="flex items-center justify-between border-border border-b pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<Trophy weight="bold" className="text-yellow-500" />
												<span className="font-medium text-sm">
													Signal Score
												</span>
											</div>
											<span className="font-display text-foreground text-lg">
												{ghData.score.toLocaleString()}
											</span>
										</div>
									</div>
									<div className="mt-6 border-border border-t pt-6">
										<Button
											className="w-full cursor-pointer rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:bg-primary/90 hover:shadow-primary/20"
											onClick={async () => {
												const match = await trpcClient.matchUsers.query({
													telegramUsername: tgData.username,
													githubUsername: ghData.username,
													excludeTelegramUsername: tgData.username,
												});
												if (match.username) {
													navigate({
														to: "/match",
														search: {
															telegram1: tgData.username,
															telegram2: match.username,
															github1: ghData.username,
															github2:
																match.githubUsername ?? undefined,
															reason: match.reason ?? undefined,
														},
													});
												} else {
													toast.error(
														"No other cofounding channel found in the system yet.",
													);
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
							<div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary font-bold font-display text-primary-foreground text-xl shadow-lg shadow-primary/20">
								VS
							</div>

							<Card className="w-full flex-1 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_20px_50px_rgba(15,23,42,0.1)] dark:shadow-none">
								<CardHeader className="bg-muted/30 pb-8 text-center">
									<div className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.2em]">
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
									<div className="grid grid-cols-2 divide-x divide-border border-border border-t">
										<div className="p-6 text-center">
											<div className="text-muted-foreground text-xs uppercase tracking-wider">
												Signal
											</div>
											<div className="mt-1 font-display text-2xl text-foreground">
												{ghData.score}
											</div>
										</div>
										<div className="p-6 text-center">
											<div className="text-muted-foreground text-xs uppercase tracking-wider">
												Noise
											</div>
											<div className="mt-1 font-display text-2xl text-foreground">
												{tgData.score}
											</div>
										</div>
									</div>
									<div className="border-border border-t px-6 py-6">
										<div className="mb-5 flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider">
											<span>Commits vs Posts</span>
											<span>Activity Chart</span>
										</div>
										<div className="flex h-44 items-end justify-center gap-8 rounded-2xl border border-border bg-muted/20 px-5 py-4">
											<div className="flex w-20 flex-col items-center gap-2">
												<div className="flex h-32 w-full items-end justify-center rounded-lg bg-background">
													<div
														className="w-14 rounded-t-md bg-emerald-600 transition-all duration-500"
														style={{ height: `${githubActivityHeight}%` }}
													/>
												</div>
												<div className="flex items-center gap-1 text-muted-foreground text-xs">
													<GithubLogo weight="fill" className="h-4 w-4" />
													<span className="font-semibold text-foreground">
														{ghData.commits.toLocaleString()}
													</span>
												</div>
											</div>
											<div className="flex w-20 flex-col items-center gap-2">
												<div className="flex h-32 w-full items-end justify-center rounded-lg bg-background">
													<div
														className="w-14 rounded-t-md bg-sky-500 transition-all duration-500"
														style={{ height: `${telegramActivityHeight}%` }}
													/>
												</div>
												<div className="flex items-center gap-1 text-muted-foreground text-xs">
													<PaperPlaneTilt weight="fill" className="h-4 w-4" />
													<span className="font-semibold text-foreground">
														{tgData.posts.toLocaleString()}
													</span>
												</div>
											</div>
										</div>
										<p className="mt-4 text-balance text-center text-foreground text-sm">
											{codingRatio === null
												? `@${ghData.username} has activity data, but @${tgData.username} has no posts yet.`
												: codingDelta !== null && codingDelta >= 0
													? `@${ghData.username} spends ${codingDelta.toLocaleString()}% more time coding than yapping.`
													: `@${ghData.username} is ${Math.abs(codingDelta || 0).toLocaleString()}% less active in coding than @${tgData.username} is in posting.`}
										</p>
										<div className="mt-4 flex items-center justify-between text-muted-foreground text-xs">
											<span>Signal share: {signalPercent}%</span>
											<span>Noise share: {noisePercent}%</span>
										</div>
									</div>
									<div className="bg-primary p-8 text-center text-primary-foreground">
										<div className="font-medium text-primary-foreground/70 text-sm">
											Signal Ratio
										</div>
										<div className="mt-2 font-bold font-display text-4xl">
											{codingRatio === null
												? "N/A"
												: `${codingRatio.toLocaleString()}%`}
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
							<CardContent className="relative px-6 pt-0 pb-6">
								<div className="absolute -top-12 left-6">
									<img
										src={tgData.avatarUrl || fallbackAvatar(tgData.username)}
										alt={tgData.username}
										data-fallback={fallbackAvatar(tgData.username)}
										referrerPolicy="no-referrer"
										className="h-24 w-24 rounded-2xl border-4 border-card bg-card object-cover shadow-sm"
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
										<div className="flex items-center justify-between border-border border-b pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<PaperPlaneTilt
													weight="bold"
													className="text-muted-foreground/60"
												/>
												<span className="font-medium text-sm">Posts</span>
											</div>
											<span className="font-display text-foreground text-lg">
												{tgData.posts.toLocaleString()}
											</span>
										</div>
										<div className="flex items-center justify-between border-border border-b pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<Users
													weight="bold"
													className="text-muted-foreground/60"
												/>
												<span className="font-medium text-sm">Subscribers</span>
											</div>
											<span className="font-display text-foreground text-lg">
												{tgData.participants?.toLocaleString() || "N/A"}
											</span>
										</div>
										<div className="flex items-center justify-between border-border border-b pb-3 last:border-0 last:pb-0">
											<div className="flex items-center gap-2 text-muted-foreground">
												<Trophy weight="bold" className="text-yellow-500" />
												<span className="font-medium text-sm">Yap Score</span>
											</div>
											<span className="font-display text-foreground text-lg">
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
			<div className="container mx-auto max-w-6xl border-border border-t px-6 py-12">
				<div className="mb-8">
					<h3 className="font-bold font-display text-2xl text-foreground">
						Recently Compared
					</h3>
					<p className="text-muted-foreground">
						History of builder vs yapper ratios
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{recentQuery.data?.map((item) => (
						<Link
							key={item.id}
							to={item.type === "user_vs_channel" ? "/compare" : "/match"}
							search={
								item.type === "user_vs_channel"
									? {
											github: item.left.username,
											telegram: item.right.username,
										}
									: {
											telegram1: item.left.username,
											telegram2: item.right.username,
										}
							}
							className="group block"
						>
							<Card className="h-full overflow-hidden border border-border bg-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-border/80 group-hover:shadow-md">
								<CardContent className="p-4">
									<div className="flex flex-col gap-3">
										<div className="flex items-center justify-between">
											<div className="flex -space-x-3 overflow-hidden">
												<div className="relative">
													<img
														src={
															item.left.avatarUrl ||
															fallbackAvatar(item.left.username)
														}
														alt={item.left.username}
														data-fallback={fallbackAvatar(item.left.username)}
														referrerPolicy="no-referrer"
														className="inline-block h-10 w-10 rounded-full border-2 border-card object-cover ring-2 ring-muted"
														onError={(e) => {
															e.currentTarget.src = fallbackAvatar(
																item.left.username,
															);
														}}
													/>
													<div className="absolute -right-1 -bottom-1 rounded-full bg-card p-0.5 shadow-xs">
														{item.left.type === "github" ? (
															<GithubLogo
																weight="fill"
																className="h-2.5 w-2.5 text-foreground"
															/>
														) : (
															<TelegramLogo
																weight="fill"
																className="h-2.5 w-2.5 text-[#229ED9]"
															/>
														)}
													</div>
												</div>
												<div className="relative">
													<img
														src={
															item.right.avatarUrl ||
															fallbackAvatar(item.right.username)
														}
														alt={item.right.username}
														data-fallback={fallbackAvatar(item.right.username)}
														referrerPolicy="no-referrer"
														className="inline-block h-10 w-10 rounded-full border-2 border-card object-cover ring-2 ring-muted"
														onError={(e) => {
															e.currentTarget.src = fallbackAvatar(
																item.right.username,
															);
														}}
													/>
													<div className="absolute -right-1 -bottom-1 rounded-full bg-card p-0.5 shadow-xs">
														<TelegramLogo
															weight="fill"
															className="h-2.5 w-2.5 text-[#229ED9]"
														/>
													</div>
												</div>
											</div>
											<div className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
												{new Date(item.timestamp).toLocaleDateString()}
											</div>
										</div>

										<div className="space-y-1">
											<div className="flex items-center justify-between text-sm">
												<span
													className={`truncate font-medium ${item.winner === "left" ? "text-foreground" : "text-muted-foreground"}`}
												>
													@{item.left.username}
												</span>
												<span className="font-bold font-display text-foreground">
													{item.leftScore}
												</span>
											</div>
											<div className="flex items-center justify-between text-sm">
												<span
													className={`truncate font-medium ${item.winner === "right" ? "text-foreground" : "text-muted-foreground"}`}
												>
													@{item.right.username}
												</span>
												<span className="font-bold font-display text-foreground">
													{item.rightScore}
												</span>
											</div>
										</div>

										<div
											className={`mt-1 rounded-lg px-2 py-1 text-center font-bold text-[10px] uppercase tracking-widest ${
												item.winner === "left"
													? "bg-primary text-primary-foreground"
													: "bg-[#229ED9] text-white"
											}`}
										>
											{item.winner === "left"
												? item.left.type === "github"
													? "Builder Wins"
													: "Yap Winner"
												: "Yap Winner"}
										</div>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
					{(!recentQuery.data || recentQuery.data.length === 0) && (
						<div className="col-span-full rounded-3xl border-2 border-border border-dashed py-12 text-center text-muted-foreground">
							No recent comparisons yet. Start shipping vs yapping!
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
