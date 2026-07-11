import type {
  ProjectEventCount,
  RecentEvent,
  TopEvent,
  TopProperty,
} from "../analytics-types";
import { EventsByProjectCard } from "../EventsByProjectCard";
import { RecentActivityCard } from "../RecentActivityCard";
import { TopEventsCard } from "../TopEventsCard";
import { TopPropertiesCard } from "../TopPropertiesCard";

export function BehaviorTab({
  topEvents,
  eventsByProject,
  recentActivity,
  topProperties,
}: {
  topEvents: TopEvent[];
  eventsByProject: ProjectEventCount[];
  recentActivity: RecentEvent[];
  topProperties: TopProperty[];
}) {
  return (
    <>
      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
        <TopEventsCard events={topEvents} />
        <EventsByProjectCard projects={eventsByProject} />
        <RecentActivityCard events={recentActivity} />
      </section>

      <section className="mt-4">
        <TopPropertiesCard properties={topProperties} />
      </section>
    </>
  );
}
