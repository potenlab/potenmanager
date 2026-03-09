import { cn } from "../../../lib/utils";
import { PropertyItem } from "./PropertyItem";
import { InlineDropdown } from "./InlineDropdown";
import type { PropertyFieldConfig } from "./PropertyConfig";

// ─── Field Renderers ─────────────────────────────────────────────

function TextField({ config }: { config: Extract<PropertyFieldConfig, { type: "text" }> }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <input
        value={config.value}
        onChange={(e) => config.onChange(e.target.value)}
        className={cn(
          "flex-1 text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700",
          config.mono && "font-mono"
        )}
        placeholder={config.placeholder}
      />
      {config.suffix}
    </div>
  );
}

function DropdownField({ config }: { config: Extract<PropertyFieldConfig, { type: "dropdown" }> }) {
  return (
    <InlineDropdown
      value={config.value}
      options={config.options}
      onChange={config.onChange}
      renderOption={config.renderOption}
      renderValue={config.renderValue}
      disabled={config.disabled}
    />
  );
}

function DateField({ config }: { config: Extract<PropertyFieldConfig, { type: "date" }> }) {
  return (
    <input
      type="date"
      value={config.value}
      onChange={(e) => config.onChange(e.target.value)}
      className="text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700"
    />
  );
}

function ToggleField({ config }: { config: Extract<PropertyFieldConfig, { type: "toggle" }> }) {
  const onColor = config.onColor || "bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
  const offColor = config.offColor || "bg-gray-100 text-gray-600 hover:bg-gray-200";

  return (
    <button
      onClick={() => config.onChange(!config.value)}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
        config.value ? onColor : offColor
      )}
    >
      {config.value ? config.onIcon : config.offIcon}
      {config.value ? config.onLabel : config.offLabel}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export function AutoProperties({ fields }: { fields: PropertyFieldConfig[] }) {
  return (
    <>
      {fields
        .filter((f) => !f.hidden)
        .map((field) => (
          <PropertyItem key={field.key} icon={field.icon} label={field.label}>
            {field.type === "text" && <TextField config={field as any} />}
            {field.type === "dropdown" && <DropdownField config={field as any} />}
            {field.type === "date" && <DateField config={field as any} />}
            {field.type === "toggle" && <ToggleField config={field as any} />}
            {field.type === "custom" && (field as Extract<PropertyFieldConfig, { type: "custom" }>).render()}
          </PropertyItem>
        ))}
    </>
  );
}
