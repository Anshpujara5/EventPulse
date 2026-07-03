import { ProjectView } from "@/components/dashboard/projects/ProjectView";

export default async function ProjectViewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectView projectId={projectId} />;
}
