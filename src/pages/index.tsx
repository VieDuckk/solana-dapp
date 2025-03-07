import { NextPage } from "next";
import styles from "../styles/Home.module.css";
import { AppBar } from "@/components/AppBar";
import Head from "next/head";
import WalletContextProvider from "@/components/WalletContextProvider";
import { InputFormWallet } from "@/components/InputFormWallet";

const Home: NextPage = (props) => {
  return (
    <div className={styles.App}>
      <Head>
        <title>Solana dapp</title>
        <meta name="description" content="Wallet-Adapter Example" />
      </Head>
      <WalletContextProvider>
        <AppBar />
        <div className={styles.AppBody}>
          <InputFormWallet />
        </div>
      </WalletContextProvider>
    </div>
  );
};

export default Home;
