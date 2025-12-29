import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Optimized font loading with next/font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TaxReadyWallet - Crypto taxes, refined.",
    template: "%s | TaxReadyWallet",
  },
  description: "Complex data made simple. Repair your crypto CSV files for any tax platform. Fix broken CSV imports in 30 seconds with our intelligent parsing engine.",
  keywords: ["crypto tax", "CSV repair", "tax software", "cryptocurrency", "tax filing", "TurboTax", "tax platform", "crypto accounting"],
  authors: [{ name: "TaxReadyWallet" }],
  creator: "TaxReadyWallet",
  publisher: "TaxReadyWallet",
  metadataBase: new URL("https://taxreadywallet.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://taxreadywallet.com",
    title: "TaxReadyWallet - Crypto taxes, refined.",
    description: "Complex data made simple. Repair your crypto CSV files for any tax platform. Fix broken CSV imports in 30 seconds.",
    siteName: "TaxReadyWallet",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TaxReadyWallet - Crypto Tax CSV Repair Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TaxReadyWallet - Crypto taxes, refined.",
    description: "Fix your crypto CSV files for any tax platform in 30 seconds.",
    images: ["/og-image.png"],
    creator: "@taxreadywallet",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a365d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
