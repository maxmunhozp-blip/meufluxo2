import { useCallback } from 'react';
import { Project, Section, Task } from '@/types/task';

export function useDataExport(
  projectsState: Project[],
  sectionsState: Section[],
  tasksState: Task[],
) {
  const exportData = useCallback(() => {
    const json = JSON.stringify({ projects: projectsState, sections: sectionsState, tasks: tasksState }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meufluxo_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectsState, sectionsState, tasksState]);

  const importData = useCallback((_file: File) => {
    alert('Importação via arquivo não disponível no modo online. Use a interface para criar projetos e tarefas.');
  }, []);

  return { exportData, importData };
}
