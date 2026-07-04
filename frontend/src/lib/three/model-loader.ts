/**
 * VRM/GLBモデルローダーユーティリティ
 * F-001: 3Dモデル表示機能
 */

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRM } from "@pixiv/three-vrm";
import type { Object3D } from "three";
import type { ModelLoadOptions, ModelLoadResult } from "./types";

/**
 * VRM/GLBモデルを読み込む
 *
 * @param options - モデル読み込みオプション
 * @returns モデル読み込み結果のPromise
 */
export async function loadModel(
  options: ModelLoadOptions
): Promise<ModelLoadResult> {
  const { modelPath, modelType, onProgress, onError } = options;

  try {
    // GLTFLoaderを作成
    const loader = new GLTFLoader();

    // VRMの場合はVRMLoaderPluginを登録
    if (modelType === "vrm") {
      loader.register((parser) => new VRMLoaderPlugin(parser));
    }

    // モデルを非同期で読み込み
    const gltf = await new Promise<{
      scene: Object3D;
      userData: { vrm?: VRM };
    }>((resolve, reject) => {
      loader.load(
        modelPath,
        (gltf) => resolve(gltf),
        (xhr) => {
          if (onProgress && xhr.lengthComputable) {
            const progress = (xhr.loaded / xhr.total) * 100;
            onProgress(Math.round(progress));
          }
        },
        (error) => {
          reject(
            error instanceof Error
              ? error
              : new Error("Failed to load model")
          );
        }
      );
    });

    // VRMインスタンスを取得（VRMの場合）
    const vrm = modelType === "vrm" ? gltf.userData.vrm || null : null;

    return {
      vrm,
      model: gltf.scene,
    };
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Unknown error occurred");

    if (onError) {
      onError(err);
    }

    throw err;
  }
}

/**
 * VRMモデルを破棄する
 *
 * @param vrm - VRMインスタンス
 */
export function disposeVRM(vrm: VRM | null): void {
  if (!vrm) return;

  // VRMのdisposeメソッドを呼び出す
  // Three.jsのシーンから削除される前に呼び出す必要がある
  vrm.scene.traverse((object) => {
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
}
