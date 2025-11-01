"use client";

import { useEffect, useRef, useState } from "react";

export default function CameraFeed() {
  const videoRefs = [
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
  ];
  const [streams, setStreams] = useState<MediaStream[]>([]);

  useEffect(() => {
    const startButton = document.getElementById("svli");
    if (!startButton) return;

    const handleStart = async () => {
      try {
        // 请求摄像头权限（注意：浏览器只允许一个流，这里演示如何处理多个视频元素）
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        // 为所有视频元素分配相同的流（实际应用中，每个视频应该对应不同的摄像头）
        videoRefs.forEach((videoRef) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        });

        setStreams([stream]);
      } catch (error) {
        console.error("获取摄像头权限失败:", error);
        alert("无法访问摄像头，请检查浏览器权限设置");
      }
    };

    startButton.addEventListener("click", handleStart);

    return () => {
      startButton.removeEventListener("click", handleStart);
      // 清理流
      streams.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
    };
  }, [streams]);

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {[1, 2, 3, 4].map((index) => (
        <div key={index} className="bg-black/50 rounded overflow-hidden">
          <video
            ref={videoRefs[index - 1]}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}

