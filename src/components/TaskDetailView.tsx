import React, { useState } from 'react';
import { Task, Difficulty } from '../types.ts';
import { DifficultyIndicator } from './TaskCard.tsx';
import { Sparkles, Pencil, ArrowLeft, Clock, Check } from 'lucide-react';
import { TimeInputField } from './DateTimePicker';

interface TaskDetailViewProps {
  task: Task;
  categoryName?: string;
  onUpdate: (updated: Task) => void;
  onBack: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  task,
  categoryName,
  onUpdate,
  onBack,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // Directly toggle priority (works in both view & edit mode, auto-saved)
  const handleTogglePriority = () => {
    onUpdate({
      ...task,
      isPriority: !task.isPriority,
      updatedAt: Date.now(),
    });
  };

  // Auto-save changes in edit mode
  const handleTitleChange = (newTitle: string) => {
    onUpdate({
      ...task,
      title: newTitle,
      updatedAt: Date.now(),
    });
  };

  const handleTimeChange = (newTime: string) => {
    onUpdate({
      ...task,
      time: newTime.trim() ? newTime : undefined,
      updatedAt: Date.now(),
    });
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    onUpdate({
      ...task,
      difficulty: newDifficulty,
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-4">
      {/* Container with max-width matching studio memo card */}
      <div className="w-full max-w-md">
        {/* Top minimal navigation bar */}
        <div className="flex items-center justify-between mb-4 px-1">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors p-1 -ml-1 rounded-lg hover:bg-zinc-800/60"
          >
            <ArrowLeft className="w-4 h-4" />
            {categoryName ? <span className="font-mono">{categoryName}</span> : null}
          </button>
        </div>

        {/* The Memo-Style Task Card */}
        <div
          className={`relative rounded-2xl p-6 border backdrop-blur-md transition-all duration-300 shadow-xl ${
            task.isPriority
              ? 'bg-purple-950/40 border-purple-500/40 shadow-[0_8px_32px_rgba(168,85,247,0.15)] text-purple-100'
              : 'bg-zinc-900/90 border-zinc-800 text-zinc-200'
          }`}
        >
          {/* Card Action Icons in Top Right - view mode */}
          {!isEditing && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                aria-label="Edit"
                className="p-1.5 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              >
                <Pencil className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTogglePriority}
                aria-label={task.isPriority ? 'Remove priority' : 'Mark priority'}
                className={`p-1.5 rounded-lg transition-all ${
                  task.isPriority
                    ? 'text-purple-300 bg-purple-500/20 hover:bg-purple-500/30'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${task.isPriority ? 'fill-purple-400' : ''}`} />
              </button>
            </div>
          )}

          {/* VIEW MODE vs EDIT MODE */}
          {!isEditing ? (
            <div className="pt-2 pr-16 space-y-6">
              <h2
                className={`text-lg font-medium leading-relaxed tracking-tight ${
                  task.isPriority ? 'text-purple-50 font-medium' : 'text-zinc-100'
                }`}
              >
                {task.title}
              </h2>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50 text-xs">
                {/* Time */}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-mono text-zinc-300">{task.time || 'No time set'}</span>
                </div>

                {/* Difficulty */}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-xs">
                    {task.difficulty === 'high' ? 'High' : task.difficulty === 'medium' ? 'Mid' : 'Low'}
                  </span>
                  <DifficultyIndicator difficulty={task.difficulty} size="md" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header row in edit mode */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs font-mono uppercase tracking-wider text-purple-300">
                  Editing Task
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    aria-label="Done editing"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-600/30 text-purple-200 border border-purple-500/40"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTogglePriority}
                    aria-label={task.isPriority ? 'Remove priority' : 'Mark priority'}
                    className={`p-1.5 rounded-lg transition-all ${
                      task.isPriority
                        ? 'text-purple-300 bg-purple-500/20 hover:bg-purple-500/30'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
                    }`}
                  >
                    <Sparkles className={`w-4 h-4 ${task.isPriority ? 'fill-purple-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Task name */}
              <div className="w-full">
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Task name"
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-2xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500/80 text-sm h-[46px] box-border"
                />
              </div>

              {/* Time */}
              <TimeInputField
                value={task.time || ''}
                onChange={handleTimeChange}
                showLabel={true}
                onClear={() => handleTimeChange('')}
              />

              {/* Difficulty */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Difficulty
                </span>
                <div className="flex items-center bg-zinc-950/70 border border-zinc-800 rounded-xl p-1 gap-1">
                  {(['low', 'medium', 'high'] as Difficulty[]).map((level) => {
                    const isSelected = task.difficulty === level;
                    const label = level === 'low' ? 'Low' : level === 'medium' ? 'Mid' : 'High';
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleDifficultyChange(level)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? level === 'high'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : level === 'medium'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
