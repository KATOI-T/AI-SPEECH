"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";

const PAGES_WITHOUT_HEADER = [
  "/chat",
];

export function HeaderWrapper() {
  const pathname = usePathname();

  const shouldShowHeader = !PAGES_WITHOUT_HEADER.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );

  if (!shouldShowHeader) {
    return null;
  }

  return <Header />;
}
