import { NotionDateRangePicker } from "../NotionDateRangePicker";

// ─── Unified Date/Time Property ─────────────────────────────────────
// Used by both Task ("일시") and Meeting ("일시") detail pages.
// - defaultShowTime=false → tasks (date only by default, expandable via toggle)
// - defaultShowTime=true  → meetings (date+time by default)
export function DateTimeProperty({
  startDate,
  endDate,
  onDateChange,
  language,
  singleDate,
  defaultShowTime = false,
}: {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
  language: string;
  singleDate?: boolean;
  defaultShowTime?: boolean;
}) {
  return (
    <NotionDateRangePicker
      startDate={startDate}
      endDate={singleDate ? null : endDate}
      onChange={onDateChange}
      language={language}
      singleDate={singleDate}
      defaultIncludeTime={defaultShowTime}
    />
  );
}
