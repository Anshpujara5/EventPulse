"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

function FieldIcon({ type }: { type: "email" | "password" }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
    >
      {type === "email" ? (
        <path
          d="M4 6h16v12H4V6Zm0 1 8 6 8-6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      ) : (
        <path
          d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5V11Zm7 4v2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      )}
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M3 3l18 18M10.6 10.6A3 3 0 0 0 13.4 13.4M9.9 5.4A9.7 9.7 0 0 1 12 5c6 0 9.5 7 9.5 7a15 15 0 0 1-3 4.1M6.6 6.6A15.4 15.4 0 0 0 2.5 12s3.5 7 9.5 7a9.8 9.8 0 0 0 4.3-1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ProviderIcon({ provider }: { provider: "google" | "github" }) {
  if (provider === "google") {
    return (
      <span
        aria-hidden="true"
        className="flex size-6 items-center justify-center rounded-full bg-white text-sm font-black text-blue-600"
      >
        G
      </span>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="size-6"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.19-3.37-1.19-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.5 9.5 0 0 1 12 7c.85 0 1.71.11 2.51.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.86v2.58c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

export default function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard");
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm font-bold text-white" htmlFor="email">
          Work email
        </label>
        <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-600/70 bg-slate-950/55 px-4 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20">
          <FieldIcon type="email" />
          <input
            autoComplete="email"
            className="signin-input h-full min-w-0 flex-1 rounded-md border-0 bg-slate-950/70 px-1 text-base text-white caret-white outline-none placeholder:text-slate-500 focus:bg-slate-950/70"
            id="email"
            name="email"
            placeholder="you@company.com"
            type="email"
          />
        </div>
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-bold text-white"
          htmlFor="password"
        >
          Password
        </label>
        <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-600/70 bg-slate-950/55 px-4 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20">
          <FieldIcon type="password" />
          <input
            autoComplete="current-password"
            className="signin-input h-full min-w-0 flex-1 rounded-md border-0 bg-slate-950/70 px-1 text-base text-white caret-white outline-none placeholder:text-slate-500 focus:bg-slate-950/70"
            id="password"
            name="password"
            placeholder="Enter your password"
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="text-slate-400 transition hover:text-cyan-300"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="flex items-center gap-3 font-medium text-slate-200">
          <input
            className="size-4 rounded border-slate-600 bg-slate-950 accent-blue-500"
            defaultChecked
            type="checkbox"
          />
          Remember me
        </label>
        <a className="font-semibold text-cyan-400 hover:text-cyan-300" href="#">
          Forgot password?
        </a>
      </div>

      <button
        className="flex h-14 w-full items-center justify-center gap-4 rounded-xl bg-linear-to-r from-cyan-400 via-blue-600 to-violet-700 text-base font-extrabold text-white shadow-[0_0_30px_rgba(37,99,235,0.34)] transition hover:scale-[1.01]"
        type="submit"
      >
        Sign In
        <span aria-hidden="true">-&gt;</span>
      </button>

      <div className="flex items-center gap-5 text-sm text-slate-400">
        <span className="h-px flex-1 bg-white/10" />
        or continue with
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className="flex h-12 items-center justify-center gap-3 rounded-xl border border-white/12 bg-slate-950/35 text-sm font-bold text-white transition hover:border-cyan-300/35 hover:bg-white/6"
          type="button"
        >
          <ProviderIcon provider="google" />
          Google
        </button>
        <button
          className="flex h-12 items-center justify-center gap-3 rounded-xl border border-white/12 bg-slate-950/35 text-sm font-bold text-white transition hover:border-cyan-300/35 hover:bg-white/6"
          type="button"
        >
          <ProviderIcon provider="github" />
          GitHub
        </button>
      </div>

      <p className="pt-2 text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link className="font-bold text-cyan-400 hover:text-cyan-300" href="/signup">
          Sign up
        </Link>
      </p>
    </form>
  );
}
