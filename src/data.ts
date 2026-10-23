export interface TaskStep {
  id: string;
  label: string;
  done: boolean;
}

export interface Task {
  id: string;
  label: string;
  done: boolean;
  tag?: string;
  start?: string;
  due?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | string;
  is_priority?: boolean;
  category?: 'essential' | 'focus' | 'other';
  created_at?: number;
  status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'abandoned';
  project_id?: string;
  steps?: TaskStep[];
}

export interface EventItem {
  id: string;
  title: string;
  startHour: number;
  endHour: number;
  color: string;
}

export interface ProjectStage {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  difficulty?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'medium' | 'high' | string;
  time?: string;
  is_priority?: boolean;
  learningBranch?: {
    active?: boolean;
    step?: 1 | 2 | 3; // 1: Learn, 2: Practice, 3: Verify
    verified?: boolean;
    note?: string;
  };
}

export interface ProjectDiscovery {
  id: string;
  note: string;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  progress: number;
  accent: string;
  vision?: string; // ① 成品的想象 (Imagination of Deliverable)
  status?: 'in_progress' | 'completed' | 'paused';
  stages?: ProjectStage[];
  discoveries?: ProjectDiscovery[]; // ④ 发现问题、记录新信息
  cycleCount?: number; // 叙事游戏多周目循环数
  completedAt?: number;
}

export const essentials: Task[] = [
  { id: 'e1', label: 'Drink water', done: true, tag: 'Health' },
  { id: 'e2', label: 'Morning stretch', done: true, tag: 'Health' },
  { id: 'e3', label: 'Review goals', done: false, tag: 'Mind' },
  { id: 'e4', label: 'Read 20 pages', done: false, tag: 'Mind' },
  { id: 'e5', label: 'Plan tomorrow', done: false, tag: 'Plan' },
];

export const focusTasks: Task[] = [
  { id: 'f1', label: 'Finish design review', done: false, tag: 'Design', start: '09:00', due: '20 Oct, 20:00' },
  { id: 'f2', label: 'Write project brief', done: false, tag: 'Writing', start: '11:00', due: '20 Oct, 18:00' },
  { id: 'f3', label: 'Code auth flow', done: false, tag: 'Dev', start: '14:00', due: '20 Oct, 17:00' },
];

export const otherTasks: Task[] = [
  { id: 'o1', label: 'Reply to client email', done: true, tag: 'Comms', start: '10:30', due: '20 Oct, 12:00' },
  { id: 'o2', label: 'Update sprint board', done: false, tag: 'Plan', start: '13:00', due: '20 Oct, 14:00' },
  { id: 'o3', label: 'Research icon set', done: false, tag: 'Design', start: '15:30', due: '20 Oct, 20:00' },
  { id: 'o4', label: 'Backup project files', done: false, tag: 'Admin', start: '17:00', due: '20 Oct, 22:00' },
];

export const events: EventItem[] = [
  { id: 'ev1', title: 'Standup', startHour: 9, endHour: 9.5, color: 'from-sky-500/70 to-blue-600/70' },
  { id: 'ev2', title: 'Design Review', startHour: 10, endHour: 11, color: 'from-violet-500/70 to-purple-600/70' },
  { id: 'ev3', title: 'Deep Work', startHour: 11.5, endHour: 13, color: 'from-fuchsia-500/70 to-pink-600/70' },
  { id: 'ev4', title: 'Lunch', startHour: 13, endHour: 13.75, color: 'from-teal-500/70 to-emerald-600/70' },
  { id: 'ev5', title: 'Client Call', startHour: 14.5, endHour: 15.5, color: 'from-blue-500/70 to-indigo-600/70' },
  { id: 'ev6', title: 'Focus Block', startHour: 16, endHour: 17.5, color: 'from-violet-500/70 to-fuchsia-600/70' },
];

export const projects: Project[] = [
  {
    id: 'p1',
    name: 'Studio App Redesign',
    progress: 72,
    accent: 'from-sky-400 to-blue-500',
    vision: 'A fluid, playful personal OS with zero-pill discipline and Apple Watch elegance.',
    status: 'in_progress',
    cycleCount: 2,
    stages: [
      { id: 's1', name: 'Vision Definition & Wireframes', status: 'completed' },
      { id: 's2', name: 'Core Micro-interactions & Cards', status: 'in_progress' },
      { id: 's3', name: 'Cross-device Validation & Polish', status: 'pending' },
    ],
    discoveries: [
      { id: 'd1', note: 'Priority cards need distinct purple glow for instant recognition', createdAt: Date.now() - 86400000 * 2 },
      { id: 'd2', note: 'Scratchpad and Idea Box should be strictly differentiated', createdAt: Date.now() - 86400000 },
    ],
  },
  {
    id: 'p2',
    name: 'Marketing Site',
    progress: 45,
    accent: 'from-violet-400 to-purple-500',
    vision: 'High-conversion interactive landing experience demonstrating real-time reactivity.',
    status: 'in_progress',
    cycleCount: 1,
    stages: [
      { id: 's4', name: 'Hero Section & Narrative Copy', status: 'completed' },
      { id: 's5', name: 'Feature Showcase Demos', status: 'in_progress' },
      { id: 's6', name: 'SEO & Performance Benchmarking', status: 'pending' },
    ],
    discoveries: [],
  },
  {
    id: 'p3',
    name: 'API Migration',
    progress: 88,
    accent: 'from-fuchsia-400 to-pink-500',
    vision: 'Sub-50ms latency offline-first sync engine connecting client and cloud storage.',
    status: 'in_progress',
    cycleCount: 1,
    stages: [
      { id: 's7', name: 'Schema Unification', status: 'completed' },
      { id: 's8', name: 'Cache-first Adapter Layer', status: 'completed' },
      { id: 's9', name: 'E2E Stress Testing', status: 'in_progress' },
    ],
    discoveries: [
      { id: 'd3', note: 'LocalStorage fallback prevents boot failure on unconfigured Supabase', createdAt: Date.now() - 3600000 * 12 },
    ],
  },
];
