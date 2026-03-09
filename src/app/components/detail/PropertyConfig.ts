import type { ReactNode } from "react";

// ─── Property Field Config Types ─────────────────────────────────

/** Base config shared by all field types */
interface PropertyFieldBase {
  /** Unique key for this property (used as React key) */
  key: string;
  /** Icon element (e.g., <Calendar size={14} />) */
  icon: ReactNode;
  /** Display label */
  label: string;
  /** Hide this property row entirely */
  hidden?: boolean;
}

/** Simple text input */
export interface TextFieldConfig extends PropertyFieldBase {
  type: "text";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Show as monospace font */
  mono?: boolean;
  /** Extra element after the input (e.g., "Open" link) */
  suffix?: ReactNode;
}

/** Dropdown select with typed options */
export interface DropdownFieldConfig<T extends string = string> extends PropertyFieldBase {
  type: "dropdown";
  value: T;
  options: T[];
  onChange: (v: T) => void;
  renderOption: (opt: T) => ReactNode;
  renderValue: (val: T) => ReactNode;
  disabled?: boolean;
}

/** Native date input */
export interface DateFieldConfig extends PropertyFieldBase {
  type: "date";
  value: string; // ISO date string or ""
  onChange: (v: string) => void;
}

/** Boolean toggle button */
export interface ToggleFieldConfig extends PropertyFieldBase {
  type: "toggle";
  value: boolean;
  onChange: (v: boolean) => void;
  /** Label when on */
  onLabel: string;
  /** Label when off */
  offLabel: string;
  /** Icon when on */
  onIcon?: ReactNode;
  /** Icon when off */
  offIcon?: ReactNode;
  /** Color class when on (default: "bg-emerald-50 text-emerald-700") */
  onColor?: string;
  /** Color class when off (default: "bg-gray-100 text-gray-600") */
  offColor?: string;
}

/** Escape hatch: fully custom render */
export interface CustomFieldConfig extends PropertyFieldBase {
  type: "custom";
  render: () => ReactNode;
}

/** Union of all field config types */
export type PropertyFieldConfig =
  | TextFieldConfig
  | DropdownFieldConfig
  | DateFieldConfig
  | ToggleFieldConfig
  | CustomFieldConfig;
