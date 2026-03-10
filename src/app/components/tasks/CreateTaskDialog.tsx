import { useState } from "react";
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
import { Task } from "../../../lib/mockData";
import { usePermission } from "../../context/PermissionContext";
import { 
  Calendar as CalendarIcon, 
  Flag, 
  User, 
  AlignLeft, 
  Type,
  CheckCircle2 
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Partial<Task>) => void;
}

export function CreateTaskDialog({ open, onOpenChange, onSubmit }: CreateTaskDialogProps) {
  const { language } = useLanguage();
  const { members, currentUser } = usePermission();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [assigneeId, setAssigneeId] = useState<string>(currentUser?.id || members[0]?.id || "");
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      priority: priority as 'low' | 'medium' | 'high',
      assigneeId,
      dueDate: new Date(dueDate),
      status: 'pending',
      level: 'Day',
      progress: 0
    });
    
    // Reset form
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate(new Date().toISOString().split('T')[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-white p-0 gap-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            {language === 'ko' ? "새 업무 추가" : "Add New Task"}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {language === 'ko' ? "새로운 업무를 생성하고 팀원에게 할당하세요." : "Create a new task and assign it to your team."}
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-3">
            <Label htmlFor="title" className="text-gray-700 flex items-center gap-2">
              <Type size={16} className="text-gray-400" />
              {language === 'ko' ? "업무명" : "Task Title"} <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder={language === 'ko' ? "예: 1분기 마케팅 전략 수립" : "e.g., Q1 Marketing Strategy"}
              className="h-11 text-base bg-gray-50 border-gray-200 focus-visible:bg-white transition-colors"
              required
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="priority" className="text-gray-700 flex items-center gap-2">
                <Flag size={16} className="text-gray-400" />
                {language === 'ko' ? "우선순위" : "Priority"}
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="medium" className="text-green-600">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="high" className="text-red-600">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      High
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="dueDate" className="text-gray-700 flex items-center gap-2">
                <CalendarIcon size={16} className="text-gray-400" />
                {language === 'ko' ? "마감일" : "Due Date"}
              </Label>
              <div className="relative">
                <Input 
                  id="dueDate" 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                  className="h-11 bg-gray-50 border-gray-200 focus-visible:bg-white pl-10 block w-full"
                  required
                />
                <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="assignee" className="text-gray-700 flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              {language === 'ko' ? "참여자" : "Participant"}
            </Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <img src={member.avatar} alt={member.name} className="w-5 h-5 rounded-full object-cover" />
                      <span>{member.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="description" className="text-gray-700 flex items-center gap-2">
              <AlignLeft size={16} className="text-gray-400" />
              {language === 'ko' ? "설명" : "Description"}
            </Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder={language === 'ko' ? "업무에 대한 상세 설명을 입력하세요..." : "Add more details about this task..."}
              className="min-h-[100px] resize-none bg-gray-50 border-gray-200 focus-visible:bg-white p-3 leading-relaxed"
            />
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
              {language === 'ko' ? "업무 추가하기" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}