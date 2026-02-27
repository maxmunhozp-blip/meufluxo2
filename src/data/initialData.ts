import { Project, Section, Task } from '@/types/task';

export const projects: Project[] = [
  { id: 'centuriao', name: '1 Centurião', color: '#4A90D9' },
  { id: 'expo-play', name: '2 Expo Play', color: '#D4A843' },
  { id: 'tojiro', name: '3 Tojiro', color: '#3D9A50' },
  { id: 'oticas-jb', name: '4 Óticas JB', color: '#9B59B6' },
  { id: 'poeticamente', name: '5 Poeticamente', color: '#E67E22' },
  { id: 'outros', name: '8 Outros', color: '#5C5F66' },
];

export const sections: Section[] = [
  { id: 'centuriao-jan-2026', title: '2026 [Centurião] - 01 - JANEIRO', projectId: 'centuriao' },
];

export const tasks: Task[] = [
  {
    id: '1',
    name: '[Centurião] Campanha - Planejamento Redes Sociais 2026',
    assignee: 'Max Munhoz',
    dueDate: '2026-01-19',
    status: 'done',
    section: 'centuriao-jan-2026',
    projectId: 'centuriao',
    description: 'Planejamento estratégico completo das redes sociais para o ano de 2026, incluindo calendário editorial, definição de KPIs e metas mensais.',
    comments: [
      { id: 'c1', author: 'Max Munhoz', text: 'Planejamento finalizado e aprovado pelo cliente.', date: '2026-01-19' },
    ],
  },
  {
    id: '2',
    name: '[Centurião] Campanha - Relatórios Redes Sociais 2025',
    assignee: 'Max Munhoz',
    dueDate: '2026-01-16',
    status: 'done',
    section: 'centuriao-jan-2026',
    projectId: 'centuriao',
  },
  {
    id: '3',
    name: '[Centurião] Campanha - Post Rede Sociais 23/01/2026',
    assignee: 'Max Munhoz',
    dueDate: '2026-01-22',
    status: 'done',
    section: 'centuriao-jan-2026',
    projectId: 'centuriao',
  },
  {
    id: '4',
    name: '[Centurião] Campanha - Comunicado TotalPass',
    assignee: 'Max Munhoz',
    dueDate: '2026-01-22',
    status: 'done',
    section: 'centuriao-jan-2026',
    projectId: 'centuriao',
  },
  {
    id: '5',
    name: '[Centurião] Campanha - Viaturas Escolta Armada',
    assignee: 'Max Munhoz',
    dueDate: '2026-02-10',
    status: 'in_progress',
    section: 'centuriao-jan-2026',
    projectId: 'centuriao',
    description: 'Criação de material visual para divulgação das viaturas de escolta armada.',
  },
  {
    id: '6',
    name: '[Centurião] Campanha - Proposta Comercial Centurião/Armada Real',
    assignee: 'Max Munhoz',
    dueDate: '2026-02-20',
    status: 'in_progress',
    section: 'centuriao-jan-2026',
    projectId: 'centuriao',
  },
  {
    id: '7',
    name: '[Centurião] Campanha - Apresentação Institucional',
    assignee: 'Max Munhoz',
    dueDate: '2026-02-25',
    status: 'in_progress',
    section: 'centuriao-jan-2026',
    projectId: 'centuriao',
  },
  {
    id: '8',
    name: '[Centurião] Campanha - Posts Fevereiro',
    status: 'pending',
    section: 'centuriao-jan-2026',
    projectId: 'centuriao',
    subtasks: [
      { id: 's1', name: 'Post 1 - Institucional', status: 'pending' as const, section: 'centuriao-jan-2026', projectId: 'centuriao' },
      { id: 's2', name: 'Post 2 - Serviços', status: 'pending' as const, section: 'centuriao-jan-2026', projectId: 'centuriao' },
      { id: 's3', name: 'Post 3 - Depoimento', status: 'pending' as const, section: 'centuriao-jan-2026', projectId: 'centuriao' },
      { id: 's4', name: 'Post 4 - Carnaval', status: 'pending' as const, section: 'centuriao-jan-2026', projectId: 'centuriao' },
    ],
  },
];
