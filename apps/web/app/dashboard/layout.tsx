"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type MeResponse = {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      createdAt: string;
      updatedAt?: string;
    };
  };
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isActive = true;
    const token = localStorage.getItem("eventpulse_token");

    if (!token) {
      router.replace("/signin");
      return;
    }

    async function verifySession() {
      try {
        await apiRequest<MeResponse>("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (isActive) {
          setIsAuthorized(true);
        }
      } catch {
        localStorage.removeItem("eventpulse_token");
        localStorage.removeItem("eventpulse_user");
        router.replace("/signin");
      }
    }

    void verifySession();

    return () => {
      isActive = false;
    };
  }, [router]);

  if (!isAuthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020814] text-white">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-950/60 px-6 py-4 text-sm font-semibold text-slate-300 shadow-[0_0_40px_rgba(14,165,233,0.14)]">
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020814] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,0.16),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(124,58,237,0.16),transparent_28%)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[240px_1fr]">
        <DashboardSidebar />

        <section className="min-w-0">
          <DashboardHeader />
          {children}
        </section>
      </div>
    </main>
  );
}
