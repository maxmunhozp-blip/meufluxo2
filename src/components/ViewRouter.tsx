import { memo } from 'react';
import { MyDayView } from '@/components/MyDayView';
import { MyWeekView } from '@/components/MyWeekView';
import { MyTasksView } from '@/components/MyTasksView';
import { GlobalNotesView } from '@/components/GlobalNotesView';
import { Task, TaskStatus, Project, Section, Subtask } from '@/types/task';
import { Profile } from '@/hooks/supabase/types';
import { ServiceTag } from '@/types/task';

interface ViewRouterProps {
  activeView: 'day' | 'week' | 'tasks' | 'notes' | 'project';
  // Data
  tasks: Task[];
  projects: Project[];
  sections: Section[];
  profiles: Profile[];
  serviceTags: ServiceTag[];
  activeWorkspaceId: string | null;
  session: any;
  selectedTaskId?: string;
  isPro: boolean;
  // Handlers
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onBatchUpdatePositions: (updates: { id: string; position: number }[]) => Promise<void>;
  onScheduleSubtask?: (subtaskId: string, scheduledDate: string | null) => Promise<void>;
  onUpgrade: () => void;
  onNavigateToWeek: () => void;
  onViewModeChange: (mode: 'columns' | 'timeline') => void;
}

function ViewRouterInner({
  activeView, tasks, projects, sections, profiles, serviceTags,
  activeWorkspaceId, session, selectedTaskId, isPro,
  onStatusChange, onSelectTask, onUpdateTask, onBatchUpdatePositions,
  onScheduleSubtask, onUpgrade, onNavigateToWeek, onViewModeChange,
}: ViewRouterProps) {
  if (activeView === 'day') {
    const userName = profiles.find(p => p.id === session?.user?.id)?.fullName || session?.user?.email || 'Usuário';
    return (
      <MyDayView
        tasks={tasks}
        projects={projects}
        sections={sections}
        serviceTags={serviceTags}
        userName={userName}
        isPro={isPro}
        onUpdateTask={onUpdateTask}
        onBatchUpdatePositions={onBatchUpdatePositions}
        onStatusChange={onStatusChange}
        onSelectTask={onSelectTask}
        selectedTaskId={selectedTaskId}
        onNavigateToWeek={onNavigateToWeek}
      />
    );
  }

  if (activeView === 'week') {
    return (
      <MyWeekView
        tasks={tasks}
        projects={projects}
        sections={sections}
        onUpdateTask={onUpdateTask}
        onBatchUpdatePositions={onBatchUpdatePositions}
        onStatusChange={onStatusChange}
        onSelectTask={onSelectTask}
        onScheduleSubtask={onScheduleSubtask}
        selectedTaskId={selectedTaskId}
        isPro={isPro}
        onUpgrade={onUpgrade}
        onViewModeChange={onViewModeChange}
      />
    );
  }

  if (activeView === 'tasks') {
    return (
      <>
        <div className="h-14 px-6 flex items-center border-b border-nd-border" style={{ background: 'hsl(var(--bg-app))' }}>
          <h1 className="text-[18px] font-bold text-nd-text">Minhas Tarefas</h1>
        </div>
        <MyTasksView
          tasks={tasks}
          sections={sections}
          currentUserId={session?.user?.id}
          profiles={profiles}
          onSelectTask={onSelectTask}
          selectedTaskId={selectedTaskId}
          onStatusChange={onStatusChange}
        />
      </>
    );
  }

  if (activeView === 'notes') {
    return (
      <GlobalNotesView
        workspaceId={activeWorkspaceId}
        userId={session?.user?.id || ''}
        projects={projects}
        isPro={isPro}
        onUpgrade={onUpgrade}
      />
    );
  }

  return null;
}

export const ViewRouter = memo(ViewRouterInner);
