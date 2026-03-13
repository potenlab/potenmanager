import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { InlineText } from "../components/detail/InlineText";
import { EmojiPicker } from "../components/EmojiPicker";
import { getSubPage, updateSubPage, deleteSubPage, syncSubPagesFromServer, type SubPage } from "../../lib/subPages";

export function SubPageDetailPage() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";

  const [page, setPage] = useState<SubPage | null>(() =>
    pageId ? getSubPage(pageId) ?? null : null
  );

  // Sync from server (in case page was created on another device)
  useEffect(() => {
    if (page || !pageId) return;
    if (localStorage.getItem('poten_demo_mode') === 'true') return;
    syncSubPagesFromServer().then(() => {
      const found = getSubPage(pageId);
      if (found) setPage(found);
    });
  }, [pageId]);

  const handleUpdate = useCallback(
    (updates: Partial<SubPage>) => {
      if (!pageId) return;
      updateSubPage(pageId, updates);
      setPage((prev) => (prev ? { ...prev, ...updates } : null));
    },
    [pageId]
  );

  const handleDelete = () => {
    if (!page) return;
    if (!confirm(ko ? "이 페이지를 삭제하시겠습니까?" : "Delete this page?")) return;
    deleteSubPage(page.id);
    navigate(-1);
  };

  if (!page) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">{ko ? "페이지를 찾을 수 없습니다" : "Page not found"}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-64">
        <div className="max-w-3xl">
          <div className="space-y-6">
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm group"
              >
                <ArrowLeft
                  size={16}
                  className="group-hover:-translate-x-1 transition-transform"
                />
                {ko ? "뒤로" : "Back"}
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Emoji + Title */}
            <div className="flex items-start gap-3">
              <EmojiPicker
                value={page.emoji}
                onChange={(emoji) => handleUpdate({ emoji })}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <InlineText
                  value={page.title}
                  onChange={(v) => handleUpdate({ title: v })}
                  placeholder={ko ? "제목 없음" : "Untitled"}
                  className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
                  as="h1"
                />
              </div>
            </div>

            {/* Content */}
            <div className="min-h-[200px] border-t border-gray-100 pt-5">
              <NotionBlockEditor
                initialContent={page.content}
                onChange={(v) => handleUpdate({ content: v })}
                placeholder={ko ? "내용을 입력하세요..." : "Start writing..."}
                parentType="page"
                parentId={page.id}
              />

              <UrlPreviewSection content={page.content || ""} language={language} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
