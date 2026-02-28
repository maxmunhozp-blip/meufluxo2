# MeuFluxo 2.0 — Arquitetura Completa do Sistema

> Documento gerado em 28/02/2026 para análise externa.

---

## 1. Visão Geral

**MeuFluxo** é um gerenciador de tarefas e projetos para agências/freelancers, focado em neuroinclusividade (TDAH-friendly). Construído com React + Vite + Tailwind + Supabase (via Lovable Cloud).

- **URL publicada:** https://meufluxo2.lovable.app
- **Stack:** React 18, TypeScript, Vite 5, Tailwind CSS 3, shadcn/ui, Supabase (Auth + Postgres + Edge Functions + Storage)
- **State management:** useState/useCallback local + Supabase como source of truth
- **Drag & Drop:** @dnd-kit (reorder) + HTML5 native drag (cross-area move to sidebar)

---

## 2. Rotas (App.tsx)

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | `Index` | App principal (sidebar + área de tarefas) |
| `/auth` | `Auth` | Login/Signup (Google OAuth + email) |
| `/reset-password` | `ResetPassword` | Reset de senha |
| `/admin` | `Admin` | Painel super_admin |
| `/plans` | `Plans` | Planos Free/Pro |
| `/profile` | `Profile` | Perfil do usuário |
| `/invite/:code` | `AcceptInvite` | Aceitar convite de workspace |

---

## 3. Estrutura de Diretórios

```
src/
├── components/           # Componentes da aplicação
│   ├── ui/              # shadcn/ui components (40+ componentes)
│   ├── BottomNav.tsx    # Nav mobile bottom bar
│   ├── ColumnHeader.tsx # Header de coluna
│   ├── ContextMenu.tsx  # Menu de contexto customizado
│   ├── DeliveryTemplateModal.tsx  # Templates de entrega mensal
│   ├── DropIndicatorLine.tsx      # Indicador visual de drop
│   ├── FocusMode.tsx    # Modo foco (uma tarefa por vez)
│   ├── GenerateMonthlyTasksButton.tsx  # Gerar tarefas do mês
│   ├── GlobalNotesView.tsx   # View de notas globais
│   ├── HowToUseModal.tsx     # Modal "como usar"
│   ├── LinkPreview.tsx       # Preview de links (OG tags)
│   ├── MemberPicker.tsx      # Picker de membros do projeto
│   ├── MyDayView.tsx         # View "Meu Dia" (tarefas agendadas para hoje)
│   ├── MyTasksView.tsx       # View "Minhas Tarefas" (todas do usuário)
│   ├── MyWeekView.tsx        # View "Minha Semana" (timeline semanal)
│   ├── NoteEditor.tsx        # Editor de notas rich-text
│   ├── NotesList.tsx         # Lista de notas
│   ├── ProjectMembersModal.tsx  # Modal de membros do projeto
│   ├── ProjectNotesView.tsx     # Notas específicas do projeto
│   ├── ProjectSidebar.tsx       # Sidebar com lista de clientes/projetos
│   ├── QuickNoteModal.tsx       # Modal de nota rápida
│   ├── RecurrencePicker.tsx     # Picker de recorrência
│   ├── SectionProgressBar.tsx   # Barra de progresso da seção (desabilitada)
│   ├── ServiceTagsManager.tsx   # Gerenciar tags de serviço
│   ├── SortableSubtaskRow.tsx   # Row de subtarefa (sortable + rename)
│   ├── SortableTaskRow.tsx      # Row de tarefa (sortable + drag + subtasks)
│   ├── StatusCheckbox.tsx       # Checkbox de status (pending/in_progress/done)
│   ├── TaskDetailPanel.tsx      # Painel lateral de detalhes da tarefa
│   ├── TaskListHeader.tsx       # Header da lista com filtros
│   ├── TaskSection.tsx          # Seção agrupadora de tarefas
│   ├── ThemeToggle.tsx          # Toggle dark/light/system
│   ├── UpgradeModal.tsx         # Modal de upgrade Pro
│   ├── WeekTimelineView.tsx     # Timeline semanal visual
│   └── WorkspaceSelector.tsx    # Seletor de workspace
├── hooks/
│   ├── use-mobile.tsx       # Detecção de mobile
│   ├── use-toast.ts         # Hook de toast
│   ├── useAdminData.ts      # Dados do painel admin
│   ├── usePersistence.ts    # Persistência localStorage
│   ├── usePlanLimits.ts     # Limites por plano (Free/Pro)
│   ├── useSupabaseData.ts   # ★ HOOK PRINCIPAL — CRUD completo (1400+ linhas)
│   ├── useTheme.ts          # Gerenciamento de tema
│   └── useUndoStack.ts      # Stack de undo
├── pages/
│   ├── Index.tsx            # ★ PÁGINA PRINCIPAL (1243 linhas)
│   ├── Auth.tsx             # Autenticação
│   ├── Admin.tsx            # Painel admin
│   ├── Plans.tsx            # Página de planos
│   ├── Profile.tsx          # Perfil
│   ├── AcceptInvite.tsx     # Aceitar convite
│   └── ResetPassword.tsx    # Reset de senha
├── types/
│   └── task.ts              # Tipos: Task, Subtask, Section, Project, etc.
├── lib/
│   ├── utils.ts             # cn() helper
│   └── recurrence.ts        # Lógica de recorrência
├── data/
│   └── initialData.ts       # Dados iniciais (mock)
├── integrations/
│   └── supabase/
│       ├── client.ts        # Cliente Supabase (auto-gerado)
│       └── types.ts         # Tipos do banco (auto-gerado)
└── index.css                # ★ DESIGN TOKEN SYSTEM (573 linhas)
```

---

## 4. Modelo de Dados (Supabase)

### 4.1 Tabelas Principais

```
workspaces (id, name, owner_id, plan: free|pro)
  └── workspace_members (workspace_id, user_id, role: owner|admin|member)
  └── projects (id, name, color, workspace_id, position, archived)
       └── project_members (project_id, user_id)
       └── sections (id, name, position, project_id, workspace_id)
            └── tasks (id, title, status, priority, position, section_id, project_id, ...)
                 └── tasks (subtasks via parent_task_id)
                 └── task_members (task_id, user_id)
                 └── comments (task_id, user_id, content)
                 └── task_attachments (task_id, file_name, file_path)
  └── notes (id, title, content:jsonb, project_id?, task_id?, workspace_id)
  └── service_tags (id, name, icon, workspace_id)
  └── client_delivery_templates (id, name, tasks_template:jsonb, project_id)
  └── monthly_instances (template_id, month, project_id)
  └── monthly_reports (project_id, month, sections:jsonb, whatsapp_text)
```

### 4.2 Tabelas de Auth/Admin

```
profiles (id=user_id, full_name, avatar_url, theme_preference)
user_roles (user_id, role: super_admin|admin|member)
workspace_invites (workspace_id, invite_code, expires_at, used_by)
activity_log (user_id, task_id, action)
```

### 4.3 Campos da Tabela `tasks`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| title | text | Nome da tarefa |
| status | enum | pending, in_progress, done |
| priority | enum | high, medium, low |
| position | int | Ordem na seção |
| section_id | uuid | FK → sections |
| project_id | uuid | FK → projects |
| workspace_id | uuid | FK → workspaces |
| parent_task_id | uuid | FK → tasks (subtarefa) |
| assignee | text | Responsável (texto livre) |
| due_date | date | Data de entrega |
| scheduled_date | date | Data agendada (Meu Dia) |
| day_period | text | morning, afternoon, evening |
| description | text | Descrição da tarefa |
| recurrence_type | text | daily, weekly, monthly_day, etc. |
| recurrence_config | jsonb | Config de recorrência |
| rollover_count | int | Quantas vezes foi adiada |
| original_due_date | date | Data original antes de rollover |
| service_tag_id | uuid | FK → service_tags |
| template_id | uuid | FK → client_delivery_templates |
| monthly_instance_id | uuid | FK → monthly_instances |
| metrics | jsonb | Métricas customizáveis |
| created_by | uuid | Quem criou |
| created_at | timestamp | Quando foi criada |

### 4.4 RLS (Row Level Security)

Todas as tabelas têm RLS habilitado. Padrão:
- **SELECT:** `is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid())`
- **INSERT:** `is_workspace_member(auth.uid(), workspace_id)`
- **UPDATE:** `is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid())`
- **DELETE:** `is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid())`

Exceções:
- `comments`: DELETE só pelo autor
- `profiles`: SELECT público, UPDATE só o próprio
- `project_members`: INSERT/DELETE só por workspace owners/admins

### 4.5 Database Functions

| Função | Descrição |
|--------|-----------|
| `handle_new_user()` | Trigger on auth.users INSERT: cria profile, workspace pessoal, atribui roles |
| `is_workspace_member()` | Verifica se usuário é membro do workspace |
| `is_project_member()` | Verifica se usuário é membro do projeto |
| `is_super_admin()` | Verifica se é super_admin |
| `has_role()` | Verifica se tem determinada role |
| `generate_monthly_report()` | Gera relatório mensal de um projeto (seções, tasks, WhatsApp text) |

---

## 5. Edge Functions (Supabase)

| Função | Descrição |
|--------|-----------|
| `accept-invite` | Aceitar convite de workspace via código |
| `admin-data` | Dados para painel admin (todos workspaces/users) |
| `fetch-og` | Buscar OpenGraph metadata de URLs |
| `generate-recurring-tasks` | Gerar tarefas recorrentes |
| `invite-member` | Enviar convite por email |
| `rollover-tasks` | Mover tarefas vencidas para o próximo dia |

---

## 6. Storage Buckets

| Bucket | Público | Uso |
|--------|---------|-----|
| `task-attachments` | Sim | Anexos de tarefas |
| `avatars` | Sim | Fotos de perfil |
| `notes-images` | Sim | Imagens em notas |

---

## 7. Planos (Free vs Pro)

Gerenciado via `usePlanLimits.ts` e campo `workspaces.plan`.

| Recurso | Free | Pro |
|---------|------|-----|
| Projetos | Limitado | Ilimitado |
| Tarefas por projeto | Limitado | Ilimitado |
| Membros no workspace | Limitado | Ilimitado |
| Workspaces | 1 | Múltiplos |

---

## 8. Design System

### 8.1 Filosofia

- **Neuroinclusivo (TDAH-friendly):** Sem barras de progresso (geram overwhelm), contadores discretos, campos vazios ocultos
- **Transições:** Apenas 150ms em cores/backgrounds (sem "efeito gelatina")
- **Dark mode padrão** com Light mode Warm Ivory (#F5F0E8)

### 8.2 Tokens (CSS Variables)

```css
/* Dark Mode */
--bg-base: #0A0A0C          /* Fundo principal */
--bg-surface: #141416       /* Cards, sidebar */
--bg-elevated: #1C1C1F      /* Elementos elevados */
--bg-hover: rgba(255,255,255,0.04)   /* Hover sutil */
--bg-active: rgba(255,255,255,0.08)  /* Item ativo */

--text-primary: #E8E8ED     /* Texto principal */
--text-secondary: #8E8E93   /* Texto secundário */
--text-tertiary: #636366    /* Labels */
--text-placeholder: #48484A /* Placeholders */

--border-subtle: #1E1E21    /* Bordas quase invisíveis (tom e sobretom) */
--border-default: #3A3A3F   /* Bordas normais */

--accent-blue: #3B82F6      /* Cor primária/accent */
--accent-subtle: rgba(59,130,246,0.15)  /* Accent sutil (drop zones) */

/* Light Mode */
--bg-base: #F5F0E8          /* Warm Ivory */
--bg-surface: #FFFFFF
--text-primary: #1A1207
--border-subtle: #E5DDD0
```

### 8.3 Tipografia (Apple-inspired)

- **Títulos:** 24px (h1), 16-18px (h2-h3)
- **Corpo:** 14px
- **Labels/Overline:** 11-12px
- **Font weight 700 (bold)** evitado em navegação

### 8.4 Spacing

- Padding principal: 32px
- Rows de tarefa: 40px de altura
- Gaps: 12px (8px em listas densas)

---

## 9. Funcionalidades Principais

### 9.1 Views

1. **Meu Dia** (padrão) — Tarefas agendadas para hoje, separadas por Manhã/Tarde/Noite
2. **Minha Semana** — Timeline semanal com drag-and-drop para agendar
3. **Notas** — Notas globais do workspace (editor rich-text)
4. **Projeto (Cliente)** — Lista de tarefas por seções, com filtros (all/pending/done)

### 9.2 Tarefas

- CRUD completo com optimistic updates
- Status: pending → in_progress → done (ciclo via checkbox)
- Subtarefas (nested via parent_task_id, até 1 nível)
- Recorrência configurável (daily, weekly, monthly, custom)
- Rollover automático (tarefas vencidas migram para o próximo dia)
- Agendamento (scheduled_date) para "Meu Dia"
- Atribuição de membros
- Comentários
- Anexos (upload para Storage)
- Tags de serviço
- Métricas customizáveis (JSON)
- Drag & Drop: reordenar dentro de seções, mover entre seções, mover para outro projeto via sidebar

### 9.3 Projetos (Clientes)

- Sidebar com lista de clientes (reordenável via drag-and-drop)
- Cores customizáveis por cliente
- Seções dentro de cada projeto
- Templates de entrega mensal
- Relatórios mensais com texto para WhatsApp
- Duplicação de projetos (seções, tarefas, ou ambos)
- Arquivamento

### 9.4 Workspaces

- Multi-workspace (Pro)
- Convites por link ou email
- Roles: owner, admin, member
- Cada workspace tem seus projetos, membros e dados isolados

### 9.5 Painel Admin

- Rota `/admin` (apenas super_admin)
- Visualização de todos os workspaces e usuários
- Edge function `admin-data` para buscar dados cross-workspace

---

## 10. Hook Principal: useSupabaseData

**Arquivo:** `src/hooks/useSupabaseData.ts` (~1400 linhas)

Responsabilidades:
- Autenticação (session management)
- CRUD de projetos, seções, tarefas, subtarefas
- Gerenciamento de workspace e membros
- Upload/delete de anexos
- Comentários
- Service tags
- Import/export de dados
- Limites de plano
- Optimistic updates no state local

**Interface exposta (resumo):**

```typescript
{
  // Data
  projects, sections, tasks, profiles, comments, attachments, serviceTags
  loading, session
  workspaces, activeWorkspaceId, workspaceMembers
  
  // Setters (optimistic)
  setProjects, setSections, setTasks
  
  // Workspace
  switchWorkspace, createWorkspace, renameWorkspace, deleteWorkspace
  inviteToWorkspace, generateInviteLink, acceptWorkspaceInvite
  
  // Projects
  createProject, renameProject, deleteProject, changeProjectColor
  reorderProjects, duplicateProject
  addProjectMember, removeProjectMember, getProjectMembers
  
  // Sections
  createSection, renameSection, deleteSection
  
  // Tasks
  createTask, updateTask, deleteTask, duplicateTask, updateTaskStatus
  addTaskMember, removeTaskMember
  addComment, deleteComment
  addSubtask, updateSubtask, deleteSubtask, reorderSubtasks, scheduleSubtask
  uploadAttachment, deleteAttachment
  
  // Service Tags
  createServiceTag, renameServiceTag, changeServiceTagIcon, deleteServiceTag
  
  // Plan
  planLimits, showUpgradeModal, setShowUpgradeModal
  
  // Data management
  exportData, importData
}
```

---

## 11. Index.tsx — Página Principal

**Arquivo:** `src/pages/Index.tsx` (~1243 linhas)

Responsabilidades:
- Orquestra todas as views (Meu Dia, Minha Semana, Notas, Projeto)
- Gerencia state de UI (selectedTask, focusedTask, expandedSections, filters)
- Drag & Drop com @dnd-kit (reorder de tarefas/seções)
- Drag & Drop nativo HTML5 (mover tarefas para outros projetos via sidebar)
- Keyboard shortcuts (↑/↓ para navegar, Enter para selecionar, Escape para fechar)
- Layout responsivo: sidebar + área principal + painel de detalhes
- Sidebar resizável

---

## 12. Dependências Principais

| Pacote | Uso |
|--------|-----|
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag & Drop (reorder) |
| `@supabase/supabase-js` | Backend (auth, db, storage, functions) |
| `@tanstack/react-query` | Cache de queries (setup, não muito usado) |
| `react-router-dom` | Roteamento |
| `lucide-react` | Ícones |
| `sonner` + `@radix-ui/react-toast` | Notificações |
| `date-fns` | Manipulação de datas |
| `recharts` | Gráficos (admin?) |
| `react-resizable-panels` | Painéis redimensionáveis |
| `react-hook-form` + `zod` | Formulários com validação |
| `cmdk` | Command palette |
| `vaul` | Drawer mobile |

---

## 13. Pontos de Atenção / Débitos Técnicos

1. **Index.tsx (1243 linhas)** e **useSupabaseData.ts (1400 linhas)** são muito grandes e precisam ser refatorados
2. **SortableTaskRow.tsx (449 linhas)** contém SubtaskDndWrapper e InlineSubtaskInput que poderiam ser extraídos
3. **Sem React Query real** — dados são gerenciados com useState+useEffect, não aproveita cache/refetch do TanStack Query
4. **Sem testes significativos** — apenas um `example.test.ts`
5. **Optimistic updates manuais** — risco de dessincronização com o banco
6. **Sem realtime** — dados não atualizam em tempo real entre múltiplos usuários
7. **Sem i18n** — textos hardcoded em português
8. **Sem error boundaries** — erros não tratados podem crashar a app
9. **Sem loading states granulares** — um `loading` booleano para tudo
10. **Sem lazy loading de rotas** — todas carregam no bundle principal

---

## 14. Fluxos Importantes

### 14.1 Autenticação
1. `/auth` → Google OAuth ou email/password
2. Trigger `handle_new_user()` cria profile + workspace + roles
3. Redirect para `/`
4. `useSupabaseData` detecta session e carrega dados do workspace ativo

### 14.2 Criar Tarefa
1. User digita no input da seção → `createTask()`
2. INSERT na tabela `tasks` com project_id, section_id, workspace_id
3. Optimistic update do state local
4. Task aparece na lista

### 14.3 Drag & Drop (Mover para outro projeto)
1. `SortableTaskRow` → `onDragStart` seta `dataTransfer` com task_id
2. `ProjectSidebar` → `onDragOver` destaca projeto alvo
3. `ProjectSidebar` → `onDrop` chama `handleMoveTaskToProject`
4. Supabase UPDATE project_id + section_id da tarefa e subtarefas
5. Fade-out animation (150ms) → atualização otimista do state

### 14.4 Templates de Entrega Mensal
1. User cria template com lista de tarefas padrão
2. `GenerateMonthlyTasksButton` gera tarefas do mês baseado no template
3. `monthly_instances` rastreia quais meses já foram gerados
4. `generate_monthly_report()` gera relatório com texto para WhatsApp
