import { signInChains } from "@perkify/auth/sign-in-chains";
import Link from "next/link";
import { useState, type Ref } from "react";

import { Translate } from "@/lib/i18n/provider";

export default function WalletSignInNotice({
  dialogRef,
}: {
  dialogRef: Ref<HTMLDialogElement>;
}) {
  const [chainId, setChainId] = useState("");

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="wallet-sign-in-title"
      aria-describedby="wallet-sign-in-description"
      className="surface fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md p-6 text-[var(--fg)] backdrop:bg-black/60"
    >
      <h2
        id="wallet-sign-in-title"
        className="font-display text-2xl font-semibold"
      >
        <Translate text={"Before you connect your wallet"} />
      </h2>
      <p
        id="wallet-sign-in-description"
        className="muted mt-3 text-sm leading-relaxed"
      >
        <Translate
          text={
            "Perkify uses your public wallet address and a signed message to sign you in. This sign-in does not cost gas or move funds. Transactions you approve separately may be public and irreversible. Never share your seed phrase or private key."
          }
        />
      </p>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--accent-text)]">
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          <Translate text={"Terms of Service (opens in a new tab)"} />
        </Link>
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          <Translate text={"Privacy Notice (opens in a new tab)"} />
        </Link>
      </div>
      <form method="dialog" className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="wallet-sign-in-chain"
            className="mb-2 block text-sm font-medium"
          >
            <Translate text={"Sign-in network"} />
          </label>
          <select
            id="wallet-sign-in-chain"
            className="input"
            value={chainId}
            onChange={(event) => setChainId(event.currentTarget.value)}
          >
            <option value="" disabled>
              <Translate text={"Choose a network"} />
            </option>
            {signInChains.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="submit" value="cancel" className="btn">
            <Translate text={"Cancel"} />
          </button>
          <button
            type="submit"
            value={chainId}
            className="btn btn-primary"
            disabled={!chainId}
          >
            <Translate text={"Continue to wallet"} />
          </button>
        </div>
      </form>
    </dialog>
  );
}
