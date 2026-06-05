package com.rheayao.wheelhub.cache;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.RedisServerCommands;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Unified Redis cache operations service providing get/set/delete/stats
 * with graceful fallback when Redis is unavailable.
 */
@Service
public class RedisCacheService {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheService.class);

    private static final String KEY_PREFIX = "wheel-hub:";

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Tracks whether Redis is reachable. Falls back to in-memory cache if unreachable.
     */
    private volatile boolean redisAvailable = true;

    /**
     * In-memory fallback cache for resilience.
     */
    private final Map<String, FallbackEntry> fallbackCache = new ConcurrentHashMap<>();

    public RedisCacheService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
        // Test Redis connectivity on startup
        try {
            redisTemplate.opsForValue().get("__health_check__");
            redisAvailable = true;
            log.info("Redis cache service initialized successfully");
        } catch (Exception e) {
            redisAvailable = false;
            log.warn("Redis unavailable, using in-memory fallback cache: {}", e.getMessage());
        }
    }

    // ======================== Basic Operations ========================

    /**
     * Get a cached value by key.
     */
    @SuppressWarnings("unchecked")
    public <T> Optional<T> get(String key, Class<T> clazz) {
        String fullKey = KEY_PREFIX + key;

        if (redisAvailable) {
            try {
                Object value = redisTemplate.opsForValue().get(fullKey);
                if (value != null) {
                    return Optional.of(clazz.cast(value));
                }
            } catch (Exception e) {
                log.warn("Redis get failed for key '{}', falling back: {}", fullKey, e.getMessage());
                setRedisAvailable(false);
            }
        }

        // Fallback to in-memory cache
        FallbackEntry entry = fallbackCache.get(fullKey);
        if (entry != null && !entry.isExpired()) {
            return Optional.of(clazz.cast(entry.value()));
        }
        return Optional.empty();
    }

    /**
     * Set a value with the default TTL (5 minutes).
     */
    public void set(String key, Object value) {
        set(key, value, Duration.ofMinutes(5));
    }

    /**
     * Set a value with a custom TTL.
     */
    public void set(String key, Object value, Duration ttl) {
        String fullKey = KEY_PREFIX + key;

        if (redisAvailable) {
            try {
                redisTemplate.opsForValue().set(fullKey, value, ttl);
                return;
            } catch (Exception e) {
                log.warn("Redis set failed for key '{}', falling back: {}", fullKey, e.getMessage());
                setRedisAvailable(false);
            }
        }

        // Fallback to in-memory cache
        fallbackCache.put(fullKey, new FallbackEntry(value, ttl));
    }

    /**
     * Delete a key from cache.
     */
    public boolean delete(String key) {
        String fullKey = KEY_PREFIX + key;

        boolean redisDeleted = false;
        if (redisAvailable) {
            try {
                redisDeleted = Boolean.TRUE.equals(redisTemplate.delete(fullKey));
            } catch (Exception e) {
                log.warn("Redis delete failed for key '{}': {}", fullKey, e.getMessage());
            }
        }

        fallbackCache.remove(fullKey);
        return redisDeleted;
    }

    /**
     * Check if a key exists in cache.
     */
    public boolean hasKey(String key) {
        String fullKey = KEY_PREFIX + key;

        if (redisAvailable) {
            try {
                return Boolean.TRUE.equals(redisTemplate.hasKey(fullKey));
            } catch (Exception e) {
                log.warn("Redis hasKey failed for key '{}': {}", fullKey, e.getMessage());
            }
        }

        FallbackEntry entry = fallbackCache.get(fullKey);
        return entry != null && !entry.isExpired();
    }

    /**
     * Set TTL for an existing key.
     */
    public boolean expire(String key, Duration ttl) {
        String fullKey = KEY_PREFIX + key;

        if (redisAvailable) {
            try {
                return Boolean.TRUE.equals(redisTemplate.expire(fullKey, ttl));
            } catch (Exception e) {
                log.warn("Redis expire failed for key '{}': {}", fullKey, e.getMessage());
            }
        }

        FallbackEntry entry = fallbackCache.get(fullKey);
        if (entry != null) {
            fallbackCache.put(fullKey, new FallbackEntry(entry.value(), ttl));
            return true;
        }
        return false;
    }

    // ======================== Batch Operations ========================

    /**
     * Delete multiple keys matching a pattern (supports glob patterns like 'dashboard:*').
     */
    public long deleteByPattern(String pattern) {
        String fullPattern = KEY_PREFIX + pattern;
        long count = 0;

        if (redisAvailable) {
            try {
                Set<String> keys = redisTemplate.keys(fullPattern);
                if (keys != null && !keys.isEmpty()) {
                    Long deleted = redisTemplate.delete(keys);
                    count = deleted != null ? deleted : 0;
                }
            } catch (Exception e) {
                log.warn("Redis deleteByPattern failed for pattern '{}': {}", fullPattern, e.getMessage());
            }
        }

        // Also clean up fallback cache
        List<String> fallbackKeys = fallbackCache.keySet().stream()
                .filter(k -> matchesPattern(k, fullPattern))
                .collect(Collectors.toList());
        fallbackKeys.forEach(fallbackCache::remove);
        count += fallbackKeys.size();

        log.info("Deleted {} cache entries matching pattern '{}'", count, pattern);
        return count;
    }

    /**
     * Get all keys matching a pattern.
     */
    public Set<String> keys(String pattern) {
        String fullPattern = KEY_PREFIX + pattern;

        if (redisAvailable) {
            try {
                Set<String> keys = redisTemplate.keys(fullPattern);
                if (keys != null) {
                    return keys.stream()
                            .map(k -> k.substring(KEY_PREFIX.length()))
                            .collect(Collectors.toSet());
                }
            } catch (Exception e) {
                log.warn("Redis keys failed for pattern '{}': {}", fullPattern, e.getMessage());
            }
        }

        return fallbackCache.keySet().stream()
                .filter(k -> matchesPattern(k, fullPattern))
                .map(k -> k.substring(KEY_PREFIX.length()))
                .collect(Collectors.toSet());
    }

    // ======================== Cache Statistics ========================

    /**
     * Get cache statistics including size, memory info, and hit rate estimates.
     */
    public CacheStats getStats() {
        CacheStats stats = new CacheStats();
        stats.setRedisAvailable(redisAvailable);

        if (redisAvailable) {
            try {
                // Get total key count
                Long dbSize = redisTemplate.execute((RedisCallback<Long>) RedisServerCommands::dbSize);
                stats.setKeyCount(dbSize != null ? dbSize : 0);

                // Get Redis info
                Properties info = redisTemplate.execute((RedisCallback<Properties>) RedisServerCommands::info);
                if (info != null) {
                    stats.setUsedMemoryHuman(info.getProperty("used_memory_human", "N/A"));
                    stats.setConnectedClients(info.getProperty("connected_clients", "N/A"));
                    stats.setUptimeInSeconds(info.getProperty("uptime_in_seconds", "N/A"));
                    stats.setKeyspaceHits(info.getProperty("keyspace_hits", "0"));
                    stats.setKeyspaceMisses(info.getProperty("keyspace_misses", "0"));

                    // Calculate hit rate
                    long hits = Long.parseLong(stats.getKeyspaceHits());
                    long misses = Long.parseLong(stats.getKeyspaceMisses());
                    long total = hits + misses;
                    if (total > 0) {
                        stats.setHitRate(String.format("%.2f%%", (hits * 100.0) / total));
                    } else {
                        stats.setHitRate("N/A");
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to get Redis stats: {}", e.getMessage());
                stats.setRedisAvailable(false);
            }
        }

        stats.setFallbackCacheSize(fallbackCache.size());
        return stats;
    }

    /**
     * Get memory usage info.
     */
    public String getMemoryInfo() {
        if (redisAvailable) {
            try {
                Properties info = redisTemplate.execute((RedisCallback<Properties>) RedisServerCommands::info);
                if (info != null) {
                    return String.format(
                            "Used Memory: %s, Peak Memory: %s, Frag Ratio: %s",
                            info.getProperty("used_memory_human", "N/A"),
                            info.getProperty("used_memory_peak_human", "N/A"),
                            info.getProperty("mem_fragmentation_ratio", "N/A")
                    );
                }
            } catch (Exception e) {
                log.warn("Failed to get memory info: {}", e.getMessage());
            }
        }
        return "Redis unavailable";
    }

    // ======================== Admin Operations ========================

    /**
     * Flush all cache entries (dangerous - use with caution).
     */
    public void flushAll() {
        if (redisAvailable) {
            try {
                // Only flush wheel-hub prefixed keys
                Set<String> keys = redisTemplate.keys(KEY_PREFIX + "*");
                if (keys != null && !keys.isEmpty()) {
                    redisTemplate.delete(keys);
                    log.info("Flushed all wheel-hub cache entries ({} keys)", keys.size());
                }
            } catch (Exception e) {
                log.error("Failed to flush all cache: {}", e.getMessage());
            }
        }
        fallbackCache.clear();
    }

    /**
     * Ping Redis to check connectivity.
     */
    public boolean ping() {
        try {
            String result = redisTemplate.getConnectionFactory()
                    .getConnection().ping();
            return "PONG".equals(result);
        } catch (Exception e) {
            log.warn("Redis ping failed: {}", e.getMessage());
            return false;
        }
    }

    // ======================== Internal Methods ========================

    private void setRedisAvailable(boolean available) {
        if (this.redisAvailable != available) {
            this.redisAvailable = available;
            log.info("Redis availability changed to: {}", available);
        }
    }

    private boolean matchesPattern(String key, String pattern) {
        // Simple glob matching: replace * with regex .*
        String regex = pattern.replace("*", ".*");
        return key.matches(regex);
    }

    // ======================== Inner Classes ========================

    /**
     * In-memory fallback cache entry with expiration.
     */
    private record FallbackEntry(Object value, Duration ttl, long createdAt) {
        FallbackEntry(Object value, Duration ttl) {
            this(value, ttl, System.currentTimeMillis());
        }

        boolean isExpired() {
            return System.currentTimeMillis() - createdAt > ttl.toMillis();
        }
    }

    /**
     * Cache statistics DTO.
     */
    public static class CacheStats {
        private boolean redisAvailable;
        private long keyCount;
        private int fallbackCacheSize;
        private String usedMemoryHuman;
        private String connectedClients;
        private String uptimeInSeconds;
        private String keyspaceHits;
        private String keyspaceMisses;
        private String hitRate;

        public boolean isRedisAvailable() {
            return redisAvailable;
        }

        public void setRedisAvailable(boolean redisAvailable) {
            this.redisAvailable = redisAvailable;
        }

        public long getKeyCount() {
            return keyCount;
        }

        public void setKeyCount(long keyCount) {
            this.keyCount = keyCount;
        }

        public int getFallbackCacheSize() {
            return fallbackCacheSize;
        }

        public void setFallbackCacheSize(int fallbackCacheSize) {
            this.fallbackCacheSize = fallbackCacheSize;
        }

        public String getUsedMemoryHuman() {
            return usedMemoryHuman;
        }

        public void setUsedMemoryHuman(String usedMemoryHuman) {
            this.usedMemoryHuman = usedMemoryHuman;
        }

        public String getConnectedClients() {
            return connectedClients;
        }

        public void setConnectedClients(String connectedClients) {
            this.connectedClients = connectedClients;
        }

        public String getUptimeInSeconds() {
            return uptimeInSeconds;
        }

        public void setUptimeInSeconds(String uptimeInSeconds) {
            this.uptimeInSeconds = uptimeInSeconds;
        }

        public String getKeyspaceHits() {
            return keyspaceHits;
        }

        public void setKeyspaceHits(String keyspaceHits) {
            this.keyspaceHits = keyspaceHits;
        }

        public String getKeyspaceMisses() {
            return keyspaceMisses;
        }

        public void setKeyspaceMisses(String keyspaceMisses) {
            this.keyspaceMisses = keyspaceMisses;
        }

        public String getHitRate() {
            return hitRate;
        }

        public void setHitRate(String hitRate) {
            this.hitRate = hitRate;
        }
    }
}
