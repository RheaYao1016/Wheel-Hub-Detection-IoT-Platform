/**
 * 导入初始示例数据到数据库
 * 运行: npx tsx scripts/import-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("开始导入数据...");

  // 导入轮毂检测记录
  const wheels = [
    { wheelNumber: "202503110001", diameter: 650, averageBolt: 48, center: 80, pcd: 280, type: "合格" },
    { wheelNumber: "202503110002", diameter: 650, averageBolt: 48, center: 80, pcd: 280, type: "合格" },
    { wheelNumber: "202503110003", diameter: 650, averageBolt: 48, center: 80, pcd: 280, type: "合格" },
    { wheelNumber: "202503110004", diameter: 650, averageBolt: 48, center: 80, pcd: 280, type: "合格" },
    { wheelNumber: "202503110005", diameter: 650, averageBolt: 48, center: 80, pcd: 280, type: "合格" },
    { wheelNumber: "202503110006", diameter: 650, averageBolt: 48, center: 80, pcd: 280, type: "合格" },
    { wheelNumber: "202503110007", diameter: 650, averageBolt: 48, center: 80, pcd: 280, type: "不合格" },
    { wheelNumber: "202503110008", diameter: 650, averageBolt: 48, center: 80, pcd: 280, type: "合格" },
    { wheelNumber: "202503110009", diameter: 650, averageBolt: 48, center: 80, pcd: 280, type: "合格" },
    { wheelNumber: "202503110010", diameter: 650, averageBolt: 48, center: 80, pcd: 280, type: "合格" },
  ];

  for (const wheel of wheels) {
    try {
      await prisma.wheel.upsert({
        where: { wheelNumber: wheel.wheelNumber },
        update: wheel,
        create: wheel,
      });
      console.log(`✓ 导入轮毂: ${wheel.wheelNumber}`);
    } catch (error) {
      console.error(`✗ 导入失败: ${wheel.wheelNumber}`, error);
    }
  }

  // 导入设备状态
  const devices = [
    { deviceName: "传送机构", status: "运行中", runningTime: 600 },
    { deviceName: "中心夹具", status: "运行中", runningTime: 500 },
    { deviceName: "侧面夹具", status: "运行中", runningTime: 614 },
    { deviceName: "检测机构", status: "运行中", runningTime: 442 },
  ];

  for (const device of devices) {
    try {
      await prisma.deviceStatus.upsert({
        where: { deviceName: device.deviceName },
        update: device,
        create: device,
      });
      console.log(`✓ 导入设备: ${device.deviceName}`);
    } catch (error) {
      console.error(`✗ 导入失败: ${device.deviceName}`, error);
    }
  }

  console.log("\n✅ 数据导入完成！");
}

main()
  .catch((e) => {
    console.error("导入出错:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

