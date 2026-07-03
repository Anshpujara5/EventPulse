import { ProjectSettings } from "@/components/dashboard/projects/ProjectSettings";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectSettings projectId={projectId} />;
}
