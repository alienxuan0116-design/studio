import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Sparkles,
  Plus,
  CheckCircle2,
  Check,
  Pencil,
  X,
  Scroll,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Trash2,
  Award,
  Layers,
  Clock,
  BookOpen,
  ExternalLink,
  Bookmark,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import {
  getProject,
  updateProject,
  addProjectDiscovery,
  toggleStageStatus,
  addPartSubtask,
  togglePartSubtask,
  deletePartSubtask,
  toggleSubtaskFocus,
  updateSubtaskTime,
  updatePartSubtask,
  loadProjects,
  linkProjectCategory,
  unlinkProjectCategory,
} from '@/lib/projects';
import {
  loadCategories,
  getSkillsByProjectId,
  addSkill,
  type BroadCategory,
  type SkillMastery,
  MASTERY_LABELS,
  MASTERY_COLORS,
} from '@/lib/categories';
import {
  type Project,
  type ProjectStage,
  type PartSubtask,
  type SubtaskDifficulty,
  DIFFICULTY_LABELS,
} from '@/data';

interface Props {
  projectId: string;
  onBack: () => void;
  onOpenResearch?: (partId: string, subtaskId: string) => void;
  onOpenCategory?: (categoryId: string) => void;
}

export default function ProjectDetailPage({
  projectId,
  onBack,
  onOpenResearch,
  onOpenCategory,
}: Props) {
  const [project, setProject] = useState<Project | null>(null);

  // Vision editing state
  const [editingVision, setEditingVision] = useState(false);
  const [visionInput, setVisionInput] = useState('');

  // Adding new Part
  const [addingPart, setAddingPart] = useState(false);
  const [newPartName, setNewPartName] = useState('');

  // Editing existing Part name
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [partNameEdit, setPartNameEdit] = useState('');

  // Adding subtask inside a specific Part
  const [addingSubtaskPartId, setAddingSubtaskPartId] = useState<string | null>(null);
  const [subtaskMode, setSubtaskMode] = useState<'regular' | 'research'>('regular');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newResearchQuestion, setNewResearchQuestion] = useState('');
  const [newSubtaskDate, setNewSubtaskDate] = useState('');
  const [newSubtaskTime, setNewSubtaskTime] = useState('');
  const [newSubtaskDifficulty, setNewSubtaskDifficulty] = useState<SubtaskDifficulty>('medium');
  const [newSubtaskInFocus, setNewSubtaskInFocus] = useState(false);

  // Editing existing subtask
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<SubtaskDifficulty>('medium');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  // Discoveries Journal collapsible drawer state
  const [journalOpen, setJournalOpen] = useState(false);
  const [discoveryInput, setDiscoveryInput] = useState('');

  // Broad categories & skills linked to this project
  const [allCategories, setAllCategories] = useState<BroadCategory[]>(() => loadCategories());
  const [projectSkills, setProjectSkills] = useState(() => getSkillsByProjectId(projectId));
  const [linkingCategory, setLinkingCategory] = useState(false);

  // Quick record skill modal
  const [recordingSkill, setRecordingSkill] = useState(false);
  const [skillCatId, setSkillCatId] = useState('');
  const [skillModId, setSkillModId] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillNotes, setSkillNotes] = useState('');
  const [skillMastery, setSkillMastery] = useState<SkillMastery>('practicing');

  const topAnchorRef = useRef<HTMLDivElement>(null);

  const refreshProject = () => {
    const p = getProject(projectId);
    setProject(p);
    if (p?.vision) {
      setVisionInput(p.vision);
    }
    setAllCategories(loadCategories());
    setProjectSkills(getSkillsByProjectId(projectId));
  };

  useEffect(() => {
    refreshProject();
    const handleCatsChanged = () => {
      setAllCategories(loadCategories());
      setProjectSkills(getSkillsByProjectId(projectId));
    };
    window.addEventListener('studio_os_categories_changed', handleCatsChanged);
    return () => window.removeEventListener('studio_os_categories_changed', handleCatsChanged);
  }, [projectId]);

  if (!project) {
    return (
      <PageShell title="Project" onBack={onBack}>
        <div className="py-24 text-center text-white/40 text-xs">Project not found</div>
      </PageShell>
    );
  }

  const parts = project.stages || [];
  const discoveries = project.discoveries || [];
  const isCompleted = project.status === 'completed';

  // Save vision
  const handleSaveVision = () => {
    if (!visionInput.trim()) return;
    const updated = updateProject(project.id, { vision: visionInput.trim() });
    if (updated) {
      setProject(updated);
      setEditingVision(false);
    }
  };

  // Toggle Part status (pending -> in_progress -> completed)
  const handleTogglePartStatus = (partId: string) => {
    const updated = toggleStageStatus(project.id, partId);
    if (updated) setProject(updated);
  };

  // Toggle Part priority
  const handleTogglePartPriority = (partId: string) => {
    if (!project.stages) return;
    const nextStages = project.stages.map((s) =>
      s.id === partId ? { ...s, is_priority: !s.is_priority } : s
    );
    const updated = updateProject(project.id, { stages: nextStages });
    if (updated) setProject(updated);
  };

  // Rename Part
  const handleStartEditPart = (part: ProjectStage) => {
    setEditingPartId(part.id);
    setPartNameEdit(part.name);
  };

  const handleSavePartName = (partId: string) => {
    if (!partNameEdit.trim() || !project.stages) return;
    const nextStages = project.stages.map((s) =>
      s.id === partId ? { ...s, name: partNameEdit.trim() } : s
    );
    const updated = updateProject(project.id, { stages: nextStages });
    if (updated) setProject(updated);
    setEditingPartId(null);
  };

  // Add Part
  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim() || !project.stages) return;
    const nextStages: ProjectStage[] = [
      ...project.stages,
      {
        id: `stage-${Date.now()}`,
        name: newPartName.trim(),
        status: 'pending',
        priority: 'medium',
        subtasks: [],
      },
    ];
    const updated = updateProject(project.id, { stages: nextStages });
    if (updated) setProject(updated);
    setNewPartName('');
    setAddingPart(false);
  };

  // Add subtask (regular or research) to a Part
  const handleCreateSubtask = (partId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (subtaskMode === 'regular') {
      if (!newSubtaskTitle.trim()) return;
      addPartSubtask(project.id, partId, {
        title: newSubtaskTitle.trim(),
        type: 'regular',
        time: newSubtaskTime || undefined,
        due_date: newSubtaskDate || undefined,
        difficulty: newSubtaskDifficulty,
        in_today_focus: newSubtaskInFocus,
      });
    } else {
      if (!newSubtaskTitle.trim() && !newResearchQuestion.trim()) return;
      const title = newSubtaskTitle.trim() || newResearchQuestion.trim();
      const question = newResearchQuestion.trim() || title;
      const res = addPartSubtask(project.id, partId, {
        title,
        type: 'research',
        question,
        time: newSubtaskTime || undefined,
        due_date: newSubtaskDate || undefined,
        difficulty: newSubtaskDifficulty,
        in_today_focus: newSubtaskInFocus,
      });
      // Optionally open the research page immediately if created
      if (res && onOpenResearch) {
        onOpenResearch(partId, res.subtask.id);
      }
    }
    setNewSubtaskTitle('');
    setNewResearchQuestion('');
    setNewSubtaskDate('');
    setNewSubtaskTime('');
    setNewSubtaskDifficulty('medium');
    setNewSubtaskInFocus(false);
    setAddingSubtaskPartId(null);
    refreshProject();
  };

  // Toggle subtask done
  const handleToggleSubtask = (partId: string, subtaskId: string) => {
    togglePartSubtask(project.id, partId, subtaskId);
    refreshProject();
  };

  // Toggle subtask in Today's Focus
  const handleToggleFocus = (partId: string, subtaskId: string) => {
    toggleSubtaskFocus(project.id, partId, subtaskId);
    refreshProject();
  };

  // Start editing existing subtask (with complete echo back)
  const handleStartEditSubtask = (sub: PartSubtask) => {
    setEditingSubtaskId(sub.id);
    setEditTitle(sub.title);
    setEditDifficulty(sub.difficulty || 'medium');
    setEditDate(sub.due_date || '');
    setEditTime(sub.time || '');
  };

  // Save edited subtask
  const handleSaveEditSubtask = (partId: string, subtaskId: string) => {
    if (!editTitle.trim()) return;
    updatePartSubtask(project.id, partId, subtaskId, {
      title: editTitle.trim(),
      difficulty: editDifficulty,
      due_date: editDate.trim() || undefined,
      time: editTime.trim() || undefined,
    });
    setEditingSubtaskId(null);
    refreshProject();
  };

  // Delete subtask
  const handleDeleteSubtask = (partId: string, subtaskId: string) => {
    deletePartSubtask(project.id, partId, subtaskId);
    refreshProject();
  };

  // Add discovery to journal
  const handleAddDiscovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discoveryInput.trim()) return;
    const updated = addProjectDiscovery(project.id, discoveryInput.trim());
    if (updated) setProject(updated);
    setDiscoveryInput('');
  };

  // Mark Deliverable Complete
  const handleCompleteDeliverable = () => {
    const updated = updateProject(project.id, {
      status: 'completed',
      progress: 100,
      completedAt: Date.now(),
    });
    if (updated) setProject(updated);
  };

  // Toggle linking category to project
  const handleToggleCategoryLink = (catId: string) => {
    if (!project) return;
    const current = project.category_ids || [];
    if (current.includes(catId)) {
      unlinkProjectCategory(project.id, catId);
    } else {
      linkProjectCategory(project.id, catId);
    }
    refreshProject();
  };

  // Open skill recording modal
  const handleOpenRecordSkillModal = () => {
    const defaultCatId = project?.category_ids?.[0] || allCategories[0]?.id || '';
    setSkillCatId(defaultCatId);
    const cat = allCategories.find((c) => c.id === defaultCatId);
    setSkillModId(cat?.modules?.[0]?.id || '');
    setSkillName('');
    setSkillNotes('');
    setSkillMastery('practicing');
    setRecordingSkill(true);
  };

  // Submit recorded skill
  const handleRecordSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !skillCatId || !skillModId || !skillName.trim()) return;
    addSkill(skillCatId, skillModId, {
      name: skillName.trim(),
      notes: skillNotes.trim() || undefined,
      mastery: skillMastery,
      source: `Deliverable "${project.name}" practice`,
      source_project_id: project.id,
      source_project_name: project.name,
    });
    setRecordingSkill(false);
    refreshProject();
  };

  return (
    <PageShell title={project.name} onBack={onBack}>
      <div className="relative max-w-xl mx-auto pb-32">
        {/* =====================================================================
            TOP HUD: OVERVIEW & PROGRESS BAR
            ===================================================================== */}
        <div
          ref={topAnchorRef}
          className="glass glass-glow rounded-3xl p-5 border border-white/10 mb-8 sticky top-16 z-20 backdrop-blur-2xl transition-all duration-300"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                    : 'bg-white/5 text-white/80 border border-white/10'
                }`}
              >
                <Layers size={13} className={isCompleted ? 'text-emerald-300' : 'text-purple-400'} />
                <span>{parts.length} Parts</span>
                {isCompleted && (
                  <span className="ml-1 text-[10px] tracking-wide uppercase text-emerald-400 font-semibold">• Completed</span>
                )}
              </span>

              <span className="text-[11px] font-mono uppercase tracking-wider text-white/40 hidden sm:inline">
                Production Line
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-white/90">
                {project.progress}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-3.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : `bg-gradient-to-r ${project.accent}`
              }`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* =====================================================================
            MAIN CONTENT CANVAS
            ===================================================================== */}
        <div className="space-y-8">
          {/* -------------------------------------------------------------
              1. DELIVERABLE VISION (成品的想象)
              ------------------------------------------------------------- */}
          <div className="glass glass-glow rounded-3xl p-5 border border-purple-500/20 transition-all">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-purple-200">
                  Deliverable Vision
                </span>
              </div>

              <div>
                {!editingVision ? (
                  <button
                    type="button"
                    onClick={() => setEditingVision(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingVision(false)}
                    className="p-1 rounded-lg text-white/40 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {!editingVision ? (
              <p className="text-xs text-white/90 leading-relaxed font-light italic">
                "{project.vision || 'No vision statement defined yet.'}"
              </p>
            ) : (
              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={visionInput}
                  onChange={(e) => setVisionInput(e.target.value)}
                  placeholder="What does the finished product look and feel like?"
                  className="w-full bg-white/5 border border-purple-500/30 rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 resize-none leading-relaxed"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingVision(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-white/40 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveVision}
                    className="px-4 py-1.5 rounded-xl text-xs font-medium bg-purple-600/60 hover:bg-purple-600 text-white transition-colors"
                  >
                    Save Vision
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------------
              1.5. LINKED MAJOR CATEGORIES & ACCUMULATED SKILLS
              ------------------------------------------------------------- */}
          <div className="glass glass-glow rounded-3xl p-5 border border-amber-500/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-amber-200">
                  Linked Categories & Skills
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLinkingCategory(!linkingCategory)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  <BookOpen size={11} />
                  <span>{linkingCategory ? 'Done' : 'Manage'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenRecordSkillModal}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-medium text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/35 transition-colors shadow-sm"
                >
                  <Plus size={12} />
                  <span>Log Skill</span>
                </button>
              </div>
            </div>

            {/* Linked Broad Categories Chips */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono text-white/40">Linked:</span>
                {(project.category_ids || []).length === 0 ? (
                  <span className="text-[11px] font-mono text-white/30 italic">No categories linked yet</span>
                ) : (
                  (project.category_ids || []).map((catId) => {
                    const cat = allCategories.find((c) => c.id === catId);
                    if (!cat) return null;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => onOpenCategory?.(cat.id)}
                        title={`Open "${cat.name}" category`}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono border transition-all ${
                          cat.accent
                            ? `bg-gradient-to-r ${cat.accent} text-white shadow-md shadow-black/20 hover:opacity-90`
                            : 'bg-amber-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500/30'
                        }`}
                      >
                        <BookOpen size={12} />
                        <span>{cat.name}</span>
                        <ExternalLink size={10} className="opacity-70" />
                      </button>
                    );
                  })
                )}
              </div>

              {/* Category Linking Selector Drawer */}
              {linkingCategory && (
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                  <div className="text-[11px] font-mono text-white/50">
                    Select categories linked to this deliverable:
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {allCategories.map((cat) => {
                      const isLinked = (project.category_ids || []).includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleToggleCategoryLink(cat.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-mono text-xs border transition-all ${
                            isLinked
                              ? 'bg-amber-500/25 border-amber-500/50 text-amber-200 font-medium'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                          }`}
                        >
                          {isLinked ? <Check size={12} className="text-amber-300" /> : <Plus size={12} />}
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Accumulated Skills Learned from this Project */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-mono text-white/50 flex items-center justify-between">
                <span>Skills logged from this deliverable ({projectSkills.length}):</span>
                {projectSkills.length > 0 && (
                  <span className="text-[10px] text-white/30">Click to view in category</span>
                )}
              </div>

              {projectSkills.length === 0 ? (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/30 text-center font-mono">
                  Skills acquired during production can be logged to a category module using "Log Skill" above.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {projectSkills.map(({ category: cat, module: mod, skill }) => {
                    const masteryConfig = MASTERY_COLORS[skill.mastery] || MASTERY_COLORS.practicing;
                    return (
                      <div
                        key={skill.id}
                        onClick={() => onOpenCategory?.(cat.id)}
                        className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-medium text-white/95 group-hover:text-amber-200 transition-colors truncate">
                            {skill.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono border shrink-0 ${masteryConfig.bg} ${masteryConfig.text} ${masteryConfig.border}`}
                          >
                            {MASTERY_LABELS[skill.mastery]}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-white/40 mt-1 truncate">
                          {cat.name} · {mod.name}
                        </div>
                        {skill.notes && (
                          <p className="text-[11px] text-white/60 line-clamp-2 mt-1 leading-snug">
                            {skill.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------
              2. PRODUCTION PARTS (制作主线 / Parts)
              ------------------------------------------------------------- */}
          <div className="glass glass-glow rounded-3xl p-5 border border-sky-500/15 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-sky-200">
                  Parts of the Work ({parts.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAddingPart(!addingPart)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs bg-sky-600/30 text-sky-200 border border-sky-500/30 hover:bg-sky-600/50 transition-colors"
              >
                <Plus size={14} />
                <span>Add Part</span>
              </button>
            </div>

            {/* Add Part Form */}
            {addingPart && (
              <form onSubmit={handleAddPart} className="flex items-center gap-2 pt-1 pb-2">
                <input
                  type="text"
                  autoFocus
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  placeholder="Part name (e.g. Navigation Architecture, Sound Design, Physics Engine)..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  disabled={!newPartName.trim()}
                  className="px-4 py-2 rounded-xl text-xs bg-sky-600 text-white font-medium disabled:opacity-30 transition-colors"
                >
                  Create Part
                </button>
                <button
                  type="button"
                  onClick={() => setAddingPart(false)}
                  className="p-2 rounded-xl text-white/40 hover:text-white"
                >
                  <X size={15} />
                </button>
              </form>
            )}

            {/* Parts List */}
            <div className="space-y-4 pt-1">
              {parts.map((part) => {
                const isPartCompleted = part.status === 'completed';
                const isPartInProgress = part.status === 'in_progress';
                const isPriority = Boolean(part.is_priority);
                const isEditingThisPart = editingPartId === part.id;
                const isAddingSubtaskHere = addingSubtaskPartId === part.id;
                const subtasks = part.subtasks || [];
                const completedSubtasks = subtasks.filter((s) => s.done).length;

                return (
                  <div
                    key={part.id}
                    className={`rounded-2xl border transition-all p-4 ${
                      isPriority
                        ? 'bg-purple-950/20 border-purple-500/30'
                        : isPartCompleted
                        ? 'bg-emerald-950/15 border-emerald-500/20'
                        : isPartInProgress
                        ? 'bg-sky-950/15 border-sky-500/20'
                        : 'glass border-white/5'
                    }`}
                  >
                    {/* Part Header Row */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Status Check Circle */}
                        <button
                          type="button"
                          onClick={() => handleTogglePartStatus(part.id)}
                          aria-label="Toggle part status"
                          className="flex-shrink-0"
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                              isPartCompleted
                                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-500/40 text-black'
                                : isPartInProgress
                                ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                                : 'border-white/20 bg-white/5 hover:border-white/40 text-white/40'
                            }`}
                          >
                            {isPartCompleted ? (
                              <Check size={12} strokeWidth={3} />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            )}
                          </span>
                        </button>

                        {/* Part Name */}
                        <div className="flex-1 min-w-0">
                          {!isEditingThisPart ? (
                            <span
                              onClick={() => handleTogglePartStatus(part.id)}
                              className={`text-sm font-medium leading-none cursor-pointer truncate block ${
                                isPartCompleted
                                  ? 'text-white/40 line-through'
                                  : isPriority
                                  ? 'text-purple-100'
                                  : 'text-white/95'
                              }`}
                            >
                              {part.name}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                autoFocus
                                value={partNameEdit}
                                onChange={(e) => setPartNameEdit(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSavePartName(part.id)}
                                className="bg-white/10 border border-purple-400 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleSavePartName(part.id)}
                                className="p-1 text-purple-300 hover:text-white"
                              >
                                <Check size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Status Pill */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider shrink-0 ${
                            isPartCompleted
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isPartInProgress
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-white/5 text-white/40 border border-white/10'
                          }`}
                        >
                          {part.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Header Actions: Priority & Rename */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePartPriority(part.id)}
                          title={isPriority ? 'Remove priority' : 'Mark priority'}
                          className={`p-1.5 rounded-xl transition-all ${
                            isPriority
                              ? 'text-purple-300 bg-purple-500/25'
                              : 'text-white/30 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Sparkles size={13} className={isPriority ? 'fill-purple-400' : ''} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEditPart(part)}
                          title="Rename part"
                          className="p-1.5 rounded-xl text-white/35 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Subtasks Section for this Part */}
                    <div className="pl-8 pt-1 space-y-2">
                      {subtasks.length > 0 && (
                        <div className="space-y-1.5">
                          {subtasks.map((sub) => {
                            const isResearch = sub.type === 'research';
                            const methods = sub.research?.methods || [];
                            const hasSuccess = methods.some((m) => m.status === 'success');

                            const isEditing = editingSubtaskId === sub.id;

                            if (isEditing) {
                              return (
                                <div
                                  key={sub.id}
                                  className="p-3 rounded-2xl border border-purple-500/40 bg-purple-950/20 space-y-3 animate-in fade-in duration-150"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-mono text-purple-200 uppercase tracking-wider">
                                      Edit {isResearch ? 'Research Sub-task' : 'Sub-task'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSubtaskId(null)}
                                      className="text-white/40 hover:text-white"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>

                                  <input
                                    type="text"
                                    autoFocus
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                                    placeholder="Sub-task title..."
                                  />

                                  {/* Difficulty selection: low, medium, high */}
                                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                                    <span className="text-[10px] font-mono text-white/50">Difficulty:</span>
                                    <div className="flex items-center gap-1">
                                      {(['low', 'medium', 'high'] as const).map((level) => {
                                        const isSel = editDifficulty === level;
                                        return (
                                          <button
                                            key={level}
                                            type="button"
                                            onClick={() => setEditDifficulty(level)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                                              isSel
                                                ? level === 'low'
                                                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 font-bold'
                                                  : level === 'medium'
                                                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 font-bold'
                                                  : 'bg-rose-500/25 text-rose-300 border-rose-500/40 font-bold'
                                                : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
                                            }`}
                                          >
                                            {DIFFICULTY_LABELS[level]}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Date and Time */}
                                  <div className="flex items-center gap-3 pt-1 flex-wrap text-[11px] text-white/50">
                                    <div className="flex items-center gap-1.5">
                                      <span>Date:</span>
                                      <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-purple-400"
                                      />
                                      {editDate && (
                                        <button
                                          type="button"
                                          onClick={() => setEditDate('')}
                                          className="text-white/30 hover:text-white"
                                          title="Clear date"
                                        >
                                          <X size={10} />
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <Clock size={11} className="text-sky-400" />
                                      <span>Time:</span>
                                      <input
                                        type="time"
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-purple-400"
                                      />
                                      {editTime && (
                                        <button
                                          type="button"
                                          onClick={() => setEditTime('')}
                                          className="text-white/30 hover:text-white"
                                          title="Clear time"
                                        >
                                          <X size={10} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                                    <button
                                      type="button"
                                      onClick={() => setEditingSubtaskId(null)}
                                      className="px-2.5 py-1 text-xs text-white/40 hover:text-white"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditSubtask(part.id, sub.id)}
                                      disabled={!editTitle.trim()}
                                      className="px-3.5 py-1 rounded-xl text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium disabled:opacity-30"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={sub.id}
                                className={`p-2.5 rounded-xl border text-xs transition-colors ${
                                  isResearch
                                    ? 'bg-indigo-950/20 border-indigo-500/30 hover:border-indigo-500/50'
                                    : 'bg-white/[0.03] border-white/5 hover:border-white/10'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-1">
                                    {/* Checkbox for regular or research completion */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleSubtask(part.id, sub.id);
                                      }}
                                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                                        sub.done
                                          ? 'bg-emerald-600 border-emerald-500 text-white'
                                          : 'border-white/30 hover:border-white/60 bg-white/5'
                                      }`}
                                    >
                                      {sub.done && <Check size={10} strokeWidth={3} />}
                                    </button>

                                    {/* Subtask Title & Badges */}
                                    <div
                                      className={`flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden ${
                                        isResearch ? 'cursor-pointer' : ''
                                      }`}
                                      onClick={() => {
                                        if (isResearch && onOpenResearch) {
                                          onOpenResearch(part.id, sub.id);
                                        }
                                      }}
                                    >
                                      {isResearch && (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                          <FlaskConical size={10} />
                                          <span>Research</span>
                                        </span>
                                      )}

                                      <span
                                        className={`truncate ${
                                          sub.done ? 'line-through text-white/40' : 'text-white/90'
                                        }`}
                                      >
                                        {sub.title}
                                      </span>

                                      {/* Difficulty Badge: Easy, Medium, Hard */}
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono border shrink-0 ${
                                          sub.difficulty === 'low'
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                            : sub.difficulty === 'high'
                                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        }`}
                                      >
                                        {DIFFICULTY_LABELS[sub.difficulty || 'medium']}
                                      </span>

                                      {/* Date & Time Badges */}
                                      {sub.due_date && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-white/60 border border-white/10 shrink-0">
                                          {sub.due_date.slice(5)}
                                        </span>
                                      )}
                                      {sub.time && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-500/15 text-sky-300 border border-sky-500/25 shrink-0 flex items-center gap-1">
                                          <Clock size={9} />
                                          <span>{sub.time}</span>
                                        </span>
                                      )}

                                      {isResearch && methods.length > 0 && (
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 ${
                                            hasSuccess
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                              : 'bg-white/5 text-white/40'
                                          }`}
                                        >
                                          {hasSuccess ? 'Success' : `${methods.length} methods`}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Edit Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditSubtask(sub);
                                      }}
                                      title="Edit subtask"
                                      className="p-1 rounded text-white/30 hover:text-white hover:bg-white/5 transition-all"
                                    >
                                      <Pencil size={11} />
                                    </button>

                                    {/* Today's Focus toggle */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFocus(part.id, sub.id);
                                      }}
                                      title={
                                        sub.in_today_focus
                                          ? "In Today's Focus (Click to remove)"
                                          : "Add to Today's Focus"
                                      }
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all ${
                                        sub.in_today_focus
                                          ? 'bg-purple-500/25 border border-purple-500/40 text-purple-200 hover:bg-purple-500/35'
                                          : 'text-white/40 hover:text-purple-300 hover:bg-purple-500/10 border border-transparent'
                                      }`}
                                    >
                                      <Sparkles
                                        size={10}
                                        className={sub.in_today_focus ? 'fill-purple-300 text-purple-300' : ''}
                                      />
                                      <span>{sub.in_today_focus ? 'Focus' : '+ Focus'}</span>
                                    </button>

                                    {isResearch && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (onOpenResearch) onOpenResearch(part.id, sub.id);
                                        }}
                                        className="text-[10px] text-indigo-300 hover:text-indigo-100 font-mono px-1 py-0.5"
                                      >
                                        Open ➔
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSubtask(part.id, sub.id);
                                      }}
                                      className="p-1 rounded text-white/30 hover:text-rose-400 transition-colors"
                                      title="Delete subtask"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Subtask Entry Controls */}
                      {!isAddingSubtaskHere ? (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAddingSubtaskPartId(part.id);
                              setSubtaskMode('regular');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Plus size={12} />
                            <span>Sub-task</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAddingSubtaskPartId(part.id);
                              setSubtaskMode('research');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-indigo-300/80 hover:text-indigo-200 hover:bg-indigo-500/10 border border-indigo-500/20 transition-colors"
                          >
                            <FlaskConical size={12} />
                            <span>Research Sub-task</span>
                          </button>
                        </div>
                      ) : (
                        <form
                          onSubmit={(e) => handleCreateSubtask(part.id, e)}
                          className="pt-2 pb-1 space-y-2 animate-in fade-in duration-150"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSubtaskMode('regular')}
                                className={`px-2 py-0.5 rounded ${
                                  subtaskMode === 'regular'
                                    ? 'bg-white/20 text-white font-medium'
                                    : 'text-white/40 hover:text-white'
                                }`}
                              >
                                Regular Task
                              </button>
                              <button
                                type="button"
                                onClick={() => setSubtaskMode('research')}
                                className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                                  subtaskMode === 'research'
                                    ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 font-medium'
                                    : 'text-white/40 hover:text-indigo-300'
                                }`}
                              >
                                <FlaskConical size={11} />
                                <span>Research Task</span>
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAddingSubtaskPartId(null)}
                              className="text-white/40 hover:text-white"
                            >
                              <X size={13} />
                            </button>
                          </div>

                          {subtaskMode === 'regular' ? (
                            <div className="space-y-2.5 bg-white/[0.02] border border-white/10 p-3 rounded-2xl">
                              <input
                                type="text"
                                autoFocus
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                placeholder="Sub-task description..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-sky-400"
                              />

                              {/* Difficulty: low, medium, high */}
                              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                <span className="text-[10px] font-mono text-white/50">Difficulty:</span>
                                <div className="flex items-center gap-1">
                                  {(['low', 'medium', 'high'] as const).map((level) => {
                                    const isSel = newSubtaskDifficulty === level;
                                    return (
                                      <button
                                        key={level}
                                        type="button"
                                        onClick={() => setNewSubtaskDifficulty(level)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                                          isSel
                                            ? level === 'low'
                                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 font-bold'
                                              : level === 'medium'
                                              ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 font-bold'
                                              : 'bg-rose-500/25 text-rose-300 border-rose-500/40 font-bold'
                                            : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
                                        }`}
                                      >
                                        {DIFFICULTY_LABELS[level]}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Date */}
                                  <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                                    <span>Date:</span>
                                    <input
                                      type="date"
                                      value={newSubtaskDate}
                                      onChange={(e) => setNewSubtaskDate(e.target.value)}
                                      className="bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-sky-400"
                                    />
                                    {newSubtaskDate && (
                                      <button
                                        type="button"
                                        onClick={() => setNewSubtaskDate('')}
                                        className="text-white/30 hover:text-white"
                                        title="Clear date"
                                      >
                                        <X size={10} />
                                      </button>
                                    )}
                                  </div>

                                  {/* Time */}
                                  <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                                    <Clock size={12} className="text-sky-400" />
                                    <span>Time:</span>
                                    <input
                                      type="time"
                                      value={newSubtaskTime}
                                      onChange={(e) => setNewSubtaskTime(e.target.value)}
                                      className="bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-sky-400"
                                    />
                                    {newSubtaskTime && (
                                      <button
                                        type="button"
                                        onClick={() => setNewSubtaskTime('')}
                                        className="text-white/30 hover:text-white"
                                        title="Clear time"
                                      >
                                        <X size={10} />
                                      </button>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setNewSubtaskInFocus(!newSubtaskInFocus)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all ${
                                      newSubtaskInFocus
                                        ? 'bg-purple-500/25 border border-purple-500/40 text-purple-200'
                                        : 'text-white/40 hover:text-white border border-white/10'
                                    }`}
                                  >
                                    <Sparkles size={10} className={newSubtaskInFocus ? 'fill-purple-300' : ''} />
                                    <span>Today's Focus</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setAddingSubtaskPartId(null)}
                                    className="px-2.5 py-1 text-xs text-white/40 hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={!newSubtaskTitle.trim()}
                                    className="px-3 py-1.5 rounded-xl text-xs bg-sky-600 hover:bg-sky-500 text-white font-medium disabled:opacity-30"
                                  >
                                    Add Task
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2.5 bg-indigo-950/20 border border-indigo-500/25 p-3 rounded-2xl">
                              <input
                                type="text"
                                autoFocus
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                placeholder="Research title (e.g. Memory profiling on low-end devices)..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-400"
                              />
                              <input
                                type="text"
                                value={newResearchQuestion}
                                onChange={(e) => setNewResearchQuestion(e.target.value)}
                                placeholder="Initial question / hypothesis..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-400"
                              />

                              {/* Difficulty: low, medium, high */}
                              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                <span className="text-[10px] font-mono text-indigo-300/60">Difficulty:</span>
                                <div className="flex items-center gap-1">
                                  {(['low', 'medium', 'high'] as const).map((level) => {
                                    const isSel = newSubtaskDifficulty === level;
                                    return (
                                      <button
                                        key={level}
                                        type="button"
                                        onClick={() => setNewSubtaskDifficulty(level)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                                          isSel
                                            ? level === 'low'
                                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 font-bold'
                                              : level === 'medium'
                                              ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 font-bold'
                                              : 'bg-rose-500/25 text-rose-300 border-rose-500/40 font-bold'
                                            : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
                                        }`}
                                      >
                                        {DIFFICULTY_LABELS[level]}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Date */}
                                  <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                                    <span>Date:</span>
                                    <input
                                      type="date"
                                      value={newSubtaskDate}
                                      onChange={(e) => setNewSubtaskDate(e.target.value)}
                                      className="bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                                    />
                                    {newSubtaskDate && (
                                      <button
                                        type="button"
                                        onClick={() => setNewSubtaskDate('')}
                                        className="text-white/30 hover:text-white"
                                        title="Clear date"
                                      >
                                        <X size={10} />
                                      </button>
                                    )}
                                  </div>

                                  {/* Time */}
                                  <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                                    <Clock size={12} className="text-indigo-400" />
                                    <span>Time:</span>
                                    <input
                                      type="time"
                                      value={newSubtaskTime}
                                      onChange={(e) => setNewSubtaskTime(e.target.value)}
                                      className="bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                                    />
                                    {newSubtaskTime && (
                                      <button
                                        type="button"
                                        onClick={() => setNewSubtaskTime('')}
                                        className="text-white/30 hover:text-white"
                                        title="Clear time"
                                      >
                                        <X size={10} />
                                      </button>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setNewSubtaskInFocus(!newSubtaskInFocus)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all ${
                                      newSubtaskInFocus
                                        ? 'bg-purple-500/25 border border-purple-500/40 text-purple-200'
                                        : 'text-white/40 hover:text-white border border-white/10'
                                    }`}
                                  >
                                    <Sparkles size={10} className={newSubtaskInFocus ? 'fill-purple-300' : ''} />
                                    <span>Today's Focus</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setAddingSubtaskPartId(null)}
                                    className="px-2.5 py-1 text-xs text-white/40 hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={!newSubtaskTitle.trim() && !newResearchQuestion.trim()}
                                    className="px-3.5 py-1.5 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-30 flex items-center gap-1.5"
                                  >
                                    <FlaskConical size={12} />
                                    <span>Create Research</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------------
              3. DISCOVERIES JOURNAL DRAWER (探路日志)
              ------------------------------------------------------------- */}
          <div className="glass glass-glow rounded-3xl p-5 border border-amber-500/20 space-y-3">
            <div
              onClick={() => setJournalOpen(!journalOpen)}
              className="flex items-center justify-between cursor-pointer select-none group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-amber-200">
                  Discoveries & Pitfalls Journal
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-mono border border-amber-500/25">
                  {discoveries.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white transition-colors">
                <span className="text-[11px] font-mono hidden sm:inline">
                  {journalOpen ? 'Collapse' : 'Expand'}
                </span>
                {journalOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </div>

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

          {/* -------------------------------------------------------------
              4. DELIVERABLE COMPLETION CHECK
              ------------------------------------------------------------- */}
          <div className="glass glass-glow rounded-3xl p-5 border border-teal-500/20 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isCompleted ? 'bg-emerald-400' : 'bg-teal-400'
                  }`}
                />
                <span className="text-xs font-mono uppercase tracking-wider text-teal-200">
                  Deliverable Check
                </span>
              </div>
              <span className="text-[10px] font-mono text-white/40">
                {parts.filter((s) => s.status === 'completed').length}/{parts.length} parts completed
              </span>
            </div>

            {!isCompleted ? (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-white/70 leading-relaxed font-light">
                  Inspect the finished work against your deliverable vision.
                </p>
                <button
                  type="button"
                  onClick={handleCompleteDeliverable}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/50 transition-all active:scale-95 shrink-0"
                >
                  <CheckCircle2 size={15} />
                  <span>Complete Deliverable</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Award size={18} className="text-emerald-400" />
                  <span>Deliverable successfully completed and archived.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Record Skill Modal */}
        {recordingSkill && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setRecordingSkill(false)}
          >
            <form
              onSubmit={handleRecordSkillSubmit}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass glass-glow rounded-3xl p-5 border border-amber-500/30 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-200">
                  Log Skill to Category
                </span>
                <button
                  type="button"
                  onClick={() => setRecordingSkill(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Target Category & Module */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-white/50 block mb-1">Target Category:</span>
                  <select
                    value={skillCatId}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setSkillCatId(newCat);
                      const cat = allCategories.find((c) => c.id === newCat);
                      setSkillModId(cat?.modules?.[0]?.id || '');
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-white/50 block mb-1">Learning Module:</span>
                  <select
                    value={skillModId}
                    onChange={(e) => setSkillModId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {(allCategories.find((c) => c.id === skillCatId)?.modules || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-white/60 block mb-1">
                  Skill Name (required)
                </label>
                <input
                  type="text"
                  autoFocus
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g. Acceleration & Deceleration, Expression Dynamics..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Mastery Level Selection */}
              <div>
                <label className="text-[11px] font-mono text-white/60 block mb-1.5">
                  Mastery
                </label>
                <div className="flex items-center gap-1.5">
                  {(['familiar', 'practicing', 'mastered'] as const).map((lvl) => {
                    const isSel = skillMastery === lvl;
                    const cfg = MASTERY_COLORS[lvl];
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSkillMastery(lvl)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                          isSel
                            ? `${cfg.bg} ${cfg.text} ${cfg.border} font-bold shadow-md`
                            : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
                        }`}
                      >
                        {MASTERY_LABELS[lvl]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-white/60 block mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={skillNotes}
                  onChange={(e) => setSkillNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes, key techniques and takeaways from building this deliverable..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>

              <div className="text-[10px] font-mono text-white/40 bg-white/5 p-2 rounded-xl">
                Source will be saved as: Deliverable "{project.name}" practice
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRecordingSkill(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!skillName.trim() || !skillModId}
                  className="px-4 py-1.5 rounded-xl text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-medium"
                >
                  Save Skill
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </PageShell>
  );
}
