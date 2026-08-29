"use client";

import Link from "next/link";
import { PasswordStrengthIndicator } from "./components/PasswordStrengthIndicator";
import { SignupFormField } from "./components/SignupFormField";
import { SignupTermsAgreement } from "./components/SignupTermsAgreement";
import { SocialSignupButtons } from "./components/SocialSignupButtons";
import { useSignupForm } from "./useSignupForm";

export default function SignUpForm() {
  const {
    values,
    error,
    termsError,
    isLoading,
    showPassword,
    showConfirmPassword,
    termsInputRef,
    handleNameChange,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleTermsChange,
    handleSubmit,
    togglePasswordVisibility,
    toggleConfirmPasswordVisibility,
  } = useSignupForm();

  return (
    <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
      <SignupFormField
        autoComplete="name"
        icon="user"
        id="fullName"
        label="Full name"
        onChange={handleNameChange}
        placeholder="Jane Doe"
        type="text"
        value={values.name}
      />
      <SignupFormField
        autoComplete="email"
        icon="email"
        id="email"
        label="Work email"
        onChange={handleEmailChange}
        placeholder="you@company.com"
        type="email"
        value={values.email}
      />
      <div>
        <SignupFormField
          ariaToggleLabel={showPassword ? "Hide password" : "Show password"}
          autoComplete="new-password"
          icon="password"
          id="password"
          label="Password"
          onChange={handlePasswordChange}
          onToggleVisibility={togglePasswordVisibility}
          placeholder="Create a strong password"
          showValue={showPassword}
          type="password"
          value={values.password}
        />
        <PasswordStrengthIndicator password={values.password} />
      </div>
      <SignupFormField
        ariaToggleLabel={
          showConfirmPassword ? "Hide confirm password" : "Show confirm password"
        }
        autoComplete="new-password"
        icon="password"
        id="confirmPassword"
        label="Confirm password"
        onChange={handleConfirmPasswordChange}
        onToggleVisibility={toggleConfirmPasswordVisibility}
        placeholder="Confirm your password"
        showValue={showConfirmPassword}
        type="password"
        value={values.confirmPassword}
      />

      {error ? (
        <p
          className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <SignupTermsAgreement
        checked={values.termsAccepted}
        error={termsError}
        inputRef={termsInputRef}
        onChange={handleTermsChange}
      />

      <button
        className="flex h-13 w-full items-center justify-center gap-4 rounded-lg bg-linear-to-r from-cyan-400 via-blue-600 to-violet-700 text-base font-extrabold text-white shadow-[0_0_30px_rgba(37,99,235,0.34)] transition hover:scale-[1.01]"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? "Creating account..." : "Create Account"}
        <span aria-hidden="true">-&gt;</span>
      </button>

      <div className="flex items-center gap-5 text-sm text-slate-400">
        <span className="h-px flex-1 bg-white/10" />
        or continue with
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <SocialSignupButtons />

      <p className="pt-1 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link className="font-bold text-cyan-400 hover:text-cyan-300" href="/signin">
          Sign in
        </Link>
      </p>
    </form>
  );
}
