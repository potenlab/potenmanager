import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { Plus, Pin, MessageSquare, ChevronRight, Trash2, Edit3, X, Check, Lock } from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { usePermission } from "../context/PermissionContext";
import { format } from "date-fns";

// ─── Types ──────────────────────────────────────────────────
interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
}

const STORAGE_KEY = "poten_leader_board";

function loadPosts(): Post[] {
  try {
    const orgId = localStorage.getItem("poten_active_org_id") || "default";
    const data = localStorage.getItem(`${STORAGE_KEY}_${orgId}`);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function savePosts(posts: Post[]) {
  const orgId = localStorage.getItem("poten_active_org_id") || "default";
  localStorage.setItem(`${STORAGE_KEY}_${orgId}`, JSON.stringify(posts));
}

// ─── Component ──────────────────────────────────────────────
export function LeaderBoardPage() {
  const { language } = useLanguage();
  const { currentUser, can } = usePermission();
  const navigate = useNavigate();
  const ko = language === "ko";

  const isAdmin = can("team.editRole"); // owner or admin

  const [posts, setPosts] = useState<Post[]>(loadPosts);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [commentText, setCommentText] = useState("");

  const save = useCallback((updated: Post[]) => {
    setPosts(updated);
    savePosts(updated);
  }, []);

  const handleCreate = () => {
    if (!title.trim()) return;
    const post: Post = {
      id: `lb-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    };
    save([post, ...posts]);
    setTitle("");
    setContent("");
    setIsWriting(false);
  };

  const handleUpdate = () => {
    if (!editingId || !title.trim()) return;
    save(posts.map(p => p.id === editingId ? { ...p, title: title.trim(), content: content.trim(), updatedAt: new Date().toISOString() } : p));
    setEditingId(null);
    setTitle("");
    setContent("");
    setIsWriting(false);
    if (selectedPost?.id === editingId) {
      setSelectedPost(prev => prev ? { ...prev, title: title.trim(), content: content.trim() } : null);
    }
  };

  const handleDelete = (id: string) => {
    save(posts.filter(p => p.id !== id));
    if (selectedPost?.id === id) setSelectedPost(null);
  };

  const togglePin = (id: string) => {
    save(posts.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p));
  };

  const addComment = () => {
    if (!selectedPost || !commentText.trim()) return;
    const comment: Comment = {
      id: `lbc-${Date.now()}`,
      content: commentText.trim(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      createdAt: new Date().toISOString(),
    };
    const updated = posts.map(p =>
      p.id === selectedPost.id ? { ...p, comments: [...p.comments, comment] } : p
    );
    save(updated);
    setSelectedPost(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : null);
    setCommentText("");
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // ─── Not admin ────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <Lock size={48} className="mb-4" />
        <h2 className="text-xl font-bold text-gray-600 mb-2">
          {ko ? "접근 권한이 없습니다" : "Access Denied"}
        </h2>
        <p className="text-sm">
          {ko ? "리더 게시판은 관리자만 볼 수 있습니다." : "Leader Board is only accessible to admins."}
        </p>
      </div>
    );
  }

  // ─── Post detail view ─────────────────────────────────────
  if (selectedPost) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setSelectedPost(null)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"
        >
          <ChevronRight size={14} className="rotate-180" />
          {ko ? "목록으로" : "Back to list"}
        </button>

        <article className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{selectedPost.title}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                {selectedPost.authorAvatar && (
                  <img src={selectedPost.authorAvatar} alt="" className="w-5 h-5 rounded-full" />
                )}
                <span>{selectedPost.authorName}</span>
                <span>·</span>
                <span>{format(new Date(selectedPost.createdAt), "yyyy.MM.dd HH:mm")}</span>
              </div>
            </div>
            {selectedPost.authorId === currentUser.id && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingId(selectedPost.id);
                    setTitle(selectedPost.title);
                    setContent(selectedPost.content);
                    setIsWriting(true);
                    setSelectedPost(null);
                  }}
                  className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(selectedPost.id)}
                  className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {selectedPost.content}
          </div>
        </article>

        {/* Comments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <MessageSquare size={14} />
            {ko ? "댓글" : "Comments"} ({selectedPost.comments.length})
          </h3>

          <div className="space-y-4 mb-4">
            {selectedPost.comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                {c.authorAvatar ? (
                  <img src={c.authorAvatar} alt="" className="w-7 h-7 rounded-full shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                    {c.authorName[0]}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-700">{c.authorName}</span>
                    <span className="text-[10px] text-gray-400">{format(new Date(c.createdAt), "MM.dd HH:mm")}</span>
                  </div>
                  <p className="text-sm text-gray-600">{c.content}</p>
                </div>
              </div>
            ))}
            {selectedPost.comments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                {ko ? "아직 댓글이 없습니다." : "No comments yet."}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComment()}
              placeholder={ko ? "댓글을 입력하세요..." : "Write a comment..."}
              className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              onClick={addComment}
              disabled={!commentText.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {ko ? "등록" : "Post"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Write / Edit form ────────────────────────────────────
  if (isWriting) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">
            {editingId ? (ko ? "글 수정" : "Edit Post") : (ko ? "새 글 작성" : "New Post")}
          </h2>
          <button onClick={() => { setIsWriting(false); setEditingId(null); setTitle(""); setContent(""); }}
            className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={ko ? "제목을 입력하세요" : "Enter title"}
            className="w-full text-lg font-semibold px-0 py-2 border-b border-gray-200 outline-none focus:border-blue-400 transition-colors"
            autoFocus
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={ko ? "내용을 작성하세요..." : "Write content..."}
            rows={12}
            className="w-full text-sm px-0 py-2 outline-none resize-none text-gray-700 leading-relaxed"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => { setIsWriting(false); setEditingId(null); setTitle(""); setContent(""); }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {ko ? "취소" : "Cancel"}
            </button>
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={!title.trim()}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {editingId ? (ko ? "수정" : "Update") : (ko ? "등록" : "Post")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Post list ────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {ko ? "리더 게시판" : "Leader Board"}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {ko ? "관리자 간 공유 게시판입니다." : "Shared board for admins only."}
          </p>
        </div>
        <button
          onClick={() => setIsWriting(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          {ko ? "새 글" : "New Post"}
        </button>
      </div>

      {sortedPosts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{ko ? "아직 게시글이 없습니다." : "No posts yet."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {sortedPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {post.pinned && <Pin size={12} className="text-blue-500 shrink-0" />}
                  <span className="text-sm font-semibold text-gray-900 truncate">{post.title}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{post.authorName}</span>
                  <span>·</span>
                  <span>{format(new Date(post.createdAt), "yyyy.MM.dd")}</span>
                  {post.comments.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <MessageSquare size={10} />
                        {post.comments.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {post.authorId === currentUser.id && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin(post.id); }}
                    className={cn("p-1.5 rounded transition-colors", post.pinned ? "text-blue-500 bg-blue-50" : "text-gray-300 hover:text-blue-500 hover:bg-blue-50")}
                  >
                    <Pin size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                    className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
