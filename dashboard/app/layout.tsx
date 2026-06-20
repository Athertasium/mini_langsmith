import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body
        className="flex h-full"
        style={{
          background: "var(--background)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        <Sidebar />
        <main
          className="flex-1 min-w-0 overflow-y-auto"
          style={{ minHeight: "100svh" }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
