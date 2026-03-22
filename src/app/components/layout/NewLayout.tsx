/**
 * NewLayout — 심플한 레이아웃 (사이드바 + 콘텐츠)
 */

import { Outlet } from "react-router";
import { NewSidebar } from "./NewSidebar";
import { useSidebar } from "../../context/SidebarContext";

export function NewLayout() {
  const { isMobile } = useSidebar();

  return (
    <div className="flex h-screen bg-white">
      <NewSidebar />
      <main
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden min-h-screen",
          isMobile ? "w-full" : "ml-[260px]"
        )}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 pb-20">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
