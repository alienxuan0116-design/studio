/**
 * Dedicated Timetable System
 * Stores recurring weekly classes/lectures exclusively for the vertical timeline.
 * Never merges into ordinary tasks, task lists, calendar bars, or other views.
 */

export interface TimetableClass {
  id: string;
  courseName: string;
  weekday: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (matching Date.getDay())
  startTime: string; // 'HH:mm' e.g. '09:00'
  endTime: string;   // 'HH:mm' e.g. '10:30'
  location?: string;
  instructor?: string;
  color?: string; // Tailwind color token or gradient identifier
  notes?: string;
  createdAt: number;
}

const TIMETABLE_STORAGE_KEY = 'planetwork_timetable_v1';

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// Realistic, persistent seed timetable classes
const SEED_CLASSES: TimetableClass[] = [
  {
    id: 'tt-class-1',
    courseName: 'Animation Physics & Dynamics',
    weekday: 1, // Monday
    startTime: '09:00',
    endTime: '10:30',
    location: 'Studio 3B',
    instructor: 'Prof. Vance',
    color: 'emerald',
    notes: 'Weekly timing and spacing critiques.',
    createdAt: 1700000000000,
  },
  {
    id: 'tt-class-2',
    courseName: 'Digital Figure Drawing',
    weekday: 1, // Monday
    startTime: '14:00',
    endTime: '16:00',
    location: 'Lab 2',
    instructor: 'Elena Rostova',
    color: 'indigo',
    notes: 'Bring gesture sketches.',
    createdAt: 1700000001000,
  },
  {
    id: 'tt-class-3',
    courseName: 'Cinematography & Staging',
    weekday: 3, // Wednesday
    startTime: '10:00',
    endTime: '11:45',
    location: 'Auditorium C',
    instructor: 'Marcus Chen',
    color: 'cyan',
    notes: 'Focal length and camera movement study.',
    createdAt: 1700000002000,
  },
  {
    id: 'tt-class-4',
    courseName: 'Audio Synthesis & Foley Lab',
    weekday: 5, // Friday
    startTime: '13:30',
    endTime: '15:00',
    location: 'Sound Suite 1',
    instructor: 'Dr. K. Aris',
    color: 'amber',
    notes: 'Microphone setups and sample cutting.',
    createdAt: 1700000003000,
  },
];

let memoryClasses: TimetableClass[] | null = null;

export function loadTimetableClasses(): TimetableClass[] {
  if (typeof window === 'undefined') {
    if (!memoryClasses) memoryClasses = [...SEED_CLASSES];
    return memoryClasses;
  }
  try {
    const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(SEED_CLASSES));
      memoryClasses = [...SEED_CLASSES];
      return SEED_CLASSES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryClasses = parsed as TimetableClass[];
      return memoryClasses;
    }
  } catch {
    // fallback
  }
  memoryClasses = [...SEED_CLASSES];
  return SEED_CLASSES;
}

export function saveTimetableClasses(classes: TimetableClass[]): void {
  memoryClasses = classes;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(classes));
    window.dispatchEvent(new CustomEvent('studio_os_timetable_changed', { detail: classes }));
  } catch {
    // fallback
  }
}

export function createTimetableClass(
  data: Omit<TimetableClass, 'id' | 'createdAt'>
): TimetableClass {
  const current = loadTimetableClasses();
  const newClass: TimetableClass = {
    ...data,
    id: `class-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
  const updated = [...current, newClass];
  saveTimetableClasses(updated);
  return newClass;
}

export function updateTimetableClass(
  id: string,
  updates: Partial<Omit<TimetableClass, 'id' | 'createdAt'>>
): TimetableClass | null {
  const current = loadTimetableClasses();
  let updatedClass: TimetableClass | null = null;
  const next = current.map((c) => {
    if (c.id === id) {
      updatedClass = { ...c, ...updates };
      return updatedClass;
    }
    return c;
  });
  if (updatedClass) {
    saveTimetableClasses(next);
  }
  return updatedClass;
}

export function deleteTimetableClass(id: string): void {
  const current = loadTimetableClasses();
  const next = current.filter((c) => c.id !== id);
  saveTimetableClasses(next);
}

/**
 * Returns recurring classes for a given YYYY-MM-DD date.
 * Extracts the weekday and matches recurring timetable rules.
 * Generates no duplicate tasks.
 */
export function getClassesForDate(dateStr: string): TimetableClass[] {
  if (!dateStr) return [];
  const parts = dateStr.split('-');
  if (parts.length !== 3) return [];
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  const weekday = d.getDay();

  const all = loadTimetableClasses();
  return all.filter((c) => c.weekday === weekday);
}
