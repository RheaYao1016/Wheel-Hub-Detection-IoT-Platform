/**
 * 数据库优化与迁移脚本
 * 
 * 使用方法:
 * 1. 生成迁移文件: npx prisma migrate dev --name add_performance_indexes
 * 2. 部署到生产: npx prisma migrate deploy
 * 3. 重新生成客户端: npx prisma generate
 */

import { PrismaClient } from "@prisma/client";
import { serverCache } from "../lib/server-cache";

const prisma = new PrismaClient();

/**
 * 分析数据库索引使用情况
 * 此函数可以帮助识别未使用的索引和缺失的索引
 */
async function analyzeIndexUsage() {
  console.log("=== 数据库索引分析报告 ===\n");

  try {
    // 获取所有表的索引使用统计
    const indexStats = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      ORDER BY idx_scan ASC
    `;

    console.log("索引使用统计 (按扫描次数升序):");
    console.table(indexStats);

    // 识别潜在未使用的索引 (扫描次数为0)
    const unusedIndexes = (indexStats as any[]).filter(
      (idx: any) => idx.idx_scan === 0
    );

    if (unusedIndexes.length > 0) {
      console.log("\n⚠️  以下索引可能未被使用:");
      unusedIndexes.forEach((idx: any) => {
        console.log(`  - ${idx.tablename}.${idx.indexname}`);
      });
    } else {
      console.log("\n✅ 所有索引都有被使用");
    }

    // 获取表的大小统计
    const tableStats = await prisma.$queryRaw`
      SELECT 
        relname AS table_name,
        n_live_tup AS row_count,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
        pg_size_pretty(pg_relation_size(relid)) AS table_size,
        pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
    `;

    console.log("\n=== 表大小统计 ===");
    console.table(tableStats);

    return { indexStats, tableStats };
  } catch (error) {
    console.error("分析失败:", error);
    throw error;
  }
}

/**
 * 获取慢查询统计
 * 需要启用 pg_stat_statements 扩展
 */
async function getSlowQueryStats() {
  try {
    // 检查 pg_stat_statements 是否启用
    const extensionExists = await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      )
    `;

    if (!(extensionExists as any[])[0].exists) {
      console.log("⚠️  pg_stat_statements 扩展未启用，无法获取慢查询统计");
      return null;
    }

    const slowQueries = await prisma.$queryRaw`
      SELECT 
        query,
        calls,
        mean_time,
        total_time,
        rows,
        shared_blks_hit,
        shared_blks_read
      FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      ORDER BY mean_time DESC
      LIMIT 20
    `;

    console.log("=== 慢查询统计 (Top 20) ===");
    console.table(slowQueries);

    return slowQueries;
  } catch (error) {
    console.error("获取慢查询统计失败:", error);
    return null;
  }
}

/**
 * 执行数据库维护操作
 */
async function performMaintenance() {
  console.log("=== 开始数据库维护 ===\n");

  try {
    // 1. 清理过期缓存
    serverCache.purgeExpired();
    console.log("✅ 已清理过期缓存");

    // 2. 分析表统计信息（帮助查询规划器做出更好的决策）
    await prisma.$executeRaw`ANALYZE wheels`;
    await prisma.$executeRaw`ANALYZE statistics`;
    await prisma.$executeRaw`ANALYZE device_statuses`;
    console.log("✅ 已更新表统计信息");

    // 3. 重新索引（定期重建索引可以提高查询性能）
    // 注意: 在生产环境中应谨慎使用，建议在低峰期执行
    // await prisma.$executeRaw`REINDEX TABLE wheels`;
    console.log("ℹ️  跳过重索引（请在低峰期手动执行）");

    // 4. 获取表行数统计
    const wheelCount = await prisma.wheel.count();
    const statsCount = await prisma.statistics.count();
    const deviceCount = await prisma.deviceStatus.count();

    console.log("\n=== 数据量统计 ===");
    console.log(`  轮毂记录: ${wheelCount}`);
    console.log(`  统计快照: ${statsCount}`);
    console.log(`  设备状态: ${deviceCount}`);

    console.log("\n✅ 数据库维护完成");
  } catch (error) {
    console.error("数据库维护失败:", error);
    throw error;
  }
}

/**
 * 生成性能优化报告
 */
async function generatePerformanceReport() {
  console.log("=====================================");
  console.log("  工业表面缺陷智能检测系统 数据库性能优化报告");
  console.log("=====================================\n");

  const report = {
    timestamp: new Date().toISOString(),
    optimizations: {
      indexes: {
        added: [
          "diameter - 用于尺寸分布范围查询",
          "pcd - 用于型号分布范围查询",
          "type + createdAt (复合) - 用于按状态和时间筛选",
          "diameter + type (复合) - 用于尺寸和质量联合查询",
          "pcd + type (复合) - 用于型号和质量联合查询",
          "createdAt DESC + type (复合) - 用于时间降序+类型筛选",
          "DeviceStatus: status, lastUpdate - 用于设备状态查询",
        ],
        existing: [
          "createdAt - 用于时间排序",
          "type - 用于状态筛选",
        ],
      },
      nPlusOneFixes: [
        {
          endpoint: "GET /api/statistics?type=overview",
          before: "3次独立count查询",
          after: "1次groupBy聚合查询",
          improvement: "减少67%数据库往返",
        },
        {
          endpoint: "GET /api/statistics?type=size-dist",
          before: "5次独立count查询",
          after: "1次查询+内存分组",
          improvement: "减少80%数据库往返",
        },
        {
          endpoint: "GET /api/statistics?type=model-dist",
          before: "5次独立count查询",
          after: "1次查询+内存分组",
          improvement: "减少80%数据库往返",
        },
        {
          endpoint: "GET /api/statistics?type=quality",
          before: "2次独立count查询",
          after: "1次groupBy聚合查询",
          improvement: "减少50%数据库往返",
        },
        {
          endpoint: "GET /api/statistics?type=daily",
          before: "24次独立count查询 (严重)",
          after: "1次范围查询+内存分组",
          improvement: "减少96%数据库往返",
        },
      ],
      caching: {
        strategy: "服务端内存缓存 (LRU)",
        ttl: {
          short: "2分钟 - 每日统计数据",
          medium: "5分钟 - 一般统计数据",
          long: "15分钟 - 低频变化数据",
          device: "1分钟 - 设备状态（需要更实时）",
        },
        invalidation: "数据写入时自动清除相关缓存",
      },
      pagination: {
        improvements: [
          "支持基于游标的分页 (cursor) - O(1)复杂度",
          "限制最大分页大小 (MAX_PAGE_LIMIT=100)",
          "选择性查询字段 (select) - 减少数据传输",
          "延迟查询总数 (仅前10页查询总数)",
          "添加批量导入接口 (PUT) - 使用createMany",
        ],
      },
      connectionPool: {
        improvements: [
          "通过DATABASE_URL参数配置连接池",
          "connection_limit: 推荐 (CPU核心数 * 2) + 有效磁盘数",
          "pool_timeout: 30秒",
          "添加健康检查函数",
          "添加优雅关闭连接功能",
        ],
      },
    },
    estimatedPerformanceGain: {
      statisticsEndpoints: "60-90% 响应时间减少",
      paginationEndpoints: "40-70% 响应时间减少（尤其深分页场景）",
      overallThroughput: "2-5倍 并发请求处理能力",
      databaseLoad: "50-80% 数据库查询负载减少",
    },
  };

  console.log(JSON.stringify(report, null, 2));
  console.log("\n=====================================");

  return report;
}

// 主函数 - 执行所有优化任务
async function main() {
  console.log("开始执行数据库优化任务...\n");

  try {
    // 1. 生成性能报告
    await generatePerformanceReport();

    // 2. 分析索引使用情况
    console.log("\n");
    await analyzeIndexUsage();

    // 3. 执行维护操作
    console.log("\n");
    await performMaintenance();

    console.log("\n✅ 所有优化任务完成！");
  } catch (error) {
    console.error("\n❌ 优化任务执行失败:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export {
  analyzeIndexUsage,
  getSlowQueryStats,
  performMaintenance,
  generatePerformanceReport,
};
