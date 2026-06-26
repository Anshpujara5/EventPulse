import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";

export function EventsComingSoonCard() {
  return (
    <GlowCard className="p-6">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10 text-violet-400">
          <Icon name="pulse" />
        </div>
        <div>
          <h2 className="font-black text-white">Event Tracking</h2>
          <p className="mt-1 text-sm text-slate-400">
            Event ingestion is not connected yet. Once you start sending events
            via your API keys, live metrics and charts will appear here.
          </p>
          <a
            className="mt-3 inline-block text-sm font-bold text-cyan-400 hover:text-cyan-300"
            href="/dashboard/api-keys"
          >
            Get your API key to start sending events →
          </a>
        </div>
      </div>
    </GlowCard>
  );
}
