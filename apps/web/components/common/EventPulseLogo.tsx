export function EventPulseLogo({
  compact = false,
  className,
  svgClassName = "h-full w-full text-cyan-400 drop-shadow-[0_0_14px_rgba(34,211,238,0.75)]",
}: {
  compact?: boolean;
  className?: string;
  svgClassName?: string;
}) {
  return (
    <span
      className={
        className ??
        `relative flex items-center justify-center ${compact ? "size-7" : "size-9"}`
      }
    >
      <svg
        aria-hidden="true"
        className={svgClassName}
        fill="none"
        viewBox="0 0 36 36"
      >
        <path
          d="M2 18h5l3-12 5 24 4-17 3 8 3-4h9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <path
          d="M20 18h5"
          stroke="#8b5cf6"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
    </span>
  );
}
