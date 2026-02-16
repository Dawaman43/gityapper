import { env } from '@gityap/env/web';
import { Circle, MagnifyingGlass } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

function HomeComponent() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const leaderboardQuery = useQuery(trpc.leaderboard.queryOptions());
  const navigate = useNavigate();

  const [channelUsername, setChannelUsername] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const leaderboard = leaderboardQuery.data;

  const fallbackAvatar = (value?: string) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
				<rect width="100%" height="100%" fill="#e2e8f0"/>
				<text x="50%" y="52%" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="#475569" text-anchor="middle" dominant-baseline="middle">
					${(value ?? '??').replace(/^@+/, '').slice(0, 2).toUpperCase()}
				</text>
			</svg>`
    )}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncToken = () => {
      setGithubToken(localStorage.getItem('gh_token'));
    };

    syncToken();
    window.addEventListener('gityap:github-token', syncToken as EventListener);
    window.addEventListener('storage', syncToken);
    return () => {
      window.removeEventListener(
        'gityap:github-token',
        syncToken as EventListener
      );
      window.removeEventListener('storage', syncToken);
    };
  }, []);

  const handleRemoveGitHubConnection = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('gh_token');
    window.dispatchEvent(new Event('gityap:github-token'));
    setGithubToken(null);
    toast.success('GitHub connection removed.');
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUsername || !channelUsername) {
      toast.error('Enter both usernames');
      return;
    }
    navigate({
      to: '/compare',
      search: { github: githubUsername, telegram: channelUsername },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-border border-b">
        <div className="container mx-auto flex w-full max-w-6xl flex-col px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-display text-lg tracking-tight">
                  Gityap
                </div>
                <div className="text-muted-foreground text-sm">
                  Ship vs. talk intelligence
                </div>
              </div>
            </div>

						<div className="flex items-center gap-3">
							<a
								href="https://stark.wip.et/project/gityapper-528"
								target="_blank"
								rel="noreferrer"
								className={`${buttonVariants({
									variant: "outline",
									size: "sm",
								})} rounded-full px-3 text-xs shadow-sm`}
							>
								Star on Stark
							</a>
							<div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground text-sm shadow-sm">
								<Circle
									weight="fill"
									className={healthCheck.data ? "text-primary" : "text-muted"}
								/>
								<span>
									API {healthCheck.data ? "Connected" : "Disconnected"}
								</span>
							</div>
						</div>
					</div>

          <div className="mt-10 space-y-10">
            <div className="space-y-6">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-semibold text-muted-foreground text-xs uppercase tracking-[0.2em]">
                  Signal over noise
                </span>
                <h1 className="font-display text-4xl text-foreground leading-tight md:text-5xl">
                  See who ships code and who just talks.
                </h1>
                <p className="max-w-3xl text-base text-muted-foreground md:text-lg">
                  Compare a GitHub user with a Telegram channel to get an
                  immediate read on creator behavior. No dashboards, just a
                  clean ratio and sharp insight.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                    Signal
                  </div>
                  <div className="mt-2 font-display text-2xl text-foreground">
                    Ship ratio
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                    Comparisons
                  </div>
                  <div className="mt-2 font-display text-2xl text-foreground">
                    {leaderboard?.comparisonsCount?.toLocaleString() ?? '0'}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                    Scope
                  </div>
                  <div className="mt-2 font-display text-2xl text-foreground">
                    Git + TG
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                    Output
                  </div>
                  <div className="mt-2 font-display text-2xl text-foreground">
                    One score
                  </div>
                </div>
              </div>
            </div>

            <Card className="rounded-3xl border border-border bg-card shadow-[0_18px_40px_rgba(15,23,42,0.1)] dark:shadow-none">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-foreground">
                  Compare Users
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  GitHub handle + Telegram channel. That's all you need.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-muted-foreground text-sm">
                  <div className="font-medium text-foreground">
                    Private commits (optional)
                  </div>
                  <div className="mt-1">
                    Connect GitHub OAuth to include private contributions for
                    your own account. Public-only counts work without it.
                  </div>
                  <div className="mt-3">
                    {githubToken ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled
                        >
                          Connected
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveGitHubConnection}
                          className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                        >
                          Remove Connection
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (typeof window === 'undefined') return;
                          window.open(
                            `${env.VITE_SERVER_URL}/auth/github/start`,
                            'github_oauth',
                            'width=520,height=700'
                          );
                        }}
                      >
                        Connect GitHub (Optional)
                      </Button>
                    )}
                  </div>
                </div>
                <form onSubmit={handleCompare} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="github" className="text-foreground">
                        GitHub Username
                      </Label>
                      <Input
                        id="github"
                        placeholder="@username"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telegram" className="text-foreground">
                        Telegram Channel
                      </Label>
                      <Input
                        id="telegram"
                        placeholder="@channel"
                        value={channelUsername}
                        onChange={(e) => setChannelUsername(e.target.value)}
                        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-6 text-primary-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-60"
                  >
                    <MagnifyingGlass weight="fill" />
                    Check Their Ratio
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto w-full max-w-6xl px-6 py-16">
          <div className={`grid gap-8 ${'lg:grid-cols-1'}`}>
            {leaderboard && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="rounded-3xl border border-border bg-card shadow-sm">
                    <CardHeader>
                      <CardTitle className="font-display text-foreground text-xl">
                        Top GitHub Shippers
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Based on recent comparisons.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-96 space-y-3 overflow-y-auto pr-1">
                      {leaderboard.github.length === 0 && (
                        <div className="text-muted-foreground text-sm">
                          No data yet. Run a comparison to populate.
                        </div>
                      )}
                      {leaderboard.github.map((entry, index) => (
                        <a
                          key={entry.username}
                          href={`https://github.com/${entry.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 transition hover:bg-muted/60"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-muted-foreground/60 text-xs">
                              {index + 1}
                            </div>
                            <img
                              src={
                                entry.avatarUrl ||
                                fallbackAvatar(entry.username)
                              }
                              alt={`GitHub avatar for ${entry.username}`}
                              className="h-9 w-9 rounded-full border border-border bg-card object-cover"
                              onError={(event) => {
                                event.currentTarget.src = fallbackAvatar(
                                  entry.username
                                );
                              }}
                            />
                            <div>
                              <div className="font-medium text-foreground">
                                @{entry.username}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {entry.commits.toLocaleString()} commits
                              </div>
                            </div>
                          </div>
                        </a>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border border-border bg-card shadow-sm">
                    <CardHeader>
                      <CardTitle className="font-display text-foreground text-xl">
                        Top Telegram Yappers
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Based on recent comparisons.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-96 space-y-3 overflow-y-auto pr-1">
                      {leaderboard.telegram.length === 0 && (
                        <div className="text-muted-foreground text-sm">
                          No data yet. Run a comparison to populate.
                        </div>
                      )}
                      {leaderboard.telegram.map((entry, index) => (
                        <a
                          key={entry.username}
                          href={`https://t.me/${entry.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 transition hover:bg-muted/60"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-muted-foreground/60 text-xs">
                              {index + 1}
                            </div>
                            <img
                              src={
                                entry.avatarUrl ||
                                fallbackAvatar(entry.username)
                              }
                              alt={`Telegram avatar for ${entry.username}`}
                              className="h-9 w-9 rounded-full border border-border bg-card object-cover"
                              onError={(event) => {
                                event.currentTarget.src = fallbackAvatar(
                                  entry.username
                                );
                              }}
                            />
                            <div>
                              <div className="font-medium text-foreground">
                                @{entry.username}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {entry.posts.toLocaleString()} posts
                              </div>
                            </div>
                          </div>
                        </a>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-3xl border border-border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-display text-foreground text-xl">
                      Top Telegram Channels
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      All tracked channels ranked by subscribers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-96 space-y-3 overflow-y-auto pr-1">
                    {(leaderboard.telegramBySubscribers ?? leaderboard.telegram)
                      .length === 0 && (
                      <div className="text-muted-foreground text-sm">
                        No channels yet. Run comparisons to populate this list.
                      </div>
                    )}
                    {(
                      leaderboard.telegramBySubscribers ?? leaderboard.telegram
                    ).map((entry, index) => (
                      <a
                        key={`${entry.username}-channel`}
                        href={`https://t.me/${entry.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 transition hover:bg-muted/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground/60 text-xs">
                            {index + 1}
                          </div>
                          <img
                            src={
                              entry.avatarUrl || fallbackAvatar(entry.username)
                            }
                            alt={`Telegram avatar for ${entry.username}`}
                            className="h-9 w-9 rounded-full border border-border bg-card object-cover"
                            onError={(event) => {
                              event.currentTarget.src = fallbackAvatar(
                                entry.username
                              );
                            }}
                          />
                          <div>
                            <div className="font-medium text-foreground">
                              @{entry.username}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {(entry.subscribers ?? 0).toLocaleString()}{' '}
                              subscribers
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
