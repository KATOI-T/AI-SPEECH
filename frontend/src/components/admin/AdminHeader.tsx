"use client";

import Link from "next/link";

export function AdminHeader() {
  return (
    <header className="border-b border-border-primary bg-bg-primary">
      <div className="flex h-16 items-center px-6">
        <Link href="/admin" className="text-lg font-semibold text-text-primary">
          AI Speech 管理画面
        </Link>
      </div>
    </header>
  );
}
