'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, X, Zap, Shield, WifiOff, Wifi } from 'lucide-react';
import { showInstallPrompt, isOnline, onOnlineStatusChange } from '@/lib/pwa-utils';

/**
 * PWA 安装提示组件
 * 当用户满足安装条件时显示精美的安装提示横幅
 * 同时显示在线/离线状态指示器
 */
export default function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [online, setOnline] = useState(true);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  // 检测是否已安装（standalone 模式）
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsAppInstalled(isStandalone);

    if (isStandalone) {
      setShowInstallBanner(false);
      setShowPrompt(false);
    }
  }, []);

  // 监听在线/离线状态
  useEffect(() => {
    setOnline(isOnline());

    const cleanup = onOnlineStatusChange(
      () => {
        setOnline(true);
        setShowOfflineBanner(false);
      },
      () => {
        setOnline(false);
        setShowOfflineBanner(true);
        setTimeout(() => setShowOfflineBanner(false), 5000);
      }
    );

    return cleanup;
  }, []);

  // 设置安装提示监听
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // 如果已安装，不显示
      if (isAppInstalled) return;

      // 延迟显示，让用户先体验应用
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 5000);

      // 存储事件引用
      (window as any).__deferredPromptEvent = e;
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isAppInstalled]);

  const handleInstall = useCallback(async () => {
    const deferredEvent = (window as any).__deferredPromptEvent;
    if (!deferredEvent) return;

    deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] 用户同意安装');
      setShowInstallBanner(false);
    } else {
      console.log('[PWA] 用户拒绝安装');
      setShowPrompt(false);
      setTimeout(() => setShowPrompt(true), 30000); // 30秒后再次提示
    }

    (window as any).__deferredPromptEvent = null;
  }, []);

  const handleDismiss = useCallback(() => {
    setShowInstallBanner(false);
    setShowPrompt(false);
    // 存储已拒绝标记
    try {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    } catch {
      // ignore
    }
  }, []);

  // 检查是否之前已拒绝
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const hoursSinceDismissal = (Date.now() - dismissedTime) / (1000 * 60 * 60);
        if (hoursSinceDismissal < 24) {
          // 24小时内不再显示
          setShowPrompt(false);
          return;
        }
        // 超过24小时清除标记
        localStorage.removeItem('pwa-install-dismissed');
      }
    } catch {
      // ignore
    }

    setShowPrompt(true);
  }, []);

  // 已安装或非 PWA 环境不显示
  if (isAppInstalled) return null;
  if (!showPrompt && !showInstallBanner && !showOfflineBanner) return null;

  return (
    <>
      {/* 离线状态提示条 */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300">
          <div className="mx-auto max-w-3xl px-4 py-2 mt-2">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm text-red-300 backdrop-blur-xl">
              <WifiOff className="h-4 w-4" />
              <span>网络连接已断开，部分功能可能不可用</span>
            </div>
          </div>
        </div>
      )}

      {/* 网络恢复提示 */}
      {!online && showOfflineBanner === false && (
        <div className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300">
          <div className="mx-auto max-w-3xl px-4 py-2 mt-2">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 text-sm text-emerald-300 backdrop-blur-xl">
              <Wifi className="h-4 w-4" />
              <span>网络已恢复连接</span>
            </div>
          </div>
        </div>
      )}

      {/* PWA 安装提示横幅 */}
      {showInstallBanner && showPrompt && (
        <div className="fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2 animate-in slide-in-from-bottom duration-500 sm:bottom-6">
          <div className="w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-emerald-500/20 bg-[#141620]/95 p-4 shadow-2xl shadow-emerald-500/5 backdrop-blur-xl sm:p-5">
            {/* 关闭按钮 */}
            <button
              onClick={handleDismiss}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200"
              aria-label="关闭安装提示"
            >
              <X className="h-4 w-4" />
            </button>

            {/* 图标和标题 */}
            <div className="flex items-start gap-3 pr-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/20">
                <Download className="h-5 w-5 text-emerald-400" />
              </div>

              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-white">
                  安装轮毅检测平台
                </h3>
                <p className="mt-0.5 text-[13px] leading-relaxed text-gray-400">
                  将应用添加到主屏幕，获得原生应用般的体验。支持离线访问和即时通知。
                </p>

                {/* 特性标签 */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                    <Zap className="h-3 w-3" />
                    快速启动
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                    <Shield className="h-3 w-3" />
                    离线可用
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-400">
                    <WifiOff className="h-3 w-3" />
                    即时通知
                  </span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-[13px] font-semibold text-[#0d0f14] shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98]"
              >
                立即安装
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-[13px] font-medium text-gray-400 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-gray-300 active:scale-[0.98]"
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
