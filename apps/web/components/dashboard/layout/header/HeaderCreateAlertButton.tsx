"use client";

import { AlertFormModal } from "@/components/dashboard/alerts/AlertFormModal";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function HeaderCreateAlertButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // The Alerts page already has its own Create Alert button — avoid showing
  // two create actions at once.
  if (pathname === "/dashboard/alerts") {
    return null;
  }

  return (
    <>
      <button
        className="flex h-12 items-center rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Create Alert
      </button>

      {isOpen ? (
        <AlertFormModal
          onClose={() => setIsOpen(false)}
          onSaved={() => {
            setIsOpen(false);
            router.push("/dashboard/alerts");
          }}
        />
      ) : null}
    </>
  );
}
