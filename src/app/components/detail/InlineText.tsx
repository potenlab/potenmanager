import { useState, useRef, useEffect } from "react";
import { cn } from "../../../lib/utils";

export function InlineText({
  value,
  onChange,
  placeholder,
  className,
  as = "p",
  readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  as?: "h1" | "p" | "span";
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref.current && !isFocused) {
      ref.current.textContent = value;
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const newVal = ref.current?.textContent?.trim() || "";
    if (newVal !== value) onChange(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && as !== "p" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  return (
    <div
      ref={ref}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onFocus={() => !readOnly && setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
      className={cn(
        "outline-none rounded-lg transition-colors relative",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none",
        !readOnly && "focus:bg-gray-50 focus:ring-2 focus:ring-blue-100 px-1 -mx-1",
        !readOnly && "hover:bg-gray-50/50",
        readOnly && "cursor-default",
        className
      )}
    />
  );
}
