import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { essentials, focusTasks, otherTasks, type Task } from '@/data';
import { loadProjects, updateSubtaskTime } from '@/lib/projects';

export interface TaskRow {
  id: string;
  label: string;
  description: string | null;
  done: boolean;
  category: 'essential' | 'focus' | 'other';
  tag: string | null;
  project_id: string | null;
  start_time: string | null;
  due_time: string | null;
  start_date?: string | null;
  due_date?: string | null;
  priority: string | null; // 'low' | 'medium' | 'high'
  is_priority?: boolean;   // 重点任务标记
  task_type: 'essential' | 'single' | 'project' | 'learning';
  sort_order: number;
  created_at?: number;
  status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'abandoned';
  steps?: Array<{ id: string; label: string; done: boolean }>;
}

export interface SubtaskRow {
  id: string;
  task_id: string;
  label: string;
  done: boolean;
  sort_order: number;
}

export interface ScratchNote {
  id: string;
  content: string;
  is_priority: boolean;
  created_at: number;
  is_organized: boolean;
  organized_at?: number; // 归类完成的时间戳，保留 3 天后自动清除副本
  target_category?: 'essential' | 'focus' | 'other' | string;
  linked_task_id?: string;
}

export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const LOCAL_STORAGE_TASKS_KEY = 'planetwork_tasks_v2';
const LOCAL_STORAGE_SCRATCH_KEY = 'planetwork_scratchpad_v2';

function getInitialTasks(): TaskRow[] {
  const all: TaskRow[] = [];
  let order = 0;

  essentials.forEach((t) => {
    all.push({
      id: t.id,
      label: t.label,
      description: null,
      done: t.done,
      category: 'essential',
      tag: t.tag ?? null,
      project_id: null,
      start_time: t.start ?? null,
      due_time: t.due ?? null,
      priority: (t.priority as string) ?? 'medium',
      is_priority: t.is_priority ?? false,
      task_type: 'essential',
      sort_order: order++,
      created_at: Date.now() - 3600000 * 10,
    });
  });

  focusTasks.forEach((t) => {
    all.push({
      id: t.id,
      label: t.label,
      description: null,
      done: t.done,
      category: 'focus',
      tag: t.tag ?? null,
      project_id: null,
      start_time: t.start ?? null,
      due_time: t.due ?? null,
      start_date: t.start_date ?? null,
      due_date: t.due_date ?? null,
      priority: (t.priority as string) ?? 'high',
      is_priority: t.id === 'f1' || t.id === 'f-multiday-1' ? true : (t.is_priority ?? false),
      task_type: 'project',
      sort_order: order++,
      created_at: Date.now() - 3600000 * 8,
    });
  });

  otherTasks.forEach((t) => {
    all.push({
      id: t.id,
      label: t.label,
      description: null,
      done: t.done,
      category: 'other',
      tag: t.tag ?? null,
      project_id: null,
      start_time: t.start ?? null,
      due_time: t.due ?? null,
      start_date: t.start_date ?? null,
      due_date: t.due_date ?? null,
      priority: (t.priority as string) ?? 'low',
      is_priority: t.is_priority ?? false,
      task_type: 'single',
      sort_order: order++,
      created_at: Date.now() - 3600000 * 6,
    });
  });

  return all;
}

let memoryTasks: TaskRow[] | null = null;

export function loadLocalTasks(): TaskRow[] {
  if (typeof localStorage === 'undefined') {
    if (!memoryTasks) {
      memoryTasks = getInitialTasks();
    }
    return memoryTasks;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
    if (!raw) {
      const initial = getInitialTasks();
      saveLocalTasks(initial);
      return initial;
    }
    const parsed: TaskRow[] = JSON.parse(raw);
    const hasMultiday = parsed.some((t) => t.id === 'f-multiday-1');
    let working = parsed;
    if (!hasMultiday) {
      const multi = focusTasks.find((t) => t.id === 'f-multiday-1');
      if (multi) {
        working = [
          {
            id: multi.id,
            label: multi.label,
            description: null,
            done: multi.done,
            category: 'focus',
            tag: multi.tag ?? null,
            project_id: null,
            start_time: multi.start ?? null,
            due_time: multi.due ?? null,
            start_date: multi.start_date ?? null,
            due_date: multi.due_date ?? null,
            priority: (multi.priority as string) ?? 'high',
            is_priority: multi.is_priority ?? true,
            task_type: 'project',
            sort_order: -1,
            created_at: Date.now() - 3600000 * 5,
          },
          ...parsed,
        ];
        saveLocalTasks(working);
      }
    }
    return working.map((t) => ({
      ...t,
      is_priority: typeof t.is_priority === 'boolean' ? t.is_priority : false,
      priority: t.priority === 'extreme' ? 'high' : (t.priority || 'medium'),
    }));
  } catch {
    return getInitialTasks();
  }
}

function saveLocalTasks(tasks: TaskRow[]): void {
  if (typeof localStorage === 'undefined') {
    memoryTasks = tasks;
    return;
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks locally', e);
  }
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    label: row.label,
    done: row.done,
    tag: row.tag ?? undefined,
    start: row.start_time ?? undefined,
    due: row.due_time ?? undefined,
    start_date: row.start_date ?? undefined,
    due_date: row.due_date ?? undefined,
    priority: ((row.priority === 'extreme' ? 'high' : row.priority) as 'low' | 'medium' | 'high') ?? 'medium',
    is_priority: row.is_priority ?? false,
    category: row.category,
    created_at: row.created_at,
    status: row.status,
    project_id: row.project_id ?? undefined,
    steps: row.steps,
  };
}

/**
 * 重点任务排序规则：
 * 每个分类内部独立排序，不跨分类移动任务。
 * 1. 所有重点任务集中显示在本分类最前面。
 * 2. 普通任务显示在重点任务之后。
 * 3. 重点任务组内部保留原有时间排序规则。
 * 4. 普通任务组内部也保留原有时间排序规则。
 */
export function sortTasksByPriorityAndTime(tasks: Task[]): Task[] {
  const priorityTasks: Task[] = [];
  const normalTasks: Task[] = [];

  for (const t of tasks) {
    if (t.is_priority) {
      priorityTasks.push(t);
    } else {
      normalTasks.push(t);
    }
  }

  const timeCmp = (a: Task, b: Task) => {
    const timeA = a.due || a.start;
    const timeB = b.due || b.start;
    if (timeA && timeB) {
      const cmp = timeA.localeCompare(timeB);
      if (cmp !== 0) return cmp;
    } else if (timeA) {
      return -1;
    } else if (timeB) {
      return 1;
    }
    return (a.created_at || 0) - (b.created_at || 0);
  };

  priorityTasks.sort(timeCmp);
  normalTasks.sort(timeCmp);

  return [...priorityTasks, ...normalTasks];
}

export async function fetchTasksByCategory(category: 'essential' | 'focus' | 'other'): Promise<TaskRow[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('category', category)
        .order('sort_order', { ascending: true });
      if (!error && data) {
        return data as TaskRow[];
      }
    } catch {
      // Fallback to local
    }
  }
  const all = loadLocalTasks();
  return all.filter((t) => t.category === category);
}

export async function fetchTask(id: string): Promise<TaskRow | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) {
        return data as TaskRow;
      }
    } catch {
      // Fallback to local
    }
  }
  const all = loadLocalTasks();
  return all.find((t) => t.id === id) ?? null;
}

export async function fetchSubtasks(taskId: string): Promise<SubtaskRow[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('sort_order', { ascending: true });
      if (!error && data) {
        return (data as SubtaskRow[]) ?? [];
      }
    } catch {
      // Fallback
    }
  }
  return [];
}

export async function toggleTaskDone(id: string, done: boolean): Promise<void> {
  const all = loadLocalTasks();
  const next = all.map((t) => (t.id === id ? { ...t, done } : t));
  saveLocalTasks(next);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('tasks').update({ done }).eq('id', id);
    } catch {
      // ignore
    }
  }
}

export async function updateTask(id: string, updates: Partial<TaskRow>): Promise<void> {
  const all = loadLocalTasks();
  const next = all.map((t) => (t.id === id ? { ...t, ...updates } : t));
  saveLocalTasks(next);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('tasks').update(updates).eq('id', id);
    } catch {
      // ignore
    }
  }
}

export async function createTask(task: Partial<TaskRow>): Promise<TaskRow | null> {
  const all = loadLocalTasks();
  const newTask: TaskRow = {
    id: task.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: task.label || '',
    description: task.description ?? null,
    done: task.done ?? false,
    category: task.category || 'other',
    tag: task.tag ?? null,
    project_id: task.project_id ?? null,
    start_time: task.start_time ?? null,
    due_time: task.due_time ?? null,
    start_date: task.start_date ?? null,
    due_date: task.due_date ?? null,
    priority: task.priority ?? 'medium',
    is_priority: task.is_priority ?? false,
    task_type: task.task_type || 'single',
    sort_order: task.sort_order ?? all.length,
    created_at: task.created_at ?? Date.now(),
  };

  const next = [newTask, ...all];
  saveLocalTasks(next);

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .maybeSingle();
      if (!error && data) return data as TaskRow;
    } catch {
      // fallback
    }
  }

  return newTask;
}

export async function deleteTask(id: string): Promise<void> {
  const all = loadLocalTasks();
  const next = all.filter((t) => t.id !== id);
  saveLocalTasks(next);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('tasks').delete().eq('id', id);
    } catch {
      // ignore
    }
  }
}

export async function addSubtask(taskId: string, label: string): Promise<SubtaskRow | null> {
  const sub: SubtaskRow = {
    id: `sub-${Date.now()}`,
    task_id: taskId,
    label,
    done: false,
    sort_order: 0,
  };
  return sub;
}

export async function toggleSubtask(id: string, done: boolean): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('subtasks').update({ done }).eq('id', id);
    } catch {
      // ignore
    }
  }
}

export async function updateSubtask(id: string, label: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('subtasks').update({ label }).eq('id', id);
    } catch {
      // ignore
    }
  }
}

export async function deleteSubtask(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('subtasks').delete().eq('id', id);
    } catch {
      // ignore
    }
  }
}

// ==================== Module 2: Steps Breakdown & Status Flow ====================

export async function addTaskStep(taskId: string, label: string): Promise<TaskRow | null> {
  const all = loadLocalTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task) return null;

  const newStep = {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: label.trim(),
    done: false,
  };

  const steps = [...(task.steps || []), newStep];
  await updateTask(taskId, { steps });
  return { ...task, steps };
}

export async function toggleTaskStep(taskId: string, stepId: string): Promise<TaskRow | null> {
  const all = loadLocalTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task || !task.steps) return null;

  const steps = task.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
  await updateTask(taskId, { steps });
  return { ...task, steps };
}

export async function deleteTaskStep(taskId: string, stepId: string): Promise<TaskRow | null> {
  const all = loadLocalTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task || !task.steps) return null;

  const steps = task.steps.filter((s) => s.id !== stepId);
  await updateTask(taskId, { steps });
  return { ...task, steps };
}

export async function setTaskStatus(
  taskId: string,
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'abandoned'
): Promise<TaskRow | null> {
  const all = loadLocalTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task) return null;

  const updates: Partial<TaskRow> = {
    status,
    done: status === 'completed',
  };
  await updateTask(taskId, updates);
  return { ...task, ...updates };
}

export async function postponeTask(taskId: string, amount: '1h' | '1d'): Promise<TaskRow | null> {
  const all = loadLocalTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task) return null;

  let newTime = task.due_time;
  if (amount === '1h') {
    const curHour = new Date().getHours();
    const nextHour = (curHour + 1) % 24;
    newTime = `${nextHour.toString().padStart(2, '0')}:00`;
  } else {
    newTime = 'Tomorrow 10:00';
  }

  const updates: Partial<TaskRow> = {
    due_time: newTime,
    status: 'paused',
  };
  await updateTask(taskId, updates);
  return { ...task, ...updates };
}

export async function linkTaskToProject(
  taskId: string,
  projectId: string | null,
  projectName?: string
): Promise<TaskRow | null> {
  const all = loadLocalTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task) return null;

  const updates: Partial<TaskRow> = {
    project_id: projectId,
    tag: projectName ?? task.tag,
  };
  await updateTask(taskId, updates);
  return { ...task, ...updates };
}

export async function applyAiMicroSteps(taskId: string, microSteps: string[]): Promise<TaskRow | null> {
  const all = loadLocalTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task) return null;

  const generatedSteps = microSteps.map((m) => ({
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: m.trim(),
    done: false,
  }));

  const steps = [...(task.steps || []), ...generatedSteps];
  await updateTask(taskId, { steps, status: 'in_progress' });
  return { ...task, steps, status: 'in_progress' };
}


// ==================== Scratchpad (速记板) ====================

const DEFAULT_SCRATCH_NOTES: ScratchNote[] = [
  {
    id: 'note-1',
    content: 'Studio OS card geometry and glassmorphism styling alignment',
    is_priority: true,
    created_at: Date.now() - 3600000 * 5,
    is_organized: false,
  },
  {
    id: 'note-2',
    content: 'Scratchpad 3-day retention check with persistent timestamps',
    is_priority: false,
    created_at: Date.now() - 3600000 * 2,
    is_organized: false,
  },
];

export function purgeExpiredScratchNotes(notes: ScratchNote[], now = Date.now()): ScratchNote[] {
  return notes.filter((note) => {
    if (!note.is_organized) return true;
    if (!note.organized_at) return true;
    return now - note.organized_at < THREE_DAYS_MS;
  });
}

export function loadScratchNotes(): ScratchNote[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SCRATCH_KEY);
    let notes: ScratchNote[];
    if (!raw) {
      notes = DEFAULT_SCRATCH_NOTES;
    } else {
      notes = JSON.parse(raw);
    }
    const cleaned = purgeExpiredScratchNotes(notes);
    if (cleaned.length !== notes.length) {
      saveScratchNotes(cleaned);
    }
    return cleaned;
  } catch {
    return DEFAULT_SCRATCH_NOTES;
  }
}

export function saveScratchNotes(notes: ScratchNote[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_SCRATCH_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save scratch notes', e);
  }
}

export interface UnifiedScheduleTask {
  id: string; // "task-xxx" or "subtask::projId::stageId::subId"
  rawId: string;
  title: string;
  done: boolean;
  is_priority?: boolean;
  priority?: string; // difficulty: 'low' | 'medium' | 'high'
  start_date?: string; // YYYY-MM-DD
  due_date?: string; // YYYY-MM-DD
  start_time?: string; // HH:mm
  due_time?: string; // HH:mm
  sourceType: 'task' | 'subtask_regular' | 'subtask_research';
  category?: string;
  part_name?: string;
  project_name?: string;
  projectId?: string;
  stageId?: string;
  subtaskId?: string;
}

export function getAllScheduleTasks(): UnifiedScheduleTask[] {
  const result: UnifiedScheduleTask[] = [];

  // 1. Regular tasks from local storage
  const tasks = loadLocalTasks();
  tasks.forEach((t) => {
    result.push({
      id: t.id,
      rawId: t.id,
      title: t.label,
      done: Boolean(t.done),
      is_priority: Boolean(t.is_priority),
      priority: t.priority === 'extreme' ? 'high' : (t.priority || 'medium'),
      start_date: (t.start_date || t.due_date)?.trim() || undefined,
      due_date: (t.due_date || t.start_date)?.trim() || undefined,
      start_time: t.start_time?.trim() || undefined,
      due_time: (t.due_time || t.start_time)?.trim() || undefined,
      sourceType: 'task',
      category: t.category,
      project_name: t.tag || undefined,
      projectId: t.project_id || undefined,
    });
  });

  // 2. Part subtasks (regular and research) from projects
  const projects = loadProjects();
  projects.forEach((proj) => {
    (proj.stages || []).forEach((stage) => {
      (stage.subtasks || []).forEach((sub) => {
        result.push({
          id: `subtask::${proj.id}::${stage.id}::${sub.id}`,
          rawId: sub.id,
          title: sub.title,
          done: Boolean(sub.done),
          is_priority: Boolean(sub.in_today_focus),
          priority: (sub.difficulty as string) === 'extreme' ? 'high' : (sub.difficulty || 'medium'),
          start_date: (sub.start_date || sub.due_date)?.trim() || undefined,
          due_date: (sub.due_date || sub.start_date)?.trim() || undefined,
          due_time: sub.time?.trim() || undefined,
          sourceType: sub.type === 'research' ? 'subtask_research' : 'subtask_regular',
          category: 'project',
          part_name: stage.name,
          project_name: proj.name,
          projectId: proj.id,
          stageId: stage.id,
          subtaskId: sub.id,
        });
      });
    });
  });

  return result;
}

export async function updateUnifiedTaskSchedule(
  id: string,
  due_date?: string | null,
  due_time?: string | null,
  start_date?: string | null,
  start_time?: string | null
): Promise<void> {
  const dateVal = due_date !== undefined ? (due_date?.trim() || null) : undefined;
  const timeVal = due_time !== undefined ? (due_time?.trim() || null) : undefined;
  const startDateVal = start_date !== undefined ? (start_date?.trim() || null) : undefined;
  const startTimeVal = start_time !== undefined ? (start_time?.trim() || null) : undefined;

  if (id.startsWith('subtask::')) {
    const parts = id.split('::');
    const projId = parts[1];
    const stageId = parts[2];
    const subId = parts[3];
    updateSubtaskTime(
      projId,
      stageId,
      subId,
      timeVal !== undefined ? (timeVal || undefined) : undefined,
      dateVal !== undefined ? (dateVal || undefined) : undefined,
      startDateVal !== undefined ? (startDateVal || undefined) : undefined,
      startTimeVal !== undefined ? (startTimeVal || undefined) : undefined
    );
  } else {
    const updates: Partial<TaskRow> = {};
    if (due_date !== undefined) updates.due_date = dateVal;
    if (due_time !== undefined) updates.due_time = timeVal;
    if (start_date !== undefined) updates.start_date = startDateVal;
    if (start_time !== undefined) updates.start_time = startTimeVal;

    await updateTask(id, updates);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('studio_os_tasks_changed'));
  }
}

