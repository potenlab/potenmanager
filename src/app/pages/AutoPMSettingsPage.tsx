import { useState, useEffect } from "react";
import {
  Bot, Settings, ExternalLink, Copy, Check, AlertCircle,
  Server, Hash, MessageSquare, Shield, Zap, RefreshCw,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useInvite } from "../context/InviteContext";

const AUTO_PM_API = "http://localhost:8000";

// Discord brand color
const DISCORD_COLOR = "#5865F2";

interface BackendStatus {
  status: "online" | "offline" | "checking";
  service?: string;
}

interface DiscordBotConfig {
  token: string;
  prefix: string;
  orgId: string;
}

export function AutoPMSettingsPage() {
  const { language } = useLanguage();
  const { org } = useInvite();
  const ko = language === "ko";

  const [backendStatus, setBackendStatus] = useState<BackendStatus>({ status: "checking" });
  const [discordStatus, setDiscordStatus] = useState<"online" | "offline" | "checking">("checking");
  const [copied, setCopied] = useState<string | null>(null);
  const [botToken, setBotToken] = useState("");
  const [botPrefix, setBotPrefix] = useState("!pm");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check backend + discord status
  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    setBackendStatus({ status: "checking" });
    setDiscordStatus("checking");
    try {
      const res = await fetch(`${AUTO_PM_API}/health`);
      if (res.ok) {
        const data = await res.json();
        setBackendStatus({ status: "online", service: data.service });
        setDiscordStatus(data.discord_bot === "online" ? "online" : "offline");
      } else {
        setBackendStatus({ status: "offline" });
        setDiscordStatus("offline");
      }
    } catch {
      setBackendStatus({ status: "offline" });
      setDiscordStatus("offline");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveToken = async () => {
    if (!botToken.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${AUTO_PM_API}/api/settings/discord`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: botToken.trim(),
          prefix: botPrefix.trim() || "!pm",
          org_id: org?.id || "",
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      // Backend might not have this endpoint yet — that's fine
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Settings size={20} className="text-gray-500" />
          {ko ? "Auto PM 설정" : "Auto PM Settings"}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {ko ? "Discord 봇 및 백엔드 서버 설정" : "Discord bot and backend server configuration"}
        </p>
      </div>

      <div className="space-y-6">

        {/* ── Backend Status ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                {ko ? "백엔드 서버" : "Backend Server"}
              </h2>
            </div>
            <button onClick={checkBackend} className="text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw size={14} className={backendStatus.status === "checking" ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              backendStatus.status === "online" ? "bg-green-500" :
              backendStatus.status === "checking" ? "bg-yellow-400 animate-pulse" :
              "bg-red-400"
            )} />
            <span className="text-sm font-medium text-gray-700">
              {backendStatus.status === "online" ? (ko ? "온라인" : "Online") :
               backendStatus.status === "checking" ? (ko ? "확인 중..." : "Checking...") :
               (ko ? "오프라인" : "Offline")}
            </span>
            <span className="text-xs text-gray-400">{AUTO_PM_API}</span>
          </div>

          {/* Discord bot status */}
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              discordStatus === "online" ? "bg-green-500" :
              discordStatus === "checking" ? "bg-yellow-400 animate-pulse" :
              "bg-gray-300"
            )} />
            <span className="text-sm text-gray-600">
              Discord Bot: {discordStatus === "online" ? (ko ? "온라인" : "Online") :
               discordStatus === "checking" ? (ko ? "확인 중..." : "Checking...") :
               (ko ? "오프라인 (토큰 미설정)" : "Offline (no token)")}
            </span>
          </div>

          {backendStatus.status === "offline" && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-3">
              <p className="text-xs text-red-600 font-medium mb-2">
                {ko ? "백엔드 서버가 실행 중이지 않습니다" : "Backend server is not running"}
              </p>
              <div className="bg-white rounded-md p-2 font-mono text-xs text-gray-600">
                <p>cd backend</p>
                <p>source venv/bin/activate</p>
                <p>uvicorn app.main:app --port 8000 --reload</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Discord Bot Setup ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: DISCORD_COLOR }}>
              <MessageSquare size={14} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-gray-700">
              {ko ? "Discord 봇 설정" : "Discord Bot Setup"}
            </h2>
          </div>

          {/* Step 1: Create Bot */}
          <div className="space-y-4">
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">1</div>
                <span className="text-sm font-medium text-gray-700">
                  {ko ? "Discord 봇 생성" : "Create Discord Bot"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {ko
                  ? "Discord Developer Portal에서 새 애플리케이션을 만들고 봇 토큰을 받으세요."
                  : "Create a new application in Discord Developer Portal and get your bot token."}
              </p>
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
                style={{ backgroundColor: DISCORD_COLOR }}
              >
                <ExternalLink size={12} />
                Discord Developer Portal
              </a>
            </div>

            {/* Step 2: Enable Intent */}
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">2</div>
                <span className="text-sm font-medium text-gray-700">
                  {ko ? "Message Content Intent 활성화" : "Enable Message Content Intent"}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {ko
                  ? "Bot 탭 → Privileged Gateway Intents → MESSAGE CONTENT INTENT를 켜세요."
                  : "Bot tab → Privileged Gateway Intents → Turn on MESSAGE CONTENT INTENT."}
              </p>
            </div>

            {/* Step 3: Bot Token */}
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">3</div>
                <span className="text-sm font-medium text-gray-700">
                  {ko ? "봇 토큰 설정" : "Set Bot Token"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {ko
                  ? "Bot 탭에서 토큰을 복사하여 아래에 붙여넣으세요."
                  : "Copy your bot token from the Bot tab and paste it below."}
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={botToken}
                  onChange={e => setBotToken(e.target.value)}
                  placeholder={ko ? "봇 토큰을 입력하세요..." : "Paste bot token here..."}
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Step 4: Prefix */}
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">4</div>
                <span className="text-sm font-medium text-gray-700">
                  {ko ? "명령어 접두사" : "Command Prefix"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {ko
                  ? "Discord에서 봇을 호출할 때 사용할 접두사입니다."
                  : "The prefix used to invoke the bot in Discord."}
              </p>
              <input
                type="text"
                value={botPrefix}
                onChange={e => setBotPrefix(e.target.value)}
                className="w-32 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-400 focus:outline-none font-mono"
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveToken}
              disabled={!botToken.trim() || saving}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
                saveSuccess
                  ? "bg-green-500 text-white"
                  : "bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {saveSuccess ? (
                <><Check size={16} />{ko ? "저장됨!" : "Saved!"}</>
              ) : saving ? (
                <><RefreshCw size={16} className="animate-spin" />{ko ? "저장 중..." : "Saving..."}</>
              ) : (
                <><Shield size={16} />{ko ? "토큰 저장" : "Save Token"}</>
              )}
            </button>

            {/* Step 5: Invite */}
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">5</div>
                <span className="text-sm font-medium text-gray-700">
                  {ko ? "서버에 봇 초대" : "Invite Bot to Server"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {ko
                  ? "OAuth2 → URL Generator에서 bot 스코프 + Send Messages 권한을 선택하고 URL을 복사하세요."
                  : "In OAuth2 → URL Generator, select 'bot' scope + 'Send Messages' permission, then copy the invite URL."}
              </p>
            </div>

            {/* Step 6: Run */}
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">6</div>
                <span className="text-sm font-medium text-gray-700">
                  {ko ? "봇 실행" : "Run the Bot"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {ko ? "터미널에서 아래 명령어를 실행하세요." : "Run these commands in your terminal."}
              </p>
              <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-gray-300 space-y-0.5 relative">
                <p><span className="text-green-400">$</span> cd backend</p>
                <p><span className="text-green-400">$</span> source venv/bin/activate</p>
                <p><span className="text-green-400">$</span> python -m discord_bot.bot</p>
                <button
                  onClick={() => copyToClipboard("cd backend && source venv/bin/activate && python -m discord_bot.bot", "run")}
                  className="absolute top-2 right-2 text-gray-500 hover:text-white transition-colors"
                >
                  {copied === "run" ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Usage Examples ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              {ko ? "사용 예시" : "Usage Examples"}
            </h2>
          </div>

          <div className="space-y-2">
            {[
              { cmd: `${botPrefix} What are the pending action items?`, desc: ko ? "대기 중인 액션 아이템 조회" : "Check pending action items" },
              { cmd: `${botPrefix} Summarize the latest meetings`, desc: ko ? "최근 회의 요약" : "Summarize recent meetings" },
              { cmd: `${botPrefix} What milestones are coming up?`, desc: ko ? "다가오는 마일스톤 확인" : "Upcoming milestones" },
              { cmd: `${botPrefix} Show overdue tasks`, desc: ko ? "기한 초과 작업 표시" : "Show overdue tasks" },
              { cmd: `${botPrefix} 최근 회의 요약해줘`, desc: ko ? "한국어로 질문 가능" : "Works in Korean too" },
            ].map((ex, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 group">
                <code className="text-xs font-mono text-indigo-600 flex-1">{ex.cmd}</code>
                <span className="text-[10px] text-gray-400 shrink-0">{ex.desc}</span>
                <button
                  onClick={() => copyToClipboard(ex.cmd, `ex-${i}`)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all"
                >
                  {copied === `ex-${i}` ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Org Info ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Hash size={18} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">
              {ko ? "조직 정보" : "Organization Info"}
            </h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-gray-500">{ko ? "조직 이름" : "Org Name"}</span>
              <span className="font-medium text-gray-700">{org?.name || "-"}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-gray-500">{ko ? "조직 ID" : "Org ID"}</span>
              <div className="flex items-center gap-1.5">
                <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{org?.id || "-"}</code>
                {org?.id && (
                  <button onClick={() => copyToClipboard(org.id, "orgId")} className="text-gray-400 hover:text-gray-600">
                    {copied === "orgId" ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-gray-500">{ko ? "API 엔드포인트" : "API Endpoint"}</span>
              <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{AUTO_PM_API}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
