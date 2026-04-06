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
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const startButton = document.getElementById("svli");
    if (!startButton) return;

    const handleStart = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRefs.forEach((videoRef) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        });
        setStreams([stream]);
        setMessage("本机摄像头预览已启动。");
      } catch (error) {
        console.error("unable to get camera permission", error);
        setMessage("无法访问摄像头，请检查浏览器权限设置。");
      }
    };

    startButton.addEventListener("click", handleStart);

    return () => {
      startButton.removeEventListener("click", handleStart);
      streams.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
    };
  }, [streams, videoRefs]);

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((index) => (
        <div key={index} className="overflow-hidden rounded bg-black/50">
          <video ref={videoRefs[index - 1]} autoPlay playsInline muted className="h-full w-full object-contain" />
        </div>
      ))}
      {message ? <div className="floating-toast success">{message}</div> : null}
    </div>
  );
}
