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

  const explorer = config.chains.find(
    (chain) => chain.id === chainId,
  )?.blockExplorers?.default.url;

  return (
    <section className="surface space-y-3 p-4 sm:p-5">
      <div>
        <h2 className="font-display font-semibold">
          Escrow
        </h2>

        <p className="muted-2 text-xs tracking-wider">
          ON-CHAIN INFORMATION
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="muted">Status</span>
        <span className="font-medium">{escrowStatus}</span>
      </div>

      {chainId && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="muted">Chain ID</span>
          <span className="font-medium">{chainId}</span>
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
    </section>
  );
}