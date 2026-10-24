import React from 'react';
import { Category, Task } from '../types.ts';
import { TaskCard } from './TaskCard.tsx';
import { sortTasksByPriorityAndTime } from '../utils/sorting.ts';
import { ArrowLeft, Plus } from 'lucide-react';

interface CategoryDetailViewProps {
  category: Category;
  tasks: Task[];
  onBack: () => void;
  onSelectTask: (taskId: string) => void;
  onAddTask: (categoryId: string) => void;
  onTogglePriority: (taskId: string, e: React.MouseEvent) => void;
}

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  category,
  tasks,
  onBack,
  onSelectTask,
  onAddTask,
  onTogglePriority,
}) => {
  // Sort tasks: priority first, both groups sorted by time
  const sortedTasks = sortTasksByPriorityAndTime(tasks);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500/80" />
            <h2 className="text-lg font-medium text-zinc-100">{category.name}</h2>
            <span className="text-xs font-mono text-zinc-500 ml-1">({tasks.length})</span>
          </div>
        </div>

        {/* Add Task Button in Category */}
        <button
          type="button"
          onClick={() => onAddTask(category.id)}
          aria-label="Add task"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Task List */}
      {sortedTasks.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 text-xs">
          No tasks
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onSelect={onSelectTask}
              onTogglePriority={onTogglePriority}
            />
          ))}
        </div>
      )}
    </div>
  );
};
