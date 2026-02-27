import { useState, useEffect, useCallback, useRef } from 'react';
import { Project, Section, Task } from '@/types/task';
import { projects as defaultProjects, sections as defaultSections, tasks as defaultTasks } from '@/data/initialData';

const STORAGE_KEY = 'meufluxo_data';

interface AppData {
  projects: Project[];
  sections: Section[];
  tasks: Task[];
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.projects && parsed.sections && parsed.tasks) {
        return parsed as AppData;
      }
    }
  } catch {}
  return {
    projects: defaultProjects,
    sections: defaultSections,
    tasks: defaultTasks,
  };
}

export function usePersistence() {
  const [data, setData] = useState<AppData>(loadData);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback((newData: AppData) => {
    setData(newData);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    }, 500);
  }, []);

  const setProjects = useCallback((fn: (prev: Project[]) => Project[]) => {
    setData(prev => {
      const next = { ...prev, projects: fn(prev.projects) };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }, 500);
      return next;
    });
  }, []);

  const setSections = useCallback((fn: (prev: Section[]) => Section[]) => {
    setData(prev => {
      const next = { ...prev, sections: fn(prev.sections) };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }, 500);
      return next;
    });
  }, []);

  const setTasks = useCallback((fn: (prev: Task[]) => Task[]) => {
    setData(prev => {
      const next = { ...prev, tasks: fn(prev.tasks) };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }, 500);
      return next;
    });
  }, []);

  const exportData = useCallback(() => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meufluxo_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importData = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.projects && parsed.sections && parsed.tasks) {
          save(parsed as AppData);
        } else {
          alert('Arquivo inválido. Verifique o formato JSON.');
        }
      } catch {
        alert('Erro ao ler o arquivo.');
      }
    };
    reader.readAsText(file);
  }, [save]);

  const replaceAll = useCallback((newData: AppData) => {
    save(newData);
  }, [save]);

  return {
    projects: data.projects,
    sections: data.sections,
    tasks: data.tasks,
    setProjects,
    setSections,
    setTasks,
    exportData,
    importData,
    replaceAll,
  };
}
