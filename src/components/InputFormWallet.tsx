import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import React, { FC, useState, useEffect } from "react";
import * as web3 from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import styles from "../styles/Home.module.css";

export const InputFormWallet: FC = () => {
  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [tokenMint, setTokenMint] = useState<string>("");
  const [transactionLink, setTransactionLink] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [solBalance, setSolBalance] = useState<number>(0);
  const [tokenBalances, setTokenBalances] = useState<any[]>([]);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  useEffect(() => {
    const fetchBalance = async () => {
      if (!connection || !publicKey) return;

      const balance = await connection.getBalance(publicKey);
      setSolBalance(balance / web3.LAMPORTS_PER_SOL);

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );
      const tokens = tokenAccounts.value.map((account) => ({
        mint: account.account.data.parsed.info.mint,
        amount: account.account.data.parsed.info.tokenAmount.uiAmount,
        account: account.pubkey.toBase58(),
      }));
      setTokenBalances(tokens);
    };

    fetchBalance();
  }, [connection, publicKey]);

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(event.target.value);
  };

  const handleRecipientChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRecipient(event.target.value);
  };

  const handleTokenMintChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setTokenMint(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!connection || !publicKey) {
      setStatus("Wallet not connected.");
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setStatus("Please enter a valid amount.");
      return;
    }

    let recipientPubKey: web3.PublicKey;
    try {
      recipientPubKey = new web3.PublicKey(recipient);
    } catch (e) {
      setStatus("Invalid recipient address.");
      return;
    }

    const transaction = new web3.Transaction();

    try {
      setStatus("Preparing transaction...");

      if (tokenMint) {
        // Chuyển token SPL
        const tokenMintPubkey = new web3.PublicKey(tokenMint);
        const sourceTokenAccountInfo = tokenBalances.find(
          (t) => t.mint === tokenMint
        );
        if (!sourceTokenAccountInfo) {
          setStatus("Token not found in wallet.");
          return;
        }
        const sourceTokenAccount = new web3.PublicKey(
          sourceTokenAccountInfo.account
        );

        const destinationTokenAccount = await getAssociatedTokenAddress(
          tokenMintPubkey,
          recipientPubKey
        );

        const destinationAccountInfo = await connection.getAccountInfo(
          destinationTokenAccount
        );
        if (!destinationAccountInfo) {
          const createATAInstruction = createAssociatedTokenAccountInstruction(
            publicKey, // Người trả phí
            destinationTokenAccount,
            recipientPubKey,
            tokenMintPubkey,
            TOKEN_PROGRAM_ID
          );
          transaction.add(createATAInstruction);
        }

        const tokenSupply = await connection.getTokenSupply(tokenMintPubkey);
        const decimals = tokenSupply.value.decimals;
        const lamports = Math.round(amountValue * Math.pow(10, decimals));

        const transferInstruction = createTransferInstruction(
          sourceTokenAccount,
          destinationTokenAccount,
          publicKey,
          lamports,
          [],
          TOKEN_PROGRAM_ID
        );
        transaction.add(transferInstruction);
      } else {
        // Chuyển SOL
        const lamports = amountValue * web3.LAMPORTS_PER_SOL;
        const sendSolInstruction = web3.SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubKey,
          lamports,
        });
        transaction.add(sendSolInstruction);
      }

      const signature = await sendTransaction(transaction, connection);
      setStatus("Confirming transaction...");

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
      setTransactionLink(explorerUrl);
      setStatus("Transaction successful!");
    } catch (error) {
      console.error("Transaction failed:", error);
      setStatus(`Transaction failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className={styles.AppBody}>
      {/* Hiển thị số dư */}
      {publicKey && (
        <div>
          <h3>Wallet Balance</h3>
          <p>SOL: {solBalance} SOL</p>
          <h4>Token Balances:</h4>
          {tokenBalances.length > 0 ? (
            <ul>
              {tokenBalances.map((token) => (
                <li key={token.mint}>
                  {token.mint}: {token.amount} tokens
                </li>
              ))}
            </ul>
          ) : (
            <p>No SPL tokens found.</p>
          )}
        </div>
      )}

      {/* Form gửi SOL hoặc token */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <p>Amount to send:</p>
        <input
          type="text"
          value={amount}
          onChange={handleAmountChange}
          placeholder="Enter amount"
          className={`${styles.input} ${styles.formField}`}
        />
        <br />
        <p>Send to:</p>
        <input
          type="text"
          value={recipient}
          onChange={handleRecipientChange}
          placeholder="Enter recipient address"
          className={`${styles.input} ${styles.formField}`}
        />
        <br />
        <p>Token Mint (leave blank for SOL):</p>
        <input
          type="text"
          value={tokenMint}
          onChange={handleTokenMintChange}
          placeholder="Enter token mint address (optional)"
          className={`${styles.input} ${styles.formField}`}
        />
        <br />
        {transactionLink && (
          <a
            href={transactionLink}
            target="_blank"
            className={styles.transactionLink}
          >
            Check transaction at Solana Explorer
          </a>
        )}
        {status && <p>{status}</p>}
        <br />
        <button type="submit" className={`${styles.input} ${styles.formField}`}>
          Send
        </button>
      </form>
    </div>
  );
};
