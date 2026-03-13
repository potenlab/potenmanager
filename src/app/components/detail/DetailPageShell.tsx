import { useState, ReactNode } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Trash2, ChevronDown, LayoutGrid, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useLanguage } from "../../context/LanguageContext";
import { usePagePresence } from "../../context/PresenceContext";
import { ShareButton } from "./ShareButton";

// ─── Types ──────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  path?: string;  // if clickable
}

interface DetailPageShellProps {
  /** Share link type: 'task' | 'meeting' | 'project' | 'brand' | 'library' | 'radar' | 'board' */
  shareType: string;
  /** Item ID for share link */
  itemId: string;
  /** Current user ID for share link createdBy */
  currentUserId: string;

  /** Back navigation path (e.g., '/meetings') */
  backPath: string;
  /** Back button label (e.g., '회의 목록') */
  backLabel: string;
  /** Optional breadcrumb trail (shown after back button) */
  breadcrumbs?: BreadcrumbItem[];

  /** Delete handler — if provided, shows delete button */
  onDelete?: () => void;
  /** Extra action buttons (placed before share/delete) */
  extraActions?: ReactNode;

  /** Title section — typically InlineText or InlineTitle */
  title: ReactNode;
  /** Optional content between title and properties (e.g., logo+title row) */
  titlePrefix?: ReactNode;

  /** Primary properties — always visible */
  properties?: ReactNode;
  /** Secondary properties — collapsed by default with "more" toggle */
  secondaryProperties?: ReactNode;
  /** Whether properties are collapsible (default: true) */
  collapsible?: boolean;
  /** Collapsed preview badges (shown when collapsed) */
  collapsedPreview?: ReactNode;
  /** Default expanded state (default: true) */
  defaultExpanded?: boolean;

  /** Main body content (description, notes, etc.) */
  children: ReactNode;

  /** Use narrow 3xl max-width for content (default: true) */
  narrow?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

export function DetailPageShell({
  shareType,
  itemId,
  currentUserId,
  backPath,
  backLabel,
  breadcrumbs,
  onDelete,
  extraActions,
  title,
  titlePrefix,
  properties,
  secondaryProperties,
  collapsible = true,
  collapsedPreview,
  defaultExpanded = true,
  children,
  narrow = true,
}: DetailPageShellProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";
  const [propsExpanded, setPropsExpanded] = useState(secondaryProperties ? false : defaultExpanded);
  const viewers = usePagePresence(itemId);
  const [wide, setWide] = useState(() => {
    try { return localStorage.getItem("poten_detail_wide") === "true"; } catch { return false; }
  });
  const toggleWide = () => {
    const next = !wide;
    setWide(next);
    try { localStorage.setItem("poten_detail_wide", String(next)); } catch {}
  };

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className={cn("mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-64 transition-all duration-300", wide ? "max-w-full" : "max-w-6xl")}>

        {/* ── Navigation + Actions ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1.5 text-sm text-gray-400 min-w-0">
            <button
              onClick={() => navigate(backPath)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors shrink-0 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>{backLabel}</span>
            </button>
            {breadcrumbs?.map((bc, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                <span className="text-gray-300">/</span>
                {bc.path ? (
                  <button
                    onClick={() => navigate(bc.path!)}
                    className="hover:text-gray-900 transition-colors truncate max-w-[200px]"
                  >
                    {bc.label}
                  </button>
                ) : (
                  <span className="text-gray-700 font-medium truncate max-w-[200px]">{bc.label}</span>
                )}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Page viewers (Notion-style) */}
            {viewers.length > 0 && (
              <div className="flex items-center gap-1 mr-1">
                <div className="flex -space-x-1.5">
                  {viewers.slice(0, 4).map((v) => (
                    <div key={v.userId} className="relative group">
                      {v.avatar ? (
                        <img
                          src={v.avatar}
                          alt={v.name}
                          className="w-6 h-6 rounded-full ring-2 ring-white object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                          {v.name?.[0] || "?"}
                        </div>
                      )}
                      {/* Online dot */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-white" />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {v.name} — {ko ? "보는 중" : "viewing"}
                      </div>
                    </div>
                  ))}
                  {viewers.length > 4 && (
                    <div className="w-6 h-6 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500">
                      +{viewers.length - 4}
                    </div>
                  )}
                </div>
              </div>
            )}
            {extraActions}
            {narrow && (
              <button
                onClick={toggleWide}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                title={wide ? (ko ? "기본 너비" : "Default width") : (ko ? "넓게 보기" : "Full width")}
              >
                {wide ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            )}
            <ShareButton type={shareType} itemId={itemId} createdBy={currentUserId} />
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className={cn("transition-all duration-300", narrow && !wide ? "max-w-3xl" : undefined)}>
          <div className="space-y-6">

            {/* Title prefix (e.g., logo) */}
            {titlePrefix}

            {/* Title */}
            {title}

            {/* Properties — 2-tier layout */}
            {properties && (
              <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
                {/* Primary properties — always visible */}
                <div className="divide-y divide-gray-100">
                  {properties}
                </div>

                {/* Secondary properties — collapsed by default */}
                {secondaryProperties && (
                  <>
                    <button
                      onClick={() => setPropsExpanded((p) => !p)}
                      className="w-full flex items-center justify-between px-4 py-2 border-t border-gray-100 hover:bg-gray-100/50 transition-colors"
                    >
                      <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5">
                        {ko ? "더보기" : "More"}
                      </span>
                      <div className="flex items-center gap-2">
                        {!propsExpanded && collapsedPreview}
                        <ChevronDown
                          size={12}
                          className={cn(
                            "text-gray-400 transition-transform duration-200",
                            propsExpanded && "rotate-180"
                          )}
                        />
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {propsExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="divide-y divide-gray-100 border-t border-gray-100">
                            {secondaryProperties}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

                {/* If no secondary properties but collapsible, use old behavior */}
                {!secondaryProperties && collapsible && (
                  <>
                    <button
                      onClick={() => setPropsExpanded((p) => !p)}
                      className="w-full flex items-center justify-between px-4 py-2 border-t border-gray-100 hover:bg-gray-100/50 transition-colors"
                    >
                      <span className="text-[11px] font-medium text-gray-400">
                        {propsExpanded ? (ko ? "접기" : "Collapse") : (ko ? "펼치기" : "Expand")}
                      </span>
                      <ChevronDown
                        size={12}
                        className={cn(
                          "text-gray-400 transition-transform duration-200",
                          propsExpanded && "rotate-180"
                        )}
                      />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Body */}
            {children}

          </div>
        </div>
      </div>
    </div>
  );
}
