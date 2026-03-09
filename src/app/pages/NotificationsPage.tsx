import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  Target,
  CheckSquare,
  AlertTriangle,
  Info,
  Users,
  Calendar,
  Check,
  CheckCheck,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import {
  useNotifications,
  AppNotification,
  NotificationType,
  NotificationPriority,
} from "../context/NotificationContext";

type FilterTab = "all" | "unread" | "goal" | "task" | "team" | "system";

const typeConfig: Record<
  NotificationType,
  { icon: typeof Bell; color: string; bg: string; border: string }
> = {
  goal: { icon: Target, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
  task: { icon: CheckSquare, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  team: { icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  system: { icon: Info, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
  calendar: { icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
};

function formatTimestamp(date: Date, language: string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return language === "ko" ? "방금 전" : "Just now";
  if (diffMin < 60) return language === "ko" ? `${diffMin}분 전` : `${diffMin}m ago`;
  if (diffHour < 24) return language === "ko" ? `${diffHour}시간 전` : `${diffHour}h ago`;
  if (diffDay < 7) return language === "ko" ? `${diffDay}일 전` : `${diffDay}d ago`;
  return date.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

function groupByDate(
  notifications: AppNotification[],
  language: string
): { label: string; items: AppNotification[] }[] {
  const now = new Date();
  const groups: Map<string, AppNotification[]> = new Map();

  for (const n of notifications) {
    const diffDay = Math.floor((now.getTime() - n.timestamp.getTime()) / 86400000);
    let label: string;
    if (diffDay <= 0) {
      label = language === "ko" ? "오늘" : "Today";
    } else if (diffDay === 1) {
      label = language === "ko" ? "어제" : "Yesterday";
    } else if (diffDay < 7) {
      label = language === "ko" ? "이번 주" : "This Week";
    } else {
      label = language === "ko" ? "이전" : "Earlier";
    }
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(n);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export function NotificationsPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const filterTabs: { id: FilterTab; labelKo: string; labelEn: string }[] = [
    { id: "all", labelKo: "전체", labelEn: "All" },
    { id: "unread", labelKo: "읽지 않음", labelEn: "Unread" },
    { id: "goal", labelKo: "목표", labelEn: "Goals" },
    { id: "task", labelKo: "업무", labelEn: "Tasks" },
    { id: "team", labelKo: "팀", labelEn: "Team" },
    { id: "system", labelKo: "시스템", labelEn: "System" },
  ];

  const filtered = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !n.read;
    return n.type === activeFilter;
  });

  const grouped = groupByDate(filtered, language);

  const handleClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const priorityIndicator = (priority: NotificationPriority) => {
    if (priority === "high") {
      return <AlertTriangle size={13} className="text-amber-400 shrink-0" />;
    }
    return null;
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-6 pb-12">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-1"
      >
        <ArrowLeft size={14} />
        <span>{language === "ko" ? "뒤로가기" : "Back"}</span>
      </button>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 border border-blue-100">
            <Bell size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {language === "ko" ? "알림" : "Notifications"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {unreadCount > 0
                ? language === "ko"
                  ? `읽지 않은 알림 ${unreadCount}개`
                  : `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : language === "ko"
                ? "모든 알림을 확인했습니다"
                : "All caught up!"}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 border border-blue-100 transition-colors"
          >
            <CheckCheck size={16} />
            {language === "ko" ? "모두 읽음" : "Mark all read"}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filterTabs.map((tab) => {
          const count =
            tab.id === "all"
              ? notifications.length
              : tab.id === "unread"
              ? unreadCount
              : notifications.filter((n) => n.type === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap border",
                activeFilter === tab.id
                  ? "bg-white text-blue-600 border-blue-200 shadow-sm"
                  : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {language === "ko" ? tab.labelKo : tab.labelEn}
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                  activeFilter === tab.id
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-200 text-gray-500"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notification Groups */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Bell size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">
            {language === "ko" ? "알림이 없습니다" : "No notifications"}
          </p>
          <p className="text-sm mt-1">
            {language === "ko"
              ? "새로운 알림이 오면 여기에 표시됩니다."
              : "New notifications will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.items.map((notification) => {
                  const config = typeConfig[notification.type] ?? typeConfig.system;
                  const Icon = config.icon;

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleClick(notification)}
                      className={cn(
                        "group relative flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200",
                        notification.read
                          ? "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                          : "bg-blue-50/40 border-blue-100 hover:border-blue-200 hover:shadow-md"
                      )}
                    >
                      {/* Unread dot */}
                      {!notification.read && (
                        <div className="absolute top-4 left-2 w-2 h-2 rounded-full bg-blue-500" />
                      )}

                      {/* Icon */}
                      <div
                        className={cn(
                          "p-2.5 rounded-xl border shrink-0 mt-0.5",
                          config.bg,
                          config.border
                        )}
                      >
                        <Icon size={18} className={config.color} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {priorityIndicator(notification.priority)}
                          <h4
                            className={cn(
                              "text-sm line-clamp-1",
                              notification.read
                                ? "font-medium text-gray-700"
                                : "font-semibold text-gray-900"
                            )}
                          >
                            {language === "ko" ? notification.titleKo : notification.titleEn}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                          {language === "ko"
                            ? notification.descriptionKo
                            : notification.descriptionEn}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(notification.timestamp, language)}
                          </span>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-medium border",
                              config.bg,
                              config.color,
                              config.border
                            )}
                          >
                            {language === "ko"
                              ? notification.type === "goal"
                                ? "목표"
                                : notification.type === "task"
                                ? "업무"
                                : notification.type === "team"
                                ? "팀"
                                : notification.type === "system"
                                ? "시스템"
                                : "일정"
                              : notification.type.charAt(0).toUpperCase() +
                                notification.type.slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            title={language === "ko" ? "읽음 처리" : "Mark as read"}
                            className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          title={language === "ko" ? "삭제" : "Delete"}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
