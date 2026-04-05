import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import { useLanguage } from "../../context/LanguageContext";
import { useInvite } from "../../context/InviteContext";
import {
  Shield,
  User,
  UserPlus,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Link2,
  Clock,
  Building2,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (email: string, role: string) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const { org, createOrg, generateInvite } = useInvite();

  const [role, setRole] = useState("member");
  const [step, setStep] = useState<'create-org' | 'generate' | 'result'>('generate');
  const [orgName, setOrgName] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine initial step
  useEffect(() => {
    if (open) {
      if (!org) {
        setStep('create-org');
      } else {
        setStep('generate');
      }
      setGeneratedCode(null);
      setExpiresAt(null);
      setCopied(false);
      setLinkCopied(false);
      setError(null);
      setRole('member');
      setOrgName('');
    }
  }, [open, org]);

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const newOrg = await createOrg(orgName.trim());
      if (newOrg) {
        setStep('generate');
      } else {
        setError(ko ? '조직 생성에 실패했습니다.' : 'Failed to create organization.');
      }
    } catch {
      setError(ko ? '조직 생성 중 오류가 발생했습니다.' : 'Error creating organization.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const invite = await generateInvite(role);
      if (invite) {
        setGeneratedCode(invite.code);
        setExpiresAt(invite.expiresAt);
        setStep('result');
      } else {
        setError(ko ? '초대 코드 생성에 실패했습니다.' : 'Failed to generate invite code.');
      }
    } catch {
      setError(ko ? '초대 코드 생성 중 오류가 발생했습니다.' : 'Error generating invite code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = generatedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInviteLink = () => {
    if (!generatedCode) return '';
    return `${window.location.origin}/invite/${generatedCode}`;
  };

  const handleCopyLink = async () => {
    const link = getInviteLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const formatExpiry = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  // ── Step: Create Org First ─────────────────────────────────
  if (step === 'create-org') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] bg-white p-0 gap-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Building2 size={18} />
              </div>
              {ko ? "먼저 조직을 만들어주세요" : "Create Organization First"}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {ko ? "팀원을 초대하려면 먼저 조직을 등록해야 합니다." : "You need to create an organization before inviting members."}
            </p>
          </DialogHeader>

          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-gray-700 flex items-center gap-2">
                <Building2 size={14} className="text-gray-400" />
                {ko ? "조직 이름" : "Organization Name"} <span className="text-red-500">*</span>
              </Label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder={ko ? "예: 더포텐셜" : "e.g. The Potential"}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0079FF]/20 focus:border-[#0079FF] focus:bg-white transition-all"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleCreateOrg()}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                <AlertCircle size={16} /> {error}
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-2 gap-3 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 px-6 text-gray-500"
            >
              {ko ? "취소" : "Cancel"}
            </Button>
            <Button
              onClick={handleCreateOrg}
              disabled={!orgName.trim() || isLoading}
              className="h-11 px-8 bg-[#0079FF] hover:bg-[#0062D1] text-white shadow-lg shadow-blue-200 rounded-xl font-medium"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Building2 size={16} className="mr-2" />}
              {ko ? "조직 만들기" : "Create Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Step: Result (show code) ───────────────────────────────
  if (step === 'result' && generatedCode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] bg-white p-8 text-center rounded-2xl shadow-2xl border-0">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {ko ? "초대 코드가 생성되었습니다!" : "Invite Code Generated!"}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {ko
              ? "아래 링크를 팀원에게 공유하세요. 링크를 통해 바로 팀에 참여할 수 있습니다."
              : "Share the link below with your team member. They can join your team directly."}
          </p>

          {/* Invite Link */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 mb-3">
            <p className="text-xs text-blue-500 mb-2 uppercase tracking-wider font-medium flex items-center gap-1.5">
              <Link2 size={12} />
              {ko ? "초대 링크" : "Invite Link"}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-blue-800 bg-white px-3 py-2 rounded-lg border border-blue-100 truncate">
                {getInviteLink()}
              </code>
              <button
                onClick={handleCopyLink}
                className={cn(
                  "p-2 rounded-lg transition-all shrink-0",
                  linkCopied
                    ? "bg-green-100 text-green-600"
                    : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                )}
              >
                {linkCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            {linkCopied && (
              <p className="text-xs text-green-600 mt-1.5 font-medium">
                {ko ? "링크가 복사되었습니다!" : "Link copied!"}
              </p>
            )}
          </div>

          {/* Code display */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-4">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-medium">
              {ko ? "초대 코드" : "Invite Code"}
            </p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-2xl font-mono font-bold text-gray-900 tracking-[0.3em]">
                {generatedCode}
              </code>
              <button
                onClick={handleCopy}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  copied
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                )}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 mt-1.5 font-medium">
                {ko ? "코드가 복사되었습니다!" : "Code copied!"}
              </p>
            )}
          </div>

          {/* Meta info */}
          <div className="flex justify-center gap-6 text-xs text-gray-400 mb-6">
            <span className="flex items-center gap-1">
              <Shield size={12} />
              {role === 'admin' ? (ko ? '관리자' : 'Admin') :
               role === 'viewer' ? (ko ? '뷰어' : 'Viewer') :
               (ko ? '멤버' : 'Member')}
            </span>
            {expiresAt && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {ko ? '만료:' : 'Expires:'} {formatExpiry(expiresAt)}
              </span>
            )}
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-[#0079FF] hover:bg-[#006AE0] text-white rounded-xl h-12"
          >
            {ko ? "확인" : "Done"}
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Step: Generate (select role) ───────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white p-0 gap-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            {ko ? "팀원 초대하기" : "Invite Team Member"}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {ko
              ? `${org?.name || '조직'}에 새로운 멤버를 초대합니다. 초대 코드를 생성하여 전달하세요.`
              : `Invite a new member to ${org?.name || 'your organization'}. Generate an invite code to share.`}
          </p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Org info */}
          {org && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">{org.name}</p>
                <p className="text-xs text-blue-600">
                  {ko ? `${org.memberIds?.length || 1}명의 멤버` : `${org.memberIds?.length || 1} members`}
                </p>
              </div>
            </div>
          )}

          {/* Role select */}
          <div className="space-y-3">
            <Label className="text-gray-700 flex items-center gap-2">
              <Shield size={16} className="text-gray-400" />
              {ko ? "초대 역할" : "Invite Role"}
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-purple-500" />
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{ko ? '관리자' : 'Admin'}</span>
                      <span className="text-xs text-gray-400">{ko ? '팀 관리 및 설정 가능' : 'Can manage team and settings'}</span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-blue-500" />
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{ko ? '멤버' : 'Member'}</span>
                      <span className="text-xs text-gray-400">{ko ? '업무 생성 및 수정 가능' : 'Can create and edit tasks'}</span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-gray-500" />
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{ko ? '뷰어' : 'Viewer'}</span>
                      <span className="text-xs text-gray-400">{ko ? '조회만 가능' : 'Read-only access'}</span>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* How it works */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Link2 size={14} />
              {ko ? "초대 방식" : "How it works"}
            </p>
            <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
              <li>{ko ? "초대 링크를 생성합니다 (유효기간 7일)" : "Generate an invite link (valid for 7 days)"}</li>
              <li>{ko ? "링크를 팀원에게 공유합니다" : "Share the link with your team member"}</li>
              <li>{ko ? "팀원이 링크를 통해 로그인하면 바로 합류됩니다" : "They sign in via the link and join instantly"}</li>
            </ol>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 gap-3 sm:gap-0 border-t border-gray-100">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-11 px-6 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          >
            {ko ? "취소" : "Cancel"}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="h-11 px-8 bg-[#0079FF] hover:bg-[#0062D1] text-white shadow-lg shadow-blue-200 rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Link2 size={16} className="mr-2" />}
            {ko ? "초대 코드 생성" : "Generate Code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
