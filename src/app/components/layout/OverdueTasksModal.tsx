import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  X,
  Clock,
  ChevronRight,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { Task } from "../../../lib/mockData";
import { useLanguage } from "../../context/LanguageContext";
import { useTaskContext } from "../../context/TaskContext";
import { useTeam } from "../../context/TeamContext";
import { differenceInDays, format } from "date-fns";
import { ko as koLocale } from "date-fns/locale";
import { cn } from "../../../lib/utils";

// 오늘 날짜 기준 키 (하루 1회 표시)
function getTodayKey() {
  const d = new Date();
  return `poten_overdue_dismissed_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const PRIORITY_CONFIG = {
  high: { label: "긴급", color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
  medium: { label: "보통", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  low: { label: "낮음", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  "pending": { label: "시작 전", color: "text-gray-500", dot: "bg-gray-400" },
  "in-progress": { label: "진행 중", color: "text-blue-600", dot: "bg-blue-500" },
  "routine": { label: "루틴", color: "text-purple-600", dot: "bg-purple-500" },
  "completed": { label: "완료", color: "text-emerald-600", dot: "bg-emerald-500" },
};

interface OverdueTaskRowProps {
  task: Task;
  onNavigate: (id: string) => void;
  members: { id: string; avatar: string; name: string }[];
}

function OverdueTaskRow({ task, onNavigate, members }: OverdueTaskRowProps) {
  const { language } = useLanguage();
  const title = language === "ko" ? task.titleKo || task.title : task.title;
  const assignee = task.assigneeId ? members.find((m) => m.id === task.assigneeId) : null;
  const daysOverdue = task.dueDate ? Math.abs(differenceInDays(new Date(), task.dueDate)) : 0;
  const dueDateStr = task.dueDate
    ? format(new Date(task.dueDate), language === "ko" ? "M월 d일" : "MMM d", {
        locale: language === "ko" ? koLocale : undefined,
      })
    : "";
  const priority = task.priority || "medium";
  const pCfg = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  const sCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG["pending"];

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onNavigate(task.id)}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group text-left"
    >
      {/* Priority bar */}
      <div className={cn("shrink-0 w-1.5 h-10 rounded-full", priority === "high" ? "bg-red-300" : priority === "medium" ? "bg-green-400" : "bg-gray-300")} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          {/* Status */}
          <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
            <span className={cn("w-1.5 h-1.5 rounded-full", sCfg.dot)} />
            {sCfg.label}
          </span>
          <span className="text-gray-200">·</span>
          {/* Due date */}
          <span className="flex items-center gap-1 text-[11px] text-gray-500 font-semibold">
            <Clock size={10} />
            {dueDateStr} 마감 ({daysOverdue}일 경과)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Priority */}
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", pCfg.bg, pCfg.color, pCfg.border)}>
          {pCfg.label}
        </span>
        {/* Assignee */}
        {assignee && (
          <img
            src={assignee.avatar}
            alt={assignee.name}
            className="w-6 h-6 rounded-full border-2 border-white shadow-sm object-cover"
            title={assignee.name}
          />
        )}
        <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
      </div>
    </motion.button>
  );
}

export function OverdueTasksModal() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { tasks } = useTaskContext();
  const { members } = useTeam();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 미처리 업무: 마감일이 오늘 이전이고 완료되지 않은 태스크
  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks
      .filter((t) => {
        if (t.status === "completed") return false;
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due < today;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [tasks]);

  useEffect(() => {
    if (overdueTasks.length === 0) return;
    const key = getTodayKey();
    const alreadyDismissed = localStorage.getItem(key) === "true";
    if (!alreadyDismissed) {
      const timer = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [overdueTasks.length]);

  const handleDismiss = () => {
    const key = getTodayKey();
    localStorage.setItem(key, "true");
    setIsOpen(false);
    setDismissed(true);
  };

  const handleNavigate = (taskId: string) => {
    handleDismiss();
    navigate(`/tasks/${taskId}`);
  };

  const handleGoToTasks = () => {
    handleDismiss();
    navigate("/tasks");
  };

  if (overdueTasks.length === 0 || dismissed) return null;

  const highCount = overdueTasks.filter((t) => t.priority === "high").length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9000]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9001] w-full max-w-lg mx-4"
          >
            <div className="bg-white rounded-3xl shadow-xl border-2 border-red-200 overflow-hidden">

              {/* Header */}
              <div className="relative bg-gray-50 px-6 pt-6 pb-5 border-b border-red-100">
                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className="absolute top-4 right-4 p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-red-200 flex items-center justify-center shrink-0 shadow-sm">
                    <AlertTriangle size={22} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
                      미처리 업무 알림
                    </p>
                    <h2 className="text-gray-900 text-xl font-bold leading-tight">
                      기한이 지난 업무가{" "}
                      <span className="text-red-500">{overdueTasks.length}건</span> 있어요
                    </h2>
                    <p className="text-gray-500 text-sm mt-1.5">
                      {highCount > 0 && (
                        <>
                          <span className="font-semibold text-gray-700">{highCount}건</span>은 긴급 우선순위예요.{" "}
                        </>
                      )}
                      지금 바로 확인하고 처리해보세요.
                    </p>
                  </div>
                </div>

                {/* Overdue days summary */}
                <div className="mt-4 flex items-center gap-2">
                  {["1일", "2~3일", "4일+"].map((label, i) => {
                    const counts = [
                      overdueTasks.filter((t) => differenceInDays(new Date(), t.dueDate!) === 1).length,
                      overdueTasks.filter((t) => { const d = differenceInDays(new Date(), t.dueDate!); return d >= 2 && d <= 3; }).length,
                      overdueTasks.filter((t) => differenceInDays(new Date(), t.dueDate!) >= 4).length,
                    ];
                    if (counts[i] === 0) return null;
                    return (
                      <div key={label} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
                        <Calendar size={11} className="text-gray-400" />
                        <span className="text-xs text-gray-700 font-semibold">{counts[i]}건</span>
                        <span className="text-[11px] text-gray-400">{label} 경과</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Task List */}
              <div className="px-4 py-3 max-h-72 overflow-y-auto divide-y divide-gray-50">
                {overdueTasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <OverdueTaskRow task={task} onNavigate={handleNavigate} members={members} />
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3 bg-gray-50/60">
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors bg-white"
                >
                  오늘은 그냥 지나칠게요
                </button>
                <button
                  onClick={handleGoToTasks}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-500 text-sm font-semibold transition-colors"
                >
                  업무 전체 보기
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}