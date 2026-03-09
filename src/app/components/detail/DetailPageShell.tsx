import { useState, ReactNode } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Trash2, ChevronDown, LayoutGrid } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useLanguage } from "../../context/LanguageContext";
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

  /** Properties section content (PropertyItem elements) */
  properties?: ReactNode;
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
  collapsible = true,
  collapsedPreview,
  defaultExpanded = true,
  children,
  narrow = true,
}: DetailPageShellProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";
  const [propsExpanded, setPropsExpanded] = useState(defaultExpanded);

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl py-4 sm:py-7 px-4 sm:px-8 pb-64">

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
            {extraActions}
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
        <div className={narrow ? "max-w-3xl" : undefined}>
          <div className="space-y-6">

            {/* Title prefix (e.g., logo) */}
            {titlePrefix}

            {/* Title */}
            {title}

            {/* Properties */}
            {properties && (
              collapsible ? (
                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setPropsExpanded((p) => !p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-100/50 transition-colors"
                  >
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <LayoutGrid size={12} />
                      {ko ? "속성" : "Properties"}
                    </span>
                    <div className="flex items-center gap-2">
                      {!propsExpanded && collapsedPreview}
                      <ChevronDown
                        size={14}
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
                          {properties}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                  {properties}
                </div>
              )
            )}

            {/* Body */}
            {children}

          </div>
        </div>
      </div>
    </div>
  );
}
