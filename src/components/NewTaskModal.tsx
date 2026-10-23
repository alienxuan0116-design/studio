import React, { useState } from 'react';
import { Difficulty, Task } from '../types.ts';
import { X, Check } from 'lucide-react';
import { TimeInputField } from './DateTimePicker';

interface NewTaskModalProps {
  categoryId: string;
  categoryName: string;
  onSave: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  categoryId,
  categoryName,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [time, setTime] = useState('');

  const isTitleValid = title.trim().length > 0;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isTitleValid) return;

    onSave({
      title: title.trim(),
      categoryId,
      difficulty,
      time: time.trim() ? time.trim() : undefined,
      isPriority: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: minimalist with close icon */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-5">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{categoryName}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Task Name */}
          <div className="w-full">
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name"
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-2xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500/80 text-sm h-[46px] box-border"
            />
          </div>

          {/* Time & Difficulty */}
          <div className="space-y-5">
            <TimeInputField
              value={time}
              onChange={setTime}
              showLabel={true}
              onClear={() => setTime('')}
            />

            {/* Difficulty selection */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Difficulty
              </span>
              <div className="flex items-center bg-zinc-950/70 border border-zinc-800 rounded-xl p-1 gap-1">
                {(['low', 'medium', 'high'] as Difficulty[]).map((level) => {
                  const isSelected = difficulty === level;
                  const label = level === 'low' ? 'Low' : level === 'medium' ? 'Mid' : 'High';
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? level === 'high'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : level === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isTitleValid}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                isTitleValid
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
