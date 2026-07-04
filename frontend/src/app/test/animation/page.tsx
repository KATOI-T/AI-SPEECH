/**
 * Animation Test Page
 * F-003: アニメーション機能のテストページ
 *
 * VRM/GLB両モデル対応
 */

"use client";

import React, { useState, useCallback } from "react";
import type { Object3D, AnimationClip } from "three";
import { VRMViewer } from "@/components/three/VRMViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AnimationConfig, AnimationState } from "@/types";
import type { VRM } from "@pixiv/three-vrm";

/**
 * アニメーション定義（7種類）
 * 各状態は対応するVRMAファイルの動作に基づいて命名
 */
const ANIMATIONS: { state: AnimationState; vrma: string; label: string }[] = [
  { state: "idle",     vrma: "/models/motion/VRMA_06.vrma", label: "モデルポーズ" },
  { state: "greeting", vrma: "/models/motion/VRMA_02.vrma", label: "挨拶" },
  { state: "happy",    vrma: "/models/motion/VRMA_03.vrma", label: "Vサイン" },
  { state: "present",  vrma: "/models/motion/VRMA_01.vrma", label: "全身を見せる" },
  { state: "shoot",    vrma: "/models/motion/VRMA_04.vrma", label: "撃つ" },
  { state: "spin",     vrma: "/models/motion/VRMA_05.vrma", label: "回る" },
  { state: "exercise", vrma: "/models/motion/VRMA_07.vrma", label: "屈伸運動" },
];

// 全てのアニメーション状態
const ALL_ANIMATION_STATES: AnimationState[] = ANIMATIONS.map(a => a.state);

// テスト用のアニメーション設定
const TEST_ANIMATION_CONFIG: AnimationConfig = ANIMATIONS.reduce((acc, anim) => {
  acc[anim.state] = anim.state;
  return acc;
}, {} as AnimationConfig);

export default function AnimationTestPage() {
  // モデル状態
  const [modelScene, setModelScene] = useState<Object3D | null>(null);
  const [vrmInstance, setVrmInstance] = useState<VRM | null>(null);
  const [animationClips, setAnimationClips] = useState<AnimationClip[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  // アニメーション状態（VRMViewerに渡して制御）
  const [currentState, setCurrentState] = useState<AnimationState>("idle");

  // テスト用のモデルパス（VRMファイル）
  const modelPath = "/models/aro.vrm";
  // モデルタイプ: VRMファイル
  const modelType = "vrm" as const;

  // 各状態に対応するVRMAファイルパス
  const animationPaths: Partial<Record<AnimationState, string>> = ANIMATIONS.reduce((acc, anim) => {
    acc[anim.state] = anim.vrma;
    return acc;
  }, {} as Partial<Record<AnimationState, string>>);

  // onLoadコールバック: scene, vrm, animationsを受け取る
  const handleLoad = useCallback((scene: Object3D | null, vrm: VRM | null, animations?: AnimationClip[]) => {
    console.log("[AnimationTest] Model loaded: scene:", scene, "vrm:", vrm, "animations:", animations?.length);
    console.log("[AnimationTest] Animation names:", animations?.map(a => a.name));
    setModelScene(scene);
    setVrmInstance(vrm);
    setAnimationClips(animations || []);
    setIsModelLoaded(true);
    setLoadError(null);
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error("[AnimationTest] Load error:", error);
    setLoadError(error);
    setIsModelLoaded(false);
  }, []);

  // アニメーション状態変更時のコールバック
  const handleAnimationStateChange = useCallback((state: AnimationState) => {
    console.log("[AnimationTest] Animation state changed:", state);
  }, []);

  // ボタンクリックでアニメーション状態を変更
  const handleStateClick = (state: AnimationState) => {
    console.log("[AnimationTest] Button clicked:", state);
    setCurrentState(state);
  };

  // 利用可能なアニメーション状態を計算
  const availableStates = animationClips
    .map(clip => clip.name as AnimationState)
    .filter(name => ALL_ANIMATION_STATES.includes(name));

  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-text-primary">
            F-003: アニメーション機能テスト
          </h1>
          <p className="text-text-secondary">
            VRMモデルのアニメーション状態を切り替えてテストします
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D Viewer */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>3Dモデルビューア</CardTitle>
                <CardDescription>
                  モデル: {modelPath} | 状態: {currentState}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px]">
                  <VRMViewer
                    modelPath={modelPath}
                    modelType={modelType}
                    animationPaths={animationPaths}
                    animationConfig={TEST_ANIMATION_CONFIG}
                    animationState={currentState}
                    onLoad={handleLoad}
                    onError={handleError}
                    onAnimationStateChange={handleAnimationStateChange}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>ステータス</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">モデル読み込み</span>
                  <Badge variant={isModelLoaded ? "default" : "secondary"}>
                    {isModelLoaded ? "完了" : "未読み込み"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">アニメーションクリップ</span>
                  <Badge variant={animationClips.length > 0 ? "default" : "secondary"}>
                    {animationClips.length}個
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">現在の状態</span>
                  <Badge variant="outline" className="font-mono">
                    {currentState}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">定義済み状態</span>
                  <Badge variant="secondary">
                    {ALL_ANIMATION_STATES.length}個
                  </Badge>
                </div>
                {vrmInstance && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">VRMバージョン</span>
                    <Badge variant="secondary">
                      {vrmInstance.meta?.metaVersion || "unknown"}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Animation Controls */}
            <Card>
              <CardHeader>
                <CardTitle>アニメーション制御</CardTitle>
                <CardDescription>
                  状態を切り替えてアニメーションをテスト（全{ANIMATIONS.length}種類）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {ANIMATIONS.map((anim) => (
                  <Button
                    key={anim.state}
                    onClick={() => handleStateClick(anim.state)}
                    variant={currentState === anim.state ? "default" : "outline"}
                    disabled={!isModelLoaded}
                    className="w-full justify-start"
                  >
                    <span className="font-mono text-sm mr-2">{anim.state}</span>
                    <span className="text-text-secondary text-sm">- {anim.label}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Error Display */}
            {loadError && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p className="font-semibold">読み込みエラー</p>
                  <p className="text-sm mt-1">{loadError.message}</p>
                  <p className="text-xs mt-2 opacity-75">
                    モデルファイル: {modelPath}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Info */}
            <Card>
              <CardHeader>
                <CardTitle>使い方</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-text-secondary">
                <p>1. VRMファイルを /public/models/ に配置</p>
                <p>2. モデルパスを更新</p>
                <p>3. アニメーション設定を調整</p>
                <p>4. ボタンで状態を切り替え</p>
                <p className="pt-2 text-xs opacity-75">
                  注: VRMファイルに対応するアニメーションクリップが必要です
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle>デバッグ情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-text-primary mb-2">アニメーション設定</h4>
                <pre className="bg-bg-tertiary p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(TEST_ANIMATION_CONFIG, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold text-text-primary mb-2">モデル情報</h4>
                <pre className="bg-bg-tertiary p-3 rounded-lg overflow-x-auto">
                  {modelScene
                    ? JSON.stringify(
                        {
                          type: modelType,
                          sceneName: modelScene.name || "unnamed",
                          sceneType: modelScene.type,
                          childrenCount: modelScene.children?.length || 0,
                          animationClips: animationClips.length,
                          clipNames: animationClips.map(c => c.name),
                          // VRM固有情報（存在する場合のみ）
                          ...(vrmInstance ? {
                            vrmName: (vrmInstance.meta as { name?: string; title?: string })?.name
                              || (vrmInstance.meta as { name?: string; title?: string })?.title
                              || "unknown",
                            vrmVersion: vrmInstance.meta?.metaVersion || "unknown",
                          } : {}),
                        },
                        null,
                        2
                      )
                    : "モデル未読み込み"}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
