const paths: Record<string, string> = {
  activity: "M4 12h3l2-6 4 12 3-8 2 4h2",
  analytics: "M4 19V9m5 10V5m5 14v-7m5 7V8M3 20h18",
  bell: "M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Zm4 12h4",
  bolt: "m13 2-9 12h7l-1 8 9-12h-7l1-8Z",
  chart: "M4 17h3l2-4 4 2 4-7 3 3",
  check: "m5 12 4 4L19 6",
  clock: "M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  code: "m8 8-4 4 4 4m8-8 4 4-4 4m-2-10-4 12",
  cube: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9",
  database:
    "M4 6c0 2 4 4 8 4s8-2 8-4-4-4-8-4-8 2-8 4Zm0 0v6c0 2 4 4 8 4s8-2 8-4V6M4 12v6c0 2 4 4 8 4s8-2 8-4v-6",
  document: "M7 3h7l4 4v14H7V3Zm7 0v5h5M10 13h6M10 17h4",
  folder: "M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z",
  globe:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0c3 3 4 6 4 10s-1 7-4 10M12 2C9 5 8 8 8 12s1 7 4 10M2 12h20",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z",
  key: "M15 7a4 4 0 1 1-2.4 7.2L7 19.8H4.2V17l5.6-5.6A4 4 0 0 1 15 7Zm0 0h.01",
  link: "M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20l1.1-1.1",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5V11Zm7 4v2",
  monitor: "M4 5h16v11H4V5Zm5 16h6m-3-5v5m-5-9 3-3 2 2 4-5",
  network:
    "M12 5v6m0 0H6v6m6-6h6v6M4 17h4v4H4v-4Zm8-14h4v4h-4V3Zm4 14h4v4h-4v-4Z",
  play: "m8 5 11 7-11 7V5Z",
  pulse: "M4 12h3l2-6 4 12 3-8 2 4h2",
  search: "M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21",
  send: "m21 3-7 18-4-8-8-4 19-6Z",
  server: "M5 4h14v6H5V4Zm0 10h14v6H5v-6Zm3-7h.01M8 17h.01",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.5 4a7.7 7.7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8.2 8.2 0 0 0-1.7-1L16 3.5h-4l-.4 2.6a8.2 8.2 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8.2 8.2 0 0 0 1.7 1l.4 2.6h4l.4-2.6a8.2 8.2 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z",
  shield: "M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z",
  spark:
    "M12 3v5m0 8v5m9-9h-5M8 12H3m14.1-7.1-3.5 3.5M10.4 15.6l-3.5 3.5m12.2 0-3.5-3.5M10.4 8.4 6.9 4.9",
  stack: "m12 3 8 4-8 4-8-4 8-4Zm-8 8 8 4 8-4M4 15l8 4 8-4",
  timer: "M10 2h4m-2 6v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  user: "M20 21a8 8 0 0 0-16 0M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
};

export function Icon({
  name,
  className = "size-5",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
