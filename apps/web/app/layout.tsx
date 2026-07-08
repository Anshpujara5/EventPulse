import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventPulse | Commerce Analytics for Online Stores",
  description:
    "EventPulse is commerce analytics for e-commerce and quick-commerce stores. Understand where shoppers drop off, why carts are abandoned, and what drives purchases.",
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
