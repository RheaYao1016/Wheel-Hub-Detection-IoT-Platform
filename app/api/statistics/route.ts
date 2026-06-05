import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverCache, CacheKeys, CacheTTL } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

// GET: 获取总体统计数据
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // "overview" | "size-dist" | "model-dist" | "quality" | "daily" | "devices"

    switch (type) {
      case "overview":
        return await getOverviewStats();
      case "size-dist":
        return await getSizeDistribution();
      case "model-dist":
        return await getModelDistribution();
      case "quality":
        return await getQualityStats();
      case "daily":
        return await getDailyStats();
      case "devices":
        return await getDeviceStats();
      default:
        return NextResponse.json(
          { error: "无效的统计类型" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json(
      { error: "获取统计数据失败" },
      { status: 500 }
    );
  }
}

// 总体统计（总数、已检测、未检测、完成率）
// 优化: 使用缓存避免频繁查询，单次查询获取所有需要的数据
async function getOverviewStats() {
  // 尝试从缓存获取
  const cached = serverCache.get(CacheKeys.STATS_OVERVIEW);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 优化: 使用单次聚合查询替代多次count查询
  // 原代码: 3次独立count查询 (N+1问题)
  // 优化后: 1次groupBy查询获取所有统计
  const stats = await prisma.wheel.groupBy({
    by: ["type"],
    _count: {
      type: true,
    },
  });

  // 从分组结果中计算各项统计
  let qualifiedCount = 0;
  let unqualifiedCount = 0;
  
  for (const stat of stats) {
    if (stat.type === "合格") {
      qualifiedCount = stat._count.type;
    } else if (stat.type === "不合格") {
      unqualifiedCount = stat._count.type;
    }
  }

  const testedCount = qualifiedCount + unqualifiedCount;
  const totalCountResult = await prisma.wheel.count();
  const untestedCount = totalCountResult - testedCount;
  const completionRate = totalCountResult > 0 ? (testedCount / totalCountResult) * 100 : 0;

  const result = {
    totalCount: totalCountResult,
    testedCount,
    untestedCount,
    completionRate: Math.round(completionRate * 100) / 100,
  };

  // 缓存结果
  serverCache.set(CacheKeys.STATS_OVERVIEW, result, CacheTTL.MEDIUM);

  return NextResponse.json(result);
}

// 尺寸分类统计
// 优化: 一次性获取所有数据，在内存中分组，避免5次独立查询
async function getSizeDistribution() {
  // 尝试从缓存获取
  const cached = serverCache.get(CacheKeys.STATS_SIZE_DIST);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 优化: 一次性获取所有轮毂的直径数据，在内存中分组
  // 原代码: 5次独立count查询
  // 优化后: 1次查询获取所有直径，内存分组
  const wheels = await prisma.wheel.findMany({
    select: {
      diameter: true,
    },
  });

  const sizeRanges = {
    "15寸": { min: 0, max: 400 },
    "16寸": { min: 400, max: 450 },
    "17寸": { min: 450, max: 500 },
    "18寸": { min: 500, max: 550 },
    "19寸": { min: 550, max: 1000 },
  };

  const distribution = Object.entries(sizeRanges).map(([size, { min, max }]) => ({
    size,
    count: wheels.filter(w => w.diameter >= min && w.diameter < max).length,
  }));

  // 缓存结果
  serverCache.set(CacheKeys.STATS_SIZE_DIST, distribution, CacheTTL.MEDIUM);

  return NextResponse.json(distribution);
}

// 型号分类统计（简化：基于PCD分组）
// 优化: 一次性获取所有数据，在内存中分组
async function getModelDistribution() {
  // 尝试从缓存获取
  const cached = serverCache.get(CacheKeys.STATS_MODEL_DIST);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 优化: 一次性获取所有轮毂的PCD数据，在内存中分组
  // 原代码: 5次独立count查询
  // 优化后: 1次查询获取所有PCD，内存分组
  const wheels = await prisma.wheel.findMany({
    select: {
      pcd: true,
    },
  });

  const pcdRanges = {
    "型号一": { min: 0, max: 200 },
    "型号二": { min: 200, max: 250 },
    "型号三": { min: 250, max: 300 },
    "型号四": { min: 300, max: 350 },
    "型号五": { min: 350, max: 1000 },
  };

  const distribution = Object.entries(pcdRanges).map(([model, { min, max }]) => ({
    model,
    count: wheels.filter(w => w.pcd >= min && w.pcd < max).length,
  }));

  // 缓存结果
  serverCache.set(CacheKeys.STATS_MODEL_DIST, distribution, CacheTTL.MEDIUM);

  return NextResponse.json(distribution);
}

// 合格/不合格统计
// 优化: 使用单次聚合查询
async function getQualityStats() {
  // 尝试从缓存获取
  const cached = serverCache.get(CacheKeys.STATS_QUALITY);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 优化: 使用groupBy一次查询获取所有类型统计
  // 原代码: 2次独立count查询
  // 优化后: 1次groupBy查询
  const stats = await prisma.wheel.groupBy({
    by: ["type"],
    _count: {
      type: true,
    },
  });

  let qualified = 0;
  let unqualified = 0;

  for (const stat of stats) {
    if (stat.type === "合格") {
      qualified = stat._count.type;
    } else if (stat.type === "不合格") {
      unqualified = stat._count.type;
    }
  }

  const result = { qualified, unqualified };

  // 缓存结果
  serverCache.set(CacheKeys.STATS_QUALITY, result, CacheTTL.MEDIUM);

  return NextResponse.json(result);
}

// 每日检测数量（最近24小时）
// 优化: 使用范围查询一次性获取数据，在内存中分组
async function getDailyStats() {
  // 尝试从缓存获取
  const cached = serverCache.get(CacheKeys.STATS_DAILY);
  if (cached) {
    return NextResponse.json(cached);
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now);
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  // 优化: 一次性获取最近24小时的所有记录
  // 原代码: 24次独立count查询 (严重的N+1问题)
  // 优化后: 1次范围查询，内存分组
  const wheels = await prisma.wheel.findMany({
    select: {
      createdAt: true,
    },
    where: {
      createdAt: {
        gte: twentyFourHoursAgo,
      },
    },
  });

  // 在内存中按小时分组统计
  const hourlyCounts = new Map<number, number>();
  
  // 初始化24个小时的计数
  for (let i = 0; i < 24; i++) {
    const hour = new Date(now);
    hour.setHours(now.getHours() - (23 - i));
    hourlyCounts.set(hour.getHours(), 0);
  }

  // 统计每个小时的记录数
  for (const wheel of wheels) {
    const hour = wheel.createdAt.getHours();
    hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
  }

  // 构建结果数组
  const stats = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now);
    hour.setHours(now.getHours() - (23 - i));
    return {
      time: `${hour.getHours()}时`,
      count: hourlyCounts.get(hour.getHours()) || 0,
    };
  });

  // 缓存结果（较短时间，因为数据变化较快）
  serverCache.set(CacheKeys.STATS_DAILY, stats, CacheTTL.SHORT);

  return NextResponse.json(stats);
}

// 设备运行状态
// 优化: 添加缓存，设备状态变化不频繁
async function getDeviceStats() {
  // 尝试从缓存获取
  const cached = serverCache.get(CacheKeys.STATS_DEVICES);
  if (cached) {
    return NextResponse.json(cached);
  }

  const devices = await prisma.deviceStatus.findMany({
    orderBy: { deviceName: "asc" },
  });

  // 如果数据库为空，返回默认数据
  const result = devices.length === 0
    ? [
        { deviceName: "传送机构", status: "运行中", runningTime: 600 },
        { deviceName: "中心夹具", status: "运行中", runningTime: 500 },
        { deviceName: "侧面夹具", status: "运行中", runningTime: 614 },
        { deviceName: "检测机构", status: "运行中", runningTime: 442 },
      ]
    : devices;

  // 缓存结果（设备状态变化较慢）
  serverCache.set(CacheKeys.STATS_DEVICES, result, CacheTTL.DEVICE);

  return NextResponse.json(result);
}
