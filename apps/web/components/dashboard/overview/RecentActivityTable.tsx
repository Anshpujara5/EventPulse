import { GlowCard } from "@/components/common/GlowCard";
import { activityRows } from "./dashboard-data";

export function RecentActivityTable() {
  return (
    <GlowCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-black">Recent Activity</h2>
        <span className="text-sm font-bold text-cyan-300">View all events →</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">Project</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {activityRows.map(([event, project, status, time]) => (
              <tr className="text-slate-300" key={`${event}-${project}`}>
                <td className="px-5 py-4 font-bold text-white">{event}</td>
                <td className="px-5 py-4">{project}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-black ${
                      status === "Failed"
                        ? "bg-rose-500/10 text-rose-300"
                        : status === "Queued"
                          ? "bg-amber-500/10 text-amber-300"
                          : "bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {status}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-500">{time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlowCard>
  );
}
