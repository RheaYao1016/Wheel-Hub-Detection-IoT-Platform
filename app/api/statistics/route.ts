import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
async function getOverviewStats() {
  const totalCount = await prisma.wheel.count();
  const testedCount = await prisma.wheel.count({
    where: { type: { in: ["合格", "不合格"] } },
  });
  const untestedCount = totalCount - testedCount;
  const completionRate = totalCount > 0 ? (testedCount / totalCount) * 100 : 0;

  return NextResponse.json({
    totalCount,
    testedCount,
    untestedCount,
    completionRate: Math.round(completionRate * 100) / 100,
  });
}

// 尺寸分类统计
async function getSizeDistribution() {
  // 基于直径范围分组统计
  const sizes = ["15寸", "16寸", "17寸", "18寸", "19寸"];
  const sizeRanges = {
    "15寸": { min: 0, max: 400 },
    "16寸": { min: 400, max: 450 },
    "17寸": { min: 450, max: 500 },
    "18寸": { min: 500, max: 550 },
    "19寸": { min: 550, max: 1000 },
  };

  const distribution = await Promise.all(
    sizes.map(async (size) => {
      const { min, max } = sizeRanges[size as keyof typeof sizeRanges];
      const count = await prisma.wheel.count({
        where: {
          diameter: {
            gte: min,
            lt: max,
          },
        },
      });
      return { size, count };
    })
  );

  return NextResponse.json(distribution);
}

// 型号分类统计（简化：基于PCD分组）
async function getModelDistribution() {
  // 按PCD分组统计（简化处理）
  const models = ["型号一", "型号二", "型号三", "型号四", "型号五"];
  const pcdRanges = {
    "型号一": { min: 0, max: 200 },
    "型号二": { min: 200, max: 250 },
    "型号三": { min: 250, max: 300 },
    "型号四": { min: 300, max: 350 },
    "型号五": { min: 350, max: 1000 },
  };

  const distribution = await Promise.all(
    models.map(async (model) => {
      const { min, max } = pcdRanges[model as keyof typeof pcdRanges];
      const count = await prisma.wheel.count({
        where: {
          pcd: {
            gte: min,
            lt: max,
          },
        },
      });
      return { model, count };
    })
  );

  return NextResponse.json(distribution);
}

// 合格/不合格统计
async function getQualityStats() {
  const qualified = await prisma.wheel.count({ where: { type: "合格" } });
  const unqualified = await prisma.wheel.count({ where: { type: "不合格" } });

  return NextResponse.json({
    qualified,
    unqualified,
  });
}

// 每日检测数量（最近24小时）
async function getDailyStats() {
  const now = new Date();
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now);
    hour.setHours(now.getHours() - (23 - i));
    return hour;
  });

  const stats = await Promise.all(
    hours.map(async (hour) => {
      const nextHour = new Date(hour);
      nextHour.setHours(nextHour.getHours() + 1);
      
      const count = await prisma.wheel.count({
        where: {
          createdAt: {
            gte: hour,
            lt: nextHour,
          },
        },
      });

      return {
        time: `${hour.getHours()}时`,
        count,
      };
    })
  );

  return NextResponse.json(stats);
}

// 设备运行状态
async function getDeviceStats() {
  const devices = await prisma.deviceStatus.findMany({
    orderBy: { deviceName: "asc" },
  });

  // 如果数据库为空，返回默认数据
  if (devices.length === 0) {
    const defaultDevices = [
      { deviceName: "传送机构", status: "运行中", runningTime: 600 },
      { deviceName: "中心夹具", status: "运行中", runningTime: 500 },
      { deviceName: "侧面夹具", status: "运行中", runningTime: 614 },
      { deviceName: "检测机构", status: "运行中", runningTime: 442 },
    ];
    return NextResponse.json(defaultDevices);
  }

  return NextResponse.json(devices);
}

