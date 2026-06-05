import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import FloatingAssistant from "./components/Assistant/FloatingAssistant";
import IndexFocusBeacon from "./components/Assistant/IndexFocusBeacon";
import ErrorLogViewer from "./components/ErrorBoundary/ErrorLogViewer";
import GlobalErrorHandler from "./components/ErrorBoundary/GlobalErrorHandler";
import Footer from "./components/Layout/Footer";
import Header from "./components/Layout/Header";
import MobileGestureProvider from "./components/Layout/MobileGestureProvider";
import PageTransitionShell from "./components/Layout/PageTransitionShell";
import ViewportProvider from "./components/Layout/ViewportProvider";
import LocaleProvider from "./components/Locale/LocaleProvider";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import ThemeProvider from "./components/Theme/ThemeProvider";
import { ProgressOverlayProvider } from "./components/ui/ProgressOverlay";
import { ToastProvider } from "./components/ui/Toast";
import { TooltipProvider } from "./components/ui/Tooltip";

export const metadata: Metadata = {
  title: "工业表面缺陷智能检测系统",
  description:
    "企业级工业表面缺陷检测平台，覆盖监控、数字孪生、AI 分析、报告和工作流。",
  keywords: [
    "表面缺陷检测",
    "工业检测",
    "数字孪生",
    "AI分析",
    "YOLO训练",
    "企业平台",
    "Next.js",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "工业检测",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/images/logo.png", sizes: "32x32" },
      { url: "/images/logo.png", sizes: "192x192" },
      { url: "/images/logo.png", sizes: "512x512" },
    ],
    apple: [{ url: "/images/logo.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0f14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
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
          <GlobalErrorHandler />
          <ThemeProvider>
            <LocaleProvider>
              <TooltipProvider delayDuration={200}>
                <ProgressOverlayProvider>
                  <ToastProvider>
                    <Header />
                    <MobileGestureProvider>
                      <main className="app-main flex-1 pb-6 pt-4">
                        <PageTransitionShell>{children}</PageTransitionShell>
                      </main>
                      <Footer />
                    </MobileGestureProvider>
                    <FloatingAssistant />
                    <Suspense fallback={null}>
                      <IndexFocusBeacon />
                    </Suspense>
                    <ServiceWorkerRegistration />
                    <PwaInstallPrompt />
                  </ToastProvider>
                </ProgressOverlayProvider>
              </TooltipProvider>
            </LocaleProvider>
          </ThemeProvider>
          <ErrorLogViewer />
        </ViewportProvider>
      </body>
    </html>
  );
}

