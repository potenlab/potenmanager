import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { notificationBus, NotificationEvent, NotificationEventType } from "../../lib/notificationEvents";
import { api } from "../../lib/api";

// ─── Types ──────────────────────────────────────────────────────────
export type NotificationType = "goal" | "task" | "team" | "system" | "calendar";
export type NotificationPriority = "high" | "medium" | "low";

export interface AppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  deleteNotification: () => {},
  clearAll: () => {},
});

// ─── Event → Notification mapping ──────────────────────────────────
function eventToNotification(event: NotificationEvent): Omit<AppNotification, "id" | "timestamp" | "read"> | null {
  const { type, data } = event;

  switch (type) {
    case "task.created":
      return {
        type: "task",
        priority: "low",
        titleKo: "새 업무가 생성되었습니다",
        titleEn: "New task created",
        descriptionKo: `'${data.titleKo || data.title}' 업무가 추가되었습니다.`,
        descriptionEn: `Task '${data.title}' has been created.`,
        actionUrl: `/tasks/${data.taskId}`,
      };

    case "task.completed":
      return {
        type: "task",
        priority: "medium",
        titleKo: "업무가 완료되었습니다",
        titleEn: "Task completed",
        descriptionKo: `'${data.titleKo || data.title}' 업무가 완료 처리되었습니다.`,
        descriptionEn: `Task '${data.title}' has been marked as completed.`,
        actionUrl: `/tasks/${data.taskId}`,
      };

    case "task.deadline_approaching":
      return {
        type: "task",
        priority: "high",
        titleKo: "업무 마감 임박",
        titleEn: "Task deadline approaching",
        descriptionKo: `'${data.titleKo || data.title}' 업무가 ${data.daysLeft}일 후 마감됩니다.`,
        descriptionEn: `Task '${data.title}' is due in ${data.daysLeft} day(s).`,
        actionUrl: `/tasks/${data.taskId}`,
      };

    case "task.assigned":
      return {
        type: "task",
        priority: "medium",
        titleKo: "새 업무가 배정되었습니다",
        titleEn: "New task assigned to you",
        descriptionKo: `${data.assignerName || '팀원'}님이 '${data.titleKo || data.title}' 업무를 배정했습니다.`,
        descriptionEn: `${data.assignerName || 'A team member'} assigned '${data.title}' to you.`,
        actionUrl: `/tasks/${data.taskId}`,
      };

    case "goal.progress_updated":
      return {
        type: "goal",
        priority: "medium",
        titleKo: "목표 진행률 업데이트",
        titleEn: "Goal progress updated",
        descriptionKo: `'${data.titleKo || data.title}' 목표가 ${data.progress}%로 업데이트되었습니다.`,
        descriptionEn: `Goal '${data.title}' updated to ${data.progress}%.`,
        actionUrl: `/organization/${data.goalId}`,
      };

    case "goal.completed":
      return {
        type: "goal",
        priority: "high",
        titleKo: "🎉 목표 달성!",
        titleEn: "🎉 Goal achieved!",
        descriptionKo: `'${data.titleKo || data.title}' 목표를 달성했습니다!`,
        descriptionEn: `Goal '${data.title}' has been achieved!`,
        actionUrl: `/organization/${data.goalId}`,
      };

    case "goal.created":
      return {
        type: "goal",
        priority: "low",
        titleKo: "새 목표가 설정되었습니다",
        titleEn: "New goal created",
        descriptionKo: `'${data.titleKo || data.title}' 목표가 추가되었습니다.`,
        descriptionEn: `Goal '${data.title}' has been created.`,
        actionUrl: `/organization/${data.goalId}`,
      };

    case "team.member_joined":
      return {
        type: "team",
        priority: "medium",
        titleKo: `${data.memberName}님이 팀에 합류했습니다`,
        titleEn: `${data.memberName} joined the team`,
        descriptionKo: `새 팀원이 프로젝트에 합류했습니다. 환영해주세요!`,
        descriptionEn: `A new team member joined the project. Say hello!`,
        actionUrl: `/team/${data.memberId}`,
      };

    case "team.member_removed":
      return {
        type: "team",
        priority: "low",
        titleKo: `${data.memberName}님이 팀에서 나갔습니다`,
        titleEn: `${data.memberName} left the team`,
        descriptionKo: `팀원이 프로젝트에서 제외되었습니다.`,
        descriptionEn: `A team member has been removed from the project.`,
        actionUrl: "/team",
      };

    case "role.changed":
      return {
        type: "team",
        priority: "medium",
        titleKo: `${data.targetName}님의 역할이 변경되었습니다`,
        titleEn: `${data.targetName}'s role was changed`,
        descriptionKo: `${data.actorName}님이 역할을 ${data.oldRoleKo}에서 ${data.newRoleKo}로 변경했습니다.`,
        descriptionEn: `${data.actorName} changed role from ${data.oldRole} to ${data.newRole}.`,
        actionUrl: "/team/permissions",
      };

    case "invite.created":
      return {
        type: "team",
        priority: "low",
        titleKo: "초대 코드가 생성되었습니다",
        titleEn: "Invite code generated",
        descriptionKo: `새 초대 코드 ${data.code}가 생성되었습니다.`,
        descriptionEn: `New invite code ${data.code} has been generated.`,
        actionUrl: "/team",
      };

    case "invite.joined":
      return {
        type: "team",
        priority: "medium",
        titleKo: `${data.userName}님이 초대를 수락했습니다`,
        titleEn: `${data.userName} accepted the invitation`,
        descriptionKo: `${data.userName}님이 조직에 합류했습니다.`,
        descriptionEn: `${data.userName} has joined the organization.`,
        actionUrl: "/team",
      };

    case "system.info":
      return {
        type: "system",
        priority: "low",
        titleKo: data.titleKo || "시스템 알림",
        titleEn: data.titleEn || "System notification",
        descriptionKo: data.descriptionKo || "",
        descriptionEn: data.descriptionEn || "",
      };

    default:
      return null;
  }
}

// ─── Initial seed notifications (shown first time) ─────────────────
const SEED_NOTIFICATIONS: Omit<AppNotification, "id">[] = [
  {
    type: "system",
    priority: "low",
    titleKo: "포텐매니저에 오신 것을 환영합니다!",
    titleEn: "Welcome to Poten Manager!",
    descriptionKo: "목표 설정, 업무 관리, 팀 협업을 시작해보세요.",
    descriptionEn: "Start setting goals, managing tasks, and collaborating with your team.",
    timestamp: new Date(Date.now() - 86400000),
    read: false,
    actionUrl: "/dashboard",
  },
  {
    type: "goal",
    priority: "high",
    titleKo: "첫 번째 목표를 설정해보세요",
    titleEn: "Set your first goal",
    descriptionKo: "AI가 도와드리는 전략 수립 도구로 목표를 설정하고 실행 계획을 세워보세요.",
    descriptionEn: "Use the AI-powered strategy tool to set goals and create action plans.",
    timestamp: new Date(Date.now() - 3600000),
    read: false,
    actionUrl: "/strategy/new",
  },
];

// ─── Provider ───────────────────────────────────────────────────────
const KV_KEY = "notifications:global";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const initRef = useRef(false);

  // ── Load from KV Store on mount ──
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const load = async () => {
      try {
        const saved = localStorage.getItem("poten_notifications");
        if (saved) {
          const parsed = JSON.parse(saved).map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }));
          setNotifications(parsed);
          return;
        }
      } catch {}

      // No local data → set seed
      const seeded = SEED_NOTIFICATIONS.map((s, i) => ({
        ...s,
        id: `seed_${i}_${Date.now()}`,
      }));
      setNotifications(seeded);
    };
    load();
  }, []);

  // ── Persist to localStorage on change ──
  useEffect(() => {
    if (!initRef.current) return;
    try {
      localStorage.setItem("poten_notifications", JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // ── Subscribe to event bus ──
  useEffect(() => {
    const unsub = notificationBus.on((event) => {
      const mapped = eventToNotification(event);
      if (!mapped) return;
      const newNotif: AppNotification = {
        ...mapped,
        id: `n_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: event.timestamp ?? new Date(),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 100)); // cap at 100
    });
    return unsub;
  }, []);

  // ── Actions ──
  const addNotification = useCallback(
    (n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
      const newNotif: AppNotification = {
        ...n,
        id: `n_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 100));
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
