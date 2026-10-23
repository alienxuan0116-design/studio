import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import TaskList from './TaskList';
import NavDot from './NavDot';
import type { Task } from '@/data';

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
  onNavigate?: () => void;
  onAdd?: () => void;
  onOpenTask?: (id: string) => void;
  onTogglePriority?: (id: string, e: React.MouseEvent) => void;
}

export default function OtherTasksSection({ tasks, onToggle, onNavigate, onAdd, onOpenTask, onTogglePriority }: Props) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visibleTasks = showAll ? tasks : tasks.slice(0, 3);

  return (
    <section id="other-tasks" className="glass glass-glow rounded-3xl p-4 sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => setSectionOpen(!sectionOpen)}
          className="flex-1 flex items-center justify-between text-left group rounded-2xl p-1.5 -m-1.5 hover:bg-white/5 transition-colors"
          aria-expanded={sectionOpen}
        >
          <div>
            <h2 className="text-xs sm:text-sm tracking-[0.2em] uppercase text-white/50">Later</h2>
            <p className="text-base sm:text-lg font-light text-white/90 mt-0.5">Other Tasks</p>
          </div>
          <span
            className={`collapsible-motion w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 text-white/55 group-hover:bg-white/10 transition-transform duration-300 ${
              sectionOpen ? 'rotate-180' : ''
            }`}
          >
            <ChevronDown size={16} strokeWidth={1.8} />
          </span>
        </button>
        <div className="flex items-center gap-1">
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              aria-label="Add task"
              title="Add task"
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          )}
          {onNavigate && <NavDot label="Open task list page" onClick={onNavigate} />}
        </div>
      </div>
      <div
        className={`collapsible-motion overflow-hidden transition-all duration-300 ${
          sectionOpen ? 'max-h-[1200px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <TaskList tasks={visibleTasks} onToggle={onToggle} onOpenTask={onOpenTask} />
        {tasks.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[12px] text-white/60 hover:bg-white/10 transition-colors"
          >
            {showAll ? 'Show less' : `Show ${tasks.length - 3} more`}
            <ChevronDown
              size={14}
              strokeWidth={1.8}
              className={`collapsible-motion transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
    </section>
  );
}
