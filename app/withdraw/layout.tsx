import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Withdraw - Cash Out Your Funds",
  description: "Withdraw USDC.e from your proxy wallet to any Polygon address. Secure withdrawals with EIP-712 signatures.",
  openGraph: {
    title: "Withdraw | BetHub",
    description: "Withdraw your funds securely",
    url: "https://polymarket.thosoft.xyz/withdraw",
  },
};

export default function WithdrawLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
