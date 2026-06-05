'use client';

import { useEffect, useState } from 'react';
import { registerServiceWorker } from '@/lib/pwa-utils';

/**
 * Service Worker 注册组件
 * 在客户端挂载后自动注册 Service Worker
 */
export default function ServiceWorkerRegistration() {
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const registration = await registerServiceWorker();
        if (registration) {
          setRegistered(true);
        }
      } catch (err) {
        console.error('[PWA] Failed to register service worker:', err);
      }
    };

    // 延迟注册，避免影响首屏加载
    const timer = setTimeout(init, 1000);
    return () => clearTimeout(timer);
  }, []);

  // 这个组件不渲染任何内容，只在后台注册 SW
  return null;
}
