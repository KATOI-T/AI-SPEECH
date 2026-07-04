/**
 * F-010: アニメーション制御ページ
 *
 * 3レイヤーアニメーションシステム（ボディ・表情・瞬き）を
 * インタラクティブに確認・制御できる専用ページ
 */

"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import type { AnimationClip } from "three";
import type { VRM } from "@pixiv/three-vrm";
import { VRMViewer } from "@/components/three/VRMViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnimationConfig, AnimationModel, AnimationState, EmotionType } from "@/types";
import { DEFAULT_VRMA_PATHS, resolveAnimationPaths } from "@/lib/three/animation-constants";
import { useConversationAnimation } from "@/hooks/useConversationAnimation";
import { BodyAnimationPanel } from "@/components/animation-control/BodyAnimationPanel";
import { ConversationPhaseSimulator } from "@/components/animation-control/ConversationPhaseSimulator";
import { ExpressionControlPanel } from "@/components/animation-control/ExpressionControlPanel";
import { BlinkControlPanel } from "@/components/animation-control/BlinkControlPanel";
import { EmotionPresetPanel } from "@/components/animation-control/EmotionPresetPanel";
import { AnimationDebugInfo } from "@/components/animation-control/AnimationDebugInfo";
import { getAnimationModels } from "@/lib/api/animations";

const MODEL_PATH = "/models/aro.vrm";

// デフォルトのアニメーション設定（API未接続時のフォールバック）
const DEFAULT_ANIMATION_CONFIG: AnimationConfig = Object.fromEntries(
  Object.entries(DEFAULT_VRMA_PATHS).map(([state, path]) => [state, path])
) as AnimationConfig;

const DEFAULT_ANIMATION_PATHS = { ...DEFAULT_VRMA_PATHS } as Partial<Record<AnimationState, string>>;

export default function AnimationControlPage() {
  // Model state
  const [vrmInstance, setVrmInstance] = useState<VRM | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [clipCount, setClipCount] = useState(0);

  // AnimationModel selection
  const [animationModels, setAnimationModels] = useState<AnimationModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("default");

  // Load animation models from API
  useEffect(() => {
    getAnimationModels({ activeOnly: true })
      .then((res) => setAnimationModels(res.items))
      .catch(() => { /* API 未接続時はデフォルトを使用 */ });
  }, []);

  // Resolve current animation config & paths based on selection
  const { animationConfig, animationPaths } = useMemo(() => {
    if (selectedModelId === "default") {
      return {
        animationConfig: DEFAULT_ANIMATION_CONFIG,
        animationPaths: DEFAULT_ANIMATION_PATHS,
      };
    }
    const model = animationModels.find((m) => String(m.id) === selectedModelId);
    if (!model) {
      return {
        animationConfig: DEFAULT_ANIMATION_CONFIG,
        animationPaths: DEFAULT_ANIMATION_PATHS,
      };
    }
    const config = model.animation_config;
    return {
      animationConfig: config,
      animationPaths: resolveAnimationPaths(config),
    };
  }, [selectedModelId, animationModels]);

  // Control mode & active tab
  const [controlMode, setControlMode] = useState<"manual" | "conversation">("manual");
  const [activeTab, setActiveTab] = useState("body");

  // Manual body animation state
  const [manualState, setManualState] = useState<AnimationState>("idle");

  // Expression manual weights
  const [manualWeights, setManualWeights] = useState<Record<string, number>>({});

  // Blink state
  const [blinkEnabled, setBlinkEnabled] = useState(true);
  const [blinkInterval, setBlinkInterval] = useState(4);

  // Conversation animation hook
  const conversation = useConversationAnimation({
    vrm: vrmInstance,
    enabled: isModelLoaded,
  });

  // Determine active animation state based on mode
  const activeAnimationState = controlMode === "manual"
    ? manualState
    : conversation.animationState;

  // Callbacks
  const handleLoad = useCallback((_scene: unknown, _vrm: unknown, animations?: AnimationClip[]) => {
    setClipCount(animations?.length ?? 0);
    setIsModelLoaded(true);
  }, []);

  const handleVRMLoaded = useCallback((vrm: VRM) => {
    setVrmInstance(vrm);
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error("[AnimationControl] Load error:", error);
    setIsModelLoaded(false);
  }, []);

  // Manual body state change
  const handleManualStateChange = useCallback((state: AnimationState) => {
    setManualState(state);
  }, []);

  // Expression weight change
  const handleWeightChange = useCallback((name: string, weight: number) => {
    setManualWeights((prev) => ({ ...prev, [name]: weight }));
    conversation.expressionController?.setExpression(name, weight);
  }, [conversation.expressionController]);

  const handleResetExpressions = useCallback(() => {
    setManualWeights({});
    conversation.expressionController?.resetExpressions();
  }, [conversation.expressionController]);

  // Blink controls
  const handleBlinkEnabledChange = useCallback((enabled: boolean) => {
    setBlinkEnabled(enabled);
    conversation.expressionController?.setBlinkEnabled(enabled);
  }, [conversation.expressionController]);

  const handleBlinkIntervalChange = useCallback((interval: number) => {
    setBlinkInterval(interval);
    conversation.expressionController?.setBlinkInterval(interval);
  }, [conversation.expressionController]);

  // Emotion preset
  const handleEmotionPreset = useCallback((emotion: EmotionType) => {
    conversation.setEmotion(emotion);
    if (controlMode === "manual") {
      setControlMode("conversation");
    }
  }, [conversation.setEmotion, controlMode]);

  // Tab change to switch mode
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    if (value === "body") {
      setControlMode("manual");
    } else if (value === "conversation") {
      setControlMode("conversation");
    }
    // expression and debug tabs don't change mode
  }, []);

  const isVRM = true; // GLBモデル時は表情パネル無効化（現在はVRM固定）

  return (
    <div className="min-h-screen bg-bg-primary p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              F010: アニメーション制御
            </h1>
            <p className="text-sm text-text-secondary">
              3レイヤーアニメーションシステム（ボディ・表情・瞬き）のインタラクティブ制御
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary whitespace-nowrap">モデル:</span>
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="デフォルト" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">デフォルト</SelectItem>
                {animationModels.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* VRM Viewer (2/3 width) */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="h-[500px] lg:h-[700px]">
                  <VRMViewer
                    modelPath={MODEL_PATH}
                    modelType="vrm"
                    animationPaths={animationPaths}
                    animationConfig={animationConfig}
                    animationState={activeAnimationState}
                    onLoad={handleLoad}
                    onError={handleError}
                    onVRMLoaded={handleVRMLoaded}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Control Panels (1/3 width) */}
          <div className="space-y-4">
            <Tabs defaultValue="body" onValueChange={handleTabChange}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="body" className="text-xs">ボディ</TabsTrigger>
                <TabsTrigger value="conversation" className="text-xs">会話</TabsTrigger>
                <TabsTrigger value="expression" className="text-xs">表情</TabsTrigger>
                <TabsTrigger value="debug" className="text-xs">デバッグ</TabsTrigger>
              </TabsList>

              {/* Body Animation Tab */}
              <TabsContent value="body">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">ボディアニメーション</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BodyAnimationPanel
                      currentState={activeAnimationState}
                      onStateChange={handleManualStateChange}
                      disabled={!isModelLoaded}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Conversation Simulation Tab */}
              <TabsContent value="conversation">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">会話シミュレーション</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ConversationPhaseSimulator
                      currentPhase={conversation.phase}
                      currentEmotion={conversation.emotion}
                      onPhaseChange={conversation.setPhase}
                      onEmotionChange={conversation.setEmotion}
                      disabled={!isModelLoaded}
                    />
                    <div className="border-t border-border-primary pt-3">
                      <EmotionPresetPanel
                        currentEmotion={conversation.emotion}
                        onPresetApply={handleEmotionPreset}
                        disabled={!isModelLoaded || !isVRM}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Expression Tab */}
              <TabsContent value="expression">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">表情制御</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ExpressionControlPanel
                      controller={conversation.expressionController}
                      weights={manualWeights}
                      onWeightChange={handleWeightChange}
                      onReset={handleResetExpressions}
                      disabled={!isModelLoaded || !isVRM}
                    />
                    <div className="border-t border-border-primary pt-3">
                      <BlinkControlPanel
                        enabled={blinkEnabled}
                        interval={blinkInterval}
                        onEnabledChange={handleBlinkEnabledChange}
                        onIntervalChange={handleBlinkIntervalChange}
                        disabled={!isModelLoaded || !isVRM}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Debug Tab */}
              <TabsContent value="debug">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">デバッグ情報</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AnimationDebugInfo
                      isModelLoaded={isModelLoaded}
                      animationState={activeAnimationState}
                      conversationPhase={conversation.phase}
                      emotion={conversation.emotion}
                      controlMode={controlMode}
                      expressionController={conversation.expressionController}
                      clipCount={clipCount}
                      active={activeTab === "debug"}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
