"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { VRMViewer } from "@/components/three";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Viseme } from "@/types/lipsync";

interface TTSResponse {
  audio_base64: string;
  visemes: Viseme[];
  format: string;
}

export default function TestVRMPage() {
  const [modelPath, setModelPath] = useState("/models/aro.vrm");
  const [modelType, setModelType] = useState<"vrm" | "glb">("vrm");
  const [isLoaded, setIsLoaded] = useState(false);
  const [showViewer, setShowViewer] = useState(true);

  // F-002: リップシンク関連のステート
  const [speechText, setSpeechText] = useState("こんにちは、テストです。");
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [visemes, setVisemes] = useState<Viseme[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAudio, setPendingAudio] = useState<HTMLAudioElement | null>(null);
  const [pendingVisemes, setPendingVisemes] = useState<Viseme[] | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // F-002: visemesとaudioElementが両方設定された後に再生を開始
  useEffect(() => {
    // 両方のステートが同期されるまで待機
    if (
      pendingAudio &&
      pendingVisemes &&
      audioElement === pendingAudio &&
      visemes === pendingVisemes &&
      visemes.length > 0
    ) {
      console.log("[TestVRM] Starting audio playback after state sync");
      console.log("[TestVRM] Visemes ready:", visemes.length);

      // ローカル変数に保存してからステートをクリア
      const audioToPlay = pendingAudio;
      setPendingAudio(null);
      setPendingVisemes(null);

      // 少し遅延を入れてuseLipSyncのeffectが実行されるのを待つ
      setTimeout(() => {
        console.log("[TestVRM] Playing audio now");
        audioToPlay.play().catch((err) => {
          console.error("[TestVRM] Audio play error:", err);
          setError("音声の再生に失敗しました");
        });
      }, 100);
    }
  }, [audioElement, pendingAudio, visemes, pendingVisemes]);

  // F-002: TTS API呼び出しと音声再生
  const handleSpeech = useCallback(async () => {
    if (!speechText.trim()) {
      setError("テキストを入力してください");
      return;
    }

    setError(null);
    setIsSynthesizing(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";
      const response = await fetch(`${apiUrl}/api/v1/tts/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: speechText,
          voice_name: null, // デフォルト音声を使用
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `APIエラー: ${response.status}`);
      }

      const data: TTSResponse = await response.json();

      // 音声を作成
      const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
      audioRef.current = audio;

      // デバッグ: 音声の読み込み状態を確認
      audio.onloadedmetadata = () => {
        console.log("[TestVRM] Audio metadata loaded, duration:", audio.duration);
      };
      audio.oncanplaythrough = () => {
        console.log("[TestVRM] Audio can play through");
      };

      audio.onplay = () => {
        console.log("[TestVRM] Audio onplay, duration:", audio.duration);
        setIsPlaying(true);
      };
      audio.onended = () => {
        console.log("[TestVRM] Audio onended");
        setIsPlaying(false);
        setVisemes([]); // 再生終了時にVisemeをクリア
      };
      audio.onpause = () => {
        console.log("[TestVRM] Audio onpause, currentTime:", audio.currentTime);
        setIsPlaying(false);
      };
      audio.onerror = (e) => {
        console.error("[TestVRM] Audio error:", e, audio.error);
        setError("音声の再生に失敗しました");
        setIsPlaying(false);
      };

      // Visemeデータと音声要素を設定（状態更新後に再生開始）
      console.log("[TestVRM] Visemes received:", data.visemes.length);
      setVisemes(data.visemes);
      setAudioElement(audio);
      setPendingAudio(audio);
      setPendingVisemes(data.visemes); // 両方のフラグを設定
    } catch (err) {
      console.error("[TestVRM] TTS error:", err);
      setError(err instanceof Error ? err.message : "音声合成に失敗しました");
    } finally {
      setIsSynthesizing(false);
    }
  }, [speechText]);

  // F-002: 音声停止
  const handleStopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setVisemes([]);
    }
  }, []);

  // VRMViewer コールバックをメモ化（再レンダリング時に新しい関数を作らない）
  const handleVRMLoad = useCallback(() => {
    console.log("モデル読み込み完了");
    setIsLoaded(true);
  }, []);

  const handleVRMError = useCallback((error: Error) => {
    console.error("モデル読み込みエラー:", error);
    setIsLoaded(false);
  }, []);

  // cameraPosition をメモ化（配列は毎回新しいインスタンスが作られるため）
  const cameraPosition = useMemo<[number, number, number]>(() => [0, 1.2, 3], []);

  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">
          VRMViewer テストページ
        </h1>

        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 設定パネル */}
        <div className="bg-bg-secondary rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">モデル設定</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="modelPath">モデルパス</Label>
              <Input
                id="modelPath"
                value={modelPath}
                onChange={(e) => setModelPath(e.target.value)}
                placeholder="/models/sample.vrm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelType">モデル形式</Label>
              <select
                id="modelType"
                value={modelType}
                onChange={(e) => setModelType(e.target.value as "vrm" | "glb")}
                className="w-full h-10 px-3 rounded-md border border-border-primary bg-bg-primary text-text-primary"
              >
                <option value="vrm">VRM</option>
                <option value="glb">GLB</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setShowViewer(false);
                  setTimeout(() => setShowViewer(true), 100);
                }}
              >
                再読み込み
              </Button>
            </div>
          </div>

          <div className="text-sm text-text-muted">
            <p>利用可能なモデル:</p>
            <ul className="list-disc list-inside ml-2">
              <li>/models/aro.vrm (VRM形式) - リップシンク対応</li>
              <li>/models/aro.glb (GLB形式)</li>
            </ul>
          </div>
        </div>

        {/* F-002: リップシンク設定パネル */}
        <div className="bg-bg-secondary rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            リップシンク テスト (F-002)
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="speechText">読み上げテキスト</Label>
              <Input
                id="speechText"
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                placeholder="こんにちは"
                disabled={isPlaying || isSynthesizing}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSpeech}
                disabled={isPlaying || isSynthesizing || !speechText.trim()}
              >
                {isSynthesizing ? "合成中..." : "音声合成 & 再生"}
              </Button>
              {isPlaying && (
                <Button variant="outline" onClick={handleStopSpeech}>
                  停止
                </Button>
              )}
            </div>

            {/* ステータス表示 */}
            <div className="text-sm text-text-muted space-y-1">
              <p>ステータス:</p>
              <ul className="list-disc list-inside ml-2">
                <li>音声合成: {isSynthesizing ? "処理中..." : "待機中"}</li>
                <li>再生状態: {isPlaying ? "再生中" : "停止"}</li>
                <li>Visemeデータ: {visemes.length}件</li>
                <li>リップシンク: {modelType === "vrm" ? "有効" : "無効（GLB形式）"}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* VRMViewer */}
        <div className="bg-bg-secondary rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              3Dモデル表示
            </h2>
            {isLoaded && (
              <span className="text-sm text-green-500">✓ 読み込み完了</span>
            )}
          </div>

          <div className="h-[600px] w-full">
            {showViewer && (
              <VRMViewer
                modelPath={modelPath}
                modelType={modelType}
                backgroundColor="#1f2937"
                cameraPosition={cameraPosition}
                enableControls={true}
                enableLipSync={modelType === "vrm"}
                audioElement={audioElement}
                visemes={visemes}
                onLoad={handleVRMLoad}
                onError={handleVRMError}
                className="rounded-lg"
              />
            )}
          </div>

          <div className="text-sm text-text-muted space-y-1">
            <p>操作方法:</p>
            <ul className="list-disc list-inside ml-2">
              <li>左クリック + ドラッグ: カメラ回転</li>
              <li>右クリック + ドラッグ: カメラ移動</li>
              <li>マウスホイール: ズーム</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
