import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventPulse | Real-Time Product Analytics",
  description:
    "EventPulse helps teams collect product events, process them at scale, and turn user activity into analytics dashboards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
