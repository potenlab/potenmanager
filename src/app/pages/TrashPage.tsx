import { useState } from "react";
import { Trash2, RotateCcw, X, Video, CheckSquare, AlertTriangle, Radar } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useTrash, TrashedItem } from "../context/TrashContext";
import { useTaskContext } from "../context/TaskContext";
import { useMeetingContext } from "../context/MeetingContext";
import { useBizRadar } from "../context/BizRadarContext";
import { cn } from "../../lib/utils";

export function TrashPage() {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const { items, restoreFromTrash, permanentlyDelete, emptyTrash } = useTrash();
  const { setTasks } = useTaskContext();
  const { addMeeting } = useMeetingContext();
  const { addItem: addRadarItem } = useBizRadar();

  const handleRestore = (item: TrashedItem) => {
    const restored = restoreFromTrash(item.id);
    if (!restored) return;

    if (restored.type === 'task') {
      setTasks(prev => [...prev, restored.data]);
    } else if (restored.type === 'meeting') {
      addMeeting(restored.data);
    } else if (restored.type === 'radar') {
      addRadarItem(restored.data);
    }
  };

  const handleEmptyTrash = () => {
    if (!confirm(ko ? '휴지통을 비우시겠습니까? 복구할 수 없습니다.' : 'Empty trash? This cannot be undone.')) return;
    emptyTrash();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col">
      <header className="mb-6 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Trash2 size={22} className="text-gray-400" />
              {ko ? '휴지통' : 'Trash'}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {ko ? `${items.length}개 항목` : `${items.length} item${items.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
            >
              <Trash2 size={14} />
              {ko ? '휴지통 비우기' : 'Empty Trash'}
            </button>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Trash2 size={28} className="text-gray-300" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-500 mb-1">{ko ? '휴지통이 비어있습니다' : 'Trash is empty'}</p>
            <p className="text-sm">{ko ? '삭제된 항목이 여기에 표시됩니다' : 'Deleted items will appear here'}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 pb-8">
          {items.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all group"
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                item.type === 'task' ? "bg-blue-50" : item.type === 'radar' ? "bg-amber-50" : "bg-purple-50"
              )}>
                {item.type === 'task'
                  ? <CheckSquare size={18} className="text-blue-500" />
                  : item.type === 'radar'
                  ? <Radar size={18} className="text-amber-500" />
                  : <Video size={18} className="text-purple-500" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {item.title || (ko ? '제목 없음' : 'Untitled')}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase">
                    {item.type === 'task' ? (ko ? '업무' : 'Task') : item.type === 'radar' ? (ko ? '레이더' : 'Radar') : (ko ? '회의' : 'Meeting')}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {ko ? '삭제: ' : 'Deleted: '}{formatDate(item.deletedAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleRestore(item)}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title={ko ? '복원' : 'Restore'}
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  onClick={() => permanentlyDelete(item.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title={ko ? '영구 삭제' : 'Delete permanently'}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
