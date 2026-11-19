'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Translate } from '@/lib/i18n/provider';
import { useInvalidateQuestQueries } from '@/hooks/quest/use-quest';
import { orpc } from '@/utils/orpc';

export function QuestDisputeAction({ questId }: { questId: string }) {
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');
  const router = useRouter();
  const invalidate = useInvalidateQuestQueries();
  const open = useMutation(orpc.disputes.open.mutationOptions({
    onSuccess: () => {
      router.push('/disputes');
      return invalidate();
    },
  }));

  if (open.isSuccess) {
    return <Link className="btn" href="/disputes"><Translate text="View my disputes" /></Link>;
  }
  if (!editing) {
    return <button className="btn" type="button" onClick={() => setEditing(true)}><Translate text="Open dispute" /></button>;
  }

  return (
    <form className="space-y-3 border-t pt-4" onSubmit={(event) => {
      event.preventDefault();
      open.mutate({ questId, reason });
    }}>
      <p className="text-sm text-muted-foreground">
        <Translate text="A moderator will review your rejected submissions and the creator’s reasons." />
      </p>
      <label className="block space-y-1">
        <span className="text-sm font-medium"><Translate text="Why are you opening a dispute?" /></span>
        <textarea className="w-full rounded-md border bg-transparent p-2" required minLength={5} maxLength={1000}
          value={reason} disabled={open.isPending} onChange={(event) => setReason(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" type="submit" disabled={open.isPending || reason.trim().length < 5}>
          <Translate text={open.isPending ? 'Opening dispute…' : 'Submit dispute'} />
        </button>
        <button className="btn" type="button" disabled={open.isPending} onClick={() => setEditing(false)}>
          <Translate text="Back" />
        </button>
      </div>
      {open.isError && <p role="alert" className="text-destructive"><Translate text={open.error.message} /></p>}
    </form>
  );
}
