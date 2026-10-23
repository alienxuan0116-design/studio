import { useState, useEffect } from 'react';
import { X, Check, FolderGit2 } from 'lucide-react';
import { createTask, type TaskRow } from '@/lib/tasks';
import { loadProjects } from '@/lib/projects';
import type { Project } from '@/data';
import DateTimePicker from '@/components/DateTimePicker';

interface Props {
  initialCategory?: 'essential' | 'focus' | 'other';
  onBack: () => void;
  onCreated: (task: TaskRow) => void;
}

export default function NewTaskPage({ initialCategory = 'other', onBack, onCreated }: Props) {
  const [label, setLabel] = useState('');
  const [difficulty, setDifficulty] = useState<'low' | 'medium' | 'high'>('medium');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  const isLabelValid = label.trim().length > 0;

  const categoryNameMap = {
    essential: 'Daily Essentials',
    focus: "Today's Focus",
    other: 'Other Tasks',
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isLabelValid || saving) return;

    setSaving(true);
    try {
      const selectedProj = projects.find((p) => p.id === projectId);
      const created = await createTask({
        label: label.trim(),
        category: initialCategory,
        priority: difficulty,
        due_time: time.trim() ? time.trim() : null,
        due_date: date.trim() ? date.trim() : null,
        project_id: projectId.trim() ? projectId : null,
        tag: selectedProj ? selectedProj.name : null,
        is_priority: false, // Priority default off
        done: false,
        task_type: initialCategory === 'essential' ? 'essential' : initialCategory === 'focus' ? 'project' : 'single',
      });

      if (created) {
        onCreated(created);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (label.trim().length > 0) return;
      onBack();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-md glass glass-glow rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl relative max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2 text-xs font-mono text-white/50">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>{categoryNameMap[initialCategory]}</span>
          </div>
          <button
            type="button"
            onClick={onBack}
            aria-label="Cancel"
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Blank Task Card Form */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="w-full">
            <input
              type="text"
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Task name"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400/80 text-sm h-[46px] box-border"
            />
          </div>

          {/* Time & Date: Month/Day + Time Point */}
          <DateTimePicker
            date={date}
            time={time}
            onChange={(d, t) => {
              setDate(d);
              setTime(t);
            }}
          />

          {/* 2. Difficulty Selection: Low / Mid / High */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">
              2. Difficulty
            </span>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
              {(['low', 'medium', 'high'] as const).map((level) => {
                const isSelected = difficulty === level;
                const txt = level === 'low' ? 'Low' : level === 'medium' ? 'Mid' : 'High';
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? level === 'high'
                          ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                          : level === 'medium'
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {txt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Project association */}
          {projects.length > 0 && (
            <div className="flex items-center justify-between text-xs font-mono text-white/50 pt-1">
              <div className="flex items-center gap-1.5">
                <FolderGit2 size={13} className="text-white/40" />
                <span>Project (Optional)</span>
              </div>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-400"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Bar: Must click 'Done' to save */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isLabelValid || saving}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                isLabelValid && !saving
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40'
                  : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
              }`}
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Done</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
