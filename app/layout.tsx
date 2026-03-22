import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Layout/Header";
import Footer from "./components/Layout/Footer";

export const metadata: Metadata = {
  title: "轮毂检测数字孪生平台",
  description: "面向工业检测、数字孪生、实时监控与运营驾驶舱的一体化轮毂检测平台",
  keywords: ["轮毂检测", "工业物联网", "数字孪生", "实时监控", "可视化平台", "Prisma", "Next.js"],
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
