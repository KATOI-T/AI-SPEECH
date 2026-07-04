/**
 * Three.jsシーン初期化ユーティリティ
 * F-001: 3Dモデル表示機能
 */

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  DirectionalLight,
  AmbientLight,
  Color,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  SceneConfig,
  CameraConfig,
  ControlsConfig,
  ThreeContext,
} from "./types";

/**
 * デフォルトのシーン設定
 */
export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  backgroundColor: 0x374151, // グレー
  ambientLightIntensity: 0.6,
  directionalLightIntensity: 0.8,
  directionalLightPosition: [5, 10, 7.5],
};

/**
 * デフォルトのカメラ設定
 */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  fov: 30,
  near: 0.1,
  far: 100,
  position: [0, 1.2, 2],
  target: [0, 1, 0],
};

/**
 * デフォルトのOrbitControls設定
 */
export const DEFAULT_CONTROLS_CONFIG: ControlsConfig = {
  enableDamping: true,
  dampingFactor: 0.05,
  minDistance: 0.5,
  maxDistance: 10,
  minPolarAngle: Math.PI / 6, // 30度
  maxPolarAngle: Math.PI / 2, // 90度
  enablePan: false,
};

/**
 * Three.jsシーンを初期化する
 *
 * @param container - レンダラーを配置するコンテナ要素
 * @param sceneConfig - シーン設定（オプション）
 * @param cameraConfig - カメラ設定（オプション）
 * @returns 初期化されたThree.jsコンテキスト
 */
export function initializeScene(
  container: HTMLElement,
  sceneConfig: Partial<SceneConfig> = {},
  cameraConfig: Partial<CameraConfig> = {}
): ThreeContext {
  const config: SceneConfig = { ...DEFAULT_SCENE_CONFIG, ...sceneConfig };
  const camConfig: CameraConfig = { ...DEFAULT_CAMERA_CONFIG, ...cameraConfig };

  // シーン作成
  const scene = new Scene();
  scene.background = new Color(config.backgroundColor);

  // カメラ作成
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new PerspectiveCamera(
    camConfig.fov,
    aspect,
    camConfig.near,
    camConfig.far
  );
  camera.position.set(...camConfig.position);

  // レンダラー作成
  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: false,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // パフォーマンス最適化

  // ライト設定
  const ambientLight = new AmbientLight(0xffffff, config.ambientLightIntensity);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(
    0xffffff,
    config.directionalLightIntensity
  );
  directionalLight.position.set(...config.directionalLightPosition);
  scene.add(directionalLight);

  return {
    scene,
    camera,
    renderer,
    controls: null,
    lights: {
      ambient: ambientLight,
      directional: directionalLight,
    },
  };
}

/**
 * OrbitControlsを初期化する
 *
 * @param camera - カメラ
 * @param domElement - イベントリスナーを登録するDOM要素
 * @param config - OrbitControls設定（オプション）
 * @returns 初期化されたOrbitControls
 */
export function initializeControls(
  camera: PerspectiveCamera,
  domElement: HTMLElement,
  config: Partial<ControlsConfig> = {}
): OrbitControls {
  const controlsConfig: ControlsConfig = {
    ...DEFAULT_CONTROLS_CONFIG,
    ...config,
  };

  const controls = new OrbitControls(camera, domElement);

  // 設定を適用
  controls.enableDamping = controlsConfig.enableDamping;
  controls.dampingFactor = controlsConfig.dampingFactor;
  controls.minDistance = controlsConfig.minDistance;
  controls.maxDistance = controlsConfig.maxDistance;
  controls.minPolarAngle = controlsConfig.minPolarAngle;
  controls.maxPolarAngle = controlsConfig.maxPolarAngle;
  controls.enablePan = controlsConfig.enablePan;

  // ターゲット位置を設定
  controls.target.set(...DEFAULT_CAMERA_CONFIG.target);
  controls.update();

  return controls;
}

/**
 * Three.jsリソースを破棄する
 *
 * @param context - Three.jsコンテキスト
 */
export function disposeScene(context: ThreeContext): void {
  // コントロールの破棄
  if (context.controls) {
    context.controls.dispose();
  }

  // シーン内のすべてのオブジェクトを破棄
  context.scene.traverse((object) => {
    if ("geometry" in object) {
      const geometry = (object as { geometry: { dispose: () => void } })
        .geometry;
      geometry.dispose();
    }

    if ("material" in object) {
      const material = (object as { material: unknown }).material;
      if (material) {
        if (Array.isArray(material)) {
          material.forEach((m) => {
            if (m && typeof m === "object" && "dispose" in m) {
              (m as { dispose: () => void }).dispose();
            }
          });
        } else if (
          typeof material === "object" &&
          "dispose" in material
        ) {
          (material as { dispose: () => void }).dispose();
        }
      }
    }
  });

  // レンダラーの破棄
  context.renderer.dispose();
}

/**
 * レスポンシブ対応：キャンバスサイズを更新する
 *
 * @param camera - カメラ
 * @param renderer - レンダラー
 * @param width - 新しい幅
 * @param height - 新しい高さ
 */
export function resizeRenderer(
  camera: PerspectiveCamera,
  renderer: WebGLRenderer,
  width: number,
  height: number
): void {
  // カメラのアスペクト比を更新
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // レンダラーのサイズを更新
  renderer.setSize(width, height);
}
