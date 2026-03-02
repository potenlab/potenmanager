import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import {
  CheckSquare,
  LayoutDashboard,
  Calendar,
  Users,
  MoreHorizontal,
  Building2,
  Video,
  Radar,
  User,
  Trash2,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";

const APP_VERSION = __APP_VERSION__;

interface TabItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  match?: (path: string) => boolean;
}

interface MoreItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

export function BottomNav() {
  const { isMobile } = useSidebar();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const ko = language === "ko";

  if (!isMobile) return null;

  const tabs: TabItem[] = [
    {
      to: "/tasks",
      icon: <CheckSquare size={20} />,
      label: ko ? "업무" : "Tasks",
      match: (p) => p.startsWith("/tasks"),
    },
    {
      to: "/",
      icon: <LayoutDashboard size={20} />,
      label: ko ? "홈" : "Home",
      match: (p) => p === "/",
    },
    {
      to: "/calendar",
      icon: <Calendar size={20} />,
      label: ko ? "캘린더" : "Calendar",
      match: (p) => p.startsWith("/calendar"),
    },
    {
      to: "/team",
      icon: <Users size={20} />,
      label: ko ? "팀" : "Team",
      match: (p) => p.startsWith("/team"),
    },
  ];

  const moreItems: MoreItem[] = [
    { to: "/organization", icon: <Building2 size={20} />, label: ko ? "조직" : "Organization" },
    { to: "/meetings", icon: <Video size={20} />, label: ko ? "회의" : "Meetings" },
    { to: "/radar", icon: <Radar size={20} />, label: ko ? "비즈 레이더" : "Biz Radar" },
    { to: "/mypage", icon: <User size={20} />, label: ko ? "마이페이지" : "My Page" },
    { to: "/trash", icon: <Trash2 size={20} />, label: ko ? "휴지통" : "Trash" },
  ];

  // Check if current path is in "more" items (to highlight ··· tab)
  const isMoreActive = moreItems.some((item) =>
    location.pathname === item.to || location.pathname.startsWith(item.to + "/")
  );

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[900] bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const active = tab.match
              ? tab.match(location.pathname)
              : location.pathname === tab.to;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors"
              >
                <span className={active ? "text-blue-600" : "text-gray-400"}>
                  {tab.icon}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    active ? "text-blue-600" : "text-gray-400"
                  )}
                >
                  {tab.label}
                </span>
              </NavLink>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors"
          >
            <span className={isMoreActive ? "text-blue-600" : "text-gray-400"}>
              <MoreHorizontal size={20} />
            </span>
            <span
              className={cn(
                "text-[10px] font-medium",
                isMoreActive ? "text-blue-600" : "text-gray-400"
              )}
            >
              {ko ? "더보기" : "More"}
            </span>
          </button>
        </div>
      </nav>

      {/* More Bottom Sheet */}
      {moreOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[950] bg-black/40 animate-in fade-in duration-200"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-[951] bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom)]">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Grid menu */}
            <div className="grid grid-cols-3 gap-1 px-4 pb-2 pt-2">
              {moreItems.map((item) => {
                const active =
                  location.pathname === item.to ||
                  location.pathname.startsWith(item.to + "/");
                return (
                  <button
                    key={item.to}
                    onClick={() => {
                      setMoreOpen(false);
                      navigate(item.to);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 py-4 rounded-xl transition-colors",
                      active
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {item.icon}
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Version */}
            <p className="text-[10px] text-gray-300 text-center pb-4">v{APP_VERSION}</p>
          </div>
        </>
      )}
    </>
  );
}
