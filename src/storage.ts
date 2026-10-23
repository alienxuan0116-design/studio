import { Category, Task, ScratchNote, THREE_DAYS_MS } from './types.ts';

const CATEGORIES_KEY = 'studio_os_categories_v1';
const TASKS_KEY = 'studio_os_tasks_v1';
const SCRATCH_KEY = 'studio_os_scratch_notes_v1';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: '工作' },
  { id: 'design', name: '设计' },
  { id: 'life', name: '生活' },
];

const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    title: '系统架构走查与接口对齐',
    categoryId: 'work',
    difficulty: 'high',
    time: '10:00',
    isPriority: true,
    createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'task-2',
    title: '周度开发进度同步会',
    categoryId: 'work',
    difficulty: 'medium',
    time: '15:30',
    isPriority: false,
    createdAt: Date.now() - 3600000 * 4,
  },
  {
    id: 'task-3',
    title: '极简卡片视觉微交互调优',
    categoryId: 'design',
    difficulty: 'high',
    time: '11:00',
    isPriority: true,
    createdAt: Date.now() - 3600000 * 3,
  },
  {
    id: 'task-4',
    title: '图标尺寸与网格对齐',
    categoryId: 'design',
    difficulty: 'low',
    time: '16:00',
    isPriority: false,
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'task-5',
    title: '晚间体能训练',
    categoryId: 'life',
    difficulty: 'low',
    time: '19:30',
    isPriority: false,
    createdAt: Date.now() - 3600000,
  },
];

const DEFAULT_SCRATCH_NOTES: ScratchNote[] = [
  {
    id: 'note-1',
    content: '设计规范与圆角变量统一为 16px',
    isPriority: true,
    createdAt: Date.now() - 3600000 * 6,
    isOrganized: false,
  },
  {
    id: 'note-2',
    content: '速记板 3 天过期清理依据时间戳持久化存储',
    isPriority: false,
    createdAt: Date.now() - 3600000 * 2,
    isOrganized: false,
  },
];

export function getCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) {
      saveCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch (err) {
    console.error('Failed to save categories', err);
  }
}

export function getTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) {
      saveTasks(DEFAULT_TASKS);
      return DEFAULT_TASKS;
    }
    const parsed: Task[] = JSON.parse(raw);
    // Ensure backwards compatibility with any existing records: isPriority defaults to false
    return parsed.map((t) => ({
      ...t,
      isPriority: typeof t.isPriority === 'boolean' ? t.isPriority : false,
      difficulty: t.difficulty || 'medium',
    }));
  } catch {
    return DEFAULT_TASKS;
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to save tasks', err);
  }
}

/**
 * Filters out organized scratchpad notes older than 3 days (72 hours).
 * CRITICAL: Only cleans up scratchpad notes copy; formal tasks are never deleted!
 */
export function purgeExpiredScratchNotes(notes: ScratchNote[], now = Date.now()): ScratchNote[] {
  return notes.filter((note) => {
    if (!note.isOrganized) {
      return true; // Keep unorganized notes
    }
    if (!note.organizedAt) {
      return true;
    }
    const elapsed = now - note.organizedAt;
    return elapsed < THREE_DAYS_MS;
  });
}

export function getScratchNotes(): ScratchNote[] {
  try {
    const raw = localStorage.getItem(SCRATCH_KEY);
    let notes: ScratchNote[];
    if (!raw) {
      notes = DEFAULT_SCRATCH_NOTES;
    } else {
      notes = JSON.parse(raw);
    }
    // Clean up expired organized notes (> 3 days) based on persistent timestamp
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
    localStorage.setItem(SCRATCH_KEY, JSON.stringify(notes));
  } catch (err) {
    console.error('Failed to save scratch notes', err);
  }
}
