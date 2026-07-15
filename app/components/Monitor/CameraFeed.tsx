"use client";

import { useEffect, useRef, useState } from "react";

const CAMERA_COUNT = 4;

export default function CameraFeed() {
  const videoRefs = useRef<Array<HTMLVideoElement | null>>(
    Array.from({ length: CAMERA_COUNT }, () => null),
  );
  const streamsRef = useRef<MediaStream[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const startButton = document.getElementById("svli");
    if (!startButton) return;

    const handleStart = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRefs.current.forEach((videoRef) => {
          if (videoRef) {
            videoRef.srcObject = stream;
          }
        });
        streamsRef.current = [stream];
        setMessage("本机摄像头预览已启动。");
      } catch (error) {
        console.error("unable to get camera permission", error);
        setMessage("无法访问摄像头，请检查浏览器权限设置。");
      }
    };

    startButton.addEventListener("click", handleStart);

    return () => {
      startButton.removeEventListener("click", handleStart);
      streamsRef.current.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      streamsRef.current = [];
    };
  }, []);

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      {Array.from({ length: CAMERA_COUNT }, (_, index) => index + 1).map((index) => (
        <div key={index} className="overflow-hidden rounded bg-black/50">
          <video
            ref={(node) => {
              videoRefs.current[index - 1] = node;
            }}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-contain"
          />
        </div>
      ))}
      {message ? <div className="floating-toast success">{message}</div> : null}
    </div>
  );
}
