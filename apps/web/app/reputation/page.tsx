'use client';

import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@perkify/ui/components/avatar';
import { useAuth } from '@/components/Providers';
import { Translate, useLanguage } from '@/lib/i18n/provider';
import { orpc } from '@/utils/orpc';

export default function ReputationPage() {
  const { user, loading } = useAuth();
  const { locale, t } = useLanguage();
  const options = orpc.reputation.leaderboard.queryOptions();
  const ranking = useQuery({
    ...options,
    queryKey: [...options.queryKey, user?.id ?? null],
    enabled: !loading,
    refetchInterval: 30_000,
  });
  const number = new Intl.NumberFormat(locale);
  const data = ranking.data;

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-3 font-display text-3xl font-bold sm:text-4xl">
          <Trophy aria-hidden className="size-7 text-primary" />
          <Translate text="Reputation" />
        </h1>
        {data && (
          <p className="text-muted-foreground">
            <Translate text="Earn {points} Perkys for every quest you complete and get paid for."
              values={{ points: number.format(data.perkysPerQuest) }} />
          </p>
        )}
      </header>

      {ranking.isPending && <p role="status"><Translate text="Loading leaderboard…" /></p>}
      {ranking.isError && (
        <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
          <p role="alert"><Translate text="Could not load the leaderboard." /></p>
          <button type="button" className="btn" onClick={() => void ranking.refetch()}>
            <Translate text="Try again" />
          </button>
        </div>
      )}

      {data && (
        <>
          {data.me && (
            <section className="surface flex flex-wrap items-center justify-between gap-4 border-primary/25 p-5 sm:p-6">
              <div>
                <h2 className="font-semibold"><Translate text="Your reputation" /></h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.me.rank === null ? t('Unranked') : t('Rank #{rank}', { rank: number.format(data.me.rank) })}
                </p>
              </div>
              <p className="font-display text-3xl font-bold tabular-nums">
                {number.format(data.me.perkys)} <span className="text-sm font-medium text-muted-foreground">Perkys</span>
              </p>
            </section>
          )}

          <section className="surface overflow-hidden">
            <h2 className="border-b px-5 py-4 font-display text-xl font-semibold"><Translate text="Leaderboard" /></h2>
            {data.leaders.length === 0 ? (
              <p className="p-5 text-muted-foreground"><Translate text="No quest payouts yet." /></p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 sm:px-5" scope="col"><Translate text="Rank" /></th>
                      <th className="px-2 py-3" scope="col"><Translate text="Participant" /></th>
                      <th className="px-2 py-3 text-right" scope="col"><Translate text="Paid quests" /></th>
                      <th className="px-4 py-3 text-right sm:px-5" scope="col">Perkys</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaders.map((entry) => (
                      <tr key={entry.userId} className="border-t">
                        <td className="px-4 py-3 font-medium tabular-nums sm:px-5">#{number.format(entry.rank)}</td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="shrink-0">
                              {entry.avatarUrl && <AvatarImage src={entry.avatarUrl} alt="" referrerPolicy="no-referrer" />}
                              <AvatarFallback>{entry.name?.slice(0, 2).toUpperCase() || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="max-w-[12rem] truncate font-medium" title={entry.name ?? undefined}>{entry.name ?? t("Participant")}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums">{number.format(entry.completed)}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums sm:px-5">{number.format(entry.perkys)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
