import { useEffect, useState, useCallback } from 'react';
import {
  Pencil,
  Sparkles,
  Clock,
  RotateCcw,
  Ban,
  Plus,
  Trash2,
  Layers,
  Check,
  FolderGit2,
  ExternalLink,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import {
  fetchTask,
  updateTask,
  addTaskStep,
  toggleTaskStep,
  deleteTaskStep,
  setTaskStatus,
  linkTaskToProject,
  applyAiMicroSteps,
  type TaskRow,
} from '@/lib/tasks';
import { loadProjects, getProject, updateProject } from '@/lib/projects';
import { DifficultyDots } from '@/components/TaskList';
import DateTimePicker, { formatMonthDayTime } from '@/components/DateTimePicker';
import type { Project } from '@/data';

interface Props {
  taskId: string;
  onBack: () => void;
  onUpdated?: () => void;
  onOpenProject?: (projectId: string) => void;
}

export default function TaskDetailPage({
  taskId,
  onBack,
  onUpdated,
  onOpenProject,
}: Props) {
  const [task, setTask] = useState<TaskRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmingDrop, setConfirmingDrop] = useState(false);

  // Micro-step input
  const [newStepLabel, setNewStepLabel] = useState('');
  const [addingStep, setAddingStep] = useState(false);

  // Projects list for linking
  const [projects, setProjects] = useState<Project[]>([]);
  const [linkedProject, setLinkedProject] = useState<Project | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const t = await fetchTask(taskId);
      setTask(t);
      const allProjects = loadProjects();
      setProjects(allProjects);

      if (t?.project_id) {
        const p = getProject(t.project_id);
        setLinkedProject(p);
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Priority toggle (works directly without entering edit mode)
  const handleTogglePriority = async () => {
    if (!task) return;
    const newPriority = !task.is_priority;
    const updated = { ...task, is_priority: newPriority };
    setTask(updated);
    await updateTask(task.id, { is_priority: newPriority });
    onUpdated?.();
  };

  // Auto-save changes in edit mode (no need to click done)
  const handleLabelChange = async (newLabel: string) => {
    if (!task) return;
    const updated = { ...task, label: newLabel };
    setTask(updated);
    await updateTask(task.id, { label: newLabel });
    onUpdated?.();
  };

  const handleTimeChange = async (newTime: string) => {
    if (!task) return;
    const updated = { ...task, due_time: newTime.trim() ? newTime : null };
    setTask(updated);
    await updateTask(task.id, { due_time: newTime.trim() ? newTime : null });
    onUpdated?.();
  };

  const handleDateTimeChange = async (newDate: string, newTime: string) => {
    if (!task) return;
    const dueTime = newTime.trim() ? newTime : null;
    const dueDate = newDate.trim() ? newDate : null;
    const updated = { ...task, due_time: dueTime, due_date: dueDate };
    setTask(updated);
    await updateTask(task.id, { due_time: dueTime, due_date: dueDate });
    onUpdated?.();
  };

  const handleDifficultyChange = async (diff: 'low' | 'medium' | 'high') => {
    if (!task) return;
    const updated = { ...task, priority: diff };
    setTask(updated);
    await updateTask(task.id, { priority: diff });
    onUpdated?.();
  };

  const handleCategoryChange = async (category: 'essential' | 'focus') => {
    if (!task) return;
    const updated = { ...task, category };
    setTask(updated);
    await updateTask(task.id, { category });
    onUpdated?.();
  };

  const handleLinkProject = async (projectId: string) => {
    if (!task) return;
    const p = projects.find((proj) => proj.id === projectId);
    const updated = await linkTaskToProject(task.id, projectId || null, p?.name);
    if (updated) {
      setTask(updated);
      setLinkedProject(p || null);
      onUpdated?.();
    }
  };

  // Action status changes: start, pause, resume, postpone, abandon, complete
  const handleSetStatus = async (
    status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'abandoned'
  ) => {
    if (!task) return;
    const updated = await setTaskStatus(task.id, status);
    if (updated) {
      setTask(updated);

      // If completed and linked to a project, sync project progress
      if (status === 'completed' && task.project_id && linkedProject) {
        const nextProgress = Math.min(100, (linkedProject.progress || 0) + 15);
        updateProject(linkedProject.id, { progress: nextProgress });
      }

      onUpdated?.();
    }
  };

  const handleDropClick = () => {
    if (status === 'abandoned') {
      handleSetStatus('pending');
      setConfirmingDrop(false);
      return;
    }
    if (!confirmingDrop) {
      setConfirmingDrop(true);
      setTimeout(() => setConfirmingDrop(false), 3500);
      return;
    }
    handleSetStatus('abandoned');
    setConfirmingDrop(false);
  };


  // Step breakdown operations
  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newStepLabel.trim()) return;
    const updated = await addTaskStep(task.id, newStepLabel.trim());
    if (updated) {
      setTask(updated);
      setNewStepLabel('');
      setAddingStep(false);
      onUpdated?.();
    }
  };

  const handleToggleStep = async (stepId: string) => {
    if (!task) return;
    const updated = await toggleTaskStep(task.id, stepId);
    if (updated) {
      setTask(updated);
      onUpdated?.();
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!task) return;
    const updated = await deleteTaskStep(task.id, stepId);
    if (updated) {
      setTask(updated);
      onUpdated?.();
    }
  };

  if (loading) {
    return (
      <PageShell title="" onBack={onBack}>
        <div className="py-20 text-center text-white/30 text-xs">Loading...</div>
      </PageShell>
    );
  }

  if (!task) {
    return (
      <PageShell title="" onBack={onBack}>
        <div className="py-20 text-center text-white/40 text-xs">Task not found</div>
      </PageShell>
    );
  }

  const isPriority = Boolean(task.is_priority);
  const status = task.status || (task.done ? 'completed' : 'pending');
  const steps = task.steps || [];
  const completedSteps = steps.filter((s) => s.done).length;
  const stepProgress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  return (
    <PageShell title="" onBack={onBack}>
      <div className="max-w-md mx-auto pt-4 pb-28 space-y-5">
        {/* =====================================================================
            1. MEMO CARD: 默认查看与编辑模式 (Strictly preserves Check 5-6 layout)
            ===================================================================== */}
        <div
          className={`relative rounded-3xl p-6 transition-all duration-300 border backdrop-blur-xl ${
            isPriority
              ? 'bg-purple-950/35 border-purple-500/40 shadow-[0_8px_32px_rgba(168,85,247,0.18)] text-purple-100'
              : 'glass glass-glow text-white/90'
          }`}
        >
          {/* Top Right Action Icons (in view mode) */}
          {!editing && (
            <div className="absolute top-5 right-5 flex items-center gap-1.5">
              {/* Edit Mode Toggle Pencil */}
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit"
                className="p-2 rounded-xl transition-colors text-white/45 hover:text-white hover:bg-white/10"
              >
                <Pencil size={16} strokeWidth={1.8} />
              </button>

              {/* Priority Toggle Sparkles Button */}
              <button
                type="button"
                onClick={handleTogglePriority}
                aria-label={isPriority ? 'Remove priority' : 'Mark priority'}
                className={`p-2 rounded-xl transition-all ${
                  isPriority
                    ? 'text-purple-300 bg-purple-500/20 hover:bg-purple-500/30'
                    : 'text-white/40 hover:text-white hover:bg-white/10'
                }`}
              >
                <Sparkles size={16} className={isPriority ? 'fill-purple-400' : ''} />
              </button>
            </div>
          )}

          {!editing ? (
            /* Default View Mode:
               Only shows clean memo card:
               - Task name
               - Time
               - Difficulty
               - Top-right priority icon
            */
            <div className="pt-2 pr-20 space-y-8">
              <h2
                className={`text-xl font-light leading-relaxed tracking-wide ${
                  isPriority ? 'text-purple-50 font-normal' : 'text-white/95'
                } ${task.done || status === 'completed' ? 'line-through opacity-60' : ''}`}
              >
                {task.label}
              </h2>

              <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
                {/* Time & Date */}
                <div className="flex items-center gap-1.5 font-mono text-white/60">
                  <Clock size={14} className="text-white/40" />
                  <span>{formatMonthDayTime(task.due_date, task.due_time || task.start_time) || 'No time set'}</span>
                </div>

                {/* Difficulty */}
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-[11px]">
                    {task.priority === 'high' ? 'High' : task.priority === 'low' ? 'Low' : 'Mid'}
                  </span>
                  <DifficultyDots difficulty={task.priority ?? 'medium'} />
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode:
               - Header row: Editing Task title + Done button + Priority toggle
               - Task name: w-full 46px height, rounded-2xl
               - DateTimePicker: w-full 46px height, rounded-2xl, identical margins and alignment
               - Auto-saves on change, no finish button needed.
            */
            <div className="space-y-5">
              {/* Header row in edit mode */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-mono uppercase tracking-wider text-purple-300">
                  Editing Task
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    aria-label="Exit edit mode"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-600/35 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-colors"
                  >
                    <Check size={13} strokeWidth={2.5} />
                    <span>Done</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTogglePriority}
                    aria-label={isPriority ? 'Remove priority' : 'Mark priority'}
                    className={`p-1.5 rounded-xl transition-all ${
                      isPriority
                        ? 'text-purple-300 bg-purple-500/20 hover:bg-purple-500/30'
                        : 'text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Sparkles size={16} className={isPriority ? 'fill-purple-400' : ''} />
                  </button>
                </div>
              </div>

              {/* Task name: full width with identical left/right margins to DateTimePicker */}
              <div className="w-full">
                <input
                  type="text"
                  value={task.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Task name"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400/80 text-sm h-[46px] box-border"
                />
              </div>

              {/* Month & Day + Time Point */}
              <DateTimePicker
                date={task.due_date || ''}
                time={task.due_time || ''}
                onChange={(d, t) => handleDateTimeChange(d, t)}
              />

              {/* 2. Difficulty selection */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-white/45">
                  2. Difficulty
                </span>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
                  {(['low', 'medium', 'high'] as const).map((level) => {
                    const isSelected = (task.priority || 'medium') === level;
                    const label = level === 'low' ? 'Low' : level === 'medium' ? 'Mid' : 'High';
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleDifficultyChange(level)}
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
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category & Project Switcher in Edit Mode */}
              <div className="pt-2 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-white/50">
                  <span>Category</span>
                  <div className="flex items-center gap-1">
                    {(['essential', 'focus'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryChange(cat)}
                        className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                          task.category === cat
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 text-white/50 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-white/50">
                  <span>Link Project</span>
                  <select
                    value={task.project_id || ''}
                    onChange={(e) => handleLinkProject(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="">None (Independent)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================================
            2. ACTION CONTROLLER: 仅保留 Drop（独占一行）
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-3 sm:p-4 border border-white/10">
          <button
            type="button"
            onClick={handleDropClick}
            title={confirmingDrop ? 'Tap again to confirm drop' : 'Drop without guilt'}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-medium border transition-all active:scale-[0.99] ${
              confirmingDrop
                ? 'bg-rose-500/30 text-rose-200 border-rose-400 animate-pulse'
                : status === 'abandoned'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-white/5 text-white/50 hover:text-rose-300 border-white/10 hover:border-rose-500/30'
            }`}
          >
            <Ban size={14} />
            <span>{confirmingDrop ? 'Confirm Drop?' : status === 'abandoned' ? 'Task Dropped (Click to restore)' : 'Drop Task'}</span>
          </button>
        </div>

        {/* =====================================================================
            4. STEP BREAKDOWN & CHECKLIST (支持步骤拆解与进度更新)
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-white/60" />
              <span className="text-xs font-mono uppercase tracking-wider text-white/80">
                Micro-Steps Checklist ({completedSteps}/{steps.length})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAddingStep(!addingStep)}
              aria-label="Add step"
              className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Step Progress Bar */}
          {steps.length > 0 && (
            <div className="space-y-1.5">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-sky-400 transition-all duration-500"
                  style={{ width: `${stepProgress}%` }}
                />
              </div>
              <div className="text-right text-[10px] font-mono text-white/40">
                {stepProgress}% completed
              </div>
            </div>
          )}

          {/* Add Step Input Form */}
          {addingStep && (
            <form onSubmit={handleAddStep} className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={newStepLabel}
                onChange={(e) => setNewStepLabel(e.target.value)}
                placeholder="Micro-action (e.g. Draft 1 paragraph)..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
              />
              <button
                type="submit"
                disabled={!newStepLabel.trim()}
                className="px-3 py-1.5 rounded-xl text-xs bg-purple-600 text-white disabled:opacity-30"
              >
                Add
              </button>
            </form>
          )}

          {/* Steps List */}
          <div className="space-y-2">
            {steps.length > 0 ? (
              steps.map((st) => (
                <div
                  key={st.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    st.done
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200/80'
                      : 'bg-white/[0.02] border-white/10 text-white/80 hover:bg-white/[0.04]'
                  }`}
                >
                  <div
                    onClick={() => handleToggleStep(st.id)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
                  >
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                        st.done
                          ? 'border-emerald-400 bg-emerald-500 text-black'
                          : 'border-white/30 bg-white/5'
                      }`}
                    >
                      {st.done && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className={`text-xs truncate ${st.done ? 'line-through opacity-60' : ''}`}>
                      {st.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteStep(st.id)}
                    className="p-1 text-white/30 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-2 text-center text-[11px] text-white/35 font-mono">
                No micro-steps yet. Add small 5-minute steps to build momentum!
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            5. ASSOCIATED PROJECT CARD (关联所属项目)
            ===================================================================== */}
        {linkedProject && (
          <div
            onClick={() => onOpenProject?.(linkedProject.id)}
            className="glass glass-hover rounded-3xl p-5 border border-sky-500/30 cursor-pointer space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 size={15} className="text-sky-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-sky-200">
                  Associated Project
                </span>
              </div>
              <ExternalLink size={13} className="text-white/40 group-hover:text-white transition-colors" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-medium text-white group-hover:text-sky-200 transition-colors">
                {linkedProject.name}
              </h4>
              {linkedProject.vision && (
                <p className="text-[11px] text-white/50 line-clamp-1 italic">
                  "{linkedProject.vision}"
                </p>
              )}
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                <span>Project Progress</span>
                <span>{linkedProject.progress}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${linkedProject.accent}`}
                  style={{ width: `${linkedProject.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
