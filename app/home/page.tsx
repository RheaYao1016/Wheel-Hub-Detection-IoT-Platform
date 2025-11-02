"use client";

import { useEffect, useRef, useState } from "react";
import Card from "../components/Layout/Card";

const HERO_PARAGRAPHS = [
  "本项目面向轮毂尺寸与形状的在线自动化检测，设计一套多功能一体化装置与配套的视觉算法与可视化平台。我们先明确生产线上轮毂检测的标准流程，再为各功能模块设计对应的机构与动作；在多套可行方案中进行对比分析，择优确定最终机构方案。",
  "在机械侧，使用 SolidWorks 完成三维建模与关键参数确定，并选型驱动与执行单元；在算法侧，围绕尺寸识别开发处理流程，形成与不同检测模块相匹配的程序方案；在平台侧，构建 Web 可视化把检测过程与结果直观呈现，形成一套从机械到算法、从数据到可视化的完整闭环。"
];

const PURPOSE_COPY =
  "随着国内汽车保有量快速增长，制造端对效率与精度的要求持续提升。为满足国家安全标准，轮毂等关键零部件必须进行严格的尺寸与性能质量控制。轮毂直接影响车辆的转向、驱动与制动安全，也与轮胎寿命密切相关，因此几何尺寸精度成为检测重点。\n当前行业普遍存在以人工或单一参数检测为主的问题，难以兼顾效率、稳定性与一致性。我们提出基于机器视觉的轮毂尺寸形状一体化检测设备，以模块化机械与视觉算法协同，实现多尺寸、多姿态的统一检测流程，补齐工业场景的一体化空缺。";

const INNOVATION_POINTS = [
  {
    title: "单工位模块化",
    body: "对中、夹紧、旋转、翻转集成于单工位，节拍稳定、切换便捷；检测结果直达后台判定并联动流转。"
  },
  {
    title: "中心夹具模块",
    body: "升降 + 中心夹紧 + 旋转三机构协同，保证同轴度与圆跳动检测的稳定性与精度。"
  },
  {
    title: "侧面夹具模块",
    body: "伸出 / 夹紧 / 抬升 / 放回流程一体，采用滚珠丝杠与近似直线机构布局，节省空间并兼顾推力与成本。"
  },
  {
    title: "视觉尺寸检测",
    body: "灰度化 → 滤波 → 阈值 → 边缘与尺寸测量的处理链路，预留引入深度学习分割以提升复杂场景鲁棒性。"
  },
  {
    title: "可视化平台",
    body: "前端 HTML/CSS/JS 联动后端服务与 ECharts，在线呈现运行状态、检测数量、合格率与预警。"
  },
  {
    title: "PLC 控制方案",
    body: "S7-1200 协同触摸屏与传感执行单元，提供安全互锁与远程监控能力，确保装置运行的实时性与可重复性。"
  }
];

const FEATURE_IMAGES = [
  { src: "/images/bj-1.png", alt: "夹具模块" },
  { src: "/images/bj-2.png", alt: "通道测量" },
  { src: "/images/bj-3.png", alt: "视觉识别单元" },
  { src: "/images/bj-4.png", alt: "数据联动示意" }
];

export default function HomeIntro() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tryPlay = async () => {
      try {
        await video.play();
      } catch (error) {
        try {
          video.muted = true;
          await video.play();
        } catch (err) {
          console.warn("Video playback failed.", err);
        }
      }
    };
    tryPlay();
  }, []);

  const handleVideoError = () => {
    setMediaFailed(true);
  };

  const handleVideoLoadedData = () => {
    setMediaFailed(false);
  };

  return (
    <div className="page-shell pt-0 pb-10 space-y-6">
      <Card className="hero-grid">
        <div className="hero-media">
          {mediaFailed ? (
            <img src="/images/gongchang.png" alt="项目概览占位图" className="hero-fallback" />
          ) : (
            <video
              ref={videoRef}
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onError={handleVideoError}
              onLoadedData={handleVideoLoadedData}
            >
              <source src="/media/project_intro_placeholder.mp4" type="video/mp4" />
              您的浏览器不支持视频播放。
            </video>
          )}
        </div>
        <div className="hero-text">
          <h2>项目概览</h2>
          {HERO_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Card>

      <Card className="purpose two-col">
        <div>
          <h3>研究目的</h3>
          {PURPOSE_COPY.split("\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="purpose-media">
          <img src="/images/she_bei_jian_mo.png" alt="设备建模占位" />
        </div>
      </Card>

      <Card className="features">
        <div className="col-text">
          <h3>创新特色</h3>
          <ul className="bullets">
            {INNOVATION_POINTS.map((point) => (
              <li key={point.title}>
                <b>{point.title}：</b>
                <span>{point.body}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-imggrid">
          {FEATURE_IMAGES.map((img) => (
            <img key={img.src} src={img.src} alt={img.alt} />
          ))}
        </div>
      </Card>
    </div>
  );
}
