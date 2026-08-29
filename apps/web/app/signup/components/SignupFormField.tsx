import type { ChangeEvent } from "react";

type FieldIconName = "user" | "email" | "password";

const FIELD_ICON_PATHS: Record<FieldIconName, string> = {
  user: "M20 21a8 8 0 0 0-16 0M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  email: "M4 6h16v12H4V6Zm0 1 8 6 8-6",
  password: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5V11Zm7 4v2",
};

interface SignupFormFieldProps {
  ariaToggleLabel?: string;
  autoComplete: string;
  icon: FieldIconName;
  id: string;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleVisibility?: () => void;
  placeholder: string;
  showValue?: boolean;
  type: "email" | "password" | "text";
  value: string;
}

function FieldIcon({ name }: { name: FieldIconName }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d={FIELD_ICON_PATHS[name]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d={
          visible
            ? "M3 3l18 18M10.6 10.6A3 3 0 0 0 13.4 13.4M9.9 5.4A9.7 9.7 0 0 1 12 5c6 0 9.5 7 9.5 7a15 15 0 0 1-3 4.1M6.6 6.6A15.4 15.4 0 0 0 2.5 12s3.5 7 9.5 7a9.8 9.8 0 0 0 4.3-1"
            : "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        }
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      {!visible ? (
        <path
          d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      ) : null}
    </svg>
  );
}

export function SignupFormField({
  ariaToggleLabel,
  autoComplete,
  icon,
  id,
  label,
  onChange,
  onToggleVisibility,
  placeholder,
  showValue = false,
  type,
  value,
}: SignupFormFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-white" htmlFor={id}>
        {label}
      </label>
      <div className="flex h-12 items-center gap-3 rounded-lg border border-slate-600/70 bg-slate-950/55 px-4 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20">
        <FieldIcon name={icon} />
        <input
          autoComplete={autoComplete}
          className="signin-input h-full min-w-0 flex-1 rounded-md border-0 bg-slate-950/70 px-1 text-base text-white caret-white outline-none placeholder:text-slate-500 focus:bg-slate-950/70"
          id={id}
          name={id}
          onChange={onChange}
          placeholder={placeholder}
          required
          type={type === "password" && showValue ? "text" : type}
          value={value}
        />
        {type === "password" ? (
          <button
            aria-label={ariaToggleLabel}
            className="text-slate-400 transition hover:text-cyan-300"
            onClick={onToggleVisibility}
            type="button"
          >
            <PasswordVisibilityIcon visible={showValue} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
