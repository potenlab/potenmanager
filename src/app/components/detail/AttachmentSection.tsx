import { useState } from "react";
import {
  Plus, Trash2, ExternalLink, FileText, Globe,
  Calculator, Layout, CheckSquare, Paperclip,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { Attachment, detectAttachmentType } from "../../../lib/mockData";

export function extractTitleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('google.com')) {
      if (u.hostname === 'docs.google.com') {
        if (u.pathname.startsWith('/document')) return 'Google Document';
        if (u.pathname.startsWith('/spreadsheets')) return 'Google Spreadsheet';
        if (u.pathname.startsWith('/presentation')) return 'Google Slides';
        if (u.pathname.startsWith('/forms')) return 'Google Form';
      }
      return 'Google Drive File';
    }
    return u.hostname.replace('www.', '');
  } catch { return url.slice(0, 40); }
}

export function getAttachmentIcon(type: Attachment['type']) {
  switch (type) {
    case 'google-drive': return { icon: <FileText size={14} />, color: 'text-green-600', bg: 'bg-green-50' };
    case 'google-doc':   return { icon: <FileText size={14} />, color: 'text-blue-600', bg: 'bg-blue-50' };
    case 'google-sheet': return { icon: <Calculator size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    case 'google-slide': return { icon: <Layout size={14} />, color: 'text-amber-600', bg: 'bg-amber-50' };
    case 'google-form':  return { icon: <CheckSquare size={14} />, color: 'text-purple-600', bg: 'bg-purple-50' };
    default:             return { icon: <Globe size={14} />, color: 'text-gray-500', bg: 'bg-gray-50' };
  }
}

export function AttachmentSection({
  attachments,
  onChange,
  language,
  canEdit,
}: {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  language: string;
  canEdit: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const ko = language === 'ko';

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    const type = detectAttachmentType(newUrl.trim());
    const attachment: Attachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      url: newUrl.trim(),
      title: newTitle.trim() || extractTitleFromUrl(newUrl.trim()),
      addedAt: new Date().toISOString(),
      type,
    };
    onChange([...attachments, attachment]);
    setNewUrl('');
    setNewTitle('');
    setIsAdding(false);
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Paperclip size={14} className="text-gray-400" />
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          {ko ? '첨부 파일' : 'Attachments'}
        </span>
        {attachments.length > 0 && (
          <span className="text-[11px] text-gray-300 ml-auto">
            {attachments.length}
          </span>
        )}
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="space-y-0.5">
          {attachments.map((att) => {
            const { icon, color, bg } = getAttachmentIcon(att.type);
            return (
              <div key={att.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", bg)}>
                  <span className={color}>{icon}</span>
                </div>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-gray-700 hover:text-blue-600 truncate transition-colors"
                >
                  {att.title}
                </a>
                <ExternalLink size={12} className="text-gray-300 group-hover:text-gray-400 shrink-0" />
                {canEdit && (
                  <button
                    onClick={() => handleRemove(att.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add attachment inline form */}
      {canEdit && (
        <>
          {isAdding ? (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder={ko ? 'URL 붙여넣기 (예: Google Drive 링크)' : 'Paste URL (e.g. Google Drive link)'}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
              />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={ko ? '제목 (선택 - 비우면 자동 생성)' : 'Title (optional)'}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setIsAdding(false); setNewUrl(''); setNewTitle(''); }} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">
                  {ko ? '취소' : 'Cancel'}
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newUrl.trim()}
                  className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {ko ? '추가' : 'Add'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors w-full"
            >
              <Plus size={14} />
              {ko ? '첨부 파일 추가' : 'Add attachment'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
