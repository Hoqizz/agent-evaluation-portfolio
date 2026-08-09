import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "真实性与时效性 Badcase 自动评测｜案例作品集",
  description: "从线上 Badcase 出发，经事实级诊断、参考回复综合与分层事实映射，自动生成理想回复和加权评分标准。",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "真实性与时效性 Badcase 自动评测",
    description: "从事实诊断到加权评分标准",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "真实性与时效性 Badcase 自动评测",
    description: "从事实诊断到加权评分标准",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
