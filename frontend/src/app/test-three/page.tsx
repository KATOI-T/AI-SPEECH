"use client";

import { useEffect, useRef, useState } from "react";

export default function TestThreePage() {
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

        // 動的インポート
        const THREE = await import("three");

        setStatus("シーンを作成中...");

        // シーン作成
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x374151);

        // カメラ作成
        const camera = new THREE.PerspectiveCamera(
          75,
          container.clientWidth / container.clientHeight,
          0.1,
          1000
        );
        camera.position.z = 5;

        // レンダラー作成
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        setStatus("テストキューブを作成中...");

        // テスト用のキューブ
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        // ライト
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        setStatus("レンダリング中...");

        // アニメーションループ
        const animate = () => {
          animationFrameId = requestAnimationFrame(animate);
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.01;
          renderer.render(scene, camera);
        };
        animate();

        setStatus("Three.js 動作確認完了！");
      } catch (err) {
        console.error("Three.js Error:", err);
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
        Three.js 動作確認テスト
      </h1>

      <div className="mb-4 p-4 bg-gray-800 rounded-lg">
        <p className="text-white">ステータス: {status}</p>
        {error && <p className="text-red-500 mt-2">エラー: {error}</p>}
      </div>

      <div
        ref={containerRef}
        className="w-full h-[500px] bg-gray-700 rounded-lg overflow-hidden"
      />

      <div className="mt-4 text-gray-400 text-sm">
        <p>緑色の回転するキューブが表示されれば、Three.js は正常に動作しています。</p>
      </div>
    </div>
  );
}
