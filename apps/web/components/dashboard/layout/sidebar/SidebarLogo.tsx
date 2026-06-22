import { EventPulseLogo } from "@/components/common/EventPulseLogo";

export function SidebarLogo() {
  return (
    <div className="flex h-16 items-center gap-2 px-5">
      <EventPulseLogo
        className="flex size-8 items-center justify-center"
        svgClassName="h-full w-full text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]"
      />
      <span className="text-2xl font-black tracking-tight">EventPulse</span>
    </div>
  );
}
