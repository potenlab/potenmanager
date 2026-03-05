import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Loader2,
  X,
  Layout,
  Trash2,
  StickyNote,
  MessageSquare,
  Lightbulb,
  Pin,
  PinOff,
  User as UserIcon,
  Calendar,
  Tag,
  Upload,
  File as FileIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Attachment } from "../../lib/mockData";
import { api } from "../../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { useInvite } from "../context/InviteContext";
import { usePermission } from "../context/PermissionContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { InlineText } from "../components/detail/InlineText";
import { InlineDropdown } from "../components/detail/InlineDropdown";
import { PropertyItem } from "../components/detail/PropertyItem";
import { AttachmentSection, getAttachmentIcon } from "../components/detail/AttachmentSection";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";

// ─── Types ───────────────────────────────────────────────────────────
type BoardItemType = "memo" | "notice" | "idea" | "request";

interface BoardItem {
  id: string;
  type: BoardItemType;
  title: string;
  content: string;
  description?: string;
  attachments?: Attachment[];
  pinned?: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

const TYPE_CONFIG: Record<BoardItemType, { label: string; labelKo: string; icon: React.ReactNode; color: string; bg: string }> = {
  memo:    { label: "Memo",    labelKo: "메모",     icon: <StickyNote size={14} />, color: "text-blue-600",    bg: "bg-blue-50" },
  notice:  { label: "Notice",  labelKo: "공지",     icon: <MessageSquare size={14} />, color: "text-amber-600",  bg: "bg-amber-50" },
  idea:    { label: "Idea",    labelKo: "아이디어", icon: <Lightbulb size={14} />,  color: "text-purple-600",  bg: "bg-purple-50" },
  request: { label: "Request", labelKo: "요청",     icon: <Tag size={14} />,        color: "text-emerald-600", bg: "bg-emerald-50" },
};

// ─── Main Page ──────────────────────────────────────────────────────
export function TeamBoardDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === 'ko';
  const { org } = useInvite();
  const { currentUser, can } = usePermission();

  const orgId = org?.id;
  const isNew = itemId === 'new';

  // State
  const [item, setItem] = useState<BoardItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<BoardItemType>('memo');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pinned, setPinned] = useState(false);
  const [propsExpanded, setPropsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Permission
  const canEdit = item ? (item.createdBy === currentUser.id || can('org.edit')) : true;
  const canDelete = canEdit;

  // Create new item
  const createdRef = useRef(false);
  useEffect(() => {
    if (isNew && !createdRef.current && orgId) {
      createdRef.current = true;
      const newItem = {
        type: 'memo' as BoardItemType,
        title: '',
        content: '',
        description: '',
        attachments: [],
        pinned: false,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
      };
      api.createTeamBoardItem(orgId, newItem).then((created) => {
        setItem(created);
        setTitle('');
        setType(created.type || 'memo');
        setLoading(false);
        navigate(`/board/${created.id}`, { replace: true });
      }).catch(() => setLoading(false));
    }
  }, [isNew, orgId]);

  // Load existing item
  useEffect(() => {
    if (!isNew && orgId && itemId) {
      api.getTeamBoardItem(orgId, itemId).then((found: BoardItem) => {
        if (found) {
          setItem(found);
          setTitle(found.title || '');
          setType((found.type as BoardItemType) || 'memo');
          setDescription(found.description || found.content || '');
          setAttachments(found.attachments || []);
          setPinned(found.pinned || false);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isNew, orgId, itemId]);

  // Auto-save with debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!item?.id || !orgId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api.updateTeamBoardItem(orgId, item.id, {
        title,
        type,
        content: description.slice(0, 200),
        description,
        attachments,
        pinned,
      });
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [title, type, description, attachments, pinned]);

  // File drop
  const handleFileDrop = useCallback(async (files: FileList) => {
    const MAX_SIZE = 5 * 1024 * 1024;
    const toUpload = Array.from(files).filter((file) => {
      if (file.size > MAX_SIZE) {
        alert(ko ? `${file.name}: 5MB 이하 파일만 첨부 가능합니다` : `${file.name}: Max 5MB`);
        return false;
      }
      return true;
    });
    if (toUpload.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of toUpload) {
        const result = await api.uploadFile(file);
        const att: Attachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          url: result.url,
          title: file.name,
          fileName: result.fileName,
          fileSize: result.fileSize,
          addedAt: new Date().toISOString(),
          type: 'file',
        };
        setAttachments((prev) => [...prev, att]);
      }
    } catch {
      alert(ko ? "파일 업로드에 실패했습니다" : "File upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [ko]);

  // Delete
  const handleDelete = () => {
    if (!confirm(ko ? "정말 삭제하시겠습니까?" : "Are you sure you want to delete?")) return;
    if (orgId && item?.id) {
      api.deleteTeamBoardItem(orgId, item.id);
    }
    navigate('/organization');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!item && !isNew) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-400">
        <StickyNote size={40} />
        <p className="text-sm">{ko ? '항목을 찾을 수 없습니다' : 'Item not found'}</p>
        <button onClick={() => navigate('/organization')} className="text-sm text-blue-500 hover:underline">
          {ko ? '돌아가기' : 'Go back'}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-64">

        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/organization')}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {ko ? '돌아가기' : 'Back'}
          </button>
          <div className="flex items-center gap-2">
            {canDelete && (
              <button onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        <div className="max-w-3xl">
            <div className="space-y-6">

              {/* Title */}
              <div>
                <InlineText
                  value={title} onChange={setTitle} readOnly={!canEdit}
                  placeholder={ko ? "제목을 입력하세요" : "Enter title"}
                  className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
                  as="h1"
                />
              </div>

              {/* Properties — collapsible */}
              <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
                <button onClick={() => setPropsExpanded(p => !p)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-100/50 transition-colors">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layout size={12} /> {ko ? '속성' : 'Properties'}
                  </span>
                  <div className="flex items-center gap-2">
                    {!propsExpanded && (
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5",
                          TYPE_CONFIG[type].bg, TYPE_CONFIG[type].color)}>
                          {TYPE_CONFIG[type].icon}
                          {ko ? TYPE_CONFIG[type].labelKo : TYPE_CONFIG[type].label}
                        </span>
                        {pinned && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 flex items-center gap-0.5">
                            <Pin size={10} /> {ko ? '고정' : 'Pinned'}
                          </span>
                        )}
                      </div>
                    )}
                    <ChevronDown size={14} className={cn("text-gray-400 transition-transform duration-200", propsExpanded && "rotate-180")} />
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {propsExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
                      <div className="divide-y divide-gray-100 border-t border-gray-100">

                        {/* Type */}
                        <PropertyItem icon={<Tag size={14} />} label={ko ? '유형' : 'Type'}>
                          <InlineDropdown
                            value={type}
                            options={['memo', 'notice', 'idea', 'request'] as BoardItemType[]}
                            onChange={setType} disabled={!canEdit}
                            renderValue={(v) => {
                              const cfg = TYPE_CONFIG[v];
                              return <span className={cn("flex items-center gap-1.5 font-bold", cfg.color)}>{cfg.icon} {ko ? cfg.labelKo : cfg.label}</span>;
                            }}
                            renderOption={(o) => {
                              const cfg = TYPE_CONFIG[o];
                              return <span className={cn("flex items-center gap-2", cfg.color)}>{cfg.icon} {ko ? cfg.labelKo : cfg.label}</span>;
                            }}
                          />
                        </PropertyItem>

                        {/* Creator (read-only) */}
                        <PropertyItem icon={<UserIcon size={14} />} label={ko ? '작성자' : 'Creator'}>
                          <span className="text-sm text-gray-700 px-2 py-1">{item?.createdByName || currentUser.name}</span>
                        </PropertyItem>

                        {/* Created date (read-only) */}
                        <PropertyItem icon={<Calendar size={14} />} label={ko ? '작성일' : 'Created'}>
                          <span className="text-sm text-gray-700 px-2 py-1">
                            {item?.createdAt
                              ? new Date(item.createdAt).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                              : '-'}
                          </span>
                        </PropertyItem>

                        {/* Pinned */}
                        <PropertyItem icon={pinned ? <Pin size={14} /> : <PinOff size={14} />} label={ko ? '고정' : 'Pinned'}>
                          <button
                            onClick={() => canEdit && setPinned(!pinned)}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors",
                              canEdit ? "hover:bg-gray-100 cursor-pointer" : "cursor-default opacity-70",
                              pinned ? "text-orange-600 font-bold" : "text-gray-400"
                            )}
                          >
                            {pinned ? <Pin size={14} /> : <PinOff size={14} />}
                            {pinned ? (ko ? '고정됨' : 'Pinned') : (ko ? '고정 안 됨' : 'Not pinned')}
                          </button>
                        </PropertyItem>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Attachments */}
              <AttachmentSection
                attachments={attachments}
                onChange={setAttachments}
                language={language}
                canEdit={canEdit}
              />

              {/* Description / Editor + Drop zone */}
              <div
                className={cn(
                  "min-h-[200px] border-t border-gray-100 pt-5 relative transition-colors",
                  isDragOver && "bg-blue-50/50 ring-2 ring-blue-200 ring-dashed rounded-xl"
                )}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
                  if (e.dataTransfer.files.length > 0) handleFileDrop(e.dataTransfer.files);
                }}
              >
                {(isDragOver || isUploading) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl shadow-lg">
                      {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {isUploading
                        ? (ko ? "업로드 중..." : "Uploading...")
                        : (ko ? "파일을 놓아주세요 (최대 5MB)" : "Drop files here (max 5MB)")}
                    </div>
                  </div>
                )}
                <NotionBlockEditor
                  initialContent={description}
                  onChange={setDescription}
                  readOnly={!canEdit}
                  placeholder={ko ? "/ 를 입력하여 블록 유형 선택..." : "Type / to select block type..."}
                  language={language}
                  parentType="board"
                  parentId={itemId}
                />

                {/* URL previews auto-detected from content */}
                <UrlPreviewSection content={description} language={language} />

                {/* Inline attached files */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {attachments.map((att) => {
                      const isFile = att.type === 'file';
                      const { icon, color, bg } = isFile
                        ? { icon: <FileIcon size={14} />, color: 'text-gray-600', bg: 'bg-gray-100' }
                        : getAttachmentIcon(att.type);
                      const sizeStr = att.fileSize
                        ? (att.fileSize < 1024 ? `${att.fileSize}B`
                          : att.fileSize < 1048576 ? `${(att.fileSize / 1024).toFixed(0)}KB`
                          : `${(att.fileSize / 1048576).toFixed(1)}MB`)
                        : '';
                      return (
                        <div key={att.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group">
                          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", bg)}>
                            <span className={color}>{icon}</span>
                          </div>
                          <a href={att.url} target="_blank" rel="noopener noreferrer" download={att.fileName}
                            className="flex-1 text-[13px] text-gray-600 hover:text-blue-600 truncate transition-colors">
                            {att.title}
                          </a>
                          {sizeStr && <span className="text-[10px] text-gray-300 shrink-0">{sizeStr}</span>}
                          {canEdit && (
                            <button onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all">
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
      </div>
    </div>
  );
}
