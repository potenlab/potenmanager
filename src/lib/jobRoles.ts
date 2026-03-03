import React from "react";
import {
  DollarSign, PenTool, Video, Megaphone, Code,
  Palette, Lightbulb, Settings, BookOpen,
} from "lucide-react";
import type { TaskCategory, JobRole, User } from "./mockData";

// ─── Task Category Config (shared across pages) ─────────────────
export const TASK_CATEGORY_CONFIG: Record<TaskCategory, {
  label: string; labelKo: string; icon: React.ReactNode; color: string; bg: string; border: string;
}> = {
  sales:           { label: "Sales",      labelKo: "영업",           icon: React.createElement(DollarSign, { size: 12 }), color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  content_writing: { label: "Content",    labelKo: "콘텐츠(글쓰기)", icon: React.createElement(PenTool, { size: 12 }),    color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200" },
  content_video:   { label: "Video",      labelKo: "콘텐츠(영상)",   icon: React.createElement(Video, { size: 12 }),      color: "text-pink-700",    bg: "bg-pink-50",     border: "border-pink-200" },
  marketing:       { label: "Marketing",  labelKo: "마케팅",         icon: React.createElement(Megaphone, { size: 12 }),  color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200" },
  development:     { label: "Dev",        labelKo: "개발",           icon: React.createElement(Code, { size: 12 }),       color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200" },
  design:          { label: "Design",     labelKo: "디자인",         icon: React.createElement(Palette, { size: 12 }),    color: "text-fuchsia-700", bg: "bg-fuchsia-50",  border: "border-fuchsia-200" },
  planning:        { label: "Planning",   labelKo: "기획",           icon: React.createElement(Lightbulb, { size: 12 }),  color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" },
  operations:      { label: "Ops",        labelKo: "운영/관리",      icon: React.createElement(Settings, { size: 12 }),   color: "text-gray-700",    bg: "bg-gray-100",    border: "border-gray-200" },
  learning:        { label: "Learning",   labelKo: "학습",           icon: React.createElement(BookOpen, { size: 12 }),   color: "text-teal-700",    bg: "bg-teal-50",     border: "border-teal-200" },
};

// ─── Job Role Config ────────────────────────────────────────────
export const JOB_ROLE_CONFIG: Record<JobRole, {
  label: string; labelKo: string; emoji: string;
  categories: TaskCategory[];
}> = {
  planner:         { label: "Planner",          labelKo: "기획자",             emoji: "💡", categories: ["planning"] },
  designer:        { label: "Designer",         labelKo: "디자이너",           emoji: "🎨", categories: ["design"] },
  developer:       { label: "Developer",        labelKo: "개발자",             emoji: "💻", categories: ["development"] },
  marketer:        { label: "Marketer",         labelKo: "마케터",             emoji: "📢", categories: ["marketing"] },
  content_creator: { label: "Content Creator",  labelKo: "콘텐츠 크리에이터",  emoji: "✍️", categories: ["content_writing", "content_video"] },
  salesperson:     { label: "Salesperson",       labelKo: "영업",               emoji: "💰", categories: ["sales"] },
  operator:        { label: "Operator",         labelKo: "운영자",             emoji: "⚙️", categories: ["operations"] },
  pm:              { label: "PM",               labelKo: "PM",                 emoji: "📋", categories: ["planning", "operations"] },
  data_analyst:    { label: "Data Analyst",     labelKo: "데이터 분석가",      emoji: "📊", categories: ["development", "learning"] },
  general:         { label: "General",          labelKo: "일반",               emoji: "👤", categories: [] },
};

export const JOB_ROLES: JobRole[] = [
  "planner", "designer", "developer", "marketer", "content_creator",
  "salesperson", "operator", "pm", "data_analyst", "general",
];

// ─── Smart Assignment ───────────────────────────────────────────

/** Find the best assignee for a task category based on team members' job roles */
export function findBestAssignee(members: User[], category: TaskCategory): User | undefined {
  // 1. Exact match: member whose jobRole maps to this category
  const exactMatch = members.find(m => {
    if (!m.jobRole || m.jobRole === "general") return false;
    return JOB_ROLE_CONFIG[m.jobRole].categories.includes(category);
  });
  if (exactMatch) return exactMatch;

  // 2. Fallback: first 'general' role member
  const generalMatch = members.find(m => m.jobRole === "general");
  if (generalMatch) return generalMatch;

  // 3. No match
  return undefined;
}

/** Get all matching members for a category, sorted by relevance */
export function findMatchingMembers(members: User[], category: TaskCategory): User[] {
  const exact: User[] = [];
  const general: User[] = [];
  const rest: User[] = [];

  for (const m of members) {
    if (!m.jobRole) { rest.push(m); continue; }
    if (m.jobRole === "general") { general.push(m); continue; }
    if (JOB_ROLE_CONFIG[m.jobRole].categories.includes(category)) {
      exact.push(m);
    } else {
      rest.push(m);
    }
  }

  return [...exact, ...general, ...rest];
}
