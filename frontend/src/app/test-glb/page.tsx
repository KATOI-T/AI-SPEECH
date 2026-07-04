"use client";

import { useEffect, useRef, useState } from "react";

export default function TestGLBPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("初期化中...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;

    const init = async () => {
      try {
        setStatus("Three.js をインポート中...");

        const THREE = await import("three");
        const { GLTFLoader } = await import(
          "three/examples/jsm/loaders/GLTFLoader.js"
        );
        const { OrbitControls } = await import(
          "three/examples/jsm/controls/OrbitControls.js"
        );

        setStatus("シーンを作成中...");

        // シーン作成
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x374151);

        // カメラ作成
        const camera = new THREE.PerspectiveCamera(
          30,
          container.clientWidth / container.clientHeight,
          0.1,
          100
        );
        camera.position.set(0, 1.5, 3);

        // レンダラー作成
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1, 0);
        controls.update();

        // ライト
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 10, 7.5);
        scene.add(light);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        setStatus("GLBモデルを読み込み中...");

        // GLBモデル読み込み
        const loader = new GLTFLoader();
        loader.load(
          "/models/aro.glb",
          (gltf) => {
            console.log("GLB loaded:", gltf);
            scene.add(gltf.scene);
            setStatus("モデル読み込み完了！");
          },
          (xhr) => {
            const progress = (xhr.loaded / xhr.total) * 100;
            setStatus(`読み込み中... ${Math.round(progress)}%`);
          },
          (err) => {
            console.error("GLB load error:", err);
            setError(`モデル読み込みエラー: ${err}`);
          }
        );

        // アニメーションループ
        const animate = () => {
          animationFrameId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();
      } catch (err) {
        console.error("Error:", err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus("エラー発生");
      }
    };

    init();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <h1 className="text-2xl font-bold text-white mb-4">
        GLBモデル読み込みテスト
      </h1>

      <div className="mb-4 p-4 bg-gray-800 rounded-lg">
        <p className="text-white">ステータス: {status}</p>
        {error && <p className="text-red-500 mt-2">エラー: {error}</p>}
      </div>

      <div
        ref={containerRef}
        className="w-full h-[600px] bg-gray-700 rounded-lg overflow-hidden"
      />

      <div className="mt-4 text-gray-400 text-sm">
        <p>モデル: /models/aro.glb</p>
        <p>操作: マウスドラッグで回転、ホイールでズーム</p>
      </div>
    </div>
  );
}
