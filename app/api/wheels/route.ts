import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 获取轮毂列表（支持分页和筛选）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type"); // "合格" | "不合格"
    const skip = (page - 1) * limit;

    const where = type ? { type } : {};

    const [wheels, total] = await Promise.all([
      prisma.wheel.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.wheel.count({ where }),
    ]);

    return NextResponse.json({
      data: wheels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    const wheel = await prisma.wheel.create({
      data: {
        wheelNumber,
        diameter: parseFloat(diameter),
        averageBolt: parseFloat(averageBolt),
        center: parseFloat(center),
        pcd: parseFloat(pcd),
        type,
      },
    });

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

