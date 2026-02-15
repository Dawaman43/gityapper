import { env } from "@gityap/env/web";
import {
	ArrowLeft,
	Copy,
	GithubLogo,
	Handshake,
	Heart,
	ShareNetwork,
	TelegramLogo,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
	reason: z.string().optional(),
});

export const Route = createFileRoute("/match")({
	validateSearch: (search) => matchSearchSchema.parse(search),
	component: RouteComponent,
});

function RouteComponent() {
	const { telegram1, telegram2, reason } = Route.useSearch();
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
			exportRoot.style.width = "1200px";
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
			exportRoot.style.width = "1200px";
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

			exportRoot.innerHTML = `
				<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:28px;">
					<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
						<div style="font-size:20px;font-weight:700;">Gityap Match</div>
						<div style="font-size:12px;color:#64748b;">${new Date().toLocaleDateString()}</div>
					</div>
					<div style="text-align:center;margin-bottom:20px;">
						<div style="font-size:18px;font-weight:700;">The best cofounder for @${tg1Data.username} is...</div>
					</div>
					<div style="display:grid;grid-template-columns:1fr 80px 1fr;gap:24px;align-items:center;">
						<div style="text-align:center;">
							<img src="${tg1Avatar}" crossorigin="anonymous" style="width:96px;height:96px;border-radius:20px;border:2px solid #e2e8f0;margin-bottom:10px;" />
							<div style="font-weight:700;">@${tg1Data.username}</div>
							<div style="font-size:12px;color:#64748b;">Main Channel</div>
						</div>
						<div style="text-align:center;">
							<div style="width:56px;height:56px;border-radius:16px;background:#0f172a;color:#f8fafc;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto;">&amp;</div>
						</div>
						<div style="text-align:center;">
							<img src="${tg2Avatar}" crossorigin="anonymous" style="width:96px;height:96px;border-radius:20px;border:2px solid #e2e8f0;margin-bottom:10px;" />
							<div style="font-weight:700;">@${tg2Data.username}</div>
							<div style="font-size:12px;color:#64748b;">Cofounder Match</div>
						</div>
					</div>
					<div style="margin-top:22px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:12px;text-align:center;font-size:14px;color:#334155;">
						${reason ? `"${reason}"` : `"Successful startups are built by a builder and a talker."`}
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
				} catch (err) {
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
			} catch (err) {
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

	return (
		<div className="min-h-screen bg-background pb-20">
			<div className="container mx-auto max-w-4xl px-6 py-10">
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
					className="rounded-3xl border border-border bg-card p-8 text-foreground shadow-xl dark:shadow-none"
				>
					<div className="mb-12 text-center">
						<div className="mb-4 inline-flex items-center justify-center rounded-full bg-red-50 p-3 dark:bg-red-500/10">
							<Heart weight="fill" className="h-8 w-8 text-[#ef4444]" />
						</div>
						<h1 className="font-bold font-display text-4xl text-foreground tracking-tight">
							The best cofounder for <br />
							<span className="text-3xl text-muted-foreground">
								@{tg1Data.username}
							</span>{" "}
							is...
						</h1>
					</div>

					<div className="relative">
						{/* Connection Line */}
						<div className="absolute top-1/2 left-0 hidden h-0.5 w-full -translate-y-1/2 bg-border md:block" />

						<div className="relative z-10 grid gap-12 md:grid-cols-2">
							{/* Telegram User 1 (Left) */}
							<div className="flex flex-col items-center">
								<div className="relative mb-6">
									<div className="absolute inset-0 rotate-3 transform rounded-3xl bg-[#e0f2fe] dark:bg-sky-500/20" />
									<img
										src={tg1Data.avatarUrl || fallbackAvatar(tg1Data.username)}
										alt={tg1Data.username}
										data-fallback={fallbackAvatar(tg1Data.username)}
										crossOrigin="anonymous"
										referrerPolicy="no-referrer"
										className="relative h-32 w-32 rounded-2xl border-4 border-card bg-card object-cover shadow-lg"
										onError={(e) => {
											e.currentTarget.src = fallbackAvatar(tg1Data.username);
										}}
									/>
									<div className="absolute -right-3 -bottom-3 rounded-xl bg-[#229ED9] p-2 text-white shadow-md">
										<TelegramLogo weight="fill" className="h-5 w-5" />
									</div>
								</div>
								<h2 className="font-bold text-foreground text-xl">
									@{tg1Data.username}
								</h2>
								<div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 font-medium text-muted-foreground text-sm">
									<span>Main Channel</span>
								</div>
							</div>

							{/* Connection Badge (Mobile) */}
							<div className="relative z-20 -my-6 flex justify-center md:hidden">
								<div className="rounded-full border border-border bg-card p-2 shadow-md">
									<Handshake
										weight="fill"
										className="h-8 w-8 text-muted-foreground"
									/>
								</div>
							</div>

							{/* Telegram User (Right - The Match) */}
							<div className="flex flex-col items-center">
								<div className="relative mb-6">
									<div className="absolute inset-0 -rotate-3 transform rounded-3xl bg-[#e0f2fe] dark:bg-sky-500/20" />
									<img
										src={tg2Data.avatarUrl || fallbackAvatar(tg2Data.username)}
										alt={tg2Data.username}
										data-fallback={fallbackAvatar(tg2Data.username)}
										crossOrigin="anonymous"
										referrerPolicy="no-referrer"
										className="relative h-32 w-32 rounded-2xl border-4 border-card bg-card object-cover shadow-lg"
										onError={(e) => {
											e.currentTarget.src = fallbackAvatar(tg2Data.username);
										}}
									/>
									<div className="absolute -right-3 -bottom-3 rounded-xl bg-[#229ED9] p-2 text-white shadow-md">
										<TelegramLogo weight="fill" className="h-5 w-5" />
									</div>
								</div>
								<h2 className="font-bold text-foreground text-xl">
									@{tg2Data.username}
								</h2>
								<div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 font-medium text-green-600 text-sm dark:text-green-400">
									<span>Cofounder Match</span>
								</div>
							</div>
						</div>

						{/* Center Badge (Desktop) */}
						<div className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center md:flex">
							<div className="rounded-2xl border border-border bg-card p-3 shadow-lg">
								<Handshake weight="fill" className="h-8 w-8 text-foreground" />
							</div>
						</div>
					</div>
					<div className="mt-12 rounded-2xl border border-border bg-muted/50 p-6 text-center">
						<p className="font-medium text-foreground text-lg">
							{reason
								? `"${reason}"`
								: `"Successful startups are built by a builder and a talker."`}
						</p>
						<div className="mt-2 flex items-center justify-center gap-2 text-muted-foreground text-sm">
							<div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
							<span>98% Compatibility Score</span>
						</div>
					</div>

					<div className="mt-10 rounded-2xl border border-border bg-card p-6">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="font-bold text-foreground text-lg">
								Performance Snapshot
							</h3>
							<div className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
								Last Check
							</div>
						</div>

						{[
							{
								label: "Yap Score",
								left: tg1Data.score,
								right: tg2Data.score,
								leftColor: "#0ea5e9",
								rightColor: "#22c55e",
							},
							{
								label: "Posts",
								left: tg1Data.posts,
								right: tg2Data.posts,
								leftColor: "#6366f1",
								rightColor: "#f97316",
							},
							{
								label: "Subscribers",
								left: tg1Data.participants,
								right: tg2Data.participants,
								leftColor: "#0f172a",
								rightColor: "#64748b",
							},
						].map((row) => {
							const max = maxValue(row.left, row.right);
							const leftWidth = Math.round(((row.left ?? 0) / max) * 100);
							const rightWidth = Math.round(((row.right ?? 0) / max) * 100);

							return (
								<div key={row.label} className="mb-5 last:mb-0">
									<div className="mb-2 flex items-center justify-between font-semibold text-foreground text-sm">
										<span>{row.label}</span>
										<span className="text-muted-foreground text-xs">
											Max {formatNumber(max)}
										</span>
									</div>
									<div className="grid gap-3 sm:grid-cols-2">
										<div>
											<div className="mb-1 flex items-center justify-between text-muted-foreground text-xs">
												<span>@{tg1Data.username}</span>
												<span>{formatNumber(row.left)}</span>
											</div>
											<div className="h-2 w-full rounded-full bg-muted">
												<div
													className="h-2 rounded-full"
													style={{
														width: `${leftWidth}%`,
														backgroundColor: row.leftColor,
													}}
												/>
											</div>
										</div>
										<div>
											<div className="mb-1 flex items-center justify-between text-muted-foreground text-xs">
												<span>@{tg2Data.username}</span>
												<span>{formatNumber(row.right)}</span>
											</div>
											<div className="h-2 w-full rounded-full bg-muted">
												<div
													className="h-2 rounded-full"
													style={{
														width: `${rightWidth}%`,
														backgroundColor: row.rightColor,
													}}
												/>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
