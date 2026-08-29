type Provider = "google" | "github";

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
];

function ProviderIcon({ provider }: { provider: Provider }) {
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

export function SocialSignupButtons() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PROVIDERS.map((provider) => (
        <button
          className="flex h-12 items-center justify-center gap-3 rounded-lg border border-white/12 bg-slate-950/35 text-sm font-bold text-white transition hover:border-cyan-300/35 hover:bg-white/6"
          key={provider.id}
          type="button"
        >
          <ProviderIcon provider={provider.id} />
          {provider.label}
        </button>
      ))}
    </div>
  );
}
