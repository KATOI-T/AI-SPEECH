/**
 * F-004 STT デモページ
 * 音声入力（Speech-to-Text）機能の動作確認用
 */

"use client";

import { useEffect } from "react";
import { useMicrophone } from "@/hooks/useMicrophone";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { MicrophoneButton } from "@/components/speech/MicrophoneButton";
import { RecognitionStatus } from "@/components/speech/RecognitionStatus";
import { TranscriptDisplay } from "@/components/speech/TranscriptDisplay";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Volume2 } from "lucide-react";
import Link from "next/link";

export default function TestSTTPage() {
  // マイク制御
  const {
    state: micState,
    stream,
    error: micError,
    requestPermission,
    stopStream,
    isAvailable,
  } = useMicrophone();

  // 音声認識制御
  const {
    state: recognitionState,
    interimText,
    finalText,
    results,
    error: recognitionError,
    start,
    stop,
    clearResults,
    warmup,
    isWarmedUp,
  } = useSpeechRecognition({
    stream,
    language: "ja-JP",
    continuous: true,
    interimResults: true,
  });

  // 起動高速化のためトークンを事前取得
  useEffect(() => {
    warmup();
  }, [warmup]);

  const isRecording = recognitionState === "listening";

  // 録音開始/停止
  const handleToggle = async () => {
    if (isRecording) {
      stop();
    } else {
      // Azure SDKが直接マイクにアクセスするため、事前のstream取得は不要
      // ただし、UI表示のためにマイク権限をリクエストしておく
      if (micState === "idle") {
        requestPermission(); // await しない - Azure SDKが自前で権限を取得する
      }
      await start();
    }
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      stop();
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">
            F-004 STT デモ
          </h1>
        </div>

        {/* 説明 */}
        <Card className="p-4 bg-bg-secondary border-border-primary">
          <div className="flex items-start gap-3">
            <Volume2 className="h-5 w-5 text-accent-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-text-primary font-medium">
                音声入力（Speech-to-Text）機能のデモ
              </p>
              <p className="text-xs text-text-muted">
                Azure Speech Services を使用したリアルタイム音声認識。
                マイクボタンを押して話しかけると、音声がテキストに変換されます。
              </p>
            </div>
          </div>
        </Card>

        {/* マイク状態 */}
        <Card className="p-4 bg-bg-secondary border-border-primary">
          <h2 className="text-sm font-medium text-text-secondary mb-3">
            マイク状態
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">利用可能: </span>
              <span className={isAvailable ? "text-status-success" : "text-status-error"}>
                {isAvailable ? "はい" : "いいえ"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">状態: </span>
              <span className="text-text-primary">{micState}</span>
            </div>
            <div>
              <span className="text-text-muted">ストリーム: </span>
              <span className={stream ? "text-status-success" : "text-text-muted"}>
                {stream ? "取得済み" : "未取得"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">認識状態: </span>
              <span className="text-text-primary">{recognitionState}</span>
            </div>
          </div>
        </Card>

        {/* 認識状態表示 */}
        <RecognitionStatus
          state={recognitionState}
          interimText={interimText}
          error={recognitionError}
        />

        {/* マイクボタン */}
        <div className="flex flex-col items-center gap-4 py-8">
          <MicrophoneButton
            isRecording={isRecording}
            onToggle={handleToggle}
            error={micError}
            disabled={micState === "requesting" || recognitionState === "starting"}
            size="lg"
          />
          <p className="text-sm text-text-muted">
            {isRecording ? "タップして停止" : "タップして録音開始"}
          </p>
        </div>

        {/* 認識結果表示 */}
        <TranscriptDisplay
          results={results}
          interimText={interimText}
          showClear={true}
          onClear={clearResults}
          className="min-h-[200px]"
        />

        {/* デバッグ情報 */}
        <Card className="p-4 bg-bg-tertiary border-border-primary">
          <h2 className="text-sm font-medium text-text-secondary mb-3">
            デバッグ情報
          </h2>
          <div className="space-y-2 text-xs font-mono">
            <div>
              <span className="text-text-muted">最終認識テキスト: </span>
              <span className="text-text-primary">{finalText || "(なし)"}</span>
            </div>
            <div>
              <span className="text-text-muted">認識結果数: </span>
              <span className="text-text-primary">{results.length}</span>
            </div>
            <div>
              <span className="text-text-muted">ウォームアップ: </span>
              <span className={isWarmedUp ? "text-status-success" : "text-text-muted"}>
                {isWarmedUp ? "完了" : "待機中"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">マイクエラー: </span>
              <span className="text-status-error">
                {micError ? `${micError.code}: ${micError.message}` : "(なし)"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">認識エラー: </span>
              <span className="text-status-error">
                {recognitionError
                  ? `${recognitionError.code}: ${recognitionError.message}`
                  : "(なし)"}
              </span>
            </div>
          </div>
        </Card>

        {/* API情報 */}
        <Card className="p-4 bg-bg-secondary border-border-primary">
          <h2 className="text-sm font-medium text-text-secondary mb-3">
            API エンドポイント
          </h2>
          <div className="space-y-2 text-xs font-mono text-text-muted">
            <p>GET /api/v1/speech/token - 認証トークン取得</p>
            <p>POST /api/v1/speech/recognize - 音声ファイル認識</p>
            <p>GET /api/v1/speech/providers - プロバイダー一覧</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
