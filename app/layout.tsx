import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hong Leong Pay | Product Lab",
  description: "An explainable cashflow underwriting and installment checkout research prototype.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
