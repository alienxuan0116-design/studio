import React, { useEffect, useState } from 'react';
import { Check, Sparkles, Pencil, Clock } from 'lucide-react';
import type { Task } from '@/data';

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
  onOpenTask?: (id: string) => void;
  onTogglePriority?: (id: string, e: React.MouseEvent) => void;
  onOpenSkillDrawer?: (task: Task) => void;
  showTime?: boolean;
}

export function DifficultyDots({ difficulty }: { difficulty?: string }) {
  const level = difficulty === 'high' ? 3 : difficulty === 'low' ? 1 : 2;
  const getColor = (i: number) => {
    if (i >= level) return 'bg-white/10';
    if (difficulty === 'high') return 'bg-rose-400';
    if (difficulty === 'low') return 'bg-emerald-400';
    return 'bg-amber-400';
  };

  return (
    <div className="flex items-center gap-1 shrink-0" title={difficulty === 'high' ? 'High' : difficulty === 'low' ? 'Low' : 'Mid'}>
      <span className={`w-1.5 h-1.5 rounded-full ${getColor(0)}`} />
      <span className={`w-1.5 h-1.5 rounded-full ${getColor(1)}`} />
      <span className={`w-1.5 h-1.5 rounded-full ${getColor(2)}`} />
    </div>
  );
}

export default function TaskList({
  tasks,
  onToggle,
  onOpenTask,
  onTogglePriority,
  onOpenSkillDrawer,
  showTime = true,
}: Props) {
  const [local, setLocal] = useState(tasks);

  useEffect(() => setLocal(tasks), [tasks]);

  return (
    <div className="flex flex-col gap-2">
      {local.map((task) => {
        const isPriority = Boolean(task.is_priority);
        return (
          <div
            key={task.id}
            onClick={() => onOpenTask?.(task.id)}
            className={`group relative flex flex-row items-center justify-between h-14 sm:h-16 px-3 sm:px-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
              isPriority
                ? 'bg-purple-950/25 border-purple-500/30 text-purple-200/90 hover:border-purple-500/50'
                : 'glass glass-hover border-white/5 text-white/85 hover:border-white/10'
            }`}
          >
            {/* [左] 极简节点勾选圈 (Status Check) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLocal((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
                onToggle(task.id);
              }}
              className="p-1 -m-1 flex-shrink-0 flex items-center justify-center rounded-full mr-2.5 sm:mr-3.5"
              aria-label={task.done ? 'Mark undone' : 'Mark done'}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                  task.done
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-500/40 text-black shadow-sm'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                {task.done && <Check size={12} strokeWidth={3} />}
              </span>
            </button>

            {/* [中] 任务标题 (Task Title) + 小型方块难度 + 可选时间 */}
            <div className="flex items-center gap-2 flex-1 min-w-0 mr-2 sm:mr-3 overflow-hidden">
              {/* 小型方块难度图标 (Compact Square Difficulty Block) */}
              {task.priority && (
                <span
                  title={`Difficulty: ${task.priority}`}
                  className={`w-4 h-4 rounded-[4px] flex items-center justify-center text-[9px] font-mono font-bold uppercase shrink-0 border transition-transform ${
                    task.priority === 'high'
                      ? 'bg-rose-500/25 text-rose-300 border-rose-500/40'
                      : task.priority === 'low'
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/25 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {task.priority === 'high' ? 'H' : task.priority === 'low' ? 'L' : 'M'}
                </span>
              )}

              {/* 任务名称：核心重点，如果属于 Part 则显示所属 Part · 子任务名称 */}
              {task.part_name ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/25 shrink-0 max-w-[130px] truncate"
                    title={task.part_name}
                  >
                    {task.part_name}
                  </span>
                  <span className="text-white/40 text-xs shrink-0">·</span>
                  <span
                    className={`text-[13px] sm:text-sm font-medium leading-normal truncate flex-1 min-w-0 transition-all duration-200 ${
                      task.done
                        ? 'text-white/40 line-through'
                        : isPriority
                        ? 'text-purple-200/90 font-medium'
                        : 'text-white/90'
                    }`}
                    title={task.label}
                  >
                    {task.subtask_title || task.label}
                  </span>
                </div>
              ) : (
                <span
                  className={`text-[13px] sm:text-sm font-medium leading-normal truncate flex-1 min-w-0 transition-all duration-200 ${
                    task.done
                      ? 'text-white/40 line-through'
                      : isPriority
                      ? 'text-purple-200/90 font-medium'
                      : 'text-white/90'
                  }`}
                  title={task.label}
                >
                  {task.label}
                </span>
              )}

              {/* 时间微型Tag：仅在未隐藏时展示 */}
              {showTime && (task.start || task.due) && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono text-fuchsia-300/85 bg-fuchsia-500/10 border border-fuchsia-500/25 shrink-0 whitespace-nowrap">
                  <Clock size={9} />
                  <span>{task.due || task.start}</span>
                </span>
              )}
            </div>

            {/* [右] 操作按钮组：[✦ Important] + [✎ Edit] */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {/* [✦ Important] Priority button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePriority?.(task.id, e);
                }}
                aria-label={isPriority ? 'Remove priority' : 'Mark priority'}
                title={isPriority ? 'Remove priority' : 'Mark priority'}
                className={`p-1 sm:p-1.5 rounded-xl transition-all active:scale-95 ${
                  isPriority
                    ? 'text-purple-300 bg-purple-500/25 hover:bg-purple-500/35'
                    : 'text-white/30 hover:text-white/80 hover:bg-white/10'
                }`}
              >
                <Sparkles size={14} className={isPriority ? 'fill-purple-400' : ''} />
              </button>

              {/* [✎ Edit] Edit button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTask?.(task.id);
                }}
                aria-label="Edit task"
                title="Edit task"
                className="p-1 sm:p-1.5 rounded-xl text-white/30 hover:text-white/80 hover:bg-white/10 active:scale-95 transition-all"
              >
                <Pencil size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
