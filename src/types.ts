export type Difficulty = 'low' | 'medium' | 'high';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Task {
  id: string;
  title: string;
  categoryId: string;
  difficulty: Difficulty;
  time?: string; // Optional time/schedule string e.g. "10:30", "2026-10-22 14:00"
  isPriority: boolean; // 重点，默认 false
  createdAt: number; // Timestamp for consistent original time ordering
  updatedAt?: number;
}

export interface ScratchNote {
  id: string;
  content: string;
  isPriority: boolean; // 支持标记重点
  createdAt: number;
  isOrganized: boolean; // 已整理状态（显示划掉）
  organizedAt?: number; // 完成分类的时间戳（保留 3 天后自动清除副本）
  targetCategoryId?: string; // 归入的分类 ID
  linkedTaskId?: string; // 对应生成的正式任务 ID
}

export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
