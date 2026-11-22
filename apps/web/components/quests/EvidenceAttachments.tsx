'use client';

import { useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { Translate } from '@/lib/i18n/provider';
import type { QuestEvidence } from '@/hooks/participations/use-participation';

type Submission = QuestEvidence[number]['submissions'][number];
const previewTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/bmp']);

export const formatEvidenceSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

export function EvidenceImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <p className="bg-muted p-4 text-sm text-muted-foreground"><Translate text="Image preview unavailable" /></p>;
  }

  return (
    // Signed storage URLs and local object URLs must load directly in the browser.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} loading="lazy" referrerPolicy="no-referrer"
      className="h-52 w-full bg-muted object-contain" onError={() => setFailed(true)} />
  );
}

export function canPreviewEvidence(contentType: string) {
  return previewTypes.has(contentType.toLowerCase());
}

export default function EvidenceAttachments({ links, files }: Pick<Submission, 'links' | 'files'>) {
  const validLinks = links.filter((link) => /^https?:\/\//i.test(link) && URL.canParse(link));

  return (
    <>
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold"><Translate text="Attachments" /></h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {files.map((file) => (
              <li key={file.id} className="min-w-0 overflow-hidden rounded-md border">
                <a className="block hover:bg-muted" href={file.url} target="_blank" rel="noopener noreferrer">
                  {canPreviewEvidence(file.contentType) && <EvidenceImage key={file.url} src={file.url} name={file.name} />}
                  <span className="flex items-center gap-2 p-3 text-sm">
                    <FileText aria-hidden className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 break-words">{file.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatEvidenceSize(file.size)}</span>
                    <ExternalLink aria-hidden className="size-4 shrink-0" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {validLinks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold"><Translate text="Links" /></h3>
          <ul className="space-y-1 text-sm">
            {validLinks.map((link, index) => (
              <li key={`${index}-${link}`} className="break-all">
                <a className="underline" href={link} rel="noopener noreferrer nofollow" target="_blank">{link}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
