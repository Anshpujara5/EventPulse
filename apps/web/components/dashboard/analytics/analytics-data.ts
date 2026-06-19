export const analyticsMetrics = [
  {
    label: "Total Events",
    value: "1.24M",
    delta: "12.6%",
    deltaContext: "vs last 24h",
    icon: "pulse",
    tone: "text-blue-400",
    boxClassName: "border-blue-400/25 bg-blue-500/10",
    spark: "M0 34 L14 33 L26 31 L38 32 L49 25 L60 27 L72 18 L84 23 L96 12",
  },
  {
    label: "Unique Users",
    value: "48,920",
    delta: "8.4%",
    deltaContext: "vs last 24h",
    icon: "user",
    tone: "text-cyan-400",
    boxClassName: "border-cyan-400/25 bg-cyan-500/10",
    spark: "M0 35 L12 34 L24 29 L36 33 L48 24 L60 28 L72 18 L84 21 L96 10",
  },
  {
    label: "Conversion Rate",
    value: "12.8%",
    delta: "2.1%",
    deltaContext: "vs yesterday",
    icon: "activity",
    tone: "text-violet-400",
    boxClassName: "border-violet-400/25 bg-violet-500/10",
    spark: "M0 36 L13 35 L25 31 L37 33 L49 25 L61 29 L73 20 L84 24 L96 13",
  },
  {
    label: "Avg. Session Events",
    value: "7.4",
    delta: "4.7%",
    deltaContext: "vs last 24h",
    icon: "chart",
    tone: "text-cyan-400",
    boxClassName: "border-cyan-400/25 bg-cyan-500/10",
    spark: "M0 36 L13 35 L25 32 L37 34 L49 27 L61 30 L73 22 L84 25 L96 15",
  },
] as const;

export const trendLines = [
  {
    label: "Requests",
    color: "text-blue-400",
    path: "M0 120 C35 118 34 96 72 98 C112 101 105 88 144 92 C184 97 180 62 220 68 C262 73 257 38 300 44 C342 49 334 86 376 91 C418 97 413 78 455 83 C497 88 491 65 533 70 C575 75 569 48 611 53 C653 58 647 84 689 78 C731 72 726 50 768 57 C810 64 804 42 846 47 C888 52 884 79 924 75",
  },
  {
    label: "Signups",
    color: "text-cyan-400",
    path: "M0 150 C38 148 36 126 74 128 C112 130 111 117 148 120 C187 123 185 96 224 100 C263 104 260 82 300 88 C339 94 337 120 376 121 C415 122 414 106 454 109 C493 112 491 98 531 103 C570 108 568 87 608 91 C647 95 646 111 685 108 C724 105 723 86 762 88 C801 90 800 75 838 78 C878 81 876 99 924 96",
  },
  {
    label: "Purchases",
    color: "text-violet-400",
    path: "M0 170 C40 168 38 164 76 165 C114 166 113 158 151 160 C189 162 188 142 226 145 C264 148 263 132 301 136 C339 140 338 154 376 156 C414 158 413 145 451 148 C489 151 488 139 526 143 C564 147 563 136 601 139 C639 142 638 153 676 151 C714 149 713 137 751 138 C789 139 788 124 826 127 C864 130 863 141 924 139",
  },
  {
    label: "Errors",
    color: "text-rose-400",
    path: "M0 190 C40 189 38 187 76 188 C114 189 113 184 151 185 C189 186 188 178 226 180 C264 182 263 178 301 179 C339 180 338 185 376 186 C414 187 413 183 451 184 C489 185 488 179 526 181 C564 183 563 176 601 177 C639 178 638 185 676 184 C714 183 713 179 751 180 C789 181 788 177 826 178 C864 179 863 183 924 184",
  },
] as const;

export const timeLabels = ["18:00", "21:00", "00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00"] as const;

export const funnelSteps = [
  ["Page Viewed", "100%", "w-full", "from-blue-600 to-cyan-400", "monitor"],
  ["Signup Clicked", "64%", "w-[64%]", "from-cyan-500 to-cyan-300", "send"],
  ["Account Created", "42%", "w-[42%]", "from-violet-600 to-blue-400", "user"],
  ["Checkout Started", "28%", "w-[28%]", "from-violet-600 to-fuchsia-500", "database"],
  ["Payment Completed", "18%", "w-[18%]", "from-rose-500 to-pink-400", "check"],
] as const;

export const topEvents = [
  ["page_view", "482K", "monitor", "text-blue-400"],
  ["signup_clicked", "214K", "send", "text-cyan-400"],
  ["login_success", "166K", "key", "text-emerald-400"],
  ["payment_completed", "82K", "database", "text-violet-400"],
  ["checkout_failed", "12K", "bell", "text-rose-400"],
] as const;

export const behaviorRows = [
  ["Returning Users", "31%", "activity", "text-cyan-400"],
  ["New Users", "69%", "user", "text-emerald-400"],
  ["Avg. Time to Conversion", "4m 28s", "clock", "text-slate-300"],
  ["Drop-off Rate", "18.4%", "chart", "text-rose-400"],
] as const;

export const trafficSegments = [
  ["Web SDK", "58%", "bg-blue-500"],
  ["Server API", "27%", "bg-cyan-400"],
  ["Mobile SDK", "10%", "bg-violet-500"],
  ["Console", "5%", "bg-rose-500"],
] as const;
