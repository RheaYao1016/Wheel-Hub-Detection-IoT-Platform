"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface ModelViewerProps {
  /** Model file path (default: /models/1.glb) */
  modelPath?: string;
  /** Environment map path (default: /models/20.hdr) */
  envPath?: string;
  /** Camera initial position */
  cameraPosition?: [number, number, number];
  /** Enable auto-rotation */
  autoRotate?: boolean;
  /** Auto-rotation speed */
  autoRotateSpeed?: number;
}

export default function ModelViewer({
  modelPath = "/models/1.glb",
  envPath = "/models/20.hdr",
  cameraPosition = [3.92, 0.5, 2.5],
  autoRotate = false,
  autoRotateSpeed = 2,
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const isMountedRef = useRef(true);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const cleanup = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    // Dispose controls
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }

    // Remove renderer DOM element
    if (rendererRef.current && containerRef.current) {
      const element = rendererRef.current.domElement;
      if (element.parentNode === containerRef.current) {
        containerRef.current.removeChild(element);
      }
    }

    // Dispose renderer
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }

    // Dispose scene and all its resources
    if (sceneRef.current) {
      sceneRef.current.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
      sceneRef.current = null;
    }

    // Clear references
    cameraRef.current = null;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!containerRef.current) return;

    setLoadError(null);
    setIsLoading(true);
    setLoadProgress(0);

    // Initialize scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Initialize camera
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100000);
    camera.position.set(...cameraPosition);
    cameraRef.current = camera;

    // Initialize renderer with performance optimizations
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace as any;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "Interactive 3D model viewer");
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lights - optimized for performance
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Add fill light
    const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.4);
    fillLight.position.set(-3, 2, -3);
    scene.add(fillLight);

    // Add hemisphere light for natural lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    scene.add(hemiLight);

    // Load environment map
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      envPath,
      (texture) => {
        if (!isMountedRef.current) return;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
      },
      undefined,
      (envError) => {
        // Continue without environment map - non-critical
        console.debug("[ModelViewer] Environment map not loaded, continuing without it");
      }
    );

    // Load GLB model with Draco compression
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(
      modelPath,
      (gltf) => {
        if (!isMountedRef.current) return;

        const model = gltf.scene;

        // Enable shadows for model
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Center and scale model if needed
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 10) {
          const scale = 5 / maxDim;
          model.scale.setScalar(scale);
        }
        model.position.sub(center.multiplyScalar(0.5));

        scene.add(model);
        setIsLoading(false);
      },
      (progress) => {
        if (!isMountedRef.current) return;
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setLoadProgress(percent);
        }
      },
      (error) => {
        if (!isMountedRef.current) return;
        console.error("[ModelViewer] Model load failed:", error);
        setLoadError("3D 模型加载失败");
        setIsLoading(false);
      }
    );

    // Add orbit controls with improved UX
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.maxPolarAngle = Math.PI;
    controls.minDistance = 1;
    controls.maxDistance = 20;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = autoRotateSpeed;
    controls.enablePan = true;
    controls.panSpeed = 0.5;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.2;
    controls.update();
    controlsRef.current = controls;

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Responsive resize handler with ResizeObserver (more accurate than window resize)
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(containerRef.current);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      cleanup();
    };
  }, [modelPath, envPath, cameraPosition, autoRotate, autoRotateSpeed, cleanup]);

  // Error state
  if (loadError) {
    return (
      <div className="model-viewer-error">
        <div className="model-viewer-error-icon">3D</div>
        <p>{loadError}</p>
        <button
          type="button"
          className="model-viewer-retry-button"
          onClick={() => {
            setLoadError(null);
            setIsLoading(true);
            setLoadProgress(0);
            cleanup();
            // Trigger re-mount by forcing a small state change
            window.location.reload();
          }}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="model-viewer-container">
      <div ref={containerRef} className="model-viewer-canvas" />
      {isLoading && (
        <div className="model-viewer-loading" role="status" aria-live="polite">
          <div className="model-viewer-spinner" />
          <span>
            {loadProgress > 0
              ? `加载中... ${loadProgress}%`
              : "加载3D模型中..."}
          </span>
          {loadProgress > 0 && (
            <div className="model-viewer-progress-bar">
              <div
                className="model-viewer-progress-fill"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
