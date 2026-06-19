import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tracer — LLM Observability",
  description: "Self-hosted LangChain trace dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <nav style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }} className="px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-sm tracking-wide" style={{ color: "var(--accent)" }}>⬡ Tracer</span>
          <Link href="/traces" className="text-sm transition-colors" style={{ color: "var(--text-secondary)" }}>
            Traces
          </Link>
          <Link href="/paths" className="text-sm transition-colors" style={{ color: "var(--text-secondary)" }}>
            Paths
          </Link>
          <Link href="/cost" className="text-sm transition-colors" style={{ color: "var(--text-secondary)" }}>
            Cost
          </Link>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
