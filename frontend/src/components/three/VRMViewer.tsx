/**
 * VRMViewer - 3Dモデル表示コンポーネント
 * F-001: 3Dモデル表示機能
 * F-002: リップシンク機能
 * F-003: アニメーション機能
 *
 * VRM/GLB両モデル対応
 */

"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import type * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { WebGLRenderer } from "three";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { AnimationConfig, AnimationState } from "@/types";
import type { AnimationClip } from "three";
import { AnimationController } from "@/lib/three/animation-controller";
import { useLipSync } from "@/hooks/useLipSync";
import type { Viseme } from "@/types/lipsync";

// デフォルト値を外部で定義して参照の安定性を確保
const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 1.2, 3];

export interface VRMViewerProps {
  /** モデルファイルパス */
  modelPath: string;
  /** モデル形式 */
  modelType: "vrm" | "glb";
  /** VRMAアニメーションファイルのパス（オプション、単一ファイル） */
  animationPath?: string;
  /** 状態ごとのVRMAアニメーションファイルパス（オプション） */
  animationPaths?: Partial<Record<AnimationState, string>>;
  /** 追加CSSクラス */
  className?: string;
  /** 背景色（HEX文字列） */
  backgroundColor?: string;
  /** 背景画像URL（署名付きURL） */
  backgroundImage?: string | null;
  /** カメラ初期位置 */
  cameraPosition?: [number, number, number];
  /** OrbitControls有効化 */
  enableControls?: boolean;
  /** アニメーション設定 */
  animationConfig?: AnimationConfig | null;
  /** 初期アニメーション状態 */
  initialAnimationState?: AnimationState;
  /** 現在のアニメーション状態（外部から制御） */
  animationState?: AnimationState;
  /**
   * 読み込み完了コールバック
   * @param scene モデルのシーン（THREE.Object3D）
   * @param vrm VRMインスタンス（VRMモデルの場合のみ）
   * @param animations アニメーションクリップ
   */
  onLoad?: (scene: THREE.Object3D | null, vrm: import("@pixiv/three-vrm").VRM | null, animations?: AnimationClip[]) => void;
  /** エラーコールバック */
  onError?: (error: Error) => void;
  /** アニメーション状態変更コールバック */
  onAnimationStateChange?: (state: AnimationState) => void;
  /** F-011-009: one-shot 特別動作終了コールバック（idle 復帰直前に呼ばれる） */
  onSpecialActionEnd?: (finishedState: AnimationState) => void;
  /** VRMインスタンス取得コールバック（F-002: リップシンク用） */
  onVRMLoaded?: (vrm: VRM) => void;
  /** リップシンク有効化（F-002） */
  enableLipSync?: boolean;
  /** 音声要素（F-002: リップシンク用） */
  audioElement?: HTMLAudioElement | null;
  /** Visemeデータ（F-002: リップシンク用） */
  visemes?: Viseme[];
}

/**
 * VRMViewer - VRM/GLBモデルを表示するコンポーネント
 */
export function VRMViewer({
  modelPath,
  modelType,
  animationPath,
  className,
  backgroundColor = "#374151",
  backgroundImage,
  cameraPosition,
  enableControls = true,
  animationConfig,
  initialAnimationState = "idle",
  animationState,
  animationPaths,
  onLoad,
  onError,
  onAnimationStateChange,
  onSpecialActionEnd,
  onVRMLoaded,
  enableLipSync = false,
  audioElement = null,
  visemes = [],
}: VRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const animationControllerRef = useRef<AnimationController | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [vrmInstance, setVrmInstance] = useState<VRM | null>(null);

  // コールバックをrefで保持して依存配列から除外（無限ループ防止）
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  const onSpecialActionEndRef = useRef(onSpecialActionEnd);
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    onSpecialActionEndRef.current = onSpecialActionEnd;
  }, [onSpecialActionEnd]);

  // 配列/オブジェクトの依存を安定化（無限ループ防止）
  const stableCameraPosition = useMemo(
    () => cameraPosition ?? DEFAULT_CAMERA_POSITION,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cameraPosition?.[0], cameraPosition?.[1], cameraPosition?.[2]]
  );
  const animationConfigKey = useMemo(
    () => (animationConfig ? JSON.stringify(animationConfig) : null),
    [animationConfig]
  );
  // animationConfigをrefで保持（useEffect内で参照）
  // レンダリング中にrefを更新してタイミング問題を回避
  const animationConfigRef = useRef(animationConfig);
  animationConfigRef.current = animationConfig;

  // animationPathsをrefで保持（VRMAファイルのロードに使用）
  const animationPathsRef = useRef(animationPaths);
  animationPathsRef.current = animationPaths;

  // 外部からのanimationState変更を監視
  useEffect(() => {
    if (animationState && animationControllerRef.current) {
      animationControllerRef.current.setState(animationState);
      onAnimationStateChange?.(animationState);
    }
  }, [animationState, onAnimationStateChange]);

  // 背景画像の動的切り替え（シーン再初期化なし）
  useEffect(() => {
    if (!sceneReady) return;
    if (!sceneRef.current) return;

    let cancelled = false;
    let blobUrl: string | null = null;

    if (!backgroundImage) {
      import("three").then((THREE) => {
        if (!cancelled && sceneRef.current) {
          const bgColor = parseInt(backgroundColor.replace("#", ""), 16);
          sceneRef.current.background = new THREE.Color(bgColor);
        }
      });
      return () => { cancelled = true; };
    }

    // fetch → blob URL → Image → Canvas → Texture（CORS完全回避）
    fetch(backgroundImage)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = blobUrl!;
        });
      })
      .then((img) => {
        if (cancelled || !sceneRef.current || !img) return;
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        return import("three").then((THREE) => {
          if (cancelled || !sceneRef.current) return;
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          sceneRef.current.background = texture;
        });
      })
      .catch((err) => {
        console.warn("Failed to load background image:", err);
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [backgroundImage, backgroundColor, sceneReady]);

  // F-002: リップシンク機能統合
  useLipSync({
    vrm: vrmInstance,
    audioElement,
    visemes,
    enabled: enableLipSync && modelType === "vrm",
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let renderer: WebGLRenderer | null = null;

    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setProgress(10);

        // 動的インポート
        const THREE = await import("three");
        const { GLTFLoader } = await import(
          "three/examples/jsm/loaders/GLTFLoader.js"
        );
        const { OrbitControls } = await import(
          "three/examples/jsm/controls/OrbitControls.js"
        );

        setProgress(20);

        // VRMの場合は追加インポート
        let VRMLoaderPlugin: typeof import("@pixiv/three-vrm").VRMLoaderPlugin | null = null;
        let VRMAnimationLoaderPlugin: typeof import("@pixiv/three-vrm-animation").VRMAnimationLoaderPlugin | null = null;
        let createVRMAnimationClip: typeof import("@pixiv/three-vrm-animation").createVRMAnimationClip | null = null;

        if (modelType === "vrm") {
          const vrmModule = await import("@pixiv/three-vrm");
          VRMLoaderPlugin = vrmModule.VRMLoaderPlugin;

          // VRMAアニメーション用のモジュールをインポート
          const vrmAnimModule = await import("@pixiv/three-vrm-animation");
          VRMAnimationLoaderPlugin = vrmAnimModule.VRMAnimationLoaderPlugin;
          createVRMAnimationClip = vrmAnimModule.createVRMAnimationClip;
        }

        setProgress(30);

        // コンテナサイズを取得
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

        // シーン作成
        const scene = new THREE.Scene();
        const bgColor = parseInt(backgroundColor.replace("#", ""), 16);
        scene.background = new THREE.Color(bgColor);
        sceneRef.current = scene;
        setSceneReady(true);

        // カメラ作成
        const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
        camera.position.set(...stableCameraPosition);

        // レンダラー作成
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // OrbitControls
        let controls: InstanceType<typeof OrbitControls> | null = null;
        if (enableControls) {
          controls = new OrbitControls(camera, renderer.domElement);
          controls.target.set(0, 1, 0);
          controls.enableDamping = true;
          controls.dampingFactor = 0.05;
          controls.update();
        }

        // ライト
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        setProgress(50);

        // モデル読み込み
        const loader = new GLTFLoader();
        if (modelType === "vrm" && VRMLoaderPlugin) {
          loader.register((parser) => new VRMLoaderPlugin(parser));
        }

        let vrm: import("@pixiv/three-vrm").VRM | null = null;

        // モデル読み込み
        const gltf = await new Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF>((resolve, reject) => {
          loader.load(
            modelPath,
            resolve,
            (xhr) => {
              if (xhr.lengthComputable) {
                const percent = 50 + (xhr.loaded / xhr.total) * 40;
                setProgress(Math.round(percent));
              }
            },
            (err) => {
              console.error("[VRMViewer] Model load error:", err);
              reject(new Error("モデルの読み込みに失敗しました"));
            }
          );
        });

        console.log("[VRMViewer] Model loaded:", gltf);
        // VRMモデルは-Z方向を向くため、カメラに向かせるようY軸180度回転
        if (modelType === "vrm") {
          gltf.scene.rotation.y = Math.PI;
        }
        scene.add(gltf.scene);

        // VRMの場合はVRMインスタンスを取得
        if (modelType === "vrm" && gltf.userData.vrm) {
          vrm = gltf.userData.vrm;
          setVrmInstance(vrm as VRM); // F-002: リップシンク用にVRMインスタンスを保存
          onVRMLoaded?.(vrm as VRM); // F-002: VRMインスタンスを親に通知

          // F-002: デバッグ - expressionManager の状態確認
          if ((vrm as VRM).expressionManager) {
            const expressions = (vrm as VRM).expressionManager!.expressions;
            console.log("[VRMViewer] ExpressionManager found");
            console.log("[VRMViewer] Available expressions:",
              expressions.map(e => e.expressionName)
            );
          } else {
            console.warn("[VRMViewer] No expressionManager found in VRM");
          }
        }

        // アニメーション対象のシーンを決定（VRMの場合はvrm.scene、GLBの場合はgltf.scene）
        const targetScene = vrm ? vrm.scene : gltf.scene;

        // アニメーションクリップを収集
        const allAnimations = [...gltf.animations];

        // VRMAファイルからアニメーションを読み込む（VRMモデルの場合のみ）
        if (vrm && VRMAnimationLoaderPlugin && createVRMAnimationClip) {
          setProgress(92);
          const animLoader = new GLTFLoader();
          animLoader.register((parser) => new VRMAnimationLoaderPlugin!(parser));

          // 状態ごとのVRMAファイルを読み込む（animationPathsが指定されている場合）
          // animationPathsRef.currentからファイルパスを取得（クロージャ問題を回避）
          const currentAnimPaths = animationPathsRef.current;
          if (currentAnimPaths && Object.keys(currentAnimPaths).length > 0) {
            // VRMAファイルパスごとに状態をグループ化（同じファイルを複数回読み込まない）
            const pathToStates = new Map<string, AnimationState[]>();
            for (const [stateName, vrmaPath] of Object.entries(currentAnimPaths)) {
              if (!vrmaPath) continue;
              const states = pathToStates.get(vrmaPath) || [];
              states.push(stateName as AnimationState);
              pathToStates.set(vrmaPath, states);
            }

            console.log("[VRMViewer] Loading", pathToStates.size, "unique VRMA files for", Object.keys(currentAnimPaths).length, "states");

            // 各VRMAファイルを1回だけ読み込み、複数の状態にクリップを作成
            for (const [vrmaPath, stateNames] of Array.from(pathToStates.entries())) {
              try {
                const vrmaGltf = await new Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF>((res, rej) => {
                  animLoader.load(vrmaPath, res, undefined, rej);
                });

                const vrmAnimations = vrmaGltf.userData.vrmAnimations;
                if (vrmAnimations && vrmAnimations.length > 0) {
                  // 各状態に対して同じアニメーションからクリップを作成
                  for (const stateName of stateNames) {
                    const clip = createVRMAnimationClip!(vrmAnimations[0], vrm as unknown as Parameters<typeof createVRMAnimationClip>[1]);
                    clip.name = stateName;
                    allAnimations.push(clip);
                  }
                  console.log("[VRMViewer] Loaded VRMA:", vrmaPath, "-> states:", stateNames.join(", "));
                }
              } catch (err) {
                console.warn("[VRMViewer] Failed to load VRMA:", vrmaPath, err);
              }
            }
          }
          // 単一のVRMAファイルを読み込む（animationPathが指定されている場合）
          else if (animationPath) {
            try {
              const vrmaGltf = await new Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF>((res, rej) => {
                animLoader.load(animationPath, res, undefined, rej);
              });

              const vrmAnimations = vrmaGltf.userData.vrmAnimations;
              if (vrmAnimations && Array.isArray(vrmAnimations)) {
                console.log("[VRMViewer] VRMA animations loaded:", vrmAnimations.length);
                const stateNames: AnimationState[] = ["idle", "greeting", "happy", "present", "shoot", "spin", "exercise"];

                for (let i = 0; i < vrmAnimations.length; i++) {
                  const vrmAnimation = vrmAnimations[i];

                  if (vrmAnimations.length === 1) {
                    // 1つのアニメーションを全ての状態にコピー
                    for (const stateName of stateNames) {
                      const clip = createVRMAnimationClip!(vrmAnimation, vrm as unknown as Parameters<typeof createVRMAnimationClip>[1]);
                      clip.name = stateName;
                      allAnimations.push(clip);
                      console.log("[VRMViewer] Created animation clip:", clip.name, "tracks:", clip.tracks.length);
                    }
                  } else {
                    const clip = createVRMAnimationClip!(vrmAnimation, vrm as unknown as Parameters<typeof createVRMAnimationClip>[1]);
                    clip.name = stateNames[i] || `animation_${i}`;
                    allAnimations.push(clip);
                    console.log("[VRMViewer] Created animation clip:", clip.name, "tracks:", clip.tracks.length);
                  }
                }
              }
            } catch (vrmaError) {
              console.warn("[VRMViewer] VRMA animation load failed:", vrmaError);
            }
          }
        }

        // VRMA で読み込めなかった状態をプロシージャルクリップで補完（一部は上書き）
        if (vrm) {
          const { generateProceduralClips, PROCEDURAL_OVERRIDE_STATES } = await import("@/lib/three/programmatic-animations");
          const proceduralClips = generateProceduralClips(vrm as VRM);
          for (const clip of proceduralClips) {
            const existingIdx = allAnimations.findIndex(c => c.name === clip.name);
            if (PROCEDURAL_OVERRIDE_STATES.has(clip.name)) {
              // 上書き対象: VRMAクリップを置き換え
              if (existingIdx >= 0) {
                allAnimations[existingIdx] = clip;
              } else {
                allAnimations.push(clip);
              }
            } else if (existingIdx < 0) {
              // フォールバック: VRMAが無い場合のみ追加
              allAnimations.push(clip);
            }
          }
        }

        // アニメーション初期化（VRM/GLB両対応）
        const currentAnimConfig = animationConfigRef.current;
        if (currentAnimConfig) {
          try {
            const animController = new AnimationController({
              defaultState: initialAnimationState,
              blendDuration: 0.3,
              // 全アニメーションをループ（v1 互換）。F-011-009 の特別動作は
              // hook 側 fire-and-forget 設計で phase/emotion 変化により上書きされる
              loopStates: [
                "idle", "greeting", "happy", "sad", "surprised",
                "angry", "thinking", "talking", "present", "shoot",
                "spin", "exercise"
              ],
              onOneShotFinished: (finishedState) => {
                onSpecialActionEndRef.current?.(finishedState);
              },
            });
            // VRM: THREE.Sceneをルートに使用（ノーマライズドボーンも検索範囲に含める）
            // GLB: targetScene（gltf.scene）をルートに使用
            const mixerRoot = vrm ? scene : targetScene;
            animController.initialize(mixerRoot, currentAnimConfig, allAnimations);
            animationControllerRef.current = animController;
            console.log("[VRMViewer] Animation initialized with", allAnimations.length, "clips");
          } catch (animError) {
            console.warn("[VRMViewer] Animation initialization failed:", animError);
          }
        }

        setProgress(100);
        setIsLoading(false);
        // scene, vrm, animationsを返す（VRM/GLB両対応）
        onLoadRef.current?.(targetScene, vrm, allAnimations);

        // アニメーションループ
        let lastTime = performance.now();
        const animate = () => {
          animationFrameId = requestAnimationFrame(animate);

          const now = performance.now();
          const delta = (now - lastTime) / 1000;
          lastTime = now;

          // AnimationControllerのupdate（ミキサーがボーン回転を設定）
          if (animationControllerRef.current) {
            animationControllerRef.current.update(delta);
          }

          // VRMのupdate（ノーマライズドボーン → ローボーンのコピー。ミキサーの後に実行する必要がある）
          if (vrm) {
            vrm.update(delta);
          }

          // OrbitControlsのupdate
          if (controls) {
            controls.update();
          }

          // レンダリング（sceneRefを使用して背景変更を反映）
          if (renderer && sceneRef.current) {
            renderer.render(sceneRef.current, camera);
          }
        };
        animate();

        // リサイズ対応
        const handleResize = () => {
          const newWidth = container.clientWidth;
          const newHeight = container.clientHeight;
          if (newWidth > 0 && newHeight > 0 && renderer) {
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
          }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        // クリーンアップを返す
        return () => {
          resizeObserver.disconnect();
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
          if (animationControllerRef.current) {
            animationControllerRef.current.dispose();
            animationControllerRef.current = null;
          }
          if (controls) {
            controls.dispose();
          }
          if (renderer) {
            renderer.dispose();
            if (renderer.domElement.parentNode) {
              renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
          }
        };
      } catch (err) {
        console.error("[VRMViewer] Error:", err);
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsLoading(false);
        onErrorRef.current?.(error);
        return undefined;
      }
    };

    let cleanup: (() => void) | undefined;
    init().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      cleanup?.();
      sceneRef.current = null;
      setSceneReady(false);
      setVrmInstance(null); // F-002: クリーンアップ時にVRMインスタンスをリセット
    };
  }, [modelPath, modelType, animationPath, backgroundColor, stableCameraPosition, enableControls, animationConfigKey, initialAnimationState]);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    // コンポーネントを再マウントするためにkeyを変更する必要があるが、
    // ここではページをリロードするか、親から再マウントしてもらう
    window.location.reload();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full min-h-[400px]",
        "bg-bg-tertiary rounded-lg overflow-hidden",
        className
      )}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-16 h-16 rounded-full" />
            <span className="text-text-secondary text-sm">
              モデル読み込み中... {progress}%
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription className="flex flex-col gap-2">
              <p>{error.message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="self-start"
              >
                再試行
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
