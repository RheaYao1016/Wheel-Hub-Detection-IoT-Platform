import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Layout/Header";
import Footer from "./components/Layout/Footer";
import ViewportProvider from "./components/Layout/ViewportProvider";
import ThemeProvider from "./components/Theme/ThemeProvider";
import PageTransitionShell from "./components/Layout/PageTransitionShell";
import LocaleProvider from "./components/Locale/LocaleProvider";
import { TooltipProvider } from "./components/ui/Tooltip";

export const metadata: Metadata = {
  title: "更精巧的工业表面缺陷智能检测系统",
  description: "Enterprise platform for industrial surface defect detection, digital twin operations, AI analysis, reporting, and training workflows.",
  keywords: ["surface defect detection", "industrial inspection", "digital twin", "AI analysis", "YOLO training", "enterprise platform", "Next.js"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="industrial-night" suppressHydrationWarning>
      <body className="app-body flex min-h-screen flex-col text-[var(--text-primary)] antialiased" suppressHydrationWarning>
        <ViewportProvider>
          <ThemeProvider>
            <LocaleProvider>
              <TooltipProvider delayDuration={200}>
                <Header />
                <main className="app-main flex-1 pt-4 pb-6">
                  <PageTransitionShell>{children}</PageTransitionShell>
                </main>
                <Footer />
              </TooltipProvider>
            </LocaleProvider>
          </ThemeProvider>
        </ViewportProvider>
      </body>
    </html>
  );
}
