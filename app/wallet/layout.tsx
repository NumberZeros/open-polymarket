import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet - Manage Your Funds",
  description: "Set up your trading wallet, view balances, and manage your crypto funds on BetHub prediction markets platform.",
  openGraph: {
    title: "Wallet | BetHub",
    description: "Manage your trading wallet and funds",
    url: "https://polymarket.thosoft.xyz/wallet",
  },
};

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
