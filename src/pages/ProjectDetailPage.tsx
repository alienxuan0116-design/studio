import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Layers,
  Sparkles,
  Plus,
  RefreshCw,
  CheckCircle2,
  Check,
  Pencil,
  X,
  Zap,
  BookOpen,
  Hammer,
  Swords,
  Award,
  Scroll,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  Clock,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import {
  getProject,
  updateProject,
  addProjectDiscovery,
  advanceProjectCycle,
  toggleStageStatus,
  updateStageLearningBranch,
} from '@/lib/projects';
import { createTask } from '@/lib/tasks';
import type { Project, Task, ProjectStage } from '@/data';

interface Props {
  projectId: string;
  tasks: Task[];
  onBack: () => void;
  onOpenTask: (taskId: string) => void;
  onRefreshTasks: () => void;
}

export default function ProjectDetailPage({
  projectId,
  tasks,
  onBack,
  onOpenTask,
  onRefreshTasks,
}: Props) {
  const [project, setProject] = useState<Project | null>(null);

  // Vision editing state
  const [editingVision, setEditingVision] = useState(false);
  const [visionInput, setVisionInput] = useState('');

  // Main quest stages
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageNameEdit, setStageNameEdit] = useState('');

  // Side Quest Drawer state (Completely decoupled from main quest canvas!)
  const [activeSideQuestStageId, setActiveSideQuestStageId] = useState<string | null>(null);
  const [drawerStep, setDrawerStep] = useState<1 | 2 | 3>(1);
  const [drawerNote, setDrawerNote] = useState('');
  const [recentlyUnlockedStageId, setRecentlyUnlockedStageId] = useState<string | null>(null);

  // Deconstruct Stagnation relief modal
  const [deconstructStageId, setDeconstructStageId] = useState<string | null>(null);

  // Discoveries Journal collapsible drawer state
  const [journalOpen, setJournalOpen] = useState(false);
  const [discoveryInput, setDiscoveryInput] = useState('');

  // Associated tasks in project
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState('');

  // Circuit completion animation state
  const [isClosingCircuit, setIsClosingCircuit] = useState(false);
  const [circuitClosed, setCircuitClosed] = useState(false);

  const topAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = getProject(projectId);
    setProject(p);
    if (p?.vision) {
      setVisionInput(p.vision);
    }
    if (p?.status === 'completed') {
      setCircuitClosed(true);
    }
  }, [projectId]);

  if (!project) {
    return (
      <PageShell title="Project" onBack={onBack}>
        <div className="py-24 text-center text-white/40 text-xs">Project not found</div>
      </PageShell>
    );
  }

  const stages = project.stages || [];
  const discoveries = project.discoveries || [];
  const cycleCount = project.cycleCount || 1;
  const projectTasks = tasks.filter((t) => t.id.startsWith('task-') || t.tag === project.name);

  const activeStageForSideQuest = stages.find((s) => s.id === activeSideQuestStageId) || null;
  const stageToDeconstruct = stages.find((s) => s.id === deconstructStageId) || null;

  // Open side quest drawer for a specific stage
  const handleOpenSideQuest = (stage: ProjectStage) => {
    setActiveSideQuestStageId(stage.id);
    setDrawerStep(stage.learningBranch?.step || 1);
    setDrawerNote(stage.learningBranch?.note || '');
  };

  const handleCloseSideQuest = () => {
    setActiveSideQuestStageId(null);
  };

  // Switch step in Side Quest drawer
  const handleSetDrawerStep = (step: 1 | 2 | 3) => {
    setDrawerStep(step);
    if (activeSideQuestStageId) {
      updateStageLearningBranch(project.id, activeSideQuestStageId, {
        active: true,
        step,
      });
    }
  };

  // Complete verification in Side Quest drawer: auto close & highlight main quest stage!
  const handleVerifyAndUnlock = () => {
    if (!activeSideQuestStageId) return;

    const targetStageId = activeSideQuestStageId;
    const updated = updateStageLearningBranch(project.id, targetStageId, {
      active: false,
      step: 3,
      verified: true,
      note: drawerNote.trim() || undefined,
    });

    if (updated) {
      setProject(updated);
    }

    // Auto fold side quest drawer
    setActiveSideQuestStageId(null);

    // Trigger glowing unlock flash on the main quest stage card
    setRecentlyUnlockedStageId(targetStageId);
    setTimeout(() => {
      setRecentlyUnlockedStageId(null);
    }, 2500);
  };

  // Save vision
  const handleSaveVision = () => {
    if (!visionInput.trim()) return;
    const updated = updateProject(project.id, { vision: visionInput.trim() });
    if (updated) {
      setProject(updated);
      setEditingVision(false);
    }
  };

  // Loop Cycle
  const handleAdvanceCycle = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const updated = advanceProjectCycle(project.id, visionInput);
    if (updated) {
      setProject(updated);
      setEditingVision(false);
      setCircuitClosed(false);
    }
  };

  // Toggle stage status (Pending -> In Progress -> Completed)
  const handleToggleStage = (stageId: string) => {
    const updated = toggleStageStatus(project.id, stageId);
    if (updated) setProject(updated);
  };

  // Toggle stage priority
  const handleToggleStagePriority = (stageId: string) => {
    if (!project.stages) return;
    const nextStages = project.stages.map((s) =>
      s.id === stageId ? { ...s, is_priority: !s.is_priority } : s
    );
    const updated = updateProject(project.id, { stages: nextStages });
    if (updated) setProject(updated);
  };

  // Inline rename stage
  const handleStartEditStage = (stage: ProjectStage) => {
    setEditingStageId(stage.id);
    setStageNameEdit(stage.name);
  };

  const handleSaveStageName = (stageId: string) => {
    if (!stageNameEdit.trim() || !project.stages) return;
    const nextStages = project.stages.map((s) =>
      s.id === stageId ? { ...s, name: stageNameEdit.trim() } : s
    );
    const updated = updateProject(project.id, { stages: nextStages });
    if (updated) setProject(updated);
    setEditingStageId(null);
  };

  // Add stage to main quest
  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim() || !project.stages) return;
    const nextStages: ProjectStage[] = [
      ...project.stages,
      {
        id: `stage-${Date.now()}`,
        name: newStageName.trim(),
        status: 'pending',
        priority: 'medium',
      },
    ];
    const updated = updateProject(project.id, { stages: nextStages });
    if (updated) setProject(updated);
    setNewStageName('');
    setAddingStage(false);
  };

  // Adopt gentle deconstruct sub-actions
  const handleAdoptDeconstructSteps = async (stepsToAdd: string[]) => {
    if (!stageToDeconstruct) return;
    for (const step of stepsToAdd) {
      await createTask({
        label: step,
        category: 'focus',
        priority: 'low',
        project_id: project.id,
        tag: project.name,
        done: false,
      });
    }
    // Mark stage in_progress
    const nextStages = (project.stages || []).map((s) =>
      s.id === stageToDeconstruct.id ? { ...s, status: 'in_progress' as const } : s
    );
    const updated = updateProject(project.id, { stages: nextStages });
    if (updated) setProject(updated);
    setDeconstructStageId(null);
    onRefreshTasks();
  };

  // Add discovery to journal
  const handleAddDiscovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discoveryInput.trim()) return;
    const updated = addProjectDiscovery(project.id, discoveryInput.trim());
    if (updated) setProject(updated);
    setDiscoveryInput('');
  };

  // Add task to this project
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskLabel.trim()) return;
    await createTask({
      label: newTaskLabel.trim(),
      category: 'focus',
      priority: 'high',
      project_id: project.id,
      tag: project.name,
      done: false,
    });
    setNewTaskLabel('');
    setAddingTask(false);
    onRefreshTasks();
  };

  // Bottom [Complete Deliverable]: triggers glowing circuit line flowing up to vision anchor
  const handleConfirmDeliverableComplete = () => {
    setIsClosingCircuit(true);

    // Smooth scroll up to top anchor
    topAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
      const updated = updateProject(project.id, {
        status: 'completed',
        progress: 100,
        completedAt: Date.now(),
      });
      if (updated) setProject(updated);
      setIsClosingCircuit(false);
      setCircuitClosed(true);
    }, 1000);
  };

  return (
    <PageShell title={project.name} onBack={onBack}>
      <div className="relative max-w-xl mx-auto pb-32">
        {/* =====================================================================
            TOP HUD: CYCLE & OVERVIEW BAR
            ===================================================================== */}
        <div
          ref={topAnchorRef}
          className="glass glass-glow rounded-3xl p-5 border border-white/10 mb-8 sticky top-16 z-20 backdrop-blur-2xl transition-all duration-300"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium transition-all duration-500 ${
                  circuitClosed
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-purple-500/10 text-purple-300/90 border border-purple-500/25'
                }`}
              >
                <Sparkles size={12} className={circuitClosed ? 'text-emerald-300' : 'text-purple-400'} />
                <span>Cycle #{cycleCount}</span>
                {circuitClosed && (
                  <span className="ml-1 text-[10px] tracking-wide uppercase">• Closed</span>
                )}
              </span>

              <span className="text-[11px] font-mono uppercase tracking-wider text-white/40 hidden sm:inline">
                Quest Narrative
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-white/90">
                {project.progress}%
              </span>
              <button
                type="button"
                onClick={handleAdvanceCycle}
                aria-label="Loop cycle"
                title="Re-examine vision & advance loop cycle"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-purple-600/30 text-white/80 hover:text-purple-200 border border-white/10 hover:border-purple-500/40 transition-all"
              >
                <RefreshCw size={13} />
                <span>Loop Cycle</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-3.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                circuitClosed
                  ? 'bg-gradient-to-r from-emerald-500/80 to-teal-500/80 shadow-sm'
                  : `bg-gradient-to-r ${project.accent} shadow-none`
              }`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* =====================================================================
            MAIN QUEST CANVAS (主线画布): 
            Only Deliverable Vision + Core Horizontal Stage Cards
            ===================================================================== */}
        <div className="relative pl-7 sm:pl-9">
          {/* Central Glowing Tree Axis Trunk */}
          <div
            className={`absolute left-[13px] sm:left-[17px] top-6 bottom-10 w-[2px] transition-all duration-700 pointer-events-none ${
              circuitClosed
                ? 'bg-gradient-to-b from-purple-500/40 via-sky-500/40 to-emerald-500/50'
                : 'bg-gradient-to-b from-purple-500/25 via-sky-500/20 to-amber-500/20'
            }`}
          />

          {/* SVG Animated Glowing Loop Return Line (triggered on Complete Deliverable) */}
          {isClosingCircuit && (
            <svg
              className="absolute left-0 top-0 w-full h-full pointer-events-none z-30 animate-in fade-in duration-300"
              style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.35))' }}
            >
              <defs>
                <linearGradient id="returnGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#c084fc" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <line
                x1="17"
                y1="95%"
                x2="17"
                y2="40"
                stroke="url(#returnGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                className="animate-pulse"
              />
            </svg>
          )}

          {/* -------------------------------------------------------------
              1. ORIGIN VISION NODE: 【成品的想象 (Deliverable Vision)】
              ------------------------------------------------------------- */}
          <div id="vision-anchor" className="relative mb-9 group">
            <div
              className={`absolute -left-[27px] sm:-left-[31px] top-4 w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-500 z-10 ${
                circuitClosed
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-[#0a0d18] text-purple-300/80 border-purple-500/30 shadow-none'
              }`}
            >
              <Compass size={14} className={circuitClosed ? 'text-emerald-300' : 'text-purple-300'} />
            </div>

            <div
              className={`glass glass-glow rounded-3xl p-5 border transition-all duration-500 ${
                circuitClosed
                  ? 'border-emerald-500/30 bg-emerald-950/15'
                  : 'border-purple-500/20'
              }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      circuitClosed ? 'bg-emerald-400' : 'bg-purple-400 animate-ping'
                    }`}
                  />
                  <span className="text-xs font-mono uppercase tracking-wider text-purple-200">
                    ① Deliverable Vision (Origin Anchor)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {!editingVision ? (
                    <button
                      type="button"
                      onClick={() => setEditingVision(true)}
                      aria-label="Re-examine vision"
                      title="Re-examine without penalty"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Pencil size={12} />
                      <span>Re-examine</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveVision}
                      className="p-1.5 rounded-xl text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Check size={15} />
                    </button>
                  )}
                </div>
              </div>

              {!editingVision ? (
                <p className="text-[14px] text-white/95 leading-relaxed font-light italic pl-1 border-l-2 border-purple-400/40">
                  "{project.vision || 'Describe the finished deliverable outcome and core experience...'}"
                </p>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={visionInput}
                    onChange={(e) => setVisionInput(e.target.value)}
                    placeholder="Describe or refine the final deliverable outcome..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 resize-none min-h-[80px]"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingVision(false)}
                      className="px-3 py-1 rounded-xl text-xs text-white/50 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveVision}
                      className="px-3 py-1 rounded-xl text-xs bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-900/40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------
              2. MAIN QUEST LINE: 【核心横向单行主线卡片】
              (Unified Horizontal Row: [Status] + [Title + Tags] + [Action Group])
              ------------------------------------------------------------- */}
          <div className="relative mb-9 group">
            <div className="absolute -left-[27px] sm:-left-[31px] top-4 w-7 h-7 rounded-full flex items-center justify-center bg-[#090d18] text-sky-300/80 border border-sky-500/30 shadow-none z-10">
              <Layers size={14} />
            </div>

            <div className="glass glass-glow rounded-3xl p-5 border border-sky-500/15 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400/80" />
                  <span className="text-xs font-mono uppercase tracking-wider text-sky-200/80">
                    ② Main Quest Stages ({stages.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAddingStage(!addingStage)}
                  aria-label="Add stage"
                  className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Plus size={15} />
                </button>
              </div>

              {addingStage && (
                <form onSubmit={handleAddStage} className="flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="New quest stage title..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="submit"
                    disabled={!newStageName.trim()}
                    className="px-3 py-1.5 rounded-xl text-xs bg-sky-600/80 text-white disabled:opacity-30"
                  >
                    Add
                  </button>
                </form>
              )}

              {/* UNIFIED HORIZONTAL ROW MAIN QUEST STAGE CARDS */}
              <div className="space-y-2.5">
                {stages.map((stage, idx) => {
                  const isCompleted = stage.status === 'completed';
                  const isInProgress = stage.status === 'in_progress';
                  const isPriority = Boolean(stage.is_priority);
                  const isVerified = Boolean(stage.learningBranch?.verified);
                  const isRecentlyUnlocked = recentlyUnlockedStageId === stage.id;
                  const isEditingThisStage = editingStageId === stage.id;

                  return (
                    <div
                      key={stage.id}
                      className={`group relative flex flex-row items-center justify-between h-14 sm:h-16 px-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                        isRecentlyUnlocked
                          ? 'ring-1 ring-emerald-500/50 bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                          : isPriority
                          ? 'bg-purple-950/25 border-purple-500/30 text-purple-200/90 hover:border-purple-500/50'
                          : isCompleted
                          ? 'bg-emerald-950/15 border-emerald-500/20 text-emerald-200/80'
                          : isInProgress
                          ? 'bg-sky-950/15 border-sky-500/20 text-sky-200/80'
                          : 'glass glass-hover border-white/5 text-white/85 hover:border-white/10'
                      }`}
                    >
                      {/* [左] 极简节点勾选圈 (Status Check) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStage(stage.id);
                        }}
                        className="p-1 -m-1 flex-shrink-0 flex items-center justify-center rounded-full mr-3.5"
                        aria-label="Toggle stage status"
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            isCompleted
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-500/40 text-black shadow-sm'
                              : isInProgress
                              ? 'border-sky-500/40 bg-sky-500/10 text-sky-300/80'
                              : 'border-white/20 bg-white/5 hover:border-white/40 text-white/40'
                          }`}
                        >
                          {isCompleted ? (
                            <Check size={12} strokeWidth={3} />
                          ) : (
                            <span className="text-[10px] font-mono">{idx + 1}</span>
                          )}
                        </span>
                      </button>

                      {/* [中] 任务标题 (Task Title) + 同行平铺的微型难度/时间 Tag (不折行) */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-3 overflow-hidden">
                        {!isEditingThisStage ? (
                          <span
                            onClick={() => handleToggleStage(stage.id)}
                            className={`text-xs sm:text-sm font-medium leading-none truncate whitespace-nowrap transition-all duration-200 ${
                              isCompleted
                                ? 'text-white/40 line-through'
                                : isPriority
                                ? 'text-purple-100'
                                : 'text-white/95'
                            }`}
                          >
                            {stage.name}
                          </span>
                        ) : (
                          <input
                            type="text"
                            autoFocus
                            value={stageNameEdit}
                            onChange={(e) => setStageNameEdit(e.target.value)}
                            onBlur={() => handleSaveStageName(stage.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveStageName(stage.id)}
                            className="bg-white/10 border border-purple-400/80 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none w-full"
                          />
                        )}

                        {/* Inline Micro-Tags Flat in Row without wrapping */}
                        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                          {/* Status / Difficulty Tag */}
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isInProgress
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-white/5 text-white/40 border border-white/10'
                            }`}
                          >
                            {stage.status.replace('_', ' ')}
                          </span>

                          {/* Skill Mastered badge if verified */}
                          {isVerified && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30">
                              <ShieldCheck size={10} />
                              <span>Mastered</span>
                            </span>
                          )}

                          {/* Gentle Deconstruct Suggestion Chip for pending stages */}
                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeconstructStageId(stage.id);
                              }}
                              title="Gentle deconstruct without anxiety"
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono text-purple-300/80 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                            >
                              <Zap size={9} />
                              <span>Deconstruct</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* [右] 操作按钮组：[⚡ Stuck/Skill] + [✦ Important] + [✎ Edit] */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* [⚡ Stuck / Skill] button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSideQuest(stage);
                          }}
                          title="Skill & Exploration Drawer"
                          className={`p-1.5 rounded-xl transition-all active:scale-95 ${
                            isVerified
                              ? 'text-emerald-300 hover:bg-emerald-500/20'
                              : 'text-amber-300 hover:text-amber-200 hover:bg-amber-500/20'
                          }`}
                        >
                          <Zap size={14} className={isVerified ? 'fill-emerald-400/30 text-emerald-400' : 'fill-amber-400/20'} />
                        </button>

                        {/* [✦ Important] Priority button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStagePriority(stage.id);
                          }}
                          title={isPriority ? 'Remove priority' : 'Mark priority'}
                          className={`p-1.5 rounded-xl transition-all active:scale-95 ${
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
                            handleStartEditStage(stage);
                          }}
                          title="Rename stage"
                          className="p-1.5 rounded-xl text-white/35 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Linked project tasks in same horizontal style */}
              {projectTasks.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/40 px-1">
                    <span>Associated Tasks ({projectTasks.length})</span>
                    <button
                      type="button"
                      onClick={() => setAddingTask(!addingTask)}
                      className="text-white/60 hover:text-white"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {addingTask && (
                    <form onSubmit={handleCreateTask} className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={newTaskLabel}
                        onChange={(e) => setNewTaskLabel(e.target.value)}
                        placeholder="Task label..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="submit"
                        disabled={!newTaskLabel.trim()}
                        className="px-2.5 py-1 rounded-xl text-xs bg-sky-600 text-white disabled:opacity-30"
                      >
                        Add
                      </button>
                    </form>
                  )}

                  <div className="space-y-1.5">
                    {projectTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onOpenTask(t.id)}
                        className="flex flex-row items-center justify-between h-12 px-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 cursor-pointer text-white/90 text-xs transition-colors"
                      >
                        <span className={`truncate flex-1 mr-2 ${t.done ? 'line-through text-white/40' : ''}`}>
                          {t.label}
                        </span>
                        {t.due && (
                          <span className="text-[10px] text-fuchsia-300/70 font-mono shrink-0 mr-2">
                            {t.due}
                          </span>
                        )}
                        <Pencil size={12} className="text-white/30 hover:text-white" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------
              3. DISCOVERIES JOURNAL DRAWER (探路日志箱)
              (Independent collapsible drawer below main quest steps)
              ------------------------------------------------------------- */}
          <div className="relative mb-9 group">
            <div className="absolute -left-[27px] sm:-left-[31px] top-4 w-7 h-7 rounded-full flex items-center justify-center bg-[#131018] text-amber-300/80 border border-amber-500/30 shadow-none z-10">
              <Scroll size={14} />
            </div>

            <div className="glass glass-glow rounded-3xl p-5 border border-amber-500/20 space-y-3">
              {/* Drawer Header Toggle */}
              <div
                onClick={() => setJournalOpen(!journalOpen)}
                className="flex items-center justify-between cursor-pointer select-none group/hdr"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-200/80">
                    ③ Discoveries & Pitfalls Journal
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300/80 text-[10px] font-mono border border-amber-500/25">
                    {discoveries.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-white/50 group-hover/hdr:text-white transition-colors">
                  <span className="text-[11px] font-mono hidden sm:inline">
                    {journalOpen ? 'Collapse' : 'Expand'}
                  </span>
                  {journalOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </div>

              {/* Collapsible Content */}
              {journalOpen && (
                <div className="pt-2 space-y-3 animate-in fade-in duration-200 border-t border-white/10">
                  <p className="text-[11px] text-white/50">
                    Chronicle obstacles, breakthroughs, and permanent knowledge learned during execution.
                  </p>

                  {/* Add Discovery Form */}
                  <form onSubmit={handleAddDiscovery} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={discoveryInput}
                      onChange={(e) => setDiscoveryInput(e.target.value)}
                      placeholder="Record pitfall, lesson or breakthrough..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={!discoveryInput.trim()}
                      className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-30 transition-colors"
                    >
                      <Plus size={15} />
                    </button>
                  </form>

                  {/* Discoveries List */}
                  {discoveries.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {discoveries.map((disc) => (
                        <div
                          key={disc.id}
                          className="p-3 rounded-2xl bg-amber-500/[0.05] border border-amber-500/20 text-amber-100/90 text-xs leading-relaxed"
                        >
                          <p>{disc.note}</p>
                          <span className="text-[9px] text-amber-400/50 font-mono block mt-1">
                            {new Date(disc.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-white/30 text-xs font-mono">
                      No discoveries logged yet. Record your first insight!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------
              4. BOTTOM TERMINAL: 【检查成品 · 确认完成 (Deliverable Complete)】
              ------------------------------------------------------------- */}
          <div className="relative group">
            <div
              className={`absolute -left-[27px] sm:-left-[31px] top-4 w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-500 z-10 ${
                circuitClosed
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-[#0a1312] text-teal-300/80 border-teal-500/30 shadow-none'
              }`}
            >
              <Award size={14} className={circuitClosed ? 'text-emerald-300' : 'text-teal-300'} />
            </div>

            <div
              className={`glass glass-glow rounded-3xl p-5 border transition-all duration-500 ${
                circuitClosed
                  ? 'border-emerald-500/30 bg-emerald-950/20'
                  : 'border-teal-500/20'
              }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      circuitClosed ? 'bg-emerald-400' : 'bg-teal-400/80'
                    }`}
                  />
                  <span className="text-xs font-mono uppercase tracking-wider text-teal-200/80">
                    ④ Deliverable Check · Complete
                  </span>
                </div>
                <span className="text-[10px] font-mono text-white/40">Full Circuit Loop</span>
              </div>

              {!circuitClosed ? (
                <div className="space-y-4">
                  <p className="text-xs text-white/70 leading-relaxed font-light">
                    Inspect the finished deliverable against the original vision. Once confirmed,
                    closing the loop anchors your achievements and completes this cycle.
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] font-mono text-white/40">
                      {stages.filter((s) => s.status === 'completed').length}/{stages.length} steps completed
                    </span>

                    <button
                      type="button"
                      onClick={handleConfirmDeliverableComplete}
                      disabled={isClosingCircuit}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/50 transition-all active:scale-95"
                    >
                      <CheckCircle2 size={15} />
                      <span>Complete Deliverable</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Closed Circuit State: Archived Deliverable Showcase */
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-teal-950/20 to-purple-950/20 border border-emerald-500/30 text-emerald-200 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <Award size={18} className="text-emerald-400 shrink-0" />
                      <span className="font-semibold text-white tracking-wide">
                        Archived Deliverable Showcase • Cycle #{cycleCount}
                      </span>
                    </div>

                    <p className="text-[11px] text-white/80 italic pl-1 border-l-2 border-emerald-400/50">
                      "{project.vision}"
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-emerald-300/80">
                      <span>✓ {stages.length} Stages Realized</span>
                      <span>• {discoveries.length} Insights Preserved</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => topAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })}
                      className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
                    >
                      <ArrowUp size={13} />
                      <span>Back to Origin Vision</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAdvanceCycle}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-medium bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 transition-all shadow-md shadow-purple-950 active:scale-95"
                    >
                      <RefreshCw size={13} />
                      <span>Start Next Cycle</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SIDE QUEST DRAWER (学习支线独立抽屉)
          Completely decoupled from main quest canvas!
          Slides out from the right on [⚡ Stuck / Need Skill] click.
          ===================================================================== */}
      {activeStageForSideQuest && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={handleCloseSideQuest}
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          />

          {/* Drawer Body */}
          <div className="relative w-full sm:max-w-md h-[100dvh] bg-[#06070e]/98 border-l border-indigo-500/20 shadow-2xl shadow-black flex flex-col z-10 animate-in slide-in-from-right duration-300 backdrop-blur-3xl overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-950/30 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    Side Quest • Skill Tree
                  </h3>
                  <p className="text-[11px] text-indigo-300/70 font-mono truncate max-w-[240px]">
                    Stage: {activeStageForSideQuest.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseSideQuest}
                className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Main Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Context callout */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200/90 leading-relaxed font-light">
                <span className="font-semibold block mb-1 text-indigo-300">
                  ⚡ Roadblock Breakdown (零焦虑学习支线)
                </span>
                Missing a technique or feeling stuck? Complete this mini-quest to acquire the skill, verify with practice, and return to unlock your main quest.
              </div>

              {/* 3-Stage Skill Quest Pathway */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-white/60">
                  <span>Skill Progression</span>
                  <span>Phase {drawerStep}/3</span>
                </div>

                {/* Stepper Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetDrawerStep(1)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      drawerStep === 1
                        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-200'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    <BookOpen size={16} className="mx-auto mb-1 text-indigo-400" />
                    <span className="text-[11px] font-mono block">1. Study</span>
                    <span className="text-[9px] text-white/40 block mt-0.5">Docs & Concept</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetDrawerStep(2)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      drawerStep === 2
                        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-200'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    <Hammer size={16} className="mx-auto mb-1 text-sky-400" />
                    <span className="text-[11px] font-mono block">2. Practice</span>
                    <span className="text-[9px] text-white/40 block mt-0.5">Tiny Prototype</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetDrawerStep(3)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      drawerStep === 3
                        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-200'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    <Swords size={16} className="mx-auto mb-1 text-emerald-400" />
                    <span className="text-[11px] font-mono block">3. Verify</span>
                    <span className="text-[9px] text-white/40 block mt-0.5">Battle Test</span>
                  </button>
                </div>
              </div>

              {/* Note / Cheat Sheet */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-white/70 block">
                  Skill Notes & Verification Takeaway
                </label>
                <textarea
                  value={drawerNote}
                  onChange={(e) => setDrawerNote(e.target.value)}
                  placeholder="Record essential syntax, API insight, or sandbox result..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 resize-none min-h-[110px]"
                />
              </div>

              {/* Mastered Status Indicator if already verified */}
              {activeStageForSideQuest.learningBranch?.verified && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>This skill has been mastered and verified for this stage.</span>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-5 border-t border-white/10 bg-[#070913] space-y-2">
              <button
                type="button"
                onClick={handleVerifyAndUnlock}
                className="w-full py-3 px-4 rounded-2xl text-xs font-medium bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white shadow-lg shadow-indigo-950 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Sparkles size={14} />
                <span>Verify & Unlock Main Quest Stage</span>
              </button>

              <button
                type="button"
                onClick={handleCloseSideQuest}
                className="w-full py-2 rounded-xl text-xs text-white/40 hover:text-white transition-colors"
              >
                Keep Exploring Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DECONSTRUCT STAGNATION RELIEF MODAL (减压拆解建议)
          ===================================================================== */}
      {stageToDeconstruct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="w-full max-w-md glass glass-glow rounded-3xl p-6 border border-purple-500/40 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-purple-300">
                <Flame size={16} />
                <h3 className="text-sm font-semibold text-white">Stagnation Relief</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeconstructStageId(null)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-white/80 leading-relaxed font-light">
              Feeling friction starting <span className="text-purple-200 font-medium">"{stageToDeconstruct.name}"</span>?
              Let's convert it into 3 microscopic 5-minute easy actions:
            </p>

            <div className="space-y-2">
              {[
                `Draft a 3-bullet concept outline for ${stageToDeconstruct.name}`,
                `Find 1 visual reference or code snippet`,
                `Make 1 smallest test edit in sandbox`,
              ].map((stepText, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-white/90"
                >
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-mono shrink-0">
                    {idx + 1}
                  </span>
                  <span>{stepText}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeconstructStageId(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-white/50 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAdoptDeconstructSteps([
                    `Draft a 3-bullet concept outline for ${stageToDeconstruct.name}`,
                    `Find 1 visual reference or code snippet`,
                    `Make 1 smallest test edit in sandbox`,
                  ])
                }
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950 transition-all active:scale-95"
              >
                <Sparkles size={13} />
                <span>Adopt Micro Actions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
