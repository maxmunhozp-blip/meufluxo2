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

export function formatFocusedTime(totalSeconds: number): string | null {
  if (totalSeconds < 5) return null;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 1) return `${totalSeconds}s`;
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
}
