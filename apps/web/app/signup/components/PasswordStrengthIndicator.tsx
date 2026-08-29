function getPasswordStrength(password: string) {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasLetter = /[A-Za-z]/.test(password);

  if (!password) {
    return {
      label: "",
      score: 0,
      colorClass: "bg-slate-800",
      textClass: "text-slate-400",
    };
  }

  if (
    password.length >= 10 &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial
  ) {
    return {
      label: "Strong",
      score: 4,
      colorClass: "bg-emerald-500",
      textClass: "text-emerald-400",
    };
  }

  if (password.length >= 8 && hasLetter && hasNumber) {
    return {
      label: "Good",
      score: 3,
      colorClass: "bg-cyan-400",
      textClass: "text-cyan-300",
    };
  }

  if (password.length >= 6) {
    return {
      label: "Fair",
      score: 2,
      colorClass: "bg-yellow-400",
      textClass: "text-yellow-300",
    };
  }

  return {
    label: "Weak",
    score: 1,
    colorClass: "bg-orange-500",
    textClass: "text-orange-300",
  };
}

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = getPasswordStrength(password);

  return (
    <>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((bar) => (
          <span
            className={`h-1.5 rounded-full transition-colors ${
              bar <= strength.score ? strength.colorClass : "bg-slate-800"
            }`}
            key={bar}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Password strength
        {strength.label ? (
          <>
            :{" "}
            <span className={`font-bold ${strength.textClass}`}>
              {strength.label}
            </span>
          </>
        ) : null}
      </p>
    </>
  );
}
