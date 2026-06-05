package com.rheayao.wheelhub.cache;

import com.rheayao.wheelhub.audit.AuditAction;
import com.rheayao.wheelhub.audit.ActionType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Cache management controller for monitoring and administering Redis cache.
 * Provides operations for cache statistics, key inspection, and cache clearing.
 */
@RestController
@RequestMapping("/api/cache")
@Tag(name = "Cache Management", description = "Redis 缓存管理接口：统计、清空、健康检查")
public class CacheController {

    private static final Logger log = LoggerFactory.getLogger(CacheController.class);

    private final RedisCacheService cacheService;

    public CacheController(RedisCacheService cacheService) {
        this.cacheService = cacheService;
    }

    @GetMapping("/stats")
    @Operation(summary = "获取缓存统计信息", description = "获取 Redis 缓存的统计信息，包括键数量、内存使用、命中率等")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "获取成功")
    })
    public ResponseEntity<Map<String, Object>> getStats() {
        RedisCacheService.CacheStats stats = cacheService.getStats();

        Map<String, Object> response = new HashMap<>();
        response.put("redisAvailable", stats.isRedisAvailable());
        response.put("keyCount", stats.getKeyCount());
        response.put("fallbackCacheSize", stats.getFallbackCacheSize());
        response.put("usedMemoryHuman", stats.getUsedMemoryHuman());
        response.put("connectedClients", stats.getConnectedClients());
        response.put("uptimeInSeconds", stats.getUptimeInSeconds());
        response.put("keyspaceHits", stats.getKeyspaceHits());
        response.put("keyspaceMisses", stats.getKeyspaceMisses());
        response.put("hitRate", stats.getHitRate());
        response.put("memoryInfo", cacheService.getMemoryInfo());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/keys")
    @Operation(summary = "查询缓存键", description = "获取匹配指定模式的缓存键列表，支持通配符 *")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "获取成功")
    })
    public ResponseEntity<Map<String, Object>> getKeys(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "*") String pattern) {
        Set<String> keys = cacheService.keys(pattern);

        Map<String, Object> response = new HashMap<>();
        response.put("pattern", pattern);
        response.put("count", keys.size());
        response.put("keys", keys);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/ping")
    @Operation(summary = "缓存健康检查", description = "检查 Redis 缓存服务是否正常运行")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "服务正常"),
            @ApiResponse(responseCode = "503", description = "服务不可用")
    })
    public ResponseEntity<Map<String, Object>> ping() {
        Map<String, Object> response = new HashMap<>();
        boolean isHealthy = cacheService.ping();
        response.put("status", isHealthy ? "UP" : "DOWN");
        response.put("redisAvailable", cacheService.getStats().isRedisAvailable());

        if (isHealthy) {
            return ResponseEntity.ok(response);
        } else {
            response.put("message", "Redis is not responding, using fallback cache");
            return ResponseEntity.status(503).body(response);
        }
    }

    @AuditAction(value = ActionType.CONFIG_CHANGE, module = "cache", description = "清空所有缓存", logParams = false)
    @DeleteMapping("/flush")
    @Operation(summary = "清空所有缓存", description = "清空所有 wheel-hub 前缀的缓存条目（危险操作，请谨慎使用）")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "清空成功")
    })
    public ResponseEntity<Map<String, Object>> flushAll() {
        log.warn("Cache flush all requested");
        cacheService.flushAll();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "All wheel-hub cache entries have been cleared");

        return ResponseEntity.ok(response);
    }

    @AuditAction(value = ActionType.CONFIG_CHANGE, module = "cache", description = "清空指定模式缓存", logParams = true)
    @DeleteMapping("/clear/{pattern}")
    @Operation(summary = "清空匹配模式的缓存", description = "清空匹配指定模式的缓存条目，支持通配符 *")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "清空成功")
    })
    public ResponseEntity<Map<String, Object>> clearByPattern(@PathVariable String pattern) {
        log.info("Cache clear requested for pattern: {}", pattern);
        long deletedCount = cacheService.deleteByPattern(pattern);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("pattern", pattern);
        response.put("deletedCount", deletedCount);
        response.put("message", "Deleted " + deletedCount + " cache entries matching pattern: " + pattern);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/key/{key}")
    @Operation(summary = "删除指定缓存键", description = "删除指定的缓存键")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "删除成功")
    })
    public ResponseEntity<Map<String, Object>> deleteKey(@PathVariable String key) {
        log.info("Cache delete requested for key: {}", key);
        boolean deleted = cacheService.delete(key);

        Map<String, Object> response = new HashMap<>();
        response.put("success", deleted);
        response.put("key", key);
        response.put("message", deleted ? "Key deleted successfully" : "Key not found");

        return ResponseEntity.ok(response);
    }
}
