import { env } from "@gityap/env/web";
import {
	ArrowLeft,
	Copy,
	GithubLogo,
	ShareNetwork,
	TelegramLogo,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import { useRef, useState } from "react";
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
import { trpc } from "@/utils/trpc";

const matchSearchSchema = z.object({
	telegram1: z.string().catch(""),
	telegram2: z.string().catch(""),
	github1: z.string().optional(),
	github2: z.string().optional(),
	reason: z.string().optional(),
});

export const Route = createFileRoute("/match")({
	validateSearch: (search) => matchSearchSchema.parse(search),
	component: RouteComponent,
});

function RouteComponent() {
	const { telegram1, telegram2, github1, github2, reason } = Route.useSearch();
	const navigate = useNavigate();
	const captureRef = useRef<HTMLDivElement>(null);
	const [isCapturing, setIsCapturing] = useState(false);

	// Check for session in localStorage directly as we need it for the query
	const session =
		typeof window !== "undefined"
			? localStorage.getItem("tg_session") || ""
			: "";

	const compareQuery = useQuery({
		...trpc.compareChannels.queryOptions({
			telegramUsername1: telegram1 || "",
			telegramUsername2: telegram2 || "",
			githubUsername1: github1,
			githubUsername2: github2,
			session,
		}),
		enabled: !!telegram1 && !!telegram2,
	});

	const isLoading = compareQuery.isLoading;
	const error = compareQuery.error;
	const data = compareQuery.data;

	const handleCopyImage = async () => {
		if (!captureRef.current) return;
		setIsCapturing(true);

		try {
			const exportRoot = document.createElement("div");
			exportRoot.id = "export-root";
			exportRoot.style.position = "fixed";
			exportRoot.style.left = "-10000px";
			exportRoot.style.top = "0";
			exportRoot.style.width = "1500px";
			exportRoot.style.padding = "32px";
			exportRoot.style.background = "#ffffff";
			exportRoot.style.color = "#0f172a";
			exportRoot.style.fontFamily = "Inter, Arial, sans-serif";
			exportRoot.style.boxSizing = "border-box";
			exportRoot.style.display = "block";
			exportRoot.style.setProperty("all", "initial");
			exportRoot.style.position = "fixed";
			exportRoot.style.left = "-10000px";
			exportRoot.style.top = "0";
			exportRoot.style.width = "1500px";
			exportRoot.style.padding = "32px";
			exportRoot.style.background = "#ffffff";
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
					background-color: #ffffff !important;
					color: #0f172a !important;
				}
			`;
			exportRoot.appendChild(exportStyle);

			const tg1Avatar =
				proxyImageUrl(tg1Data.avatarUrl) || fallbackAvatar(tg1Data.username);
			const tg2Avatar =
				proxyImageUrl(tg2Data.avatarUrl) || fallbackAvatar(tg2Data.username);
			const exportMaxPosts = Math.max(
				tg1Data.posts ?? 0,
				tg2Data.posts ?? 0,
				1,
			);
			const exportMaxScore = Math.max(
				tg1Data.score ?? 0,
				tg2Data.score ?? 0,
				1,
			);
			const exportLeftPostsPct = Math.max(
				Math.round(((tg1Data.posts ?? 0) / exportMaxPosts) * 100),
				5,
			);
			const exportLeftScorePct = Math.max(
				Math.round(((tg1Data.score ?? 0) / exportMaxScore) * 100),
				5,
			);
			const exportRightPostsPct = Math.max(
				Math.round(((tg2Data.posts ?? 0) / exportMaxPosts) * 100),
				5,
			);
			const exportRightScorePct = Math.max(
				Math.round(((tg2Data.score ?? 0) / exportMaxScore) * 100),
				5,
			);
			const exportLeftActivity = (tg1Data.posts ?? 0) + (tg1Data.score ?? 0);
			const exportRightActivity = (tg2Data.posts ?? 0) + (tg2Data.score ?? 0);
			const exportCompatibility = Math.max(
				0,
				100 -
					Math.round(
						(Math.abs(exportLeftActivity - exportRightActivity) /
							Math.max(exportLeftActivity, exportRightActivity, 1)) *
							100,
					),
			);
			const exportLeftTotal = exportLeftActivity;
			const exportRightTotal = exportRightActivity;
			const exportLeftYapPct = Math.round(
				((tg1Data.posts ?? 0) / Math.max(exportLeftTotal, 1)) * 100,
			);
			const exportLeftBuildPct = 100 - exportLeftYapPct;
			const exportRightYapPct = Math.round(
				((tg2Data.posts ?? 0) / Math.max(exportRightTotal, 1)) * 100,
			);
			const exportRightBuildPct = 100 - exportRightYapPct;
			const githubIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256"><path fill="#0f172a" d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z"/></svg>`;
			const telegramIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256"><path fill="#0ea5e9" d="M228.88,26.19a9,9,0,0,0-9.16-1.57L17.06,103.93a14.22,14.22,0,0,0,2.43,27.21L72,141.45V200a15.92,15.92,0,0,0,10,14.83,15.91,15.91,0,0,0,17.51-3.73l25.32-26.26L165,220a15.88,15.88,0,0,0,10.51,4,16.3,16.3,0,0,0,5-.79,15.85,15.85,0,0,0,10.67-11.63L231.77,35A9,9,0,0,0,228.88,26.19Zm-61.14,36L78.15,126.35l-49.6-9.73ZM88,200V152.52l24.79,21.74Zm87.53,8L92.85,135.5l119-85.29Z"/></svg>`;

			exportRoot.innerHTML = `
				<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:28px 34px;">
					<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
						<div style="font-size:20px;font-weight:700;">Gityap Match</div>
						<div style="font-size:12px;color:#64748b;">${new Date().toLocaleDateString()}</div>
					</div>
					<div style="text-align:center;margin-bottom:28px;">
						<div style="font-size:54px;line-height:1.08;font-weight:700;">The best cofounder for ${tg1Data.username} is...</div>
					</div>
					<div style="display:grid;grid-template-columns:260px 90px 1fr 90px 260px;column-gap:26px;align-items:center;">
						<div style="text-align:center;">
							<img src="${tg1Avatar}" crossorigin="anonymous" style="width:96px;height:96px;border-radius:999px;border:2px solid #e2e8f0;margin:0 auto 12px;object-fit:cover;" />
							<div style="font-size:34px;line-height:1.08;font-weight:700;margin-bottom:8px;">${tg1Data.username}</div>
							<div style="font-size:18px;color:#475569;line-height:1.4;">${(tg1Data.posts ?? 0).toLocaleString()} posts</div>
							<div style="font-size:18px;color:#475569;line-height:1.4;">${(tg1Data.score ?? 0).toLocaleString()} score</div>
							<div style="margin-top:12px;font-size:16px;color:#475569;line-height:1.35;">
								${tg1Data.username} spends ${exportLeftYapPct}% yapping and ${exportLeftBuildPct}% on signal
							</div>
						</div>
						<div style="display:flex;justify-content:center;gap:10px;align-items:flex-end;height:360px;">
							<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
								<div>${githubIcon}</div>
								<div style="height:320px;width:22px;background:#e2e8f0;display:flex;align-items:flex-end;">
									<div style="width:100%;height:${exportLeftScorePct}%;background:#16a34a;"></div>
								</div>
							</div>
							<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
								<div>${telegramIcon}</div>
								<div style="height:320px;width:22px;background:#e2e8f0;display:flex;align-items:flex-end;">
									<div style="width:100%;height:${exportLeftPostsPct}%;background:#38bdf8;"></div>
								</div>
							</div>
						</div>
						<div style="text-align:center;">
							<div style="font-size:62px;line-height:1.08;font-weight:700;">
								${tg1Data.username} and ${tg2Data.username}<br />
								are ${exportCompatibility}% compatible<br />
								as cofounders
							</div>
							<div style="margin-top:14px;font-size:18px;color:#475569;line-height:1.4;">
								${reason || "Two power-yappers joining forces."}
							</div>
						</div>
						<div style="display:flex;justify-content:center;gap:10px;align-items:flex-end;height:360px;">
							<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
								<div>${telegramIcon}</div>
								<div style="height:320px;width:22px;background:#e2e8f0;display:flex;align-items:flex-end;">
									<div style="width:100%;height:${exportRightPostsPct}%;background:#0ea5e9;"></div>
								</div>
							</div>
							<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
								<div>${githubIcon}</div>
								<div style="height:320px;width:22px;background:#e2e8f0;display:flex;align-items:flex-end;">
									<div style="width:100%;height:${exportRightScorePct}%;background:#22c55e;"></div>
								</div>
							</div>
						</div>
						<div style="text-align:center;">
							<img src="${tg2Avatar}" crossorigin="anonymous" style="width:96px;height:96px;border-radius:999px;border:2px solid #e2e8f0;margin:0 auto 12px;object-fit:cover;" />
							<div style="font-size:34px;line-height:1.08;font-weight:700;margin-bottom:8px;">${tg2Data.username}</div>
							<div style="font-size:18px;color:#475569;line-height:1.4;">${(tg2Data.posts ?? 0).toLocaleString()} posts</div>
							<div style="font-size:18px;color:#475569;line-height:1.4;">${(tg2Data.score ?? 0).toLocaleString()} score</div>
							<div style="margin-top:12px;font-size:16px;color:#475569;line-height:1.35;">
								${tg2Data.username} spends ${exportRightYapPct}% yapping and ${exportRightBuildPct}% on signal
							</div>
						</div>
					</div>
					<div style="margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:right;font-size:14px;color:#64748b;">
						${window.location.href}
					</div>
				</div>
			`;

			document.body.appendChild(exportRoot);
			const canvas = await html2canvas(exportRoot, {
				useCORS: true,
				allowTaint: true,
				scale: 2,
				backgroundColor: "#ffffff",
				logging: false,
			});
			exportRoot.remove();

			canvas.toBlob(async (blob) => {
				if (!blob) {
					setIsCapturing(false);
					toast.error(
						"Failed to generate image. Please try taking a screenshot!",
					);
					return;
				}

				try {
					await navigator.clipboard.write([
						new ClipboardItem({ "image/png": blob }),
					]);
					toast.success("Match card copied to clipboard!");
				} catch (_err) {
					saveAs(blob, `gityap-match-${telegram1}-${telegram2}.png`);
					toast.success("Match card downloaded!");
				}
				setIsCapturing(false);
			}, "image/png");
		} catch (err) {
			console.error("Capture failed:", err);
			toast.error("Failed to capture image. Please try taking a screenshot!");
			setIsCapturing(false);
		}
	};

	const handleShare = async () => {
		const url = window.location.href;
		const shareData = {
			title: `Gityap Match: ${telegram1} + ${telegram2}`,
			text: "Found the perfect cofounding channels on Gityap!",
			url: url,
		};

		if (navigator.share && navigator.canShare(shareData)) {
			try {
				await navigator.share(shareData);
			} catch (_err) {
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

	if (!telegram1 || !telegram2) {
		return (
			<div className="container mx-auto flex max-w-md flex-col items-center justify-center px-6 py-20 text-center">
				<Card className="w-full border-border bg-card shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-2xl text-foreground">
							Match Parameters Missing
						</CardTitle>
						<CardDescription className="text-muted-foreground">
							Please provide both Telegram channels to see their compatibility.
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
					Calculating compatibility...
				</h2>
				<p className="mt-2 text-muted-foreground">
					Finding the perfect synergy.
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
							className="w-full cursor-pointer border-red-200 bg-white text-red-900 hover:bg-red-50 hover:text-red-950"
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
				<div className="text-muted-foreground">No match data found.</div>
				<Button
					variant="link"
					onClick={() => navigate({ to: "/" })}
					className="mt-4 cursor-pointer text-primary hover:text-primary/90"
				>
					Go Home
				</Button>
			</div>
		);
	}

	const { telegram1: tg1Data, telegram2: tg2Data } = data;
	const formatNumber = (value?: number) =>
		typeof value === "number" ? value.toLocaleString() : "N/A";
	const proxyImageUrl = (url?: string) => {
		if (!url) return "";
		const base = env.VITE_SERVER_URL?.replace(/\/$/, "") ?? "";
		return `${base}/image-proxy?url=${encodeURIComponent(url)}`;
	};
	const maxValue = (...values: Array<number | undefined>) => {
		const nums = values.filter((v): v is number => typeof v === "number");
		return nums.length > 0 ? Math.max(...nums) : 1;
	};
	const maxPosts = maxValue(tg1Data.posts, tg2Data.posts);
	const maxScore = maxValue(tg1Data.score, tg2Data.score);
	const leftPostsPct = Math.max(
		Math.round(((tg1Data.posts ?? 0) / maxPosts) * 100),
		5,
	);
	const leftScorePct = Math.max(
		Math.round(((tg1Data.score ?? 0) / maxScore) * 100),
		5,
	);
	const rightPostsPct = Math.max(
		Math.round(((tg2Data.posts ?? 0) / maxPosts) * 100),
		5,
	);
	const rightScorePct = Math.max(
		Math.round(((tg2Data.score ?? 0) / maxScore) * 100),
		5,
	);
	const leftActivity = (tg1Data.posts ?? 0) + (tg1Data.score ?? 0);
	const rightActivity = (tg2Data.posts ?? 0) + (tg2Data.score ?? 0);
	const compatibility = Math.max(
		0,
		100 -
			Math.round(
				(Math.abs(leftActivity - rightActivity) /
					Math.max(leftActivity, rightActivity, 1)) *
					100,
			),
	);
	const leftTotal = leftActivity;
	const rightTotal = rightActivity;
	const leftYapPct = Math.round(
		((tg1Data.posts ?? 0) / Math.max(leftTotal, 1)) * 100,
	);
	const leftBuildPct = 100 - leftYapPct;
	const rightYapPct = Math.round(
		((tg2Data.posts ?? 0) / Math.max(rightTotal, 1)) * 100,
	);
	const rightBuildPct = 100 - rightYapPct;

	return (
		<div className="min-h-screen bg-background pb-20">
			<div className="container mx-auto max-w-[1700px] px-6 py-10">
				<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<button
						type="button"
						onClick={() => window.history.back()}
						className="inline-flex cursor-pointer items-center gap-2 font-medium text-muted-foreground text-sm hover:text-foreground"
					>
						<ArrowLeft weight="bold" />
						Back to previous
					</button>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleCopyImage}
							disabled={isCapturing}
							className="cursor-pointer gap-2 rounded-xl border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
						>
							{isCapturing ? (
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
							) : (
								<Copy weight="bold" />
							)}
							Save Match
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleShare}
							className="cursor-pointer gap-2 rounded-xl border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
						>
							<ShareNetwork weight="bold" />
							Share
						</Button>
					</div>
				</div>

				<div
					ref={captureRef}
					id="capture-container"
					className="rounded-3xl border border-border bg-card p-6 text-foreground shadow-xl md:p-8 dark:shadow-none"
				>
					<div className="mb-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-[0.28em]">
						Cofounder Match
					</div>
					<h1 className="text-center font-bold font-display text-3xl text-foreground sm:text-4xl">
						The best cofounder for {tg1Data.username} is...
					</h1>

					<div className="mt-10 grid gap-6 lg:grid-cols-2 2xl:grid-cols-[minmax(240px,1fr)_100px_minmax(420px,1.2fr)_100px_minmax(240px,1fr)] 2xl:items-center">
						<div className="rounded-2xl border border-border bg-muted/20 p-5 text-center">
							<img
								src={tg1Data.avatarUrl || fallbackAvatar(tg1Data.username)}
								alt={tg1Data.username}
								data-fallback={fallbackAvatar(tg1Data.username)}
								crossOrigin="anonymous"
								referrerPolicy="no-referrer"
								className="mx-auto mb-4 h-24 w-24 rounded-full border-2 border-border object-cover ring-4 ring-background"
								onError={(e) => {
									e.currentTarget.src = fallbackAvatar(tg1Data.username);
								}}
							/>
							<h2 className="font-display font-semibold text-2xl text-foreground sm:text-3xl">
								{tg1Data.username}
							</h2>
							<div className="mt-3 space-y-1 text-muted-foreground text-sm">
								<p>{formatNumber(tg1Data.posts)} posts</p>
								<p>{formatNumber(tg1Data.score)} score</p>
							</div>
							<p className="mt-3 text-muted-foreground text-sm leading-snug">
								{tg1Data.username} spends {leftYapPct}% yapping and{" "}
								{leftBuildPct}% on signal
							</p>
						</div>

						<div className="mx-auto flex h-72 items-end gap-4 rounded-2xl border border-border bg-muted/20 px-4 py-3">
							<div className="flex flex-col items-center gap-2">
								<GithubLogo weight="fill" className="h-4 w-4 text-foreground" />
								<div className="flex h-60 w-6 items-end overflow-hidden rounded-sm bg-muted">
									<div
										className="w-full bg-[#16a34a]"
										style={{ height: `${leftScorePct}%` }}
									/>
								</div>
								<span className="font-medium text-[11px] text-muted-foreground">
									Score
								</span>
							</div>
							<div className="flex flex-col items-center gap-2">
								<TelegramLogo
									weight="fill"
									className="h-4 w-4 text-[#0ea5e9]"
								/>
								<div className="flex h-60 w-6 items-end overflow-hidden rounded-sm bg-muted">
									<div
										className="w-full bg-[#38bdf8]"
										style={{ height: `${leftPostsPct}%` }}
									/>
								</div>
								<span className="font-medium text-[11px] text-muted-foreground">
									Posts
								</span>
							</div>
						</div>

						<div className="rounded-2xl border border-border bg-linear-to-b from-background to-muted/30 p-6 text-center lg:col-span-2 2xl:col-span-1">
							<h2 className="font-display font-semibold text-3xl text-foreground leading-tight sm:text-4xl">
								{tg1Data.username} and {tg2Data.username}
								<br />
								are {compatibility}% compatible
								<br />
								as cofounders
							</h2>
							<p className="mt-4 text-muted-foreground text-sm leading-relaxed">
								{reason || "Two power-yappers joining forces."}
							</p>
							<div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-muted-foreground text-xs">
								<div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
								Live Compatibility Signal
							</div>
						</div>

						<div className="mx-auto flex h-72 items-end gap-4 rounded-2xl border border-border bg-muted/20 px-4 py-3">
							<div className="flex flex-col items-center gap-2">
								<TelegramLogo
									weight="fill"
									className="h-4 w-4 text-[#0ea5e9]"
								/>
								<div className="flex h-60 w-6 items-end overflow-hidden rounded-sm bg-muted">
									<div
										className="w-full bg-[#0ea5e9]"
										style={{ height: `${rightPostsPct}%` }}
									/>
								</div>
								<span className="font-medium text-[11px] text-muted-foreground">
									Posts
								</span>
							</div>
							<div className="flex flex-col items-center gap-2">
								<GithubLogo weight="fill" className="h-4 w-4 text-foreground" />
								<div className="flex h-60 w-6 items-end overflow-hidden rounded-sm bg-muted">
									<div
										className="w-full bg-[#22c55e]"
										style={{ height: `${rightScorePct}%` }}
									/>
								</div>
								<span className="font-medium text-[11px] text-muted-foreground">
									Score
								</span>
							</div>
						</div>

						<div className="rounded-2xl border border-border bg-muted/20 p-5 text-center">
							<img
								src={tg2Data.avatarUrl || fallbackAvatar(tg2Data.username)}
								alt={tg2Data.username}
								data-fallback={fallbackAvatar(tg2Data.username)}
								crossOrigin="anonymous"
								referrerPolicy="no-referrer"
								className="mx-auto mb-4 h-24 w-24 rounded-full border-2 border-border object-cover ring-4 ring-background"
								onError={(e) => {
									e.currentTarget.src = fallbackAvatar(tg2Data.username);
								}}
							/>
							<h2 className="font-display font-semibold text-2xl text-foreground sm:text-3xl">
								{tg2Data.username}
							</h2>
							<div className="mt-3 space-y-1 text-muted-foreground text-sm">
								<p>{formatNumber(tg2Data.posts)} posts</p>
								<p>{formatNumber(tg2Data.score)} score</p>
							</div>
							<p className="mt-3 text-muted-foreground text-sm leading-snug">
								{tg2Data.username} spends {rightYapPct}% yapping and{" "}
								{rightBuildPct}% on signal
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
