export interface TimeEntry {
  id: string;
  taskId: string;
  projectId: string;
  workspaceId: string;
  userId: string;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}
