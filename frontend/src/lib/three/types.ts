/**
 * Three.js関連の型定義
 * F-001: 3Dモデル表示機能
 */

import type { VRM } from "@pixiv/three-vrm";
import type {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Object3D,
  DirectionalLight,
  AmbientLight,
} from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * シーン設定
 */
export interface SceneConfig {
  /** 背景色（16進数） */
  backgroundColor: number;
  /** 環境光の強度 */
  ambientLightIntensity: number;
  /** 平行光源の強度 */
  directionalLightIntensity: number;
  /** 平行光源の位置 [x, y, z] */
  directionalLightPosition: [number, number, number];
}

/**
 * カメラ設定
 */
export interface CameraConfig {
  /** 視野角（度） */
  fov: number;
  /** ニアクリップ */
  near: number;
  /** ファークリップ */
  far: number;
  /** カメラ初期位置 [x, y, z] */
  position: [number, number, number];
  /** カメラのターゲット位置 [x, y, z] */
  target: [number, number, number];
}

/**
 * OrbitControls設定
 */
export interface ControlsConfig {
  /** ダンピング（慣性）の有効化 */
  enableDamping: boolean;
  /** ダンピング係数 */
  dampingFactor: number;
  /** 最小距離（ズーム） */
  minDistance: number;
  /** 最大距離（ズーム） */
  maxDistance: number;
  /** 最小極角（縦回転制限） */
  minPolarAngle: number;
  /** 最大極角（縦回転制限） */
  maxPolarAngle: number;
  /** パン操作の有効化 */
  enablePan: boolean;
}

/**
 * Three.jsシーン全体のコンテキスト
 */
export interface ThreeContext {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls | null;
  lights: {
    ambient: AmbientLight;
    directional: DirectionalLight;
  };
}

/**
 * モデル読み込みオプション
 */
export interface ModelLoadOptions {
  /** モデルファイルパス */
  modelPath: string;
  /** モデル形式 */
  modelType: "vrm" | "glb";
  /** 読み込み進捗コールバック */
  onProgress?: (progress: number) => void;
  /** エラーコールバック */
  onError?: (error: Error) => void;
}

/**
 * モデル読み込み結果
 */
export interface ModelLoadResult {
  /** VRMインスタンス（VRMの場合） */
  vrm: VRM | null;
  /** Three.js Object3D */
  model: Object3D;
}

/**
 * VRMビューアーのプロパティ
 */
export interface VRMViewerProps {
  /** モデルファイルパス */
  modelPath: string;
  /** モデル形式 */
  modelType: "vrm" | "glb";
  /** 追加CSSクラス */
  className?: string;
  /** 背景色（HEX文字列） */
  backgroundColor?: string;
  /** カメラ初期位置 */
  cameraPosition?: [number, number, number];
  /** OrbitControls有効化 */
  enableControls?: boolean;
  /** 読み込み完了コールバック */
  onLoad?: () => void;
  /** エラーコールバック */
  onError?: (error: Error) => void;
}
