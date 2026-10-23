import React from 'react';
import { Task, Difficulty } from '../types.ts';
import { Sparkles, Clock } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onSelect: (taskId: string) => void;
  onTogglePriority: (taskId: string, e: React.MouseEvent) => void;
}

export const DifficultyIndicator: React.FC<{ difficulty: Difficulty; size?: 'sm' | 'md' }> = ({
  difficulty,
  size = 'sm',
}) => {
  const level = difficulty === 'high' ? 3 : difficulty === 'medium' ? 2 : 1;
  const dotClass = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  const getColor = (index: number) => {
    if (index >= level) return 'bg-zinc-700';
    if (difficulty === 'high') return 'bg-rose-400';
    if (difficulty === 'medium') return 'bg-amber-400';
    return 'bg-emerald-400';
  };

  return (
    <div className="flex items-center gap-1" title={difficulty === 'high' ? '高' : difficulty === 'medium' ? '中' : '低'}>
      <span className={`rounded-full ${dotClass} ${getColor(0)}`} />
      <span className={`rounded-full ${dotClass} ${getColor(1)}`} />
      <span className={`rounded-full ${dotClass} ${getColor(2)}`} />
    </div>
  );
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onSelect, onTogglePriority }) => {
  return (
    <div
      onClick={() => onSelect(task.id)}
      className={`group relative flex flex-col justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200 border backdrop-blur-sm ${
        task.isPriority
          ? 'bg-purple-950/35 border-purple-500/40 hover:border-purple-400/60 shadow-[0_4px_20px_rgba(168,85,247,0.12)]'
          : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/90'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4
          className={`font-medium text-sm leading-snug line-clamp-2 ${
            task.isPriority ? 'text-purple-100 font-medium' : 'text-zinc-200'
          }`}
        >
          {task.title}
        </h4>

        {/* Priority Icon Toggle Button */}
        <button
          type="button"
          aria-label={task.isPriority ? '取消重点' : '设为重点'}
          onClick={(e) => onTogglePriority(task.id, e)}
          className={`shrink-0 p-1 -mr-1 -mt-1 rounded-lg transition-colors ${
            task.isPriority
              ? 'text-purple-300 hover:text-purple-200 bg-purple-500/20'
              : 'text-zinc-600 hover:text-zinc-400 opacity-60 hover:opacity-100'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${task.isPriority ? 'fill-purple-400' : ''}`} />
        </button>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 min-h-[18px]">
          {task.time ? (
            <span className="flex items-center gap-1 text-zinc-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              {task.time}
            </span>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </div>
        <DifficultyIndicator difficulty={task.difficulty} />
      </div>
    </div>
  );
};
