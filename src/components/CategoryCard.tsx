import React from 'react';
import { Category, Task } from '../types.ts';
import { TaskCard } from './TaskCard.tsx';
import { sortTasksByPriorityAndTime } from '../utils/sorting.ts';
import { Plus, Circle } from 'lucide-react';

interface CategoryCardProps {
  category: Category;
  tasks: Task[];
  onAddTask: (categoryId: string) => void;
  onOpenCategory: (categoryId: string) => void;
  onSelectTask: (taskId: string) => void;
  onTogglePriority: (taskId: string, e: React.MouseEvent) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  tasks,
  onAddTask,
  onOpenCategory,
  onSelectTask,
  onTogglePriority,
}) => {
  const sortedTasks = sortTasksByPriorityAndTime(tasks);

  return (
    <div className="flex flex-col bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 md:p-5 backdrop-blur-md">
      {/* Category Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          <h3 className="text-sm font-medium text-zinc-200">{category.name}</h3>
          <span className="text-xs font-mono text-zinc-500">({tasks.length})</span>
        </div>

        {/* Top Right Action Icons:
            * + 用于添加任务
            * 现有圆形图标 ○ 继续打开对应分类详情页
        */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAddTask(category.id)}
            aria-label="Add task"
            title="Add task"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenCategory(category.id)}
            aria-label="Category details"
            title="Category details"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <Circle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task List in Category */}
      <div className="space-y-2 flex-1">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-xs">
            No tasks
          </div>
        ) : (
          sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onSelect={onSelectTask}
              onTogglePriority={onTogglePriority}
            />
          ))
        )}
      </div>
    </div>
  );
};
