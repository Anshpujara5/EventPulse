import type { Ref } from "react";

interface SignupTermsAgreementProps {
  checked: boolean;
  error: string;
  inputRef: Ref<HTMLInputElement>;
  onChange: (checked: boolean) => void;
}

const ERROR_ID = "signup-terms-error";

export function SignupTermsAgreement({
  checked,
  error,
  inputRef,
  onChange,
}: SignupTermsAgreementProps) {
  return (
    <div>
      <label className="flex items-start gap-3 text-sm text-slate-300">
        <input
          aria-describedby={error ? ERROR_ID : undefined}
          aria-invalid={error ? true : undefined}
          aria-required="true"
          checked={checked}
          className={`mt-0.5 size-4 rounded border-slate-600 bg-slate-950 accent-blue-500 ${
            error ? "ring-2 ring-rose-400/40" : ""
          }`}
          id="termsAccepted"
          name="termsAccepted"
          onChange={(event) => onChange(event.target.checked)}
          ref={inputRef}
          type="checkbox"
        />
        <span>
          I agree to the{" "}
          <a className="font-semibold text-cyan-400 hover:text-cyan-300" href="#">
            Terms
          </a>{" "}
          and{" "}
          <a className="font-semibold text-cyan-400 hover:text-cyan-300" href="#">
            Privacy Policy
          </a>
        </span>
      </label>
      {error ? (
        <p
          className="mt-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200"
          id={ERROR_ID}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
