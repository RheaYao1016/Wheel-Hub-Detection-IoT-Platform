import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Layout/Header";
import Footer from "./components/Layout/Footer";
import ViewportProvider from "./components/Layout/ViewportProvider";
import ThemeProvider from "./components/Theme/ThemeProvider";
import PageTransitionShell from "./components/Layout/PageTransitionShell";
import LocaleProvider from "./components/Locale/LocaleProvider";
import { TooltipProvider } from "./components/ui/Tooltip";
import ShowcaseDock from "./components/Layout/ShowcaseDock";

export const metadata: Metadata = {
  title: "Industrial Surface Defect Detection System",
  description:
    "Enterprise platform for industrial surface defect detection, digital twin operations, AI analysis, reporting, and training workflows.",
  keywords: [
    "surface defect detection",
    "industrial inspection",
    "digital twin",
    "AI analysis",
    "YOLO training",
    "enterprise platform",
    "Next.js",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="industrial-night" suppressHydrationWarning>
      <body
        className="app-body flex min-h-screen flex-col text-[var(--text-primary)] antialiased"
        suppressHydrationWarning
      >
        <ViewportProvider>
          <ThemeProvider>
            <LocaleProvider>
              <TooltipProvider delayDuration={200}>
                <Header />
                <ShowcaseDock />
                <main className="app-main flex-1 pb-6 pt-4">
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
