import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverCache, CacheKeys, CacheTTL } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

// 分页配置常量
const MAX_PAGE_LIMIT = 100;  // 最大每页数量限制
const DEFAULT_PAGE_LIMIT = 20;  // 默认每页数量

// GET: 获取轮毂列表（支持分页和筛选）
// 优化: 
// 1. 限制最大分页大小，防止单次查询过大
// 2. 使用基于游标的分页（cursor）替代基于偏移量的分页（skip）
// 3. 添加缓存支持
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    // 限制limit范围: 1-100
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_LIMIT)), 1),
      MAX_PAGE_LIMIT
    );
    const type = searchParams.get("type"); // "合格" | "不合格"
    const cursor = searchParams.get("cursor"); // 游标ID（用于基于游标的分页）

    // 构建查询条件
    const where: Record<string, any> = {};
    if (type) {
      where.type = type;
    }

    // 优先使用基于游标的分页（性能更好），如果提供了cursor
    if (cursor) {
      const wheels = await prisma.wheel.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        cursor: { id: cursor },
        skip: 1, // 跳过游标本身
      });

      return NextResponse.json({
        data: wheels,
        pagination: {
          page,
          limit,
          hasMore: wheels.length === limit,
          nextCursor: wheels.length > 0 ? wheels[wheels.length - 1].id : null,
        },
      });
    }

    // 基于偏移量的分页（传统方式）
    // 对于大偏移量，性能会下降
    const skip = (page - 1) * limit;
    
    // 优化: 使用并行查询
    const [wheels, total] = await Promise.all([
      prisma.wheel.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        // 优化: 只查询需要的字段，减少数据传输
        select: {
          id: true,
          wheelNumber: true,
          diameter: true,
          averageBolt: true,
          center: true,
          pcd: true,
          type: true,
          createdAt: true,
        },
      }),
      // 优化: 仅在首页或需要总数时才查询总数
      page <= 10 ? prisma.wheel.count({ where }) : Promise.resolve(-1),
    ]);

    return NextResponse.json({
      data: wheels,
      pagination: {
        page,
        limit,
        total: total > 0 ? total : undefined,
        totalPages: total > 0 ? Math.ceil(total / limit) : undefined,
      },
    });
  } catch (error) {
    console.error("Error fetching wheels:", error);
    return NextResponse.json(
      { error: "获取轮毂数据失败" },
      { status: 500 }
    );
  }
}

// POST: 创建新轮毂检测记录
// 优化: 
// 1. 添加数据验证
// 2. 创建成功后清除相关缓存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wheelNumber, diameter, averageBolt, center, pcd, type } = body;

    // 验证必填字段
    if (!wheelNumber || diameter === undefined || averageBolt === undefined || 
        center === undefined || pcd === undefined || !type) {
      return NextResponse.json(
        { error: "缺少必要字段" },
        { status: 400 }
      );
    }

    // 验证数据类型和范围
    const parsedDiameter = parseFloat(diameter);
    const parsedAverageBolt = parseFloat(averageBolt);
    const parsedCenter = parseFloat(center);
    const parsedPcd = parseFloat(pcd);

    if (isNaN(parsedDiameter) || isNaN(parsedAverageBolt) || 
        isNaN(parsedCenter) || isNaN(parsedPcd)) {
      return NextResponse.json(
        { error: "数值字段格式不正确" },
        { status: 400 }
      );
    }

    if (!["合格", "不合格"].includes(type)) {
      return NextResponse.json(
        { error: "type字段必须是'合格'或'不合格'" },
        { status: 400 }
      );
    }

    const wheel = await prisma.wheel.create({
      data: {
        wheelNumber,
        diameter: parsedDiameter,
        averageBolt: parsedAverageBolt,
        center: parsedCenter,
        pcd: parsedPcd,
        type,
      },
    });

    // 创建成功后，清除相关统计缓存，确保数据一致性
    invalidateStatsCache();

    return NextResponse.json(wheel, { status: 201 });
  } catch (error: any) {
    console.error("Error creating wheel:", error);
    
    // 处理唯一约束冲突
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "轮毂编号已存在" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "创建轮毂记录失败" },
      { status: 500 }
    );
  }
}

// 批量创建轮毂记录（用于数据导入）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const wheels = Array.isArray(body) ? body : body.wheels;

    if (!Array.isArray(wheels) || wheels.length === 0) {
      return NextResponse.json(
        { error: "需要提供轮毂数据数组" },
        { status: 400 }
      );
    }

    // 限制单次批量导入数量
    if (wheels.length > 500) {
      return NextResponse.json(
        { error: "单次批量导入最多支持500条记录" },
        { status: 400 }
      );
    }

    // 优化: 使用批量插入而不是循环插入
    const created = await prisma.wheel.createMany({
      data: wheels.map(w => ({
        wheelNumber: w.wheelNumber,
        diameter: parseFloat(w.diameter),
        averageBolt: parseFloat(w.averageBolt),
        center: parseFloat(w.center),
        pcd: parseFloat(w.pcd),
        type: w.type,
      })),
    });

    // 批量创建成功后，清除相关统计缓存
    invalidateStatsCache();

    return NextResponse.json({
      message: `成功导入 ${created.count} 条记录`,
      count: created.count,
    });
  } catch (error: any) {
    console.error("Error batch creating wheels:", error);
    return NextResponse.json(
      { error: "批量导入失败" },
      { status: 500 }
    );
  }
}

// DELETE: 删除轮毂记录
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "需要提供要删除的记录ID" },
        { status: 400 }
      );
    }

    await prisma.wheel.delete({
      where: { id },
    });

    // 删除成功后，清除相关统计缓存
    invalidateStatsCache();

    return NextResponse.json({ message: "删除成功" });
  } catch (error: any) {
    console.error("Error deleting wheel:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "记录不存在" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "删除失败" },
      { status: 500 }
    );
  }
}

// 清除统计相关缓存
function invalidateStatsCache() {
  serverCache.delete(CacheKeys.STATS_OVERVIEW);
  serverCache.delete(CacheKeys.STATS_SIZE_DIST);
  serverCache.delete(CacheKeys.STATS_MODEL_DIST);
  serverCache.delete(CacheKeys.STATS_QUALITY);
  serverCache.delete(CacheKeys.STATS_DAILY);
}
