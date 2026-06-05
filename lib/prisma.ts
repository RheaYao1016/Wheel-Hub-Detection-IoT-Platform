import { PrismaClient } from "@prisma/client";

// 全局Prisma客户端实例（避免在开发环境重复创建）
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 数据库连接池优化配置
// Prisma使用连接池管理数据库连接，正确配置可以显著提升性能
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" 
      ? ["query", "error", "warn"] 
      : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// 优雅关闭数据库连接（用于测试和进程退出）
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

// 健康检查 - 验证数据库连接
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}

// 获取数据库连接池统计信息（仅用于调试）
export function getConnectionPoolStats() {
  // Prisma Client 不直接暴露连接池统计
  // 如果需要监控，可以在数据库端查询:
  // SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();
  return {
    note: "连接池统计需在数据库端查询",
    query: "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();",
  };
}
