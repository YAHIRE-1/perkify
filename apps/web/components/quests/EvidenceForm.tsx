'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ORPCError } from '@orpc/client';
import { z } from 'zod';
import { EVIDENCE_LIMITS, maxEvidenceBytes, MAX_FILES, MAX_LINKS } from '@perkify/db/validations/evidence';
import { Button } from '@perkify/ui/components/button';
import { Textarea } from '@perkify/ui/components/textarea';
import { Translate, useLanguage } from '@/lib/i18n/provider';
import { useSubmitEvidence, type SubmitEvidenceInput } from '@/hooks/participations/use-participation';
import { canPreviewEvidence, EvidenceImage, formatEvidenceSize } from './EvidenceAttachments';

const validationIssues = z.object({
  issues: z.array(z.object({
    path: z.array(z.union([z.string(), z.number()])).optional(),
    message: z.string(),
  })),
});

function submissionErrors(error: Error, t: ReturnType<typeof useLanguage>['t']) {
  if (!(error instanceof ORPCError)) {
    return [t('Could not send the evidence. Check your connection and try again.')];
  }
  const validation = validationIssues.safeParse(error.data);
  if (validation.success && validation.data.issues.length) {
    return [...new Set(validation.data.issues.map((issue) => issue.path?.[0] === 'notes'
      ? (/\b10\b/.test(issue.message)
        ? t('Tell us a little about what you did (at least 10 characters).')
        : t('Check the submission notes and try again.'))
      : issue.path?.[0] === 'links'
        ? t('Check that all links start with http:// or https://.')
        : issue.message))];
  }
  return [error.code === 'BAD_REQUEST' && error.message === 'Bad Request'
    ? t('The server rejected the submission. Check the selected proof and attachments.')
    : t(error.message)];
}

function LocalImage({ file }: { file: File }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url ? <EvidenceImage key={url} src={url} name={file.name} /> : null;
}

const isUrl = (s: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(s).protocol);
  } catch {
    return false;
  }
};

export default function EvidenceForm({ questId, items, proofRequired }: {
  questId: string;
  items: string[];
  proofRequired: string[];
}) {
  const submit = useSubmitEvidence();
  const { t } = useLanguage();
  const [notes, setNotes] = useState('');
  const [linksText, setLinksText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [inlineLinks, setInlineLinks] = useState<Record<string, string>>({});
  const [proofByItem, setProofByItem] = useState<Record<string, string | File | undefined>>({});

  const links = [...new Set([
    ...linksText.split('\n'),
    ...checked.map((item) => inlineLinks[item] ?? ''),
  ].map((value) => value.trim()).filter(Boolean))];
  const badLink = links.find((l) => !isUrl(l));

  const attachments = [
    ...links.map((link, index) => ({ value: link, label: link, kind: 'link' as const, index })),
    ...files.map((file, index) => ({ value: file, label: file.name, kind: 'file' as const, index })),
  ];
  const directLinkFor = (item: string) => inlineLinks[item]?.trim() || '';
  const attachmentFor = (item: string) => {
    const proof = directLinkFor(item) || proofByItem[item];
    return attachments.find((entry) => entry.value === proof);
  };
  const checklist: SubmitEvidenceInput['checklist'] = checked.map((item) => {
    const attachment = attachmentFor(item);
    return { item, proof: attachment ? { kind: attachment.kind, index: attachment.index } : undefined };
  });
  const missingProof = proofRequired.filter((item) =>
    !checklist.some((response) => response.item === item && response.proof),
  );
  const errors = submit.error ? submissionErrors(submit.error, t) : [];
  const empty = notes.trim().length < 10 && !links.length && !files.length && !checklist.length;
  const problem = badLink ? t('Invalid link: {link}', { link: badLink })
    : links.length > MAX_LINKS ? t('Add up to {count} links.', { count: MAX_LINKS })
    : missingProof.length ? t('Add proof for every checklist item that requires it.')
    : empty ? t('Add notes, mark a checklist item, or attach a link or file.') : null;

  return (
    <form
      className="surface space-y-5 p-5 sm:p-6"
      noValidate
      onChange={() => { if (submit.isError) submit.reset(); }}
      onSubmit={(e) => {
        e.preventDefault();
        if (problem) return;
        submit.mutate({ questId, notes: notes.trim(), links, files, checklist });
      }}
    >
      <h2 className="font-display text-xl font-semibold"><Translate text="Submit evidence" /></h2>
      {items.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="mb-2 font-semibold"><Translate text="Review checklist" /></legend>
          <p className="text-sm text-muted-foreground">
            <Translate text="Mark the items you’re submitting. If proof is required, paste a link or choose an attached file." />
          </p>
          {[...new Set(items)].map((item) => {
            const required = proofRequired.includes(item);
            const marked = checked.includes(item);
            const attachment = attachmentFor(item);
            const invalidProofLink = Boolean(directLinkFor(item)) && !isUrl(directLinkFor(item));
            return (
              <div key={item} className="space-y-2 rounded-md border p-3">
                <label className="flex items-start gap-2 text-sm font-medium">
                  <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" checked={marked}
                    disabled={submit.isPending}
                    onChange={(event) => {
                      const included = event.currentTarget.checked;
                      setChecked((previous) => included
                        ? [...previous, item] : previous.filter((entry) => entry !== item));
                    }} />
                  <span className="min-w-0 break-words">{item}</span>
                  {required && <span className="ml-auto text-xs text-muted-foreground"><Translate text="Proof required" /></span>}
                </label>
                {marked && required && (
                  <label className="block text-sm">
                    <Translate text="Proof link" />
                    <input className="mt-1 block w-full rounded-md border bg-background p-2"
                      type="url" placeholder="https://" disabled={submit.isPending}
                      aria-invalid={invalidProofLink}
                      value={inlineLinks[item] ?? ''}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setInlineLinks((previous) => ({ ...previous, [item]: value }));
                      }} />
                  </label>
                )}
                {marked && !directLinkFor(item) && (required || attachments.length > 0) && (
                  <label className="block text-sm">
                    <span><Translate text={required ? 'Choose proof' : 'Choose proof (optional)'} /></span>
                    <select className="mt-1 block w-full rounded-md border bg-background p-2"
                      disabled={submit.isPending || !attachments.length}
                      value={attachment ? `${attachment.kind}:${attachment.index}` : ''}
                      onChange={(event) => {
                        const selected = attachments.find((entry) => `${entry.kind}:${entry.index}` === event.target.value);
                        setProofByItem((previous) => ({ ...previous, [item]: selected?.value }));
                      }}>
                      <option value="">{t(attachments.length ? 'Select a link or file' : 'Add a link or file under attachments')}</option>
                      {attachments.map((entry) => (
                        <option key={`${entry.kind}:${entry.index}`} value={`${entry.kind}:${entry.index}`}>{entry.label}</option>
                      ))}
                    </select>
                  </label>
                )}
                {invalidProofLink ? (
                  <p className="text-xs text-destructive"><Translate text="Check that all links start with http:// or https://." /></p>
                ) : missingProof.includes(item) && (
                  <p className="text-xs text-muted-foreground">
                    <Translate text={marked ? 'Add a proof link or choose an attachment.' : 'Mark this item and add its proof.'} />
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>
      )}

      <div>
        <label className="text-sm font-medium" htmlFor="notes"><Translate text="Submission notes" /></label>
        <Textarea
          className="min-h-24"
          disabled={submit.isPending}
          id="notes"
          maxLength={2000}
          onChange={(e) => setNotes(e.target.value)}
          value={notes}
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="links"><Translate text={"Links (one per line)"} /></label>
        <Textarea
          className="min-h-16"
          disabled={submit.isPending}
          id="links"
          onChange={(e) => setLinksText(e.target.value)}
          placeholder="https://x.com/…"
          value={linksText}
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="files"><Translate text="Attachments" /> ({files.length}/{MAX_FILES})
        </label>
        <input
          className="block w-full text-sm"
          disabled={submit.isPending || files.length >= MAX_FILES}
          accept={Object.keys(EVIDENCE_LIMITS).join(",")}
          id="files"
          multiple
          onChange={(e) => {
            const accepted: File[] = [];
            const rejected: string[] = [];
            for (const file of Array.from(e.currentTarget.files ?? [])) {
              const limit = maxEvidenceBytes(file.type);
              if (!limit) rejected.push(t('Unsupported file type: {file}', { file: file.name }));
              else if (!file.size || file.size > limit) rejected.push(t('{file} must be between 1 byte and {limit}.', { file: file.name, limit: formatEvidenceSize(limit) }));
              else if (file.name.length > 200) rejected.push(t('Rename {file} to 200 characters or fewer.', { file: file.name }));
              else if (files.length + accepted.length >= MAX_FILES) {
                rejected.push(t('You can attach up to {count} files.', { count: MAX_FILES }));
                break;
              } else accepted.push(file);
            }
            setFiles((previous) => [...previous, ...accepted]);
            setFileErrors(rejected);
            e.currentTarget.value = '';
          }}
          type="file"
        />
        {fileErrors.length > 0 && (
          <ul role="alert" className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
            {fileErrors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}
          </ul>
        )}
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {files.map((f, i) => (
            <li
              key={`${i}-${f.name}`}
              className="surface-2 min-w-0 space-y-2 p-3 text-sm"
            >
              {canPreviewEvidence(f.type) && <LocalImage file={f} />}
              <span className="block break-words">
                {f.name} · {formatEvidenceSize(f.size)}
              </span>
              <Button
                disabled={submit.isPending}
                onClick={() => {
                  setFiles((previous) => previous.filter((_, index) => index !== i));
                  setFileErrors([]);
                  if (submit.isError) submit.reset();
                }}
                type="button"
                variant="legacy-link"
              ><Translate text={"Remove"} /></Button>
            </li>
          ))}
        </ul>
      </div>

      {problem && <p className="text-xs text-muted-foreground">{problem}</p>}
      {errors.length > 0 && (
        <div role="alert" className="space-y-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          <p className="font-semibold"><Translate text="Evidence could not be submitted" /></p>
          <ul className="list-disc space-y-1 pl-5">
            {errors.map((message) => <li key={message}>{message}</li>)}
          </ul>
        </div>
      )}

      <Button disabled={!!problem || submit.isPending} type="submit" variant="legacy-primary">
        {submit.isPending ? <Loader2 className="animate-spin" /> : null}
        <Translate text={submit.isPending ? 'Uploading…' : 'Submit evidence'} />
      </Button>
    </form>
  );
}
