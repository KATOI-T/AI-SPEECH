"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FlaskConical, Settings, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export function MainNav() {
  const pathname = usePathname();

  const isAdminActive = pathname.startsWith("/admin");
  const isTestActive = pathname.startsWith("/test");

  return (
    <nav className="hidden md:flex items-center gap-1">
      {mainNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "px-3 py-2 text-sm font-medium rounded-md transition-colors",
            "hover:bg-bg-secondary hover:text-accent-primary",
            pathname === item.href
              ? "text-accent-primary bg-bg-secondary"
              : "text-text-primary"
          )}
        >
          {item.label}
        </Link>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            "hover:bg-bg-secondary hover:text-accent-primary",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            isAdminActive
              ? "text-accent-primary bg-bg-secondary"
              : "text-text-primary"
          )}
        >
          管理画面
          <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8}>
          {adminNavItems.map((item) => (
            <DropdownMenuItem key={item.href} className="cursor-pointer">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 w-full",
                  pathname === item.href && "text-accent-primary"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            "hover:bg-bg-secondary hover:text-accent-primary",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            isTestActive
              ? "text-accent-primary bg-bg-secondary"
              : "text-text-primary"
          )}
        >
          <FlaskConical className="size-4" />
          テスト
          <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8}>
          {testNavItems.map((item) => (
            <DropdownMenuItem key={item.href} className="cursor-pointer">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 w-full",
                  pathname === item.href && "text-accent-primary"
                )}
              >
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
