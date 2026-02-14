import {
	createFileRoute,
	Link,
	useNavigate,
} from "@tanstack/react-router";
import { z } from "zod";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
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
	Heart,
	ArrowLeft,
	Copy,
	ShareNetwork,
	Handshake,
} from "@phosphor-icons/react";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import { useRef, useState } from "react";
import { toast } from "sonner";

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

	if (!session) {
		return (
			<div className="container mx-auto flex max-w-md flex-col items-center justify-center px-6 py-20 text-center">
				<Card className="w-full border-border bg-card shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-2xl text-foreground">
							Login Required
						</CardTitle>
						<CardDescription className="text-muted-foreground">
							You need to be logged in to Telegram to see matches.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							className="w-full rounded-2xl bg-primary py-6 text-primary-foreground hover:bg-primary/90 cursor-pointer"
							onClick={() => navigate({ to: "/" })}
						>
							Go to Login
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const compareQuery = useQuery({
		...trpc.compareChannels.queryOptions({
			telegramUsername1: telegram1 || "",
			telegramUsername2: telegram2 || "",
			session,
		}),
		enabled: !!session && !!telegram1 && !!telegram2,
	});

	const isLoading = compareQuery.isLoading;
	const error = compareQuery.error;
	const data = compareQuery.data;

	const handleCopyImage = async () => {
		if (!captureRef.current) return;
		setIsCapturing(true);

		try {
			const canvas = await html2canvas(captureRef.current, {
				useCORS: true,
				scale: 2,
				backgroundColor: "#ffffff",
				logging: false,
				onclone: (clonedDoc) => {
					const el = clonedDoc.getElementById("capture-container");
					if (el) {
						el.style.boxShadow = "none";
					}
				}
			});

			canvas.toBlob(async (blob) => {
				if (!blob) {
					setIsCapturing(false);
					toast.error("Failed to generate image. Please try taking a screenshot!");
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
			text: `Found the perfect cofounding channels on Gityap!`,
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
							className="w-full border-red-200 bg-white text-red-900 hover:bg-red-50 hover:text-red-950 cursor-pointer"
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

	return (
		<div className="min-h-screen bg-background pb-20">
			<div className="container mx-auto max-w-4xl px-6 py-10">
				<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<Link
						to="/compare"
						search={{ github: "", telegram: telegram1 }}
						className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
					>
						<ArrowLeft weight="bold" />
						Back to comparison
					</Link>

					<div className="flex items-center gap-2">
						<div className="text-[10px] text-muted-foreground mr-2 hidden lg:block italic">
							* Reason is stored in URL for sharing
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={handleCopyImage}
							disabled={isCapturing}
							className="gap-2 rounded-xl border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
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
							className="gap-2 rounded-xl border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
						>
							<ShareNetwork weight="bold" />
							Share
						</Button>
					</div>
				</div>

				<div 
					ref={captureRef} 
					id="capture-container"
					className="rounded-3xl p-8 shadow-xl border"
					style={{
						backgroundColor: "#ffffff",
						borderColor: "#f1f5f9",
						color: "#0f172a"
					}}
				>
					<div className="text-center mb-12">
						<div className="inline-flex items-center justify-center p-3 bg-red-50 rounded-full mb-4">
							<Heart weight="fill" className="w-8 h-8 text-[#ef4444]" />
						</div> 
						<h1 className="font-display text-4xl font-bold tracking-tight" style={{ color: "#0f172a" }}>
							The best cofounder for <br />
							<span style={{ color: "#64748b" }}>@{tg1Data.username}</span> is...
						</h1>
					</div>

					<div className="relative">
						{/* Connection Line */}
						<div className="absolute top-1/2 left-0 w-full h-0.5 -translate-y-1/2 hidden md:block" style={{ backgroundColor: "#f1f5f9" }} />
						
						<div className="grid md:grid-cols-2 gap-12 relative z-10">
							{/* Telegram User 1 (Left) */}
							<div className="flex flex-col items-center">
								<div className="relative mb-6">
									<div className="absolute inset-0 bg-[#e0f2fe] rounded-3xl transform rotate-3" />
									<img
										src={tg1Data.avatarUrl || fallbackAvatar(tg1Data.username)}
										alt={tg1Data.username}
										crossOrigin="anonymous"
										className="relative w-32 h-32 rounded-2xl object-cover shadow-lg border-4 border-white bg-white"
										onError={(e) => {
											e.currentTarget.src = fallbackAvatar(tg1Data.username);
										}}
									/>
									<div className="absolute -bottom-3 -right-3 bg-[#229ED9] text-white p-2 rounded-xl shadow-md">
										<TelegramLogo weight="fill" className="w-5 h-5" />
									</div>
								</div>
								<h2 className="text-xl font-bold" style={{ color: "#0f172a" }}>@{tg1Data.username}</h2>
								<div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f1f5f9] text-[#475569] text-sm font-medium border border-[#e2e8f0]">
									<span>Main Channel</span>
								</div>
							</div>

							{/* Connection Badge (Mobile) */}
							<div className="flex md:hidden justify-center -my-6 relative z-20">
								<div className="bg-white p-2 rounded-full shadow-md border border-[#f1f5f9]">
									<Handshake weight="fill" className="w-8 h-8 text-[#94a3b8]" />
								</div>
							</div>

							{/* Telegram User (Right - The Match) */}
							<div className="flex flex-col items-center">
								<div className="relative mb-6">
									<div className="absolute inset-0 bg-[#e0f2fe] rounded-3xl transform -rotate-3" />
									<img
										src={tg2Data.avatarUrl || fallbackAvatar(tg2Data.username)}
										alt={tg2Data.username}
										crossOrigin="anonymous"
										className="relative w-32 h-32 rounded-2xl object-cover shadow-lg border-4 border-white bg-white"
										onError={(e) => {
											e.currentTarget.src = fallbackAvatar(tg2Data.username);
										}}
									/>
									<div className="absolute -bottom-3 -right-3 bg-[#229ED9] text-white p-2 rounded-xl shadow-md">
										<TelegramLogo weight="fill" className="w-5 h-5" />
									</div>
								</div>
								<h2 className="text-xl font-bold" style={{ color: "#0f172a" }}>@{tg2Data.username}</h2>
								<div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcfce7] text-[#166534] text-sm font-medium border border-[#bbf7d0]">
									<span>Cofounder Match</span>
								</div>
							</div>
						</div>

						{/* Center Badge (Desktop) */}
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center">
							<div className="bg-white p-3 rounded-2xl shadow-lg border border-[#f1f5f9]">
								<Handshake weight="fill" className="w-8 h-8 text-[#0f172a]" />
							</div>
						</div>
					</div>
					<div className="mt-12 p-6 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9] text-center">
						<p className="text-lg font-medium" style={{ color: "#334155" }}>
							{reason ? `"${reason}"` : `"Successful startups are built by a builder and a talker."`}
						</p>
						<div className="mt-2 flex items-center justify-center gap-2 text-sm text-[#64748b]">
							<div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
							<span>98% Compatibility Score</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
