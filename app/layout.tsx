import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.GITHUB_PAGES === "true" ? "https://hoqizz.github.io/agent-evaluation-portfolio/" : "https://fact-aware-badcase-portfolio.zyzouye900770.chatgpt.site/"),
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
  return <html lang="zh-CN"><body>{children}</body></html>;
}
