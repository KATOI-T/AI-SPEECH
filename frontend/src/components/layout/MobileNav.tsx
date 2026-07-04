"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FlaskConical, Menu, Settings, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mainNavItems = [
  { href: "/", label: "ホーム" },
  { href: "/select", label: "会話を始める" },
];

const adminNavItems = [
  { href: "/admin/scenarios", label: "シナリオ管理", icon: Settings },
  { href: "/admin/characters", label: "キャラクター管理", icon: Users },
];

const testNavItems = [
  { href: "/test/animation-control", label: "アニメーション制御" },
  { href: "/test/animation", label: "アニメーションテスト" },
  { href: "/test/animation-models", label: "アニメーションモデル" },
  { href: "/test-vrm", label: "VRMビューア" },
  { href: "/test-three", label: "Three.jsテスト" },
  { href: "/test-glb", label: "GLBテスト" },
  { href: "/test-stt", label: "STTテスト" },
];

export function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);
  const [isTestExpanded, setIsTestExpanded] = useState(false);

  const isAdminActive = pathname.startsWith("/admin");
  const isTestActive = pathname.startsWith("/test");

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="メニューを開く"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-left">メニュー</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 mt-4">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                "hover:bg-bg-secondary",
                pathname === item.href
                  ? "text-accent-primary bg-bg-secondary"
                  : "text-text-primary"
              )}
            >
              {item.label}
            </Link>
          ))}

          <div className="mt-2">
            <button
              onClick={() => setIsAdminExpanded(!isAdminExpanded)}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                "hover:bg-bg-secondary",
                isAdminActive
                  ? "text-accent-primary bg-bg-secondary"
                  : "text-text-primary"
              )}
            >
              管理画面
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200",
                  isAdminExpanded && "rotate-180"
                )}
              />
            </button>

            {isAdminExpanded && (
              <div className="ml-3 mt-1 flex flex-col gap-1 border-l-2 border-border-primary pl-3">
                {adminNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                      "hover:bg-bg-secondary",
                      pathname === item.href
                        ? "text-accent-primary bg-bg-secondary"
                        : "text-text-primary"
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2">
            <button
              onClick={() => setIsTestExpanded(!isTestExpanded)}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                "hover:bg-bg-secondary",
                isTestActive
                  ? "text-accent-primary bg-bg-secondary"
                  : "text-text-primary"
              )}
            >
              <span className="flex items-center gap-2">
                <FlaskConical className="size-4" />
                テスト
              </span>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200",
                  isTestExpanded && "rotate-180"
                )}
              />
            </button>

            {isTestExpanded && (
              <div className="ml-3 mt-1 flex flex-col gap-1 border-l-2 border-border-primary pl-3">
                {testNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                      "hover:bg-bg-secondary",
                      pathname === item.href
                        ? "text-accent-primary bg-bg-secondary"
                        : "text-text-primary"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
