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
  part_name?: string;
  subtask_title?: string;
  is_subtask?: boolean;
  subtask_type?: 'regular' | 'research';
  part_id?: string;
  subtask_id?: string;
}

export interface EventItem {
  id: string;
  title: string;
  startHour: number;
  endHour: number;
  color: string;
}

export type MethodResultStatus = 'untried' | 'success' | 'failure';

export interface ResearchMethod {
  id: string;
  content: string;
  status: MethodResultStatus;
  notes?: string;
  createdAt?: number;
}

export interface ResearchData {
  question: string;
  investigationLog: string;
  methods: ResearchMethod[];
}

export type SubtaskDifficulty = 'low' | 'medium' | 'high' | 'extreme'; // 简单、中等、困难、极难

export const DIFFICULTY_LABELS: Record<SubtaskDifficulty, string> = {
  low: '简单',
  medium: '中等',
  high: '困难',
  extreme: '极难',
};

export interface PartSubtask {
  id: string;
  title: string;
  type: 'regular' | 'research';
  done: boolean;
  in_today_focus?: boolean; // 加入 Today's Focus
  time?: string; // 选填时间，如 "14:30"
  due_date?: string; // 选填日期，如 "2026-10-23"
  difficulty: SubtaskDifficulty; // 难度必填：简单、中等、困难、极难
  research?: ResearchData;
  createdAt: number;
}

export interface ProjectStage {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  difficulty?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'medium' | 'high' | string;
  time?: string;
  is_priority?: boolean;
  subtasks?: PartSubtask[];
  // Legacy optional field for backwards-compatibility
  learningBranch?: {
    active?: boolean;
    step?: 1 | 2 | 3;
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
  vision?: string; // Imagination of Deliverable
  status?: 'in_progress' | 'completed' | 'paused';
  stages?: ProjectStage[]; // Parts of the project
  discoveries?: ProjectDiscovery[];
  cycleCount?: number; // Optional legacy field
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
    progress: 65,
    accent: 'from-sky-400 to-blue-500',
    vision: 'A fluid, playful personal OS with zero-pill discipline and Apple Watch elegance.',
    status: 'in_progress',
    stages: [
      {
        id: 's1',
        name: 'Navigation & Page Shells',
        status: 'completed',
        subtasks: [
          { id: 'sub-1', title: 'Build unified glass layout container', type: 'regular', done: true, difficulty: 'medium', createdAt: Date.now() - 86400000 * 3 },
          { id: 'sub-2', title: 'Implement safe-area mobile header spacing', type: 'regular', done: true, difficulty: 'low', createdAt: Date.now() - 86400000 * 2 },
        ],
      },
      {
        id: 's2',
        name: 'Core Micro-interactions & Cards',
        status: 'in_progress',
        subtasks: [
          { id: 'sub-3', title: 'Card press depth feedback animation', type: 'regular', done: true, difficulty: 'medium', createdAt: Date.now() - 86400000 },
          {
            id: 'sub-4',
            title: 'Research: Low-latency spring animation physics',
            type: 'research',
            done: false,
            in_today_focus: true,
            time: '15:00',
            difficulty: 'high',
            createdAt: Date.now() - 43200000,
            research: {
              question: 'Which spring physics engine gives native 120Hz gesture smoothness without dropped frames?',
              investigationLog: 'Testing CSS transition curves vs native requestAnimationFrame damping vs motion library. Tested touch flick velocity retention.',
              methods: [
                { id: 'm1', content: 'Pure CSS transition with bezier curve', status: 'failure', notes: 'Cannot inherit pointer release momentum smoothly' },
                { id: 'm2', content: 'Lightweight requestAnimationFrame damping solver', status: 'success', notes: 'Sub-1ms render time, zero bundle overhead, perfectly captures release velocity' },
                { id: 'm3', content: 'Hardware-accelerated WAAPI spring simulation', status: 'untried', notes: 'Check iOS Safari WebKit compatibility' },
              ],
            },
          },
        ],
      },
      {
        id: 's3',
        name: 'Cross-device Validation & Polish',
        status: 'pending',
        subtasks: [
          { id: 'sub-5', title: 'Test landscape orientation viewport height', type: 'regular', difficulty: 'medium', done: false, createdAt: Date.now() - 20000 },
        ],
      },
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
    stages: [
      {
        id: 's4',
        name: 'Hero Section & Narrative Copy',
        status: 'completed',
        subtasks: [
          { id: 'sub-6', title: 'Write 3 clear value proposition statements', type: 'regular', difficulty: 'low', done: true, createdAt: Date.now() - 86400000 },
        ],
      },
      {
        id: 's5',
        name: 'Feature Showcase Demos',
        status: 'in_progress',
        subtasks: [
          { id: 'sub-7', title: 'Embed interactive preview cards', type: 'regular', difficulty: 'medium', done: false, createdAt: Date.now() - 50000 },
        ],
      },
      { id: 's6', name: 'SEO & Performance Benchmarking', status: 'pending', subtasks: [] },
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
    stages: [
      { id: 's7', name: 'Schema Unification', status: 'completed', subtasks: [] },
      { id: 's8', name: 'Cache-first Adapter Layer', status: 'completed', subtasks: [] },
      { id: 's9', name: 'E2E Stress Testing', status: 'in_progress', subtasks: [] },
    ],
    discoveries: [
      { id: 'd3', note: 'LocalStorage fallback prevents boot failure on unconfigured Supabase', createdAt: Date.now() - 3600000 * 12 },
    ],
  },
];
