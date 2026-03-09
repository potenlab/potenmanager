import { useState, useEffect, useRef } from "react";
import { Share2, Link2, Check, X, Loader2, Globe } from "lucide-react";
import { cn } from "../../../lib/utils";
import { api } from "../../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { createPortal } from "react-dom";

interface ShareButtonProps {
  type: string;   // 'task' | 'meeting' | 'project' | 'brand' | 'library' | 'goal' | 'radar' | 'board'
  itemId: string;
  createdBy: string;
}

export function ShareButton({ type, itemId, createdBy }: ShareButtonProps) {
  const { language } = useLanguage();
  const ko = language === "ko";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(true);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // Check if already shared
  useEffect(() => {
    setChecking(true);
    api.checkShare(type, itemId)
      .then((res) => {
        if (res.shared) setShareToken(res.token);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [type, itemId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : null;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const orgId = localStorage.getItem("poten_active_org_id") || "";
      const res = await api.createShare(type, itemId, orgId, createdBy);
      setShareToken(res.token);
    } catch (e) {
      console.error("Failed to create share link:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!shareToken) return;
    setLoading(true);
    try {
      await api.deleteShare(shareToken);
      setShareToken(null);
    } catch (e) {
      console.error("Failed to revoke share link:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - 340),
    });
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "p-2 rounded-xl transition-all",
          shareToken
            ? "text-blue-500 hover:text-blue-600 hover:bg-blue-50"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        )}
        title={ko ? "공유" : "Share"}
      >
        {checking ? (
          <Loader2 size={18} className="animate-spin" />
        ) : shareToken ? (
          <Globe size={18} />
        ) : (
          <Share2 size={18} />
        )}
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className="fixed z-[9999] w-[320px] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Share2 size={16} className="text-gray-500" />
              <span className="text-sm font-bold text-gray-900">
                {ko ? "외부 공유" : "Share externally"}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="px-4 pb-4 space-y-3">
            {shareToken ? (
              <>
                {/* Active share */}
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl">
                  <Globe size={14} className="text-blue-500 shrink-0" />
                  <span className="text-xs text-blue-700 font-medium">
                    {ko ? "이 링크로 누구나 볼 수 있습니다" : "Anyone with the link can view"}
                  </span>
                </div>

                {/* URL display + copy */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600 truncate font-mono">
                    {shareUrl}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "shrink-0 p-2 rounded-lg transition-all text-sm",
                      copied
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {copied ? <Check size={16} /> : <Link2 size={16} />}
                  </button>
                </div>

                {/* Revoke button */}
                <button
                  onClick={handleRevoke}
                  disabled={loading}
                  className="w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors font-medium"
                >
                  {loading ? (ko ? "처리 중..." : "Revoking...") : (ko ? "공유 해제" : "Revoke link")}
                </button>
              </>
            ) : (
              <>
                {/* No share yet */}
                <p className="text-xs text-gray-500 leading-relaxed">
                  {ko
                    ? "공개 링크를 생성하면 로그인 없이 읽기 전용으로 볼 수 있습니다."
                    : "Create a public link so anyone can view this page (read-only)."}
                </p>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Link2 size={16} />
                  )}
                  {loading ? (ko ? "생성 중..." : "Creating...") : (ko ? "공유 링크 만들기" : "Create share link")}
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
