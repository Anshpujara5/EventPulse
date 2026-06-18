export function AuthBackground({ orbClassName }: { orbClassName: string }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_87%_42%,rgba(79,70,229,0.22),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.06)_1px,transparent_1px)] bg-size-[84px_84px]" />
      <div className={orbClassName} />
    </>
  );
}
