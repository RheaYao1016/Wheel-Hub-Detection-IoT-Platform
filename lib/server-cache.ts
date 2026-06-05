/**
 * 服务端查询缓存模块
 * 用于缓存高频数据库查询结果，减少数据库压力
 * 适用于统计类、配置类等变化不频繁的数据
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  createdAt: number;
};

class ServerCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存数据
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * 设置缓存数据
   * @param ttlMs - 缓存有效期（毫秒），默认5分钟
   */
  set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    });
  }

  /**
   * 删除指定缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期缓存
   */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// 全局单例缓存实例
export const serverCache = new ServerCache(100);

// 缓存键常量
export const CacheKeys = {
  STATS_OVERVIEW: "stats:overview",
  STATS_SIZE_DIST: "stats:size-distribution",
  STATS_MODEL_DIST: "stats:model-distribution",
  STATS_QUALITY: "stats:quality",
  STATS_DAILY: "stats:daily",
  STATS_DEVICES: "stats:devices",
  WHEELS_LIST: "wheels:list",
  PLATFORM_DATA: "platform:data",
};

// 缓存TTL配置（毫秒）
export const CacheTTL = {
  SHORT: 2 * 60 * 1000,      // 2分钟 - 高频变化数据
  MEDIUM: 5 * 60 * 1000,     // 5分钟 - 一般统计数据
  LONG: 15 * 60 * 1000,      // 15分钟 - 低频变化数据
  DEVICE: 1 * 60 * 1000,     // 1分钟 - 设备状态（需要更实时）
};
