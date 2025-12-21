import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxReadyWallet - Crypto taxes, refined.",
  description: "Complex data made simple. Repair your crypto CSV files for any tax platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
