import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { useLanguage } from "../../context/LanguageContext";
import { GoalItem, GoalLevel, UrgentCategory } from "../../../lib/mockData";
import { 
  Calendar as CalendarIcon, 
  Target,
  Flag,
  Milestone,
  CheckCircle2,
  TrendingUp,
  Layers,
  Zap
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (goal: Partial<GoalItem>) => void;
  defaultLevel?: GoalLevel;
}

export function CreateGoalDialog({ open, onOpenChange, onSubmit, defaultLevel }: CreateGoalDialogProps) {
  const { language } = useLanguage();
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<GoalLevel>(defaultLevel || "Quarter");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("pending");

  // Sync level when dialog opens with a different defaultLevel
  useEffect(() => {
    if (open && defaultLevel) {
      setLevel(defaultLevel);
    }
  }, [open, defaultLevel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      level,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      progress: Number(progress),
      status: status as 'pending' | 'in-progress' | 'completed',
    });
    
    // Reset form
    setTitle("");
    setLevel(defaultLevel || "Quarter");
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate("");
    setProgress(0);
    setStatus("pending");
    onOpenChange(false);
  };

  const getLevelIcon = (l: GoalLevel) => {
    switch(l) {
      case 'Year': return <Flag size={16} className="text-purple-500" />;
      case 'Quarter': return <Milestone size={16} className="text-blue-500" />;
      case 'Month': return <Target size={16} className="text-emerald-500" />;
      case 'Week': return <CalendarIcon size={16} className="text-amber-500" />;
      case 'Day': return <CheckCircle2 size={16} className="text-gray-500" />;
      case 'Urgent': return <Zap size={16} className="text-orange-500" />;
      default: return <Target size={16} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-white p-0 gap-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Target size={18} />
            </div>
            {language === 'ko' ? "새 목표 설정" : "Set New Goal"}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {language === 'ko' ? "달성하고자 하는 새로운 목표를 설정하세요." : "Define a new goal you want to achieve."}
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-3">
            <Label htmlFor="title" className="text-gray-700 flex items-center gap-2">
              <Target size={16} className="text-gray-400" />
              {language === 'ko' ? "목표명" : "Goal Title"} <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder={language === 'ko' ? "예: 1분기 매출 10억원 달성" : "e.g., Achieve $1M Revenue in Q1"}
              className="h-11 text-base bg-gray-50 border-gray-200 focus-visible:bg-white transition-colors"
              required
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="level" className="text-gray-700 flex items-center gap-2">
                <Layers size={16} className="text-gray-400" />
                {language === 'ko' ? "목표 레벨" : "Goal Level"}
              </Label>
              <Select value={level} onValueChange={(v) => setLevel(v as GoalLevel)}>
                <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Year">
                    <div className="flex items-center gap-2">
                      <Flag size={14} className="text-purple-500" />
                      Year (Annual)
                    </div>
                  </SelectItem>
                  <SelectItem value="Quarter">
                    <div className="flex items-center gap-2">
                      <Milestone size={14} className="text-blue-500" />
                      Quarter (Q1-Q4)
                    </div>
                  </SelectItem>
                  <SelectItem value="Month">
                    <div className="flex items-center gap-2">
                      <Target size={14} className="text-emerald-500" />
                      Month
                    </div>
                  </SelectItem>
                  <SelectItem value="Urgent">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-orange-500" />
                      {language === 'ko' ? '긴급 미션' : 'Urgent Mission'}
                    </div>
                  </SelectItem>
                  <SelectItem value="Week">
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={14} className="text-amber-500" />
                      Week
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="status" className="text-gray-700 flex items-center gap-2">
                <TrendingUp size={16} className="text-gray-400" />
                {language === 'ko' ? "상태" : "Status"}
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      Pending
                    </div>
                  </SelectItem>
                  <SelectItem value="in-progress">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      In Progress
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Completed
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="startDate" className="text-gray-700 flex items-center gap-2">
                <CalendarIcon size={16} className="text-gray-400" />
                {language === 'ko' ? "시작일" : "Start Date"}
              </Label>
              <div className="relative">
                <Input 
                  id="startDate" 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="h-11 bg-gray-50 border-gray-200 focus-visible:bg-white pl-10 block w-full"
                  required
                />
                <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="endDate" className="text-gray-700 flex items-center gap-2">
                <CalendarIcon size={16} className="text-gray-400" />
                {language === 'ko' ? "종료일 (선택)" : "End Date (Optional)"}
              </Label>
              <div className="relative">
                <Input 
                  id="endDate" 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="h-11 bg-gray-50 border-gray-200 focus-visible:bg-white pl-10 block w-full"
                />
                <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="progress" className="text-gray-700 flex items-center gap-2">
              <TrendingUp size={16} className="text-gray-400" />
              {language === 'ko' ? `진행률: ${progress}%` : `Progress: ${progress}%`}
            </Label>
            <div className="px-1 pt-2">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-3 sm:gap-0">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="h-11 px-6 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            >
              {language === 'ko' ? "취소" : "Cancel"}
            </Button>
            <Button 
              type="submit" 
              className="h-11 px-8 bg-[#0079FF] hover:bg-[#0062D1] text-white shadow-lg shadow-blue-200 rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {language === 'ko' ? "목표 추가하기" : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}