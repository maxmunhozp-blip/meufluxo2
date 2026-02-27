export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type Priority = 'high' | 'medium' | 'low';

export interface Subtask {
  id: string;
  name: string;
  status: TaskStatus;
  priority?: Priority;
  description?: string;
  dueDate?: string;
  assignee?: string;
  section: string;
  projectId: string;
  parentTaskId?: string;
  members?: TaskMember[];
  subtasks?: Subtask[];
  comments?: Comment[];
}

export interface Comment {
  id: string;
  taskId?: string;
  author: string;
  authorId?: string;
  text: string;
  date: string;
}

export interface TaskMember {
  id: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface Attachment {
  id: string;
  taskId: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string | null;
  createdAt: string;
  url?: string;
}

export interface Task {
  id: string;
  name: string;
  assignee?: string;
  dueDate?: string;
  status: TaskStatus;
  priority?: Priority;
  subtasks?: Subtask[];
  comments?: Comment[];
  description?: string;
  section: string;
  projectId: string;
  parentTaskId?: string;
  members?: TaskMember[];
}

export interface Section {
  id: string;
  title: string;
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}
