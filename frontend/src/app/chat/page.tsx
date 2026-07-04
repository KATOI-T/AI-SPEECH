'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { VRM } from '@pixiv/three-vrm';
import { Scenario, Character } from '@/types';
import { resolveAnimationPaths, ENABLE_SPECIAL_ACTIONS } from '@/lib/three/animation-constants';
import { getScenario } from '@/lib/api/scenarios';
import { getCharacter } from '@/lib/api/characters';
import { resolveModelUrl } from '@/lib/api/models';
import { resolveBackgroundUrls, getBackgroundImageProxyUrl } from '@/lib/api/backgrounds';
import { useConversationAnimation } from '@/hooks/useConversationAnimation';
import { ChatSession } from '@/components/chat/ChatSession';
import { VRMViewer } from '@/components/three/VRMViewer';
import { BackgroundSwitcher } from '@/components/chat/BackgroundSwitcher';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// F-011-009: 終了時のお辞儀クリップ長 + ルーター遷移バッファ
const BOW_ANIM_CLIP_MS = 3500;
const NAV_BUFFER_MS = 300;

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get('scenarioId');
  const characterId = searchParams.get('characterId');

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [resolvedModelPath, setResolvedModelPath] = useState<string | null>(null);
  const [backgroundPaths, setBackgroundPaths] = useState<string[]>([]);
  const [resolvedBackgroundUrls, setResolvedBackgroundUrls] = useState<(string | null)[]>([]);
  const [activeBackgroundIndex, setActiveBackgroundIndex] = useState<number | null>(null);
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // F-010 / F-013: 表情制御 + ボディアニメーション（単一ソース）
  // animationState は必ず useConversationAnimation から取得すること。
  // ローカル state を追加すると phase/emotion と二重管理になり、反映漏れが発生する。
  // F-011-009: playSpecial / specialActionTrigger / notifySpecialEnded を追加
  const {
    setPhase,
    setEmotion,
    animationState,
    playSpecial,
    notifySpecialEnded,
    specialActionTrigger,
  } = useConversationAnimation({
    vrm,
    enabled: !!vrm,
  });

  // F-011-009: VRM ロード直後に「セッション開始」挨拶を発火
  // F-011-012 (v3.0): ENABLE_SPECIAL_ACTIONS=false の間はガードして発火しない
  const hasGreetedRef = useRef(false);
  // F-011-009: 終了処理の多重実行ガード
  const isEndingRef = useRef(false);
  useEffect(() => {
    if (!ENABLE_SPECIAL_ACTIONS) return;
    if (!vrm || !specialActionTrigger || hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    specialActionTrigger.sessionStart();
  }, [vrm, specialActionTrigger]);

  // シナリオとキャラクターを取得
  useEffect(() => {
    const fetchData = async () => {
      if (!scenarioId || !characterId) {
        setError('シナリオまたはキャラクターが選択されていません');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [scenarioData, characterData] = await Promise.all([
          getScenario(parseInt(scenarioId)),
          getCharacter(parseInt(characterId)),
        ]);
        setScenario(scenarioData);
        setCharacter(characterData);
        const bgPaths = scenarioData.background_image_paths || [];
        const [modelPath, bgUrls] = await Promise.all([
          resolveModelUrl(characterData.model_path),
          resolveBackgroundUrls(bgPaths),
        ]);
        setResolvedModelPath(modelPath);
        setBackgroundPaths(bgPaths);
        setResolvedBackgroundUrls(bgUrls);
        // デフォルトで最初の背景画像を選択
        if (bgPaths.length > 0) {
          setActiveBackgroundIndex(0);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [scenarioId, characterId]);

  // セッション終了時
  // F-011-009: 別れのお辞儀を再生してからナビゲート（VRM 未ロード時は即時遷移）
  // 連打ガード: isEndingRef で多重 setTimeout / router.push を防止
  // F-011-012 (v3.0): ENABLE_SPECIAL_ACTIONS=false の間は即時遷移（お辞儀なし）
  const handleEndSession = () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    if (ENABLE_SPECIAL_ACTIONS && specialActionTrigger && vrm) {
      specialActionTrigger.sessionEnd();
      setTimeout(() => router.push('/select'), BOW_ANIM_CLIP_MS + NAV_BUFFER_MS);
    } else {
      router.push('/select');
    }
  };

  // VRMロード完了時
  const handleVRMLoaded = (vrmInstance: VRM) => {
    setVrm(vrmInstance);
  };

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/select">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              選択画面に戻る
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading || !scenario || !character || !resolvedModelPath) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <span className="text-text-secondary">読み込み中...</span>
        </div>
      </main>
    );
  }

  // animation_configのクリップ名をVRMAファイルパスに変換
  const animationPaths = resolveAnimationPaths(character.animation_config);

  return (
    <main className={cn(
      "h-screen relative",
      isFullscreen ? "bg-bg-primary" : "flex bg-slate-950"
    )}>
      {/* 3Dモデル表示 */}
      <div className={cn(
        isFullscreen
          ? "absolute inset-0 z-0"
          : "flex-1 h-full relative bg-slate-900"
      )}>
        <VRMViewer
          modelPath={resolvedModelPath}
          modelType={character.model_type}
          animationConfig={character.animation_config}
          animationPaths={animationPaths}
          initialAnimationState="idle"
          animationState={animationState}
          backgroundImage={activeBackgroundIndex !== null && backgroundPaths[activeBackgroundIndex] ? getBackgroundImageProxyUrl(backgroundPaths[activeBackgroundIndex]) : null}
          enableLipSync={true}
          onVRMLoaded={handleVRMLoaded}
          onSpecialActionEnd={notifySpecialEnded}
          className="w-full h-full"
        />
        {/* フルスクリーン: グラデーションオーバーレイ */}
        {isFullscreen && (
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/60 pointer-events-none" />
        )}
        {/* 通常モード: キャラクター情報オーバーレイ */}
        {!isFullscreen && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="inline-flex items-start gap-3 bg-slate-900/80 backdrop-blur-sm rounded-xl px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-green-500" />
                  <span className="text-lg font-bold text-white">{character.name}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 uppercase tracking-wider">Active</span>
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  Role: {scenario.name} (Training Mode)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 背景切り替えUI */}
      {resolvedBackgroundUrls.length > 0 && (
        <div className={cn(
          "absolute bg-slate-900/70 backdrop-blur-sm rounded-lg px-2 py-1.5",
          isFullscreen
            ? "bottom-6 left-6 z-10"
            : "top-3 left-3 z-10"
        )}>
          <BackgroundSwitcher
            backgroundUrls={resolvedBackgroundUrls}
            activeIndex={activeBackgroundIndex}
            onSelect={setActiveBackgroundIndex}
          />
        </div>
      )}

      {/* チャットセッション */}
      <div className={cn(
        isFullscreen
          ? "[display:contents]"
          : "w-[420px] xl:w-[480px] h-full border-l border-slate-800"
      )}>
        <ChatSession
          scenario={scenario}
          character={character}
          vrm={vrm}
          onEnd={handleEndSession}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onPhaseChange={setPhase}
          onEmotionChange={setEmotion}
        />
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <span className="text-text-secondary">読み込み中...</span>
          </div>
        </main>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
