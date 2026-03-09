import { useState, useEffect } from "react";
import { useParams } from "react-router";
import {
  Globe, Calendar, Clock, MapPin, Users, CheckCircle2, Circle,
  Tag, Flag, User as UserIcon, Loader2, AlertCircle, ExternalLink,
  CircleDot, Video, Star, Sun, Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { api } from "../../lib/api";
import { TASK_CATEGORY_CONFIG } from "../../lib/jobRoles";

// ─── Type configs (read-only copies) ────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "To Do", color: "text-amber-600", bg: "bg-amber-50" },
  "in-progress": { label: "In Progress", color: "text-blue-600", bg: "bg-blue-50" },
  delayed: { label: "Delayed", color: "text-red-600", bg: "bg-red-50" },
  completed: { label: "Completed", color: "text-emerald-600", bg: "bg-emerald-50" },
  scheduled: { label: "Scheduled", color: "text-blue-600", bg: "bg-blue-50" },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-100" },
};

const MEETING_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  standup: { label: "Standup", color: "text-green-600" },
  planning: { label: "Planning", color: "text-blue-600" },
  review: { label: "Review", color: "text-purple-600" },
  brainstorm: { label: "Brainstorm", color: "text-amber-600" },
  external: { label: "External", color: "text-cyan-600" },
  event: { label: "Event", color: "text-rose-600" },
  other: { label: "Other", color: "text-gray-600" },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "text-gray-600", bg: "bg-gray-100" },
  medium: { label: "Medium", color: "text-amber-600", bg: "bg-amber-50" },
  high: { label: "High", color: "text-red-600", bg: "bg-red-50" },
};

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError("Invalid link"); setLoading(false); return; }
    api.getShare(token)
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-gray-500">
        <AlertCircle size={48} className="text-gray-300" />
        <p className="text-lg font-medium">공유 링크를 찾을 수 없습니다</p>
        <p className="text-sm text-gray-400">Share link not found or expired</p>
      </div>
    );
  }

  const { share, item, members } = data;
  const getMemberName = (id: string) => members?.find((m: any) => m.id === id)?.name || id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Globe size={16} />
            <span className="font-medium">Poten Manager</span>
            <span className="text-gray-300 mx-1">·</span>
            <span className="text-gray-400">Shared view</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {share.type === "task" ? (
            <TaskShareView item={item} getMemberName={getMemberName} />
          ) : share.type === "meeting" ? (
            <MeetingShareView item={item} getMemberName={getMemberName} />
          ) : (
            <GenericShareView item={item} type={share.type} getMemberName={getMemberName} />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-400">
          Shared from Poten Manager · {new Date(share.createdAt).toLocaleDateString()}
        </div>
      </main>
    </div>
  );
}

// ─── Task Share View ────────────────────────────────────────────────
function TaskShareView({ item, getMemberName }: { item: any; getMemberName: (id: string) => string }) {
  const status = STATUS_LABELS[item.status] || STATUS_LABELS.pending;
  const priority = PRIORITY_LABELS[item.priority] || PRIORITY_LABELS.medium;
  const catConfig = item.category ? (TASK_CATEGORY_CONFIG as any)[item.category] : null;

  return (
    <div className="p-6 sm:p-8">
      {/* Status + Priority badges */}
      <div className="flex items-center gap-2 mb-4">
        <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", status.bg, status.color)}>
          {status.label}
        </span>
        <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", priority.bg, priority.color)}>
          <Flag size={10} className="inline mr-1" />{priority.label}
        </span>
        {catConfig && (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">
            {catConfig.labelKo || catConfig.label}
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{item.title || item.titleKo || "Untitled"}</h1>

      {/* Properties */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 mb-6">
        {item.assigneeIds?.length > 0 && (
          <PropertyRow icon={<Users size={14} />} label="Assignees">
            <div className="flex flex-wrap gap-1.5">
              {item.assigneeIds.map((id: string) => (
                <span key={id} className="px-2 py-0.5 bg-white rounded-md text-xs font-medium text-gray-700 border border-gray-200">
                  {getMemberName(id)}
                </span>
              ))}
            </div>
          </PropertyRow>
        )}
        {(item.startDate || item.dueDate || item.endDate) && (
          <PropertyRow icon={<Calendar size={14} />} label="Date">
            <span className="text-sm text-gray-700">
              {item.startDate && formatDate(item.startDate)}
              {(item.endDate || item.dueDate) && ` → ${formatDate(item.endDate || item.dueDate)}`}
            </span>
          </PropertyRow>
        )}
        {item.estimatedTime && (
          <PropertyRow icon={<Clock size={14} />} label="Estimated">
            <span className="text-sm text-gray-700">{item.estimatedTime}min</span>
          </PropertyRow>
        )}
      </div>

      {/* Description */}
      {item.description && (
        <div className="prose prose-sm max-w-none">
          <RenderedBlocks content={item.description} />
        </div>
      )}
    </div>
  );
}

// ─── Meeting Share View ─────────────────────────────────────────────
function MeetingShareView({ item, getMemberName }: { item: any; getMemberName: (id: string) => string }) {
  const status = STATUS_LABELS[item.status] || STATUS_LABELS.scheduled;
  const typeInfo = MEETING_TYPE_LABELS[item.type] || MEETING_TYPE_LABELS.other;
  const date = new Date(item.date);

  return (
    <div className="p-6 sm:p-8">
      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", status.bg, status.color)}>
          {status.label}
        </span>
        <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100", typeInfo.color)}>
          {typeInfo.label}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{item.title || "Untitled Meeting"}</h1>

      {/* Properties */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 mb-6">
        <PropertyRow icon={<Calendar size={14} />} label="Date & Time">
          <span className="text-sm text-gray-700">
            {date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            {" "}
            {date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </PropertyRow>
        <PropertyRow icon={<Clock size={14} />} label="Duration">
          <span className="text-sm text-gray-700">{item.duration}min</span>
        </PropertyRow>
        {item.location && (
          <PropertyRow icon={<MapPin size={14} />} label="Location">
            <span className="text-sm text-gray-700">{item.location}</span>
          </PropertyRow>
        )}
        {item.attendeeIds?.length > 0 && (
          <PropertyRow icon={<Users size={14} />} label="Attendees">
            <div className="flex flex-wrap gap-1.5">
              {item.attendeeIds.map((id: string) => (
                <span key={id} className="px-2 py-0.5 bg-white rounded-md text-xs font-medium text-gray-700 border border-gray-200">
                  {getMemberName(id)}
                </span>
              ))}
            </div>
          </PropertyRow>
        )}
        {item.organizerId && (
          <PropertyRow icon={<UserIcon size={14} />} label="Organizer">
            <span className="text-sm text-gray-700">{getMemberName(item.organizerId)}</span>
          </PropertyRow>
        )}
      </div>

      {/* Notes */}
      {item.notes && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Notes</h3>
          <div className="prose prose-sm max-w-none">
            <RenderedBlocks content={item.notes} />
          </div>
        </div>
      )}

      {/* Action Items */}
      {item.actionItems?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Action Items</h3>
          <div className="space-y-2">
            {item.actionItems.map((ai: any) => (
              <div key={ai.id} className="flex items-start gap-2.5 py-2 px-3 bg-gray-50 rounded-lg">
                {ai.done ? (
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle size={16} className="text-gray-300 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", ai.done ? "line-through text-gray-400" : "text-gray-700")}>{ai.title}</p>
                  {ai.assigneeId && (
                    <p className="text-xs text-gray-400 mt-0.5">{getMemberName(ai.assigneeId)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Generic Share View (projects, brands, library, etc.) ───────────
function GenericShareView({ item, type, getMemberName }: { item: any; type: string; getMemberName: (id: string) => string }) {
  const title = item.title || item.name || "Untitled";
  const description = item.description || item.notes || "";

  return (
    <div className="p-6 sm:p-8">
      {/* Type badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 capitalize">
          {type}
        </span>
        {item.status && (
          <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold",
            (STATUS_LABELS[item.status] || STATUS_LABELS.pending).bg,
            (STATUS_LABELS[item.status] || STATUS_LABELS.pending).color
          )}>
            {(STATUS_LABELS[item.status] || STATUS_LABELS.pending).label}
          </span>
        )}
        {item.category && (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">
            {item.category}
          </span>
        )}
      </div>

      {/* Image if present */}
      {(item.imageUrl || item.logoUrl) && (
        <div className="mb-6">
          <img
            src={item.imageUrl || item.logoUrl}
            alt={title}
            className="w-full max-h-64 object-cover rounded-xl border border-gray-100"
          />
        </div>
      )}

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>

      {/* Properties */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 mb-6">
        {item.memberIds?.length > 0 && (
          <PropertyRow icon={<Users size={14} />} label="Members">
            <div className="flex flex-wrap gap-1.5">
              {item.memberIds.map((id: string) => (
                <span key={id} className="px-2 py-0.5 bg-white rounded-md text-xs font-medium text-gray-700 border border-gray-200">
                  {getMemberName(id)}
                </span>
              ))}
            </div>
          </PropertyRow>
        )}
        {(item.startDate || item.endDate) && (
          <PropertyRow icon={<Calendar size={14} />} label="Date">
            <span className="text-sm text-gray-700">
              {item.startDate && formatDate(item.startDate)}
              {item.endDate && ` → ${formatDate(item.endDate)}`}
            </span>
          </PropertyRow>
        )}
        {item.url && (
          <PropertyRow icon={<ExternalLink size={14} />} label="Link">
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
              {item.url}
            </a>
          </PropertyRow>
        )}
        {item.client && (
          <PropertyRow icon={<UserIcon size={14} />} label="Client">
            <span className="text-sm text-gray-700">{item.client}</span>
          </PropertyRow>
        )}
        {item.budget && (
          <PropertyRow icon={<Tag size={14} />} label="Budget">
            <span className="text-sm text-gray-700">{item.budget}</span>
          </PropertyRow>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className="prose prose-sm max-w-none">
          <RenderedBlocks content={description} />
        </div>
      )}

      {/* Links */}
      {item.links?.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Links</h3>
          <div className="space-y-2">
            {item.links.map((link: any, i: number) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink size={12} />
                {link.label || link.url}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────
function PropertyRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="text-xs font-semibold text-gray-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function formatDate(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

// Render NotionBlockEditor content as read-only
function RenderedBlocks({ content }: { content: string }) {
  if (!content) return null;

  // Try to parse as JSON blocks (NotionBlockEditor format)
  try {
    const blocks = JSON.parse(content);
    if (Array.isArray(blocks)) {
      return (
        <div className="space-y-1.5">
          {blocks.map((block: any, i: number) => (
            <RenderBlock key={block.id || i} block={block} />
          ))}
        </div>
      );
    }
  } catch {
    // Plain text fallback
  }

  // Plain text
  return (
    <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
      {content}
    </div>
  );
}

function RenderBlock({ block }: { block: any }) {
  const text = block.content || "";
  switch (block.type) {
    case "heading1":
      return <h2 className="text-xl font-bold text-gray-900 mt-4 mb-2">{text}</h2>;
    case "heading2":
      return <h3 className="text-lg font-bold text-gray-900 mt-3 mb-1.5">{text}</h3>;
    case "heading3":
      return <h4 className="text-base font-bold text-gray-900 mt-2 mb-1">{text}</h4>;
    case "bullet":
      return (
        <div className="flex gap-2 text-sm text-gray-700">
          <span className="text-gray-400 shrink-0 mt-0.5">•</span>
          <span>{text}</span>
        </div>
      );
    case "numbered":
      return (
        <div className="flex gap-2 text-sm text-gray-700">
          <span className="text-gray-400 shrink-0 mt-0.5">{(block.number || 1)}.</span>
          <span>{text}</span>
        </div>
      );
    case "todo":
      return (
        <div className="flex items-start gap-2 text-sm">
          {block.checked ? (
            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
          ) : (
            <Circle size={16} className="text-gray-300 mt-0.5 shrink-0" />
          )}
          <span className={block.checked ? "line-through text-gray-400" : "text-gray-700"}>{text}</span>
        </div>
      );
    case "quote":
      return (
        <blockquote className="border-l-3 border-gray-300 pl-3 text-sm text-gray-600 italic my-2">
          {text}
        </blockquote>
      );
    case "divider":
      return <hr className="border-gray-200 my-3" />;
    case "code":
      return (
        <pre className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs font-mono text-gray-700 overflow-x-auto my-2">
          {text}
        </pre>
      );
    default:
      if (!text) return <div className="h-2" />;
      return <p className="text-sm text-gray-700 leading-relaxed">{text}</p>;
  }
}
