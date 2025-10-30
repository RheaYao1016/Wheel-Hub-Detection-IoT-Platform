import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Layout/Header";
import Footer from "./components/Layout/Footer";
import TabNavigator from "./components/Layout/TabNavigator";
export const metadata: Metadata = {
  title: "轮毂检测数字孪生平台",
  description: "前沿科技IoT数字孪生与监测平台",
  keywords: ["轮毂检测", "物联网", "数字孪生", "监控", "工业大屏"],
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#15253b] text-neutral-900 overflow-x-hidden">
        <Header />
        <TabNavigator />
        {children}
        <Footer />
      </body>
    </html>
  );
}

