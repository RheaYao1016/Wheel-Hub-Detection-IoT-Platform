import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Layout/Header";
import Footer from "./components/Layout/Footer";

export const metadata: Metadata = {
  title: "轮毂检测数字孪生平台",
  description: "前沿科技 IoT 轮毂检测与数字孪生可视化平台",
  keywords: ["轮毂检测", "物联网", "数字孪生", "实时监控", "工业大屏"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col text-[var(--text-primary)]">
        <Header />
        <main className="flex-1 pt-4 pb-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
