/**
 * PWA 注册工具函数
 * 负责 Service Worker 的注册、更新检测、以及安装提示事件管理
 */

/**
 * 检查当前浏览器是否支持 Service Worker
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * 检查当前浏览器是否支持 PWA 安装
 */
export function isInstallable(): boolean {
  return 'BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window;
}

/**
 * 注册 Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.log('[PWA] Service Worker not supported');
    return null;
  }

  try {
    // 确保使用绝对路径
    const swUrl = '/sw.js';
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
      updateViaCache: 'none',
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // 检测更新
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        console.log('[PWA] New Service Worker state:', newWorker.state);

        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 有新版本已安装，通知用户刷新
          dispatchUpdateEvent({
            type: 'sw-updated',
            skipWaiting: () => {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            },
          });
        }
      });
    });

    // 检测 Service Worker 控制状态
    if (registration.active) {
      console.log('[PWA] Service Worker is active');
    }

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * 取消注册 Service Worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) return false;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
    console.log('[PWA] All service workers unregistered');
    return true;
  } catch (error) {
    console.error('[PWA] Failed to unregister service workers:', error);
    return false;
  }
}

/**
 * 安装提示事件管理
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installPromptListeners: ((showPrompt: () => void) => void)[] = [];

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * 设置安装提示事件监听
 */
export function setupInstallPrompt(
  onReady: (showPrompt: () => void) => void
): void {
  if (typeof window === 'undefined') return;

  // 存储回调
  installPromptListeners.push(onReady);

  // 如果已有延迟的事件，立即触发
  if (deferredPrompt) {
    const showPrompt = () => {
      deferredPrompt?.prompt();
      deferredPrompt?.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
        } else {
          console.log('[PWA] User dismissed the install prompt');
        }
        deferredPrompt = null;
      });
    };
    onReady(showPrompt);
  }

  // 监听 beforeinstallprompt 事件
  window.addEventListener(
    'beforeinstallprompt',
    (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      console.log('[PWA] beforeinstallprompt event received');

      // 通知所有监听器
      installPromptListeners.forEach((listener) => {
        const showPrompt = () => {
          deferredPrompt?.prompt();
          deferredPrompt?.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('[PWA] User accepted the install prompt');
            } else {
              console.log('[PWA] User dismissed the install prompt');
            }
            deferredPrompt = null;
          });
        };
        listener(showPrompt);
      });
    },
    { once: false }
  );

  // 监听 appinstalled 事件
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
  });
}

/**
 * 显示安装提示（从外部调用）
 */
export function showInstallPrompt(): boolean {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }
      deferredPrompt = null;
    });
    return true;
  }
  return false;
}

/**
 * 清除缓存
 */
export async function clearSWCache(): Promise<void> {
  if (!isServiceWorkerSupported()) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    if (registration.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
    }
  }
}

/**
 * 获取缓存状态
 */
export function getSWCacheStatus(
  callback: (status: Array<{ name: string; size: number }>) => void
): void {
  if (!isServiceWorkerSupported()) return;

  const messageHandler = (event: MessageEvent) => {
    if (event.data?.type === 'CACHE_STATUS') {
      callback(event.data.status);
      navigator.serviceWorker.removeEventListener('message', messageHandler);
    }
  };

  navigator.serviceWorker.addEventListener('message', messageHandler);

  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      if (registration.active) {
        registration.active.postMessage({ type: 'GET_CACHE_STATUS' });
      }
    });
  });
}

/**
 * 检查当前是否处于离线状态
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * 监听在线/离线状态变化
 */
export function onOnlineStatusChange(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * 请求后台同步
 * 当网络恢复时，Service Worker 会自动同步待处理数据
 */
export async function requestBackgroundSync(tag: string): Promise<boolean> {
  if (!isServiceWorkerSupported()) return false;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if ('sync' in registration) {
        await (registration as any).sync.register(tag);
        console.log('[PWA] Background sync registered:', tag);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('[PWA] Background sync registration failed:', error);
    return false;
  }
}

/**
 * 发送自定义消息到 Service Worker
 */
export function sendToSW(message: Record<string, unknown>): void {
  if (!isServiceWorkerSupported()) return;

  navigator.serviceWorker.ready.then((registration) => {
    if (registration.active) {
      registration.active.postMessage(message);
    }
  });
}

/**
 * 派发 SW 更新事件
 */
function dispatchUpdateEvent(detail: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('sw-update', {
      detail,
    })
  );
}
