export interface ProjectDocument {
  id: string;
  projectId: string;
  workspaceId: string;
  createdBy: string;
  title: string;
  content: Record<string, any>;
  pinned: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}
