import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ArrowRight, X, Check, Clock } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isWithinInterval,
  isBefore,
} from "date-fns";
import { ko as koLocale } from "date-fns/locale";

interface NotionDateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  language: string;
  /** Single-date mode: no range selection */
  singleDate?: boolean;
  /** Hide time toggle and input inside the picker */
  hideTime?: boolean;
  /** Default the "include time" toggle to on */
  defaultIncludeTime?: boolean;
}

const WEEKDAYS_KO = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseTimeStr(str: string): { h: number; m: number } | null {
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function formatTime12(h: number, m: number, ko: boolean): string {
  const isAm = h < 12;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${isAm ? (ko ? "오전" : "AM") : (ko ? "오후" : "PM")}`;
}

function formatTime24(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Inline Time Input (12h with AM/PM toggle, or 24h plain) ─────────
function TimeInputInline({
  hour, minute, onChange, language, use24h,
}: {
  hour: number; minute: number;
  onChange: (h: number, m: number) => void;
  language: string;
  use24h: boolean;
}) {
  const ko = language === "ko";
  const isAm = hour < 12;
  const display12h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  const formatText = () => use24h
    ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    : `${String(display12h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const [timeText, setTimeText] = useState(formatText());

  useEffect(() => { setTimeText(formatText()); }, [hour, minute, use24h]);

  const commitTime = (text: string) => {
    const trimmed = text.trim();
    let h: number, m: number;
    const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    const plainMatch = trimmed.match(/^(\d{1,4})$/);
    if (colonMatch) { h = parseInt(colonMatch[1], 10); m = parseInt(colonMatch[2], 10); }
    else if (plainMatch) { const num = parseInt(plainMatch[1], 10); if (num <= 23) { h = num; m = 0; } else if (num >= 100) { h = Math.floor(num / 100); m = num % 100; } else { h = num; m = 0; } }
    else return;
    if (m < 0 || m > 59) return;

    if (use24h) {
      // 24h: accept 0-23 directly
      if (h < 0 || h > 23) return;
      onChange(h, m);
    } else {
      // 12h: convert using current AM/PM state
      if (h >= 13 && h <= 23) { onChange(h, m); return; }
      if (h === 0) { onChange(0, m); return; }
      if (h < 1 || h > 12) return;
      if (isAm) { h = h === 12 ? 0 : h; } else { h = h === 12 ? 12 : h + 12; }
      onChange(h, m);
    }
  };

  const toggleAmPm = () => {
    const newHour = isAm ? hour + 12 : hour - 12;
    onChange(Math.max(0, Math.min(23, newHour)), minute);
  };

  return (
    <div className="flex items-center gap-1.5">
      {!use24h && (
        <div className="flex bg-gray-100 rounded p-0.5">
          <button onClick={(e) => { e.stopPropagation(); if (!isAm) toggleAmPm(); }}
            className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all", isAm ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
            {ko ? "오전" : "AM"}
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (isAm) toggleAmPm(); }}
            className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all", !isAm ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
            {ko ? "오후" : "PM"}
          </button>
        </div>
      )}
      <input type="text" value={timeText}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setTimeText(e.target.value)}
        onBlur={() => { commitTime(timeText); setTimeText(formatText()); }}
        onKeyDown={(e) => { if (e.key === "Enter") { commitTime(timeText); (e.target as HTMLInputElement).blur(); } }}
        className="w-[50px] text-xs font-mono font-semibold text-gray-700 py-0.5 px-1.5 border border-gray-200 rounded bg-white text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
        maxLength={5} placeholder={use24h ? "09:00" : "09:00"} />
    </div>
  );
}


export function NotionDateRangePicker({
  startDate,
  endDate,
  onChange,
  language,
  singleDate = false,
  hideTime = false,
  defaultIncludeTime = false,
}: NotionDateRangePickerProps) {
  const ko = language === "ko";
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startDate || new Date());

  // Staging state — only committed on confirm
  const [tempStart, setTempStart] = useState<Date | null>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate);

  // Time state
  const [includeTime, setIncludeTime] = useState(() => {
    if (startDate && (startDate.getHours() !== 0 || startDate.getMinutes() !== 0)) return true;
    if (endDate && (endDate.getHours() !== 0 || endDate.getMinutes() !== 0)) return true;
    return defaultIncludeTime;
  });
  const [use24h, setUse24h] = useState(() => {
    try { const v = localStorage.getItem("poten_time_format"); return v === "24h"; } catch { return false; }
  });
  const [tempStartHour, setTempStartHour] = useState(startDate?.getHours() ?? 9);
  const [tempStartMinute, setTempStartMinute] = useState(startDate?.getMinutes() ?? 0);
  const [tempEndHour, setTempEndHour] = useState(endDate?.getHours() ?? 18);
  const [tempEndMinute, setTempEndMinute] = useState(endDate?.getMinutes() ?? 0);

  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

  // Sync staging when opening
  useEffect(() => {
    if (open) {
      setTempStart(startDate);
      setTempEnd(endDate);
      setViewMonth(startDate || new Date());
      const hasTime = (startDate && (startDate.getHours() !== 0 || startDate.getMinutes() !== 0)) ||
                      (endDate && (endDate.getHours() !== 0 || endDate.getMinutes() !== 0));
      setIncludeTime(!!hasTime || defaultIncludeTime);
      setTempStartHour(startDate?.getHours() ?? 9);
      setTempStartMinute(startDate?.getMinutes() ?? 0);
      setTempEndHour(endDate?.getHours() ?? 18);
      setTempEndMinute(endDate?.getMinutes() ?? 0);
    }
  }, [open]);

  // Calculate popup position
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const position = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const popupWidth = 300;
      let left = rect.left;
      if (left + popupWidth > window.innerWidth - 16) left = window.innerWidth - popupWidth - 16;
      if (left < 8) left = 8;
      let top = rect.bottom + 4;
      const popupHeight = popupRef.current?.offsetHeight || 480;
      if (top + popupHeight > window.innerHeight - 16) top = rect.top - popupHeight - 4;
      if (top < 8) top = 8;
      setPopupPos({ top, left });
    };
    position();
    requestAnimationFrame(position);
  }, [open]);

  const handleConfirmRef = useRef<() => void>(() => {});
  handleConfirmRef.current = () => {
    let start = tempStart ? new Date(tempStart) : null;
    let end = tempEnd ? new Date(tempEnd) : null;
    if (includeTime && !hideTime) {
      if (start) start.setHours(tempStartHour, tempStartMinute, 0, 0);
      if (end) end.setHours(tempEndHour, tempEndMinute, 0, 0);
    } else {
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(0, 0, 0, 0);
    }
    onChange(start, end);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popupRef.current && !popupRef.current.contains(target)
      ) {
        handleConfirmRef.current();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build calendar grid (Mon start)
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getRange = useCallback(() => {
    const s = dragStart || tempStart;
    const e = dragEnd || tempEnd;
    if (!s) return { rangeStart: null, rangeEnd: null };
    if (!e) return { rangeStart: s, rangeEnd: s };
    if (isBefore(e, s)) return { rangeStart: e, rangeEnd: s };
    return { rangeStart: s, rangeEnd: e };
  }, [dragStart, dragEnd, tempStart, tempEnd]);

  const handleMouseDown = (day: Date) => {
    setIsDragging(true);
    setDragStart(day);
    setDragEnd(null);
  };

  const handleMouseEnter = (day: Date) => {
    if (!isDragging) return;
    setDragEnd(day);
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);

    const s = dragStart;
    const e = dragEnd || dragStart;

    if (singleDate) {
      let picked = new Date(s);
      if (includeTime && !hideTime) {
        picked.setHours(tempStartHour, tempStartMinute, 0, 0);
      }
      onChange(picked, null);
      setOpen(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    } else if (isSameDay(s, e)) {
      if (tempStart && !isSameDay(s, tempStart)) {
        if (isBefore(s, tempStart)) {
          setTempStart(s);
          setTempEnd(tempStart);
        } else {
          setTempEnd(s);
        }
      } else {
        setTempStart(s);
        // Keep same-day range if end date was already set (allows same-day with different times)
        if (tempEnd) {
          setTempEnd(s);
        } else {
          setTempEnd(null);
        }
      }
    } else {
      const [rStart, rEnd] = isBefore(e, s) ? [e, s] : [s, e];
      setTempStart(rStart);
      setTempEnd(rEnd);
    }

    setDragStart(null);
    setDragEnd(null);
  };

  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDragging) handleMouseUp();
    };
    window.addEventListener("mouseup", handleGlobalUp);
    return () => window.removeEventListener("mouseup", handleGlobalUp);
  });

  const { rangeStart, rangeEnd } = getRange();

  const isInRange = (day: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    return isWithinInterval(day, { start: rangeStart, end: rangeEnd });
  };

  const isRangeStart = (day: Date) => rangeStart && isSameDay(day, rangeStart);
  const isRangeEnd = (day: Date) => rangeEnd && isSameDay(day, rangeEnd);
  const isToday = (day: Date) => isSameDay(day, new Date());

  const clearDates = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
  };

  const handleConfirm = () => handleConfirmRef.current();
  const handleCancel = () => setOpen(false);

  // ─── Display formatter ───────────────────────────────────────────
  const fmtTime = (h: number, m: number) => use24h ? formatTime24(h, m) : formatTime12(h, m, ko);

  const formatDisplay = () => {
    if (!startDate) return ko ? "날짜 선택" : "Pick a date";
    const hasTime = startDate.getHours() !== 0 || startDate.getMinutes() !== 0 ||
                    (endDate && (endDate.getHours() !== 0 || endDate.getMinutes() !== 0));
    const opts = { locale: ko ? koLocale : undefined };

    if (!endDate || isSameDay(startDate, endDate)) {
      const fmt = ko ? "yyyy년 M월 d일" : "MMM d, yyyy";
      const base = format(startDate, fmt, opts);
      if (hasTime) {
        return `${base} ${fmtTime(startDate.getHours(), startDate.getMinutes())}`;
      }
      return base;
    }
    const fmtShort = ko ? "M월 d일" : "MMM d";
    const sameYear = startDate.getFullYear() === endDate.getFullYear();
    const fmtFull = ko ? "yyyy년 M월 d일" : "MMM d, yyyy";
    const startFmt = sameYear ? fmtShort : fmtFull;
    const endFmt = sameYear ? fmtShort : fmtFull;
    const startStr = format(startDate, startFmt, opts) + (hasTime ? ` ${fmtTime(startDate.getHours(), startDate.getMinutes())}` : "");
    const endStr = format(endDate, endFmt, opts) + (hasTime && (endDate.getHours() || endDate.getMinutes()) ? ` ${fmtTime(endDate.getHours(), endDate.getMinutes())}` : "");
    return `${startStr}  →  ${endStr}`;
  };

  const weekdays = ko ? WEEKDAYS_KO : WEEKDAYS_EN;
  const dateFmt = ko ? "yyyy년 M월 d일" : "MMM d, yyyy";
  const dateOpts = { locale: ko ? koLocale : undefined };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors text-sm group"
      >
        <span className={cn("text-sm font-medium", startDate ? "text-gray-700" : "text-gray-400")}>
          {formatDisplay()}
        </span>
        {startDate && (
          <button
            onClick={clearDates}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-0.5"
          >
            <X size={12} />
          </button>
        )}
      </button>

      {/* Calendar popup */}
      {open && popupPos && (
        createPortal(
          <div
            ref={popupRef}
            className="fixed bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] w-[300px] select-none"
            style={{ top: popupPos.top, left: popupPos.left }}
          >
            {/* Month nav */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-sm font-semibold text-gray-800">
                {format(viewMonth, ko ? "yyyy년 M월" : "MMMM yyyy", dateOpts)}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => { setTempStart(new Date()); setTempEnd(null); setViewMonth(new Date()); }}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50 mr-1"
                >
                  {ko ? "오늘" : "Now"}
                </button>
                <button onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 px-3 pb-1">
              {weekdays.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div
              className="grid grid-cols-7 px-3 pb-3"
              onMouseLeave={() => { if (isDragging) setDragEnd(null); }}
            >
              {days.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const inRange = isInRange(day);
                const isStart = isRangeStart(day);
                const isEnd = isRangeEnd(day);
                const today = isToday(day);
                const singleSelect = isStart && (!rangeEnd || isSameDay(rangeStart!, rangeEnd!));

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative flex items-center justify-center",
                      inRange && !singleSelect && "before:absolute before:inset-y-0.5 before:inset-x-0 before:bg-blue-50",
                      isStart && !singleSelect && "before:!left-1/2 before:!rounded-l-full",
                      isEnd && !singleSelect && "before:!right-1/2 before:!rounded-r-full"
                    )}
                  >
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleMouseDown(day); }}
                      onMouseEnter={() => handleMouseEnter(day)}
                      className={cn(
                        "relative z-10 w-8 h-8 rounded-full text-[13px] font-medium transition-all",
                        !inMonth && "text-gray-300",
                        inMonth && !inRange && !isStart && !isEnd && "text-gray-700 hover:bg-gray-100",
                        inRange && !isStart && !isEnd && "text-blue-700",
                        (isStart || isEnd) && "bg-[#0079FF] text-white shadow-sm",
                        today && !isStart && !isEnd && "ring-1 ring-blue-300 font-bold text-blue-600"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ── Selected date rows (below calendar) ── */}
            <div className="border-t border-gray-100 px-3 py-2 space-y-1">
              {/* Start date row */}
              <div className={cn(
                "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border",
                tempStart ? "border-blue-200 bg-blue-50/50 text-gray-700" : "border-gray-200 text-gray-400"
              )}>
                <span>{tempStart ? format(tempStart, dateFmt, dateOpts) : (ko ? "시작일" : "Start date")}</span>
                {includeTime && !hideTime && tempStart && (
                  <TimeInputInline
                    hour={tempStartHour} minute={tempStartMinute}
                    onChange={(h, m) => { setTempStartHour(h); setTempStartMinute(m); }}
                    language={language} use24h={use24h}
                  />
                )}
              </div>
              {/* End date row (range mode only) */}
              {!singleDate && tempEnd && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600">
                  <span>{format(tempEnd, dateFmt, dateOpts)}</span>
                  {includeTime && !hideTime && (
                    <TimeInputInline
                      hour={tempEndHour} minute={tempEndMinute}
                      onChange={(h, m) => { setTempEndHour(h); setTempEndMinute(m); }}
                      language={language} use24h={use24h}
                    />
                  )}
                </div>
              )}
            </div>

            {/* ── Settings section (Notion-style) ── */}
            <div className="border-t border-gray-100 px-4 py-2 space-y-1.5">
              {/* End date toggle (range mode) */}
              {!singleDate && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-600">{ko ? "종료일" : "End date"}</span>
                  <button
                    onClick={() => {
                      if (tempEnd) {
                        setTempEnd(null);
                      } else if (tempStart) {
                        const d = new Date(tempStart);
                        d.setDate(d.getDate() + 7);
                        setTempEnd(d);
                      }
                    }}
                    className={cn(
                      "w-8 h-[18px] rounded-full transition-colors relative",
                      tempEnd ? "bg-blue-500" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all",
                      tempEnd ? "left-[17px]" : "left-0.5"
                    )} />
                  </button>
                </div>
              )}

              {/* Include time toggle */}
              {!hideTime && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" />
                    {ko ? "시간 포함" : "Include time"}
                  </span>
                  <button
                    onClick={() => setIncludeTime(!includeTime)}
                    className={cn(
                      "w-8 h-[18px] rounded-full transition-colors relative",
                      includeTime ? "bg-blue-500" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all",
                      includeTime ? "left-[17px]" : "left-0.5"
                    )} />
                  </button>
                </div>
              )}

              {/* Time format selector (only when time is included) */}
              {!hideTime && includeTime && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-600">{ko ? "시간 형식" : "Time format"}</span>
                  <button
                    onClick={() => {
                      const next = !use24h;
                      setUse24h(next);
                      try { localStorage.setItem("poten_time_format", next ? "24h" : "12h"); } catch {}
                    }}
                    className="text-xs font-medium text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1"
                  >
                    {use24h ? "24h" : "12h"}
                    <ChevronRight size={12} className="text-gray-400" />
                  </button>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="border-t border-gray-100 px-4 py-2.5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    onChange(null, null);
                    setOpen(false);
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  {ko ? "초기화" : "Clear"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {ko ? "취소" : "Cancel"}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={cn(
                      "flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      tempStart
                        ? "bg-[#0079FF] text-white hover:bg-blue-700 shadow-sm"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                    disabled={!tempStart}
                  >
                    <Check size={12} />
                    {ko ? "확인" : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
}
