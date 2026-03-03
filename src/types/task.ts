export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type Priority = 'high' | 'medium' | 'low';
export type DayPeriod = 'morning' | 'afternoon' | 'evening';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly_day' | 'monthly_weekday' | 'custom' | null;

export interface RecurrenceConfig {
  weekDays?: number[]; // 0=Sun..6=Sat for weekly
  monthDay?: number; // 1-31 for monthly_day
  monthWeekday?: { week: number; day: number }; // { week: 1, day: 1 } = first Monday
  interval?: number; // for custom
  intervalUnit?: 'days' | 'weeks' | 'months'; // for custom
}

export interface Subtask {
  id: string;
  name: string;
  status: TaskStatus;
  priority?: Priority;
  position?: number;
  description?: string;
  dueDate?: string;
  scheduledDate?: string;
  assignee?: string;
  section: string;
  projectId: string;
  parentTaskId?: string;
  serviceTagId?: string;
  dayPeriod?: string;
  depth?: number;
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

export interface ServiceTag {
  id: string;
  name: string;
  icon: string;
  workspaceId: string;
  position: number;
}

export interface Task {
  id: string;
  name: string;
  assignee?: string;
  dueDate?: string;
  status: TaskStatus;
  priority?: Priority;
  dayPeriod?: DayPeriod;
  recurrenceType?: RecurrenceType;
  recurrenceConfig?: RecurrenceConfig;
  subtasks?: Subtask[];
  comments?: Comment[];
  description?: string;
  section: string;
  projectId: string;
  parentTaskId?: string;
  members?: TaskMember[];
  rolloverCount?: number;
  originalDueDate?: string;
  scheduledDate?: string;
  workspaceId?: string;
  serviceTagId?: string;
  createdAt?: string;
  displayMonth?: string; // "YYYY-MM-01" — permanent month this task belongs to
  position?: number; // Used for ordering within day columns
  completedAt?: string; // ISO timestamp when task was marked as done
  manuallyMoved?: boolean; // true if user explicitly dragged this task to a period
  depth?: number; // 0-3, max depth for subtask hierarchy
}

export interface Section {
  id: string;
  title: string;
  projectId: string;
  workspaceId?: string;
  displayMonth?: string;
  sectionType?: 'inbox' | 'recurring' | 'one_time' | 'completed' | 'custom';
  isFixed?: boolean;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  workspaceId?: string;
  position?: number;
}
