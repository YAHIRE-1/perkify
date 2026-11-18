import { useConfig } from 'wagmi';

type Props = {
  chainId: number | null;
  escrowId: string | null;
  escrowStatus: string;
  createTxHash: string | null;
};

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export default function QuestEscrow({
  chainId,
  escrowId,
  escrowStatus,
  createTxHash,
}: Props) {
  const config = useConfig();

  if (escrowStatus === 'NONE') return null;

  const chain = config.chains.find((item) => item.id === chainId);
  const explorer = chain?.blockExplorers?.default.url;

  return (
    <details className="surface space-y-3 p-5">
      <summary className="cursor-pointer font-display font-semibold">Escrow details</summary>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="muted">Status</span>
        <span className="font-medium capitalize">{escrowStatus.toLowerCase().replaceAll("_", " ")}</span>
      </div>

      {chainId && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="muted">Network</span>
          <span className="font-medium">{chain?.name ?? chainId}</span>
        </div>
      )}

      {escrowId && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="muted">Escrow ID</span>
          <span className="max-w-[65%] truncate font-mono text-xs">
            {escrowId}
          </span>
        </div>
      )}

      {createTxHash && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="muted shrink-0">Deposit tx</span>

          {explorer ? (
            <a
              href={`${explorer}/tx/${createTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-xs underline"
              title={createTxHash}
            >
              {shortHash(createTxHash)}
            </a>
          ) : (
            <span
              className="truncate font-mono text-xs"
              title={createTxHash}
            >
              {shortHash(createTxHash)}
            </span>
          )}
        </div>
      )}
    </details>
  );
}