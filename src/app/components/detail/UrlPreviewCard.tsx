import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { api } from "../../../lib/api";

interface OgData {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  favicon?: string;
}

// Detect all URLs in content text
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;

function getYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch { /* ignore */ }
  return null;
}

// Simple in-memory cache for OG metadata
const ogCache = new Map<string, OgData | null>();

export function useUrlPreviews(content?: string) {
  const [previews, setPreviews] = useState<Map<string, OgData>>(new Map());
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(new Set<string>());

  const fetchOg = useCallback(async (url: string) => {
    if (fetchedRef.current.has(url)) return;
    fetchedRef.current.add(url);

    if (ogCache.has(url)) {
      const cached = ogCache.get(url);
      if (cached) setPreviews((prev) => new Map(prev).set(url, cached));
      return;
    }

    try {
      setLoading(true);
      const ytId = getYouTubeVideoId(url);
      const og = await api.fetchOgMetadata(url);
      if (og) {
        const ytFallback = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined;
        const data: OgData = { ...og, ogImage: og.ogImage || ytFallback };
        ogCache.set(url, data);
        setPreviews((prev) => new Map(prev).set(url, data));
      } else {
        ogCache.set(url, null);
      }
    } catch {
      ogCache.set(url, null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!content) return;
    // Strip [bookmark:url] patterns — those are already rendered by NotionBlockEditor
    const stripped = content.replace(/\[bookmark:[^\]]+\]/g, '');
    const urls = [...new Set(stripped.match(URL_REGEX) || [])];
    urls.slice(0, 5).forEach(fetchOg); // max 5 URLs
  }, [content, fetchOg]);

  return { previews, loading };
}

export function UrlPreviewCard({ url, data, onRemove }: { url: string; data: OgData; onRemove?: () => void }) {
  let domain = "";
  try { domain = new URL(url).hostname.replace("www.", ""); } catch { /* ignore */ }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-gray-200 overflow-hidden bg-white hover:bg-gray-50 transition-colors group"
    >
      <div className="flex h-[108px]">
        {/* Text content — Notion style */}
        <div className="flex-1 min-w-0 p-3 flex flex-col overflow-hidden">
          {data.ogTitle && (
            <p className="text-[13px] font-medium text-gray-900 leading-snug line-clamp-2">
              {data.ogTitle}
            </p>
          )}
          {data.ogDescription && (
            <p className="text-[12px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">{data.ogDescription}</p>
          )}
          <div className="flex items-center gap-1.5 mt-auto text-[12px] text-gray-400">
            {data.favicon ? (
              <img src={data.favicon} alt="" className="w-4 h-4 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <ExternalLink size={12} />
            )}
            <span className="truncate">{url}</span>
          </div>
        </div>
        {/* OG image — right side like Notion */}
        {data.ogImage && (
          <div className="w-[160px] shrink-0 border-l border-gray-200">
            <img src={data.ogImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </a>
  );
}

export function UrlPreviewSection({
  content,
  language,
}: {
  content?: string;
  language: string;
}) {
  const { previews, loading } = useUrlPreviews(content);
  const ko = language === "ko";

  if (previews.size === 0 && !loading) return null;

  return (
    <div className="space-y-2">
      {loading && previews.size === 0 && (
        <div className="flex items-center gap-2 text-sm text-blue-500 px-1 py-2">
          <Loader2 size={14} className="animate-spin" />
          {ko ? "미리보기 불러오는 중..." : "Loading preview..."}
        </div>
      )}
      {[...previews.entries()].map(([url, data]) => (
        <UrlPreviewCard key={url} url={url} data={data} />
      ))}
    </div>
  );
}
