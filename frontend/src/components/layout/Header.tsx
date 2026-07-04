"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { MainNav } from "./MainNav";
import { MobileNav } from "./MobileNav";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-primary bg-bg-primary">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <MessageSquare className="size-6 text-accent-primary" />
            <span className="text-lg font-semibold text-text-primary">
              AI Speech
            </span>
          </Link>
          <MainNav />
        </div>
        <MobileNav />
      </div>
    </header>
  );
}
