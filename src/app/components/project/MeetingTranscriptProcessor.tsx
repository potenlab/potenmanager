import { useState, useEffect, useRef, useMemo } from "react";
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Diamond, ListChecks, RefreshCw, FolderKanban } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useLanguage } from "../../context/LanguageContext";
import { useInvite } from "../../context/InviteContext";
import { api } from "../../../lib/api";
import { loadProjects, type Project } from "../../pages/ManagementPage";

const AUTO_PM_API = "http://localhost:8000";

interface MeetingTranscriptProcessorProps {
  meetingId: string;
  projectId?: string;
  onProcessed?: (result: { notes: string; title?: string }) => void;
}

type ProcessingStatus = 'idle' | 'saving' | 'processing' | 'done' | 'failed';

interface ProcessedResult {
  title?: string;
  summary?: string;
  keyDecisions?: string[];
  participants?: string[];
  milestonesCount?: number;
  actionsCount?: number;
}

export function MeetingTranscriptProcessor({ meetingId, projectId: initialProjectId, onProcessed }: MeetingTranscriptProcessorProps) {
  const { language } = useLanguage();
  const { org } = useInvite();
  const ko = language === "ko";

  const [expanded, setExpanded] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const projects = useMemo(() => loadProjects(), []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const pollStatus = (mId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${AUTO_PM_API}/api/meetings/${mId}/status`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'completed' || data.status === 'processed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus('done');
          setResult({
            title: data.title,
            summary: data.summary,
            keyDecisions: data.key_decisions,
            participants: data.participants,
            milestonesCount: data.milestones_count,
            actionsCount: data.actions_count,
          });
          // Build notes and notify parent to update the description editor
          if (onProcessed) {
            const parts: string[] = [];
            if (data.summary) parts.push(`## Summary\n${data.summary}`);
            if (data.key_decisions?.length) parts.push("## Key Decisions\n" + data.key_decisions.map((d: string) => `- ${d}`).join("\n"));
            if (data.participants?.length) parts.push("## Participants\n" + data.participants.join(", "));
            onProcessed({ notes: parts.join("\n\n"), title: data.title });
          }
        } else if (data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus('failed');
          setError(ko ? "처리 실패. 다시 시도하세요." : "Processing failed. Please try again.");
        }
      } catch {
        // Backend might not be running — ignore
      }
    }, 3000);
  };

  const handleProcess = async () => {
    if (!transcript.trim() || !org?.id) return;

    const projectId = selectedProjectId || undefined;
    setStatus('saving');
    setError(null);

    try {
      // Try to call the local backend
      const res = await fetch(`${AUTO_PM_API}/api/meetings/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: org.id,
          project_id: projectId || "",
          meeting_id: meetingId,
          transcript: transcript.trim(),
        }),
      });

      if (res.ok) {
        setStatus('processing');
        pollStatus(meetingId);
      } else {
        throw new Error(`Backend error: ${res.status}`);
      }
    } catch {
      // Backend not running — fallback to saving transcript directly
      try {
        await api.updateMeeting(meetingId, { transcript: transcript.trim() } as any);
        setStatus('done');
        setResult({
          summary: ko
            ? "트랜스크립트가 저장되었습니다. 백엔드 서버가 실행 중이지 않아 자동 처리를 할 수 없습니다.\n\n백엔드 시작:\ncd backend && source venv/bin/activate\nuvicorn app.main:app --port 8000"
            : "Transcript saved. Backend server is not running — cannot auto-process.\n\nStart backend:\ncd backend && source venv/bin/activate\nuvicorn app.main:app --port 8000",
        });
      } catch (saveErr: any) {
        setError(saveErr.message || "Failed to save transcript");
        setStatus('failed');
      }
    }
  };

  return (
    <div className="border-t border-gray-100 pt-4 mt-2">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left px-1 py-1.5 hover:bg-indigo-50/50 rounded-lg transition-colors"
      >
        {expanded ? <ChevronDown size={14} className="text-indigo-400" /> : <ChevronRight size={14} className="text-indigo-400" />}
        <FileText size={16} className="text-indigo-500" />
        <span className="text-sm font-semibold text-gray-700">
          {ko ? "Auto PM — 트랜스크립트 처리" : "Auto PM — Process Transcript"}
        </span>
        {status === 'done' && <CheckCircle2 size={14} className="text-green-500 ml-1" />}
        {status === 'processing' && <Loader2 size={14} className="text-blue-500 animate-spin ml-1" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 px-1">
          {/* Project selector (if not already linked) */}
          {!initialProjectId && (
            <div className="flex items-center gap-2">
              <FolderKanban size={14} className="text-gray-400 shrink-0" />
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:border-indigo-400 focus:outline-none bg-white"
                disabled={status === 'processing' || status === 'saving'}
              >
                <option value="">{ko ? "프로젝트 선택 (선택사항)" : "Select project (optional)"}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder={ko
              ? "회의 트랜스크립트를 붙여넣으세요...\n\n예시:\n김대리: 다음 주까지 디자인 시안 완성해주세요.\n이과장: 네, 금요일까지 1차 시안 보내드리겠습니다.\n박팀장: 그럼 4월 5일까지 개발 착수하겠습니다.\n\n→ Claude가 자동으로 요약, 타임라인, 액션 아이템을 추출합니다."
              : "Paste your meeting transcript here...\n\nExample:\nJohn: Let's finalize the design by next week.\nJane: I'll have the first draft by Friday.\nMike: Then we'll start development by April 5th.\n\n→ Claude will auto-extract summary, timeline, and action items."}
            className={cn(
              "w-full min-h-[180px] max-h-[400px] px-3 py-2.5 text-sm rounded-lg border resize-y",
              "border-gray-200 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200",
              "placeholder:text-gray-300"
            )}
            disabled={status === 'processing' || status === 'saving'}
          />

          {/* Action bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {transcript.length > 0
                ? `${transcript.split(/\s+/).filter(Boolean).length} ${ko ? "단어" : "words"}`
                : (ko ? "회의 내용을 붙여넣으세요" : "Paste meeting content above")}
            </span>
            <button
              onClick={handleProcess}
              disabled={!transcript.trim() || status === 'processing' || status === 'saving'}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all",
                "bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm hover:shadow",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              )}
            >
              {status === 'saving' ? (
                <><Loader2 size={16} className="animate-spin" />{ko ? "저장중..." : "Saving..."}</>
              ) : status === 'processing' ? (
                <><Loader2 size={16} className="animate-spin" />{ko ? "Claude 처리중..." : "Claude processing..."}</>
              ) : (
                <><Upload size={16} />{ko ? "트랜스크립트 처리" : "Process Transcript"}</>
              )}
            </button>
          </div>

          {/* Processing indicator */}
          {status === 'processing' && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-3 rounded-lg">
              <Loader2 size={16} className="animate-spin shrink-0" />
              <span>
                {ko
                  ? "Claude가 분석 중... 요약, 마일스톤, 액션 아이템을 추출하고 있습니다."
                  : "Claude is analyzing... extracting summary, milestones, and action items."}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
              <AlertCircle size={16} className="shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => { setError(null); setStatus('idle'); }} className="text-red-400 hover:text-red-600">
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          {/* Results */}
          {result && status === 'done' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-500" />
                <span className="text-sm font-semibold text-gray-700">
                  {ko ? "처리 완료!" : "Processing Complete!"}
                </span>
              </div>

              {result.title && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{ko ? "제목" : "Title"}</span>
                  <p className="text-sm text-gray-800 font-medium mt-0.5">{result.title}</p>
                </div>
              )}

              {result.summary && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{ko ? "요약" : "Summary"}</span>
                  <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{result.summary}</p>
                </div>
              )}

              {result.keyDecisions && result.keyDecisions.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{ko ? "주요 결정" : "Key Decisions"}</span>
                  <ul className="mt-1 space-y-1">
                    {result.keyDecisions.map((d, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5 shrink-0">•</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.participants && result.participants.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{ko ? "참석자" : "Participants"}</span>
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {result.participants.map((p, i) => (
                      <span key={i} className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-600 border border-gray-200">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {(result.milestonesCount || result.actionsCount) && (
                <div className="flex gap-4 pt-1 border-t border-green-200">
                  {result.milestonesCount !== undefined && result.milestonesCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-purple-600 font-medium">
                      <Diamond size={14} />
                      {result.milestonesCount} {ko ? "마일스톤 생성됨" : "milestones created"}
                    </div>
                  )}
                  {result.actionsCount !== undefined && result.actionsCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-orange-600 font-medium">
                      <ListChecks size={14} />
                      {result.actionsCount} {ko ? "액션 아이템 생성됨" : "action items created"}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
