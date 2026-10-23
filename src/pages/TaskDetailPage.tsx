import { useEffect, useState, useCallback } from 'react';
import {
  Pencil,
  Sparkles,
  Clock,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  CalendarClock,
  Ban,
  Plus,
  Trash2,
  Layers,
  Lightbulb,
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
  postponeTask,
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

  // AI Stagnation Diagnosis drawer/panel
  const [showAiDiagnosis, setShowAiDiagnosis] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<{
    reason: string;
    suggestions: string[];
  } | null>(null);

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

  const handleCategoryChange = async (category: 'essential' | 'focus' | 'other') => {
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

  const handlePostpone = async (amount: '1h' | '1d') => {
    if (!task) return;
    const updated = await postponeTask(task.id, amount);
    if (updated) {
      setTask(updated);
      onUpdated?.();
    }
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

  // AI Stagnation Diagnosis
  const handleRunAiDiagnosis = () => {
    if (!task) return;
    setIsDiagnosing(true);
    setShowAiDiagnosis(true);

    setTimeout(() => {
      // Contextual diagnosis based on task label & difficulty
      const isHighDiff = task.priority === 'high';
      const label = task.label;

      let reason = 'Action barrier: Task entry threshold is too large. Cognitive resistance is creating hesitation.';
      let suggestions = [
        `Write down the single most essential outcome of "${label}" in 1 sentence.`,
        `Gather 1 reference or template example (5 minutes max).`,
        `Draft the first 3 bullet points without seeking perfection.`,
      ];

      if (isHighDiff) {
        reason = 'High-friction complexity: Multi-variable requirements are triggering perfectionist delay.';
        suggestions = [
          `Deconstruct into an ultra-low-friction sandbox prototype.`,
          `Execute a 10-minute focus burst on the smallest single sub-element.`,
          `Validate the prototype and note discoveries in your journal.`,
        ];
      }

      setDiagnosisResult({ reason, suggestions });
      setIsDiagnosing(false);
    }, 600);
  };

  const handleAdoptMicroSteps = async () => {
    if (!task || !diagnosisResult) return;
    const updated = await applyAiMicroSteps(task.id, diagnosisResult.suggestions);
    if (updated) {
      setTask(updated);
      setShowAiDiagnosis(false);
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
                    {(['essential', 'focus', 'other'] as const).map((cat) => (
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
            2. ACTION CONTROLLER (开始 / 继续 / 暂停 / 延期 / 放弃 / 完成)
            Zero-anxiety action controls
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-white/50 px-1">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'in_progress'
                    ? 'bg-sky-400 animate-pulse'
                    : status === 'completed'
                    ? 'bg-emerald-400'
                    : status === 'paused'
                    ? 'bg-amber-400'
                    : 'bg-purple-400'
                }`}
              />
              <span className="uppercase tracking-wider">
                Status: {status.replace('_', ' ')}
              </span>
            </span>

            {/* AI Diagnose Stagnation Button */}
            <button
              type="button"
              onClick={handleRunAiDiagnosis}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono bg-purple-500/20 text-purple-200 border border-purple-500/35 hover:bg-purple-500/30 transition-all shadow-[0_0_12px_rgba(168,85,247,0.2)]"
            >
              <Lightbulb size={11} className="text-purple-300" />
              <span>AI Stagnation Assist</span>
            </button>
          </div>

          {/* Action buttons pill matrix */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1 text-[11px] sm:text-xs font-medium">
            {/* Start / Resume */}
            {status !== 'in_progress' ? (
              <button
                type="button"
                onClick={() => handleSetStatus('in_progress')}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-2.5 rounded-2xl bg-sky-500/20 text-sky-200 border border-sky-500/40 hover:bg-sky-500/30 transition-all active:scale-95"
              >
                <Play size={12} fill="currentColor" />
                <span className="truncate">Start</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSetStatus('paused')}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-2.5 rounded-2xl bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 transition-all active:scale-95"
              >
                <Pause size={12} fill="currentColor" />
                <span className="truncate">Pause</span>
              </button>
            )}

            {/* Postpone: +1h or Tomorrow */}
            <button
              type="button"
              onClick={() => handlePostpone('1h')}
              title="Postpone by 1 hour"
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-2.5 rounded-2xl bg-white/5 text-white/70 hover:text-white border border-white/10 hover:bg-white/10 transition-all active:scale-95"
            >
              <CalendarClock size={12} />
              <span className="truncate">+1 Hour</span>
            </button>

            {/* Abandon: Zero guilt drop with soft confirmation against accidental clicks */}
            <button
              type="button"
              onClick={handleDropClick}
              title={confirmingDrop ? 'Tap again to confirm drop' : 'Drop without guilt'}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-2.5 rounded-2xl border transition-all active:scale-95 ${
                confirmingDrop
                  ? 'bg-rose-500/30 text-rose-200 border-rose-400 animate-pulse'
                  : status === 'abandoned'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-white/5 text-white/40 hover:text-rose-300 border-white/10 hover:border-rose-500/30'
              }`}
            >
              <Ban size={12} />
              <span className="truncate">{confirmingDrop ? 'Confirm?' : status === 'abandoned' ? 'Dropped' : 'Drop'}</span>
            </button>

            {/* Complete / Toggle Done */}
            <button
              type="button"
              onClick={() => handleSetStatus(status === 'completed' ? 'in_progress' : 'completed')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-2.5 rounded-2xl border transition-all active:scale-95 ${
                status === 'completed' || task.done
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              <CheckCircle2 size={12} />
              <span className="truncate">{status === 'completed' ? 'Done' : 'Complete'}</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            3. AI STAGNATION DIAGNOSIS MODAL / PANEL (诊断停滞原因并调整步骤)
            ===================================================================== */}
        {showAiDiagnosis && (
          <div className="glass glass-glow rounded-3xl p-5 border border-purple-500/40 space-y-4 animate-in fade-in duration-200 bg-purple-950/20 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Lightbulb size={15} className="text-purple-300 animate-pulse" />
                <span className="text-xs font-mono uppercase tracking-wider text-purple-200">
                  AI Action Barrier Diagnosis
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAiDiagnosis(false)}
                className="text-white/40 hover:text-white text-xs"
              >
                Dismiss
              </button>
            </div>

            {isDiagnosing ? (
              <div className="py-6 text-center text-xs text-purple-300/70 font-mono animate-pulse">
                Analyzing cognitive friction and breaking down 5-min starter actions...
              </div>
            ) : diagnosisResult ? (
              <div className="space-y-3.5">
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-100/90 leading-relaxed font-light">
                  <span className="font-medium text-purple-300 block mb-1">
                    Diagnosis:
                  </span>
                  {diagnosisResult.reason}
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                    Recommended 5-Minute Micro-Steps:
                  </span>
                  <div className="space-y-1.5">
                    {diagnosisResult.suggestions.map((sug, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/80"
                      >
                        <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{sug}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAdoptMicroSteps}
                  className="w-full py-2.5 px-4 rounded-2xl text-xs font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Sparkles size={13} />
                  <span>Adopt Micro-Steps into Checklist</span>
                </button>
              </div>
            ) : null}
          </div>
        )}

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
