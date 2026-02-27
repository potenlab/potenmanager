import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Target, Flag, Milestone, Calendar, Plus, X, ArrowRight,
  ArrowLeft, Check, Sparkles, ChevronRight, Lightbulb,
  TrendingUp, Users, DollarSign, Rocket, Star, CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";

// ─── 데이터 타입 ─────────────────────────────────────────────────────
interface AnnualGoal { id: string; title: string; }
interface QuarterGoal { id: string; title: string; quarter: "Q1"|"Q2"|"Q3"|"Q4"; annualGoalId: string; }
interface MonthGoal { id: string; title: string; month: number; quarterGoalId: string; }

// ─── 용어 설명 ───────────────────────────────────────────────────────
interface TermInfo {
  term: string;
  emoji: string;
  desc: string;
  example?: string;
}

const TERM_INFO_KO: Record<string, TermInfo> = {
  MRR: {
    term: "MRR이란?",
    emoji: "📈",
    desc: "Monthly Recurring Revenue의 약자예요. 매달 구독·정기결제로 들어오는 예측 가능한 수익을 말해요.",
    example: "예) 월 구독료 5만원 × 고객 200명 = MRR 1,000만원",
  },
  NPS: {
    term: "NPS란?",
    emoji: "⭐",
    desc: "Net Promoter Score의 약자예요. '이 제품을 주변에 얼마나 추천하겠냐'고 묻고 0~10점으로 측정해요. 9~10점(추천) 비율에서 0~6점(비추천) 비율을 빼서 -100~100 사이 점수가 나와요.",
    example: "예) 점수 50 이상이면 업계 최상위 수준이에요",
  },
  시리즈: {
    term: "시리즈 투자란?",
    emoji: "💰",
    desc: "스타트업 투자 단계를 나타내요. 시드(초기 실험) → 시리즈 A(성장 가속) → 시리즈 B(대규모 확장) 순으로 커져요.",
    example: "예) 시리즈 A는 보통 제품·시장 검증 이후 본격 성장을 위한 단계예요",
  },
  ARR: {
    term: "ARR이란?",
    emoji: "💵",
    desc: "Annual Recurring Revenue의 약자예요. 구독·정기결제로 연간 발생하는 예측 가능한 수익이에요. MRR × 12로 계산해요.",
    example: "예) MRR 1억원 × 12개월 = ARR 12억원",
  },
};

const TERM_INFO_EN: Record<string, TermInfo> = {
  MRR: {
    term: "What is MRR?",
    emoji: "📈",
    desc: "Monthly Recurring Revenue — the predictable revenue you earn each month from subscriptions or recurring billing.",
    example: "e.g. $50/mo plan × 200 customers = $10K MRR",
  },
  NPS: {
    term: "What is NPS?",
    emoji: "⭐",
    desc: "Net Promoter Score — asks 'How likely are you to recommend us?' on a 0–10 scale. % promoters (9–10) minus % detractors (0–6) gives your score.",
    example: "e.g. Score 50+ is considered world-class",
  },
  Series: {
    term: "What is Series funding?",
    emoji: "💰",
    desc: "Startup funding stages: Seed (early experiment) → Series A (growth) → Series B (scale) — each with larger investment.",
    example: "e.g. Series A typically follows product-market fit",
  },
  ARR: {
    term: "What is ARR?",
    emoji: "💵",
    desc: "Annual Recurring Revenue — predictable yearly revenue from subscriptions. Simply MRR × 12.",
    example: "e.g. $1M MRR × 12 = $12M ARR",
  },
};

// ─── 템플릿 타입 ─────────────────────────────────────────────────────
interface GoalTemplate {
  template: string;
  hints: Record<string, string>;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  inputBg: string;
  inputText: string;
  info?: TermInfo;
}

// ─── 예시 템플릿 ─────────────────────────────────────────────────────
const ANNUAL_TEMPLATES_KO: GoalTemplate[] = [
  {
    template: "매출 [N]억 달성",
    hints: { N: "목표 금액" },
    icon: <DollarSign size={15} />, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", inputBg: "bg-emerald-100", inputText: "text-emerald-700",
  },
  {
    template: "유료 고객 [N]명 확보",
    hints: { N: "목표 고객 수" },
    icon: <Users size={15} />, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", inputBg: "bg-blue-100", inputText: "text-blue-700",
  },
  {
    template: "시리즈 [N] 투자 유치",
    hints: { N: "시드 / A / B" },
    icon: <TrendingUp size={15} />, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", inputBg: "bg-orange-100", inputText: "text-orange-700",
    info: TERM_INFO_KO["시리즈"],
  },
  {
    template: "팀원 [N]명으로 확장",
    hints: { N: "목표 인원" },
    icon: <Users size={15} />, color: "text-pink-700", bg: "bg-pink-50", border: "border-pink-200", inputBg: "bg-pink-100", inputText: "text-pink-700",
  },
  {
    template: "제품 [버전] 출시",
    hints: { 버전: "예: v2.0" },
    icon: <Rocket size={15} />, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", inputBg: "bg-purple-100", inputText: "text-purple-700",
  },
  {
    template: "MRR [N]천만 원 달성",
    hints: { N: "목표 금액" },
    icon: <DollarSign size={15} />, color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200", inputBg: "bg-teal-100", inputText: "text-teal-700",
    info: TERM_INFO_KO["MRR"],
  },
  {
    template: "[국가/지역] 시장 진출",
    hints: { "국가/지역": "예: 일본, 동남아" },
    icon: <Star size={15} />, color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", inputBg: "bg-indigo-100", inputText: "text-indigo-700",
  },
  {
    template: "NPS 점수 [N]점 이상 달성",
    hints: { N: "목표 점수" },
    icon: <Star size={15} />, color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", inputBg: "bg-yellow-100", inputText: "text-yellow-700",
    info: TERM_INFO_KO["NPS"],
  },
];

const ANNUAL_TEMPLATES_EN: GoalTemplate[] = [
  {
    template: "Reach $[N]M ARR",
    hints: { N: "target amount" },
    icon: <DollarSign size={15} />, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", inputBg: "bg-emerald-100", inputText: "text-emerald-700",
    info: TERM_INFO_EN["ARR"],
  },
  {
    template: "Acquire [N] paid users",
    hints: { N: "target count" },
    icon: <Users size={15} />, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", inputBg: "bg-blue-100", inputText: "text-blue-700",
  },
  {
    template: "Close Series [N] funding",
    hints: { N: "Seed / A / B" },
    icon: <TrendingUp size={15} />, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", inputBg: "bg-orange-100", inputText: "text-orange-700",
    info: TERM_INFO_EN["Series"],
  },
  {
    template: "Grow team to [N] people",
    hints: { N: "target headcount" },
    icon: <Users size={15} />, color: "text-pink-700", bg: "bg-pink-50", border: "border-pink-200", inputBg: "bg-pink-100", inputText: "text-pink-700",
  },
  {
    template: "Launch product [version]",
    hints: { version: "e.g. v2.0" },
    icon: <Rocket size={15} />, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", inputBg: "bg-purple-100", inputText: "text-purple-700",
  },
  {
    template: "Reach $[N]K MRR",
    hints: { N: "target amount" },
    icon: <DollarSign size={15} />, color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200", inputBg: "bg-teal-100", inputText: "text-teal-700",
    info: TERM_INFO_EN["MRR"],
  },
  {
    template: "Enter [market] market",
    hints: { market: "e.g. Japan, SEA" },
    icon: <Star size={15} />, color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", inputBg: "bg-indigo-100", inputText: "text-indigo-700",
  },
  {
    template: "Achieve NPS score [N]+",
    hints: { N: "target score" },
    icon: <Star size={15} />, color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", inputBg: "bg-yellow-100", inputText: "text-yellow-700",
    info: TERM_INFO_EN["NPS"],
  },
];

const GOAL_COLORS = [
  { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: <Target size={15} /> },
  { color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", icon: <Flag size={15} /> },
  { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: <Rocket size={15} /> },
  { color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", icon: <TrendingUp size={15} /> },
  { color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200", icon: <Star size={15} /> },
];

// ─── 템플릿 파싱 유틸 ────────────────────────────────────────────────
function parseTemplate(template: string): (string | { key: string })[] {
  const parts: (string | { key: string })[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0, match;
  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) parts.push(template.slice(lastIndex, match.index));
    parts.push({ key: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) parts.push(template.slice(lastIndex));
  return parts;
}

function resolveTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\[([^\]]+)\]/g, (_, key) => values[key] || `[${key}]`);
}

function getBlankKeys(template: string): string[] {
  const keys: string[] = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(template)) !== null) keys.push(match[1]);
  return keys;
}

// ─── 용어 툴팁 컴포넌트 ─────────────────────────────────────────────
function TermTooltip({ info }: { info: TermInfo }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative inline-flex shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ? 버튼 */}
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center transition-all",
          open
            ? "bg-blue-500 text-white shadow-sm scale-110"
            : "bg-white/80 text-gray-400 hover:bg-blue-100 hover:text-blue-500 border border-gray-200 hover:border-blue-200"
        )}
        aria-label={`${info.term} 보기`}
      >
        <HelpCircle size={11} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full right-0 mb-2.5 w-60 z-50 pointer-events-auto"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            {/* 말풍선 꼬리 */}
            <div className="absolute -bottom-1.5 right-2 w-3 h-3 bg-gray-900 rotate-45 rounded-sm z-0" />

            <div className="relative bg-gray-900 rounded-xl p-3.5 shadow-2xl z-10">
              {/* 헤더 */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg leading-none">{info.emoji}</span>
                <span className="font-bold text-sm text-white leading-tight">{info.term}</span>
              </div>
              {/* 설명 */}
              <p className="text-xs text-gray-300 leading-relaxed mb-2.5">{info.desc}</p>
              {/* 예시 */}
              {info.example && (
                <div className="flex items-start gap-1.5 bg-gray-800 rounded-lg px-2.5 py-2">
                  <span className="text-gray-500 text-[10px] font-bold shrink-0 mt-0.5">EX</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{info.example}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 템플릿 카드 컴포넌트 ────────────────────────────────────────────
function TemplateGoalCard({
  tmpl, onAdd, isAdded,
}: {
  tmpl: GoalTemplate; onAdd: (title: string) => void; isAdded: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const keys = getBlankKeys(tmpl.template);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(keys.map((k) => [k, ""]))
  );
  const firstInputRef = useRef<HTMLInputElement>(null);
  const parts = parseTemplate(tmpl.template);
  const allFilled = keys.every((k) => values[k].trim() !== "");
  const finalTitle = resolveTemplate(tmpl.template, values);

  const handleOpen = () => {
    if (isAdded || expanded) return;
    setExpanded(true);
    setTimeout(() => firstInputRef.current?.focus(), 60);
  };

  const handleAdd = () => {
    if (!allFilled) return;
    onAdd(finalTitle);
    setExpanded(false);
    setValues(Object.fromEntries(keys.map((k) => [k, ""])));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && allFilled) handleAdd();
    if (e.key === "Escape") { setExpanded(false); setValues(Object.fromEntries(keys.map((k) => [k, ""]))); }
  };

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border overflow-visible transition-shadow",
        isAdded ? "opacity-60" : "cursor-pointer hover:shadow-sm",
        expanded ? "border-blue-300 shadow-md ring-1 ring-blue-200 bg-white" : cn(tmpl.border, tmpl.bg),
      )}
    >
      {/* 카드 상단 */}
      <div className="flex items-center gap-2 pr-2">
        <button
          onClick={handleOpen}
          disabled={isAdded || expanded}
          className="flex-1 flex items-center gap-3 px-3.5 py-3 text-left min-w-0"
        >
          {/* 아이콘 */}
          <div className={cn("p-1.5 rounded-lg shrink-0", tmpl.bg)}>
            <span className={tmpl.color}>{tmpl.icon}</span>
          </div>

          {/* 템플릿 텍스트 — 블랭크 강조 */}
          <span className="flex-1 flex flex-wrap items-center gap-x-0.5 text-sm leading-snug min-w-0">
            {parts.map((part, i) =>
              typeof part === "string" ? (
                <span key={i} className={cn("font-medium", isAdded ? "text-gray-500" : "text-gray-700")}>
                  {part}
                </span>
              ) : (
                <span
                  key={i}
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs border",
                    tmpl.inputBg, tmpl.inputText, tmpl.border
                  )}
                >
                  {values[part.key] || part.key}
                </span>
              )
            )}
          </span>

          {/* 추가 아이콘 */}
          {isAdded ? (
            <Check size={14} className="text-blue-500 shrink-0" />
          ) : (
            <Plus size={13} className={cn("shrink-0 transition-colors", expanded ? "text-blue-400" : "text-gray-300")} />
          )}
        </button>

        {/* ? 툴팁 버튼 — info 있을 때만 */}
        {tmpl.info && (
          <div className="relative shrink-0">
            <TermTooltip info={tmpl.info} />
          </div>
        )}
      </div>

      {/* 확장 영역 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 border-t border-blue-100 pt-3 space-y-2.5">
              {/* 블랭크 입력 */}
              {keys.map((key, ki) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold px-2 py-1 rounded-md shrink-0 border", tmpl.inputBg, tmpl.inputText, tmpl.border)}>
                    {key}
                  </span>
                  <input
                    ref={ki === 0 ? firstInputRef : undefined}
                    value={values[key]}
                    onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    placeholder={tmpl.hints[key]}
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-blue-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 placeholder:text-gray-300"
                  />
                </div>
              ))}

              {/* 미리보기 + 추가 */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-400 font-medium">미리보기: </span>
                  <span className={cn("text-xs font-semibold", allFilled ? "text-gray-800" : "text-gray-400")}>
                    {allFilled ? finalTitle : "블랭크를 채워주세요"}
                  </span>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!allFilled}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 flex items-center gap-1"
                >
                  <Check size={12} />
                  추가
                </button>
                <button
                  onClick={() => { setExpanded(false); setValues(Object.fromEntries(keys.map((k) => [k, ""]))); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 진행 바 ─────────────────────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            i < current ? "bg-blue-500 w-8" : i === current ? "bg-blue-300 w-8" : "bg-gray-200 w-4"
          )}
        />
      ))}
      <span className="text-xs text-gray-400 font-medium ml-1">{current + 1} / {total}</span>
    </div>
  );
}

// ─── 직접입력 ────────────────────────────────────────────────────────
function GoalInput({ onAdd, placeholder }: { onAdd: (t: string) => void; placeholder: string }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const submit = () => { const t = value.trim(); if (!t) return; onAdd(t); setValue(""); ref.current?.focus(); };
  return (
    <div className="flex gap-2">
      <input ref={ref} value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder={placeholder}
        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-700 placeholder:text-gray-300 bg-white transition-all" />
      <button onClick={submit} disabled={!value.trim()}
        className="px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0">
        <Plus size={15} />추가
      </button>
    </div>
  );
}

// ─── 분기/월 빠른추가 ─────────────────────────────────────────────────
function QuickAdd({ onAdd, placeholder, examples = [], compact = false }: {
  onAdd: (t: string) => void; placeholder: string; examples?: string[]; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const submit = () => { const t = value.trim(); if (!t) return; onAdd(t); setValue(""); setOpen(false); };
  if (!open) {
    return (
      <div className="space-y-1">
        {examples.slice(0, compact ? 1 : 2).map((ex, i) => (
          <button key={i} onClick={() => onAdd(ex)}
            className="w-full text-left text-[11px] text-gray-400 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50/50 transition-colors flex items-center gap-1.5 group">
            <Lightbulb size={10} className="text-yellow-400 shrink-0" />
            <span className="truncate">{ex}</span>
            <Plus size={9} className="ml-auto opacity-0 group-hover:opacity-100 shrink-0" />
          </button>
        ))}
        <button onClick={() => { setOpen(true); setTimeout(() => ref.current?.focus(), 50); }}
          className="w-full flex items-center gap-1.5 text-[11px] text-gray-300 hover:text-blue-500 px-2 py-1 rounded-lg hover:bg-blue-50/50 transition-colors">
          <Plus size={11} />{placeholder}
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-1.5">
      <input ref={ref} value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setOpen(false); setValue(""); } }}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white text-[11px] outline-none focus:ring-1 focus:ring-blue-300" />
      <button onClick={submit} className="px-2 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shrink-0"><Check size={12} /></button>
      <button onClick={() => { setOpen(false); setValue(""); }} className="px-1.5 py-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors shrink-0"><X size={12} /></button>
    </div>
  );
}

const QUARTER_EXAMPLE_KO: Record<string, string[]> = {
  "Q1": ["기초 계획 수립 및 팀 세팅", "초기 실행 스프린트 시작"],
  "Q2": ["중간 점검 및 전략 조정", "핵심 KPI 50% 달성"],
  "Q3": ["성장 가속화 집중 실행", "주요 마일스톤 달성"],
  "Q4": ["연간 목표 마무리 스퍼트", "성과 분석 및 회고"],
};

const MONTH_EXAMPLE_KO: Record<string, string[]> = {
  "Q1": ["목표 공유 및 킥오프", "핵심 지표 추적 시작", "분기 목표 달성 스프린트"],
  "Q2": ["전략 재검토 및 보완", "중간 성과 점검", "상반기 마무리"],
  "Q3": ["하반기 목표 재설정", "집중 실행 기간", "성과 가속화"],
  "Q4": ["연말 총력전 시작", "마지막 스퍼트", "연간 회고 및 내년 준비"],
};

const qColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  Q1: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400", border: "border-blue-100" },
  Q2: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400", border: "border-emerald-100" },
  Q3: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400", border: "border-orange-100" },
  Q4: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400", border: "border-purple-100" },
};

// ─── 메인 위자드 ─────────────────────────────────────────────────────
export function GoalSetupWizardPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [step, setStep] = useState(0);
  const currentYear = new Date().getFullYear();

  const [annualGoals, setAnnualGoals] = useState<AnnualGoal[]>([]);
  const [quarterGoals, setQuarterGoals] = useState<QuarterGoal[]>([]);
  const [monthGoals, setMonthGoals] = useState<MonthGoal[]>([]);
  const [expandedAnnual, setExpandedAnnual] = useState<string | null>(null);
  const [expandedQuarter, setExpandedQuarter] = useState<string | null>(null);

  const templates = language === "ko" ? ANNUAL_TEMPLATES_KO : ANNUAL_TEMPLATES_EN;

  const addAnnualGoal = (title: string) => {
    if (annualGoals.some((g) => g.title === title)) return;
    setAnnualGoals((prev) => [...prev, { id: `ag-${Date.now()}`, title }]);
  };
  const removeAnnualGoal = (id: string) => {
    setAnnualGoals((prev) => prev.filter((g) => g.id !== id));
    setQuarterGoals((prev) => prev.filter((g) => g.annualGoalId !== id));
  };
  const addQuarterGoal = (title: string, annualGoalId: string, quarter: "Q1"|"Q2"|"Q3"|"Q4") =>
    setQuarterGoals((prev) => [...prev, { id: `qg-${Date.now()}-${Math.random()}`, title, quarter, annualGoalId }]);
  const removeQuarterGoal = (id: string) => {
    setQuarterGoals((prev) => prev.filter((g) => g.id !== id));
    setMonthGoals((prev) => prev.filter((g) => g.quarterGoalId !== id));
  };
  const getQuarterGoals = (annualGoalId: string, quarter: string) =>
    quarterGoals.filter((g) => g.annualGoalId === annualGoalId && g.quarter === quarter);
  const addMonthGoal = (title: string, quarterGoalId: string, month: number) =>
    setMonthGoals((prev) => [...prev, { id: `mg-${Date.now()}-${Math.random()}`, title, month, quarterGoalId }]);
  const removeMonthGoal = (id: string) => setMonthGoals((prev) => prev.filter((g) => g.id !== id));
  const getMonthGoals = (quarterGoalId: string, month: number) =>
    monthGoals.filter((g) => g.quarterGoalId === quarterGoalId && g.month === month);

  useEffect(() => {
    if (step === 1 && annualGoals.length > 0) setExpandedAnnual(annualGoals[0].id);
    if (step === 2 && quarterGoals.length > 0) setExpandedQuarter(quarterGoals[0].id);
  }, [step]);

  const totalGoalsCount = annualGoals.length + quarterGoals.length + monthGoals.length;

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      {/* 헤더 */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => step === 0 ? navigate(-1) : setStep((s) => s - 1)}
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            {step === 0 ? (language === "ko" ? "돌아가기" : "Go back") : (language === "ko" ? "이전" : "Back")}
          </button>
          <StepBar current={step} total={4} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <AnimatePresence mode="wait">

          {/* ══ STEP 0: 연간 목표 ══ */}
          {step === 0 && (
            <motion.div key="step-0"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: "easeOut" }}>

              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full text-blue-600 text-xs font-semibold mb-4">
                  <Flag size={12} />
                  {language === "ko" ? `${currentYear}년 연간 목표` : `${currentYear} Annual Goals`}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug mb-3">
                  {language === "ko"
                    ? <>올해 달성하고 싶은<br /><span className="text-blue-500">사내 목표</span>는 무엇인가요? 🎯</>
                    : <>What goals do you want to<br /><span className="text-blue-500">achieve this year</span>? 🎯</>}
                </h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {language === "ko"
                    ? "핵심 목표를 1~3개 정도 설정해보세요. 예시 카드의 빈칸을 채워 바로 추가할 수 있어요."
                    : "Set 1-3 key goals. Fill in the blanks on the example cards to add them instantly."}
                </p>
              </div>

              {/* 직접 입력 */}
              <div className="mb-6">
                <GoalInput onAdd={addAnnualGoal}
                  placeholder={language === "ko" ? "직접 입력하기..." : "Type your own goal..."} />
              </div>

              {/* 추가된 목표 */}
              {annualGoals.length > 0 && (
                <div className="mb-6 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {language === "ko" ? "추가한 연간 목표" : "Your Annual Goals"}
                    <span className="ml-2 text-blue-500 font-bold">{annualGoals.length}</span>
                  </p>
                  {annualGoals.map((goal, i) => {
                    const c = GOAL_COLORS[i % GOAL_COLORS.length];
                    return (
                      <motion.div key={goal.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border bg-white shadow-sm", c.border)}>
                        <div className={cn("p-1.5 rounded-lg shrink-0", c.bg)}>
                          <span className={c.color}>{c.icon}</span>
                        </div>
                        <span className="flex-1 text-sm font-medium text-gray-800">{goal.title}</span>
                        <button onClick={() => removeAnnualGoal(goal.id)}
                          className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0">
                          <X size={14} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* 예시 템플릿 */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={14} className="text-yellow-500" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {language === "ko"
                      ? "예시 목표 — 빈칸을 눌러 채워보세요"
                      : "Example Goals — Click to fill in the blanks"}
                  </p>
                </div>
                {/* ? 안내 문구 */}
                <p className="text-[11px] text-gray-400 mb-3 flex items-center gap-1.5">
                  <HelpCircle size={11} className="text-gray-300" />
                  {language === "ko"
                    ? "용어가 궁금하면 카드 오른쪽의 ? 버튼을 눌러보세요"
                    : "Hover the ? button on cards to learn about each term"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map((tmpl, i) => (
                    <TemplateGoalCard key={i} tmpl={tmpl} onAdd={addAnnualGoal} isAdded={false} />
                  ))}
                </div>
              </div>

              {/* 다음 버튼 */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {annualGoals.length === 0
                    ? (language === "ko" ? "목표를 1개 이상 추가해주세요" : "Add at least 1 goal")
                    : (language === "ko" ? `${annualGoals.length}개의 연간 목표 설정됨` : `${annualGoals.length} goal${annualGoals.length > 1 ? "s" : ""} added`)}
                </p>
                <button onClick={() => setStep(1)} disabled={annualGoals.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md">
                  {language === "ko" ? "분기 목표 설정" : "Set Quarterly Goals"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ══ STEP 1: 분기 목표 ══ */}
          {step === 1 && (
            <motion.div key="step-1"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: "easeOut" }}>

              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-full text-purple-600 text-xs font-semibold mb-4">
                  <Milestone size={12} />
                  {language === "ko" ? "분기별 목표" : "Quarterly Goals"}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug mb-3">
                  {language === "ko"
                    ? <>연간 목표를<br /><span className="text-purple-500">분기로 쪼개</span>볼까요? 📅</>
                    : <>Break annual goals into<br /><span className="text-purple-500">quarters</span>! 📅</>}
                </h1>
                <p className="text-gray-500 text-sm">
                  {language === "ko" ? "각 연간 목표를 클릭해 Q1~Q4 마일스톤을 입력하세요." : "Click each annual goal to add Q1~Q4 milestones."}
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {annualGoals.map((ag, agIdx) => {
                  const agColor = GOAL_COLORS[agIdx % GOAL_COLORS.length];
                  const isExpanded = expandedAnnual === ag.id;
                  return (
                    <div key={ag.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <button onClick={() => setExpandedAnnual(isExpanded ? null : ag.id)}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className={cn("p-1.5 rounded-lg shrink-0", agColor.bg)}>
                          <span className={agColor.color}>{agColor.icon}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[10px] text-gray-400 mb-0.5">{language === "ko" ? "연간 목표" : "Annual"}</p>
                          <p className="text-sm font-semibold text-gray-800">{ag.title}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-400">{quarterGoals.filter((q) => q.annualGoalId === ag.id).length}개</span>
                          <ChevronRight size={16} className={cn("text-gray-300 transition-transform", isExpanded && "rotate-90")} />
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                            <div className="px-5 pb-5 border-t border-gray-50">
                              <div className="grid grid-cols-2 gap-3 mt-4">
                                {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => {
                                  const goals = getQuarterGoals(ag.id, q);
                                  const qc = qColors[q];
                                  return (
                                    <div key={q} className="bg-gray-50 rounded-xl p-3">
                                      <div className="flex items-center gap-1.5 mb-2.5">
                                        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-bold", qc.bg, qc.text)}>{q}</span>
                                        <span className="text-[10px] text-gray-400">
                                          {q === "Q1" ? "1~3월" : q === "Q2" ? "4~6월" : q === "Q3" ? "7~9월" : "10~12월"}
                                        </span>
                                      </div>
                                      {goals.map((qg) => (
                                        <div key={qg.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 mb-1.5 border border-gray-100">
                                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", qc.dot)} />
                                          <span className="text-xs text-gray-700 flex-1 line-clamp-1">{qg.title}</span>
                                          <button onClick={() => removeQuarterGoal(qg.id)} className="text-gray-300 hover:text-red-400"><X size={11} /></button>
                                        </div>
                                      ))}
                                      <QuickAdd
                                        onAdd={(t) => addQuarterGoal(t, ag.id, q)}
                                        placeholder={language === "ko" ? `${q} 목표 추가...` : `Add ${q} goal...`}
                                        examples={QUARTER_EXAMPLE_KO[q] || []}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {quarterGoals.length === 0
                    ? (language === "ko" ? "분기 목표를 입력하거나 건너뛰세요" : "Add quarterly goals or skip")
                    : (language === "ko" ? `${quarterGoals.length}개의 분기 목표 설정됨` : `${quarterGoals.length} quarterly goals added`)}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-all">
                    {language === "ko" ? "건너뛰기" : "Skip"}
                  </button>
                  <button onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-all shadow-sm">
                    {language === "ko" ? "월간 목표 설정" : "Set Monthly Goals"}<ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ STEP 2: 월간 목표 ══ */}
          {step === 2 && (
            <motion.div key="step-2"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: "easeOut" }}>

              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full text-emerald-600 text-xs font-semibold mb-4">
                  <Calendar size={12} />
                  {language === "ko" ? "월간 목표" : "Monthly Goals"}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug mb-3">
                  {language === "ko"
                    ? <>분기 목표를<br /><span className="text-emerald-500">월별로 세분화</span>해볼까요? 📆</>
                    : <>Break quarterly goals into<br /><span className="text-emerald-500">monthly plans</span>! 📆</>}
                </h1>
                <p className="text-gray-500 text-sm">
                  {language === "ko" ? "각 분기 목표를 클릭해 월별 실행 계획을 입력하세요." : "Click each quarterly goal to add monthly action plans."}
                </p>
              </div>

              {quarterGoals.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                  <Calendar size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm">{language === "ko" ? "분기 목표가 없어요. 건너뛰세요." : "No quarterly goals. Skip this step."}</p>
                </div>
              ) : (
                <div className="space-y-3 mb-8">
                  {quarterGoals.map((qg) => {
                    const isExpanded = expandedQuarter === qg.id;
                    const parentAg = annualGoals.find((ag) => ag.id === qg.annualGoalId);
                    const qc = qColors[qg.quarter];
                    const months = qg.quarter === "Q1" ? [1,2,3] : qg.quarter === "Q2" ? [4,5,6] : qg.quarter === "Q3" ? [7,8,9] : [10,11,12];
                    const monthNames = language === "ko"
                      ? ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"]
                      : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    const exLines = MONTH_EXAMPLE_KO[qg.quarter] || [];

                    return (
                      <div key={qg.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <button onClick={() => setExpandedQuarter(isExpanded ? null : qg.id)}
                          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold shrink-0", qc.bg, qc.text)}>{qg.quarter}</span>
                          <div className="flex-1 text-left">
                            {parentAg && <p className="text-[10px] text-gray-400 mb-0.5 truncate">↳ {parentAg.title}</p>}
                            <p className="text-sm font-semibold text-gray-800">{qg.title}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-gray-400">{monthGoals.filter((m) => m.quarterGoalId === qg.id).length}개</span>
                            <ChevronRight size={16} className={cn("text-gray-300 transition-transform", isExpanded && "rotate-90")} />
                          </div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                              <div className="px-5 pb-5 border-t border-gray-50">
                                <div className="grid grid-cols-3 gap-2.5 mt-4">
                                  {months.map((month, mi) => {
                                    const mGoals = getMonthGoals(qg.id, month);
                                    return (
                                      <div key={month} className="bg-gray-50 rounded-xl p-3">
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <div className={cn("w-1.5 h-1.5 rounded-full", qc.dot)} />
                                          <span className="text-xs font-bold text-gray-600">{monthNames[month - 1]}</span>
                                        </div>
                                        {mGoals.map((mg) => (
                                          <div key={mg.id} className="flex items-start gap-1.5 bg-white rounded-lg px-2 py-1.5 mb-1.5 border border-gray-100">
                                            <Check size={10} className="text-emerald-500 mt-0.5 shrink-0" />
                                            <span className="text-[11px] text-gray-700 flex-1 leading-snug">{mg.title}</span>
                                            <button onClick={() => removeMonthGoal(mg.id)} className="text-gray-300 hover:text-red-400 shrink-0"><X size={10} /></button>
                                          </div>
                                        ))}
                                        <QuickAdd
                                          onAdd={(t) => addMonthGoal(t, qg.id, month)}
                                          placeholder={language === "ko" ? `${monthNames[month-1]} 계획...` : `${monthNames[month-1]}...`}
                                          examples={exLines[mi] ? [exLines[mi]] : []}
                                          compact
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {monthGoals.length === 0
                    ? (language === "ko" ? "월간 계획을 입력하거나 건너뛰세요" : "Add monthly plans or skip")
                    : (language === "ko" ? `${monthGoals.length}개의 월간 계획 설정됨` : `${monthGoals.length} monthly plans added`)}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setStep(3)} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-all">
                    {language === "ko" ? "건너뛰기" : "Skip"}
                  </button>
                  <button onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-all shadow-sm">
                    {language === "ko" ? "완료하기" : "Finish"}<Sparkles size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ STEP 3: 완료 ══ */}
          {step === 3 && (
            <motion.div key="step-3"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }} className="text-center">

              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }} className="text-6xl mb-6">🎉</motion.div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                {language === "ko" ? "목표 설정 완료!" : "Goals Set!"}
              </h1>
              <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
                {language === "ko"
                  ? `총 ${totalGoalsCount}개의 목표가 설정됐어요. 이제 실행만 남았습니다! 💪`
                  : `You've set ${totalGoalsCount} goals total. Time to execute! 💪`}
              </p>

              <div className="grid grid-cols-3 gap-3 mb-8 max-w-sm mx-auto">
                {[
                  { count: annualGoals.length, label: language === "ko" ? "연간 목표" : "Annual", icon: <Flag size={16} />, color: "text-blue-600", bg: "bg-blue-50" },
                  { count: quarterGoals.length, label: language === "ko" ? "분기 목표" : "Quarterly", icon: <Milestone size={16} />, color: "text-purple-600", bg: "bg-purple-50" },
                  { count: monthGoals.length, label: language === "ko" ? "월간 계획" : "Monthly", icon: <Calendar size={16} />, color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2", item.bg)}>
                      <span className={item.color}>{item.icon}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-0.5">{item.count}</div>
                    <div className="text-[10px] text-gray-400 font-medium">{item.label}</div>
                  </div>
                ))}
              </div>

              {annualGoals.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8 text-left">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    {language === "ko" ? "설정한 목표 구조" : "Your Goal Structure"}
                  </p>
                  <div className="space-y-3">
                    {annualGoals.map((ag, i) => {
                      const c = GOAL_COLORS[i % GOAL_COLORS.length];
                      const agQGoals = quarterGoals.filter((q) => q.annualGoalId === ag.id);
                      return (
                        <div key={ag.id}>
                          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border", c.border, c.bg)}>
                            <span className={c.color}>{c.icon}</span>
                            <span className={cn("text-sm font-semibold flex-1", c.color)}>{ag.title}</span>
                            <span className="text-[10px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded-full">
                              {language === "ko" ? "연간" : "Annual"}
                            </span>
                          </div>
                          {agQGoals.length > 0 && (
                            <div className="ml-4 mt-1.5 space-y-1">
                              {agQGoals.map((qg) => {
                                const qc = qColors[qg.quarter];
                                const mgList = monthGoals.filter((m) => m.quarterGoalId === qg.id);
                                return (
                                  <div key={qg.id}>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", qc.bg, qc.text)}>{qg.quarter}</span>
                                      <span className="text-xs text-gray-600 flex-1">{qg.title}</span>
                                    </div>
                                    {mgList.length > 0 && (
                                      <div className="ml-4 mt-0.5 space-y-0.5">
                                        {mgList.map((mg) => (
                                          <div key={mg.id} className="flex items-center gap-1.5 px-2.5 py-1">
                                            <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                                            <span className="text-[11px] text-gray-500">{mg.title}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => navigate("/goals")}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-all shadow-sm hover:shadow-md">
                  <Target size={16} />
                  {language === "ko" ? "전략 페이지에서 확인" : "View in Strategy"}
                </button>
                <button onClick={() => navigate("/")}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                  {language === "ko" ? "대시보드로 이동" : "Go to Dashboard"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
