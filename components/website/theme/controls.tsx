"use client";

import {
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";

export function StudioSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  disabled,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  help?: string;
}) {
  return (
    <div>
      <label className={authLabelClassName}>{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value.startsWith("#") && value.length >= 4 ? value.slice(0, 7) : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-zinc-300 bg-white"
        />
        <input
          className={authInputClassName}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          spellCheck={false}
        />
      </div>
      {help ? <p className="mt-1 text-[11px] text-zinc-500">{help}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  disabled,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className={authLabelClassName}>{label}</label>
      <select
        className={authInputClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={authLabelClassName}>{label}</label>
      <input
        className={authInputClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-zinc-200 px-3.5 py-3">
      <span>
        <span className="block text-sm font-medium text-zinc-800">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-zinc-500">{description}</span>
        ) : null}
      </span>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-zinc-300"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
    </label>
  );
}

export function ChoiceGrid({
  value,
  onChange,
  disabled,
  options,
  columns = 2,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  columns?: 2 | 3 | 4;
  options: Array<{
    value: string;
    label: string;
    description?: string;
    preview?: React.ReactNode;
  }>;
}) {
  const grid =
    columns === 4
      ? "sm:grid-cols-4"
      : columns === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";
  return (
    <div className={`grid gap-2 ${grid}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-xl border p-3 text-left transition ${
              active
                ? "border-zinc-900 ring-1 ring-zinc-900"
                : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            {option.preview}
            <p className="text-sm font-medium text-zinc-900">{option.label}</p>
            {option.description ? (
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {option.description}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export const STUDIO_NAV = [
  { id: "presets", label: "Presets" },
  { id: "brand", label: "Brand" },
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "buttons", label: "Buttons" },
  { id: "spacing", label: "Spacing" },
  { id: "borders", label: "Borders" },
  { id: "shadows", label: "Shadows" },
  { id: "icons", label: "Icons" },
  { id: "animations", label: "Animations" },
  { id: "header", label: "Header" },
  { id: "footer", label: "Footer" },
  { id: "forms", label: "Forms" },
  { id: "cards", label: "Cards" },
  { id: "sections", label: "Sections" },
  { id: "dark", label: "Dark mode" },
  { id: "import", label: "Import / Export" },
  { id: "advanced", label: "Advanced" },
] as const;

export type StudioNavId = (typeof STUDIO_NAV)[number]["id"];
