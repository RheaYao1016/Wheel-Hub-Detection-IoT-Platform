import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  return NextResponse.json({
    data: [
      {
        id: "job-001",
        baseModel: "yolov10m.pt",
        preset: "yolov10-balanced",
        deviceMode: "cuda:0",
        epochCount: 30,
        status: "completed",
        progress: 100,
        artifacts: ["best.pt", "last.pt", "training_mode.txt", "confusion_matrix.png", "results.csv"],
        metrics: [
          { epoch: 1, map50: 0.72, loss: 1.84 },
          { epoch: 5, map50: 0.81, loss: 1.12 },
          { epoch: 10, map50: 0.87, loss: 0.76 },
          { epoch: 15, map50: 0.91, loss: 0.54 },
          { epoch: 20, map50: 0.93, loss: 0.41 },
          { epoch: 25, map50: 0.94, loss: 0.35 },
          { epoch: 30, map50: 0.952, loss: 0.31 },
        ],
        createdAt: new Date(now.getTime() - 172800000).toISOString(),
        updatedAt: new Date(now.getTime() - 86400000).toISOString(),
      },
      {
        id: "job-002",
        baseModel: "yolov10s.pt",
        preset: "quick-inspection",
        deviceMode: "cuda:0",
        epochCount: 20,
        status: "running",
        progress: 65,
        artifacts: ["last.pt"],
        metrics: [
          { epoch: 1, map50: 0.65, loss: 2.01 },
          { epoch: 5, map50: 0.74, loss: 1.45 },
          { epoch: 10, map50: 0.82, loss: 0.98 },
          { epoch: 13, map50: 0.85, loss: 0.82 },
        ],
        createdAt: new Date(now.getTime() - 7200000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "job-003",
        baseModel: "yolov8n.pt",
        preset: "cpu-safe-demo",
        deviceMode: "cpu",
        epochCount: 10,
        status: "completed",
        progress: 100,
        artifacts: ["best.pt", "last.pt", "training_mode.txt"],
        metrics: [
          { epoch: 1, map50: 0.58, loss: 2.34 },
          { epoch: 5, map50: 0.69, loss: 1.67 },
          { epoch: 10, map50: 0.76, loss: 1.21 },
        ],
        createdAt: new Date(now.getTime() - 604800000).toISOString(),
        updatedAt: new Date(now.getTime() - 518400000).toISOString(),
      },
      {
        id: "job-004",
        baseModel: "yolo11n.pt",
        preset: "yolov10-balanced",
        deviceMode: "auto",
        epochCount: 50,
        status: "stopped",
        progress: 40,
        artifacts: ["last.pt"],
        metrics: [
          { epoch: 1, map50: 0.61, loss: 2.18 },
          { epoch: 5, map50: 0.71, loss: 1.56 },
          { epoch: 10, map50: 0.78, loss: 1.12 },
          { epoch: 15, map50: 0.80, loss: 0.98 },
          { epoch: 20, map50: 0.82, loss: 0.87 },
        ],
        createdAt: new Date(now.getTime() - 259200000).toISOString(),
        updatedAt: new Date(now.getTime() - 172800000).toISOString(),
      },
    ],
  });
}
