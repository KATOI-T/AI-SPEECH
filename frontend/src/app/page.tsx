"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4 text-text-primary">
          AI Speech
        </h1>
        <p className="text-lg text-text-secondary mb-8">
          AIロープレ会話システム - 3Dキャラクターと音声対話を行うWebアプリケーション
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/select"
            className="px-6 py-3 bg-accent-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            会話を始める
          </Link>
          <Link
            href="/admin/scenarios"
            className="px-6 py-3 bg-bg-secondary text-text-primary rounded-lg font-medium border border-border-primary hover:bg-bg-tertiary transition-colors"
          >
            管理画面
          </Link>
        </div>

        <div className="mt-12 p-6 bg-bg-secondary rounded-lg border border-border-primary">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">
            システム状態
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Frontend:</span>
              <span className="text-status-success font-medium">稼働中</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Backend:</span>
              <span className="text-text-muted">確認中...</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
