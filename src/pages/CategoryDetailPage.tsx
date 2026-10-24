import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
  FolderGit2,
  FileText,
  Bookmark,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import {
  getCategory,
  updateCategory,
  addModule,
  updateModuleName,
  deleteModule,
  reorderModules,
  addSkill,
  updateSkill,
  deleteSkill,
  type BroadCategory,
  type LearningModule,
  type SkillRecord,
  type SkillMastery,
  MASTERY_LABELS,
  MASTERY_COLORS,
} from '@/lib/categories';
import { loadProjects } from '@/lib/projects';
import type { Project } from '@/data';

interface Props {
  categoryId: string;
  onBack: () => void;
  onOpenProject?: (projectId: string) => void;
}

export default function CategoryDetailPage({
  categoryId,
  onBack,
  onOpenProject,
}: Props) {
  const [category, setCategory] = useState<BroadCategory | null>(() => getCategory(categoryId));
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());

  // Adding new module
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');

  // Editing existing module
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleName, setEditModuleName] = useState('');

  // Adding skill into specific module
  const [addingSkillModuleId, setAddingSkillModuleId] = useState<string | null>(null);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillNotes, setNewSkillNotes] = useState('');
  const [newSkillMastery, setNewSkillMastery] = useState<SkillMastery>('practicing');
  const [newSkillSource, setNewSkillSource] = useState('');
  const [newSkillProjectId, setNewSkillProjectId] = useState('');

  // Editing existing skill
  const [editingSkillInfo, setEditingSkillInfo] = useState<{
    moduleId: string;
    skill: SkillRecord;
  } | null>(null);
  const [editSkillName, setEditSkillName] = useState('');
  const [editSkillNotes, setEditSkillNotes] = useState('');
  const [editSkillMastery, setEditSkillMastery] = useState<SkillMastery>('practicing');
  const [editSkillSource, setEditSkillSource] = useState('');
  const [editSkillProjectId, setEditSkillProjectId] = useState('');

  const refresh = () => {
    const updated = getCategory(categoryId);
    setCategory(updated);
    setProjects(loadProjects());
  };

  useEffect(() => {
    refresh();
    window.addEventListener('studio_os_categories_changed', refresh);
    return () => window.removeEventListener('studio_os_categories_changed', refresh);
  }, [categoryId]);

  if (!category) {
    return (
      <PageShell title="Major Category" onBack={onBack}>
        <div className="py-24 text-center text-white/40 text-xs">Category not found or deleted</div>
      </PageShell>
    );
  }

  // Handle module creation
  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;
    addModule(category.id, newModuleName.trim());
    setNewModuleName('');
    setAddingModule(false);
    refresh();
  };

  // Handle module rename
  const handleSaveModuleName = (moduleId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editModuleName.trim()) return;
    updateModuleName(category.id, moduleId, editModuleName.trim());
    setEditingModuleId(null);
    refresh();
  };

  // Handle module delete
  const handleDeleteModule = (moduleId: string, moduleName: string) => {
    if (window.confirm(`Delete learning module "${moduleName}" and all its skills?`)) {
      deleteModule(category.id, moduleId);
      refresh();
    }
  };

  // Handle module reordering
  const handleMoveModule = (index: number, direction: 'up' | 'down') => {
    const modules = [...category.modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;
    const temp = modules[index];
    modules[index] = modules[targetIndex];
    modules[targetIndex] = temp;
    reorderModules(
      category.id,
      modules.map((m) => m.id)
    );
    refresh();
  };

  // Handle skill creation
  const handleCreateSkill = (moduleId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    let sourceProjectName: string | undefined;
    if (newSkillProjectId) {
      const p = projects.find((proj) => proj.id === newSkillProjectId);
      if (p) sourceProjectName = p.name;
    }

    addSkill(category.id, moduleId, {
      name: newSkillName.trim(),
      notes: newSkillNotes.trim() || undefined,
      mastery: newSkillMastery,
      source: newSkillSource.trim() || (sourceProjectName ? `Deliverable "${sourceProjectName}"` : undefined),
      source_project_id: newSkillProjectId || undefined,
      source_project_name: sourceProjectName,
    });

    setNewSkillName('');
    setNewSkillNotes('');
    setNewSkillMastery('practicing');
    setNewSkillSource('');
    setNewSkillProjectId('');
    setAddingSkillModuleId(null);
    refresh();
  };

  // Handle skill edit start
  const handleStartEditSkill = (moduleId: string, skill: SkillRecord) => {
    setEditingSkillInfo({ moduleId, skill });
    setEditSkillName(skill.name);
    setEditSkillNotes(skill.notes || '');
    setEditSkillMastery(skill.mastery);
    setEditSkillSource(skill.source || '');
    setEditSkillProjectId(skill.source_project_id || '');
  };

  // Handle skill edit save
  const handleSaveEditSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkillInfo || !editSkillName.trim()) return;

    let sourceProjectName: string | undefined;
    if (editSkillProjectId) {
      const p = projects.find((proj) => proj.id === editSkillProjectId);
      if (p) sourceProjectName = p.name;
    }

    updateSkill(category.id, editingSkillInfo.moduleId, editingSkillInfo.skill.id, {
      name: editSkillName.trim(),
      notes: editSkillNotes.trim() || undefined,
      mastery: editSkillMastery,
      source: editSkillSource.trim() || (sourceProjectName ? `Deliverable "${sourceProjectName}"` : undefined),
      source_project_id: editSkillProjectId || undefined,
      source_project_name: sourceProjectName,
    });

    setEditingSkillInfo(null);
    refresh();
  };

  // Handle skill delete
  const handleDeleteSkill = (moduleId: string, skillId: string, skillName: string) => {
    if (window.confirm(`Delete skill "${skillName}"?`)) {
      deleteSkill(category.id, moduleId, skillId);
      refresh();
    }
  };

  const totalSkillsCount = category.modules.reduce((sum, m) => sum + m.skills.length, 0);

  return (
    <PageShell
      title={category.name}
      subtitle={category.description || 'Learning modules and accumulated skills'}
      onBack={onBack}
    >
      <div className="space-y-6 max-w-xl mx-auto pb-28">
        {/* Category Header Card */}
        <div className="glass glass-glow rounded-3xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${category.accent || 'from-amber-400 to-orange-500'} flex items-center justify-center text-white shadow-lg shrink-0`}
              >
                <BookOpen size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium text-white">{category.name}</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
                    Category
                  </span>
                </div>
                {category.description && (
                  <p className="text-xs text-white/50 mt-0.5">{category.description}</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-medium text-purple-300">
                {totalSkillsCount} skills
              </span>
              <p className="text-[10px] font-mono text-white/40 mt-0.5">
                {category.modules.length} modules
              </p>
            </div>
          </div>
        </div>

        {/* Modules Section Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-white/60">
              Modules & Skills ({category.modules.length})
            </h3>
          </div>

          {!addingModule && (
            <button
              type="button"
              onClick={() => setAddingModule(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              <Plus size={13} />
              <span>Add Module</span>
            </button>
          )}
        </div>

        {/* Add New Module Input Form */}
        {addingModule && (
          <form
            onSubmit={handleAddModule}
            className="p-4 rounded-2xl glass border border-purple-500/30 space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between text-xs font-mono text-purple-200">
              <span>New Learning Module</span>
              <button
                type="button"
                onClick={() => setAddingModule(false)}
                className="text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              placeholder="Module name (e.g., Motion Principles, VFX, Camera & Narrative)..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAddingModule(false)}
                className="px-2.5 py-1 text-xs text-white/40 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newModuleName.trim()}
                className="px-3.5 py-1 rounded-xl text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-medium"
              >
                Add Module
              </button>
            </div>
          </form>
        )}

        {/* Modules List */}
        <div className="space-y-5">
          {category.modules.map((mod, modIdx) => {
            const isEditingThisModule = editingModuleId === mod.id;
            const isAddingSkillHere = addingSkillModuleId === mod.id;

            return (
              <div
                key={mod.id}
                className="glass rounded-3xl p-4 sm:p-5 border border-white/10 space-y-3"
              >
                {/* Module Header Row */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/5">
                  {!isEditingThisModule ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      <h4 className="text-sm font-medium text-white truncate">{mod.name}</h4>
                      <span className="text-[10px] font-mono text-white/40 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 shrink-0">
                        {mod.skills.length} skills
                      </span>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => handleSaveModuleName(mod.id, e)}
                      className="flex items-center gap-2 flex-1"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editModuleName}
                        onChange={(e) => setEditModuleName(e.target.value)}
                        className="flex-1 bg-white/10 border border-purple-400 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!editModuleName.trim()}
                        className="px-2.5 py-1 rounded-lg text-xs bg-purple-600 text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingModuleId(null)}
                        className="p-1 text-white/40 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </form>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Reorder buttons */}
                    <button
                      type="button"
                      disabled={modIdx === 0}
                      onClick={() => handleMoveModule(modIdx, 'up')}
                      title="Move module up"
                      className="p-1 rounded text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={modIdx === category.modules.length - 1}
                      onClick={() => handleMoveModule(modIdx, 'down')}
                      title="Move module down"
                      className="p-1 rounded text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown size={14} />
                    </button>

                    {/* Rename module */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingModuleId(mod.id);
                        setEditModuleName(mod.name);
                      }}
                      title="Rename module"
                      className="p-1 rounded text-white/30 hover:text-white transition-colors"
                    >
                      <Pencil size={12} />
                    </button>

                    {/* Delete module */}
                    <button
                      type="button"
                      onClick={() => handleDeleteModule(mod.id, mod.name)}
                      title="Delete module"
                      className="p-1 rounded text-white/30 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Skills inside this module */}
                <div className="space-y-2.5">
                  {mod.skills.map((skill) => {
                    const masteryConfig = MASTERY_COLORS[skill.mastery] || MASTERY_COLORS.practicing;
                    const masteryLabel = MASTERY_LABELS[skill.mastery] || skill.mastery;

                    return (
                      <div
                        key={skill.id}
                        className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 space-y-2 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-white/95">
                                {skill.name}
                              </span>
                              {/* Mastery degree badge */}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono border ${masteryConfig.bg} ${masteryConfig.text} ${masteryConfig.border}`}
                              >
                                {masteryLabel}
                              </span>
                            </div>

                            {/* Learning notes */}
                            {skill.notes && (
                              <p className="text-xs text-white/60 leading-relaxed bg-white/[0.02] p-2 rounded-xl border border-white/5">
                                {skill.notes}
                              </p>
                            )}

                            {/* Optional Source / Linked Deliverable */}
                            {(skill.source || skill.source_project_id) && (
                              <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 pt-0.5">
                                <Bookmark size={11} className="text-purple-400 shrink-0" />
                                <span>Source:</span>
                                {skill.source_project_id ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpenProject?.(skill.source_project_id!)}
                                    className="text-purple-300 hover:text-purple-100 underline underline-offset-2 flex items-center gap-1 transition-colors"
                                  >
                                    <span>{skill.source_project_name || skill.source}</span>
                                    <ExternalLink size={10} />
                                  </button>
                                ) : (
                                  <span className="text-white/60">{skill.source}</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditSkill(mod.id, skill)}
                              title="Edit skill"
                              className="p-1 rounded text-white/30 hover:text-white transition-colors"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSkill(mod.id, skill.id, skill.name)}
                              title="Delete skill"
                              className="p-1 rounded text-white/30 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {mod.skills.length === 0 && !isAddingSkillHere && (
                    <div className="py-3 text-center text-[11px] font-mono text-white/30">
                      No skills recorded yet. Click below to add one.
                    </div>
                  )}
                </div>

                {/* Add Skill Button or Form */}
                {!isAddingSkillHere ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingSkillModuleId(mod.id);
                      setNewSkillName('');
                      setNewSkillNotes('');
                      setNewSkillMastery('practicing');
                      setNewSkillSource('');
                      setNewSkillProjectId('');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] text-white/40 hover:text-white hover:bg-white/5 transition-colors pt-1"
                  >
                    <Plus size={12} />
                    <span>Log Skill</span>
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => handleCreateSkill(mod.id, e)}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-sky-500/30 space-y-3 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-sky-300">
                      <span>Add Skill to "{mod.name}"</span>
                      <button
                        type="button"
                        onClick={() => setAddingSkillModuleId(null)}
                        className="text-white/40 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <input
                      type="text"
                      autoFocus
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="Skill name (required)..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-sky-400"
                    />

                    {/* Mastery Level Selection */}
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <span className="text-[10px] font-mono text-white/50">Mastery:</span>
                      <div className="flex items-center gap-1">
                        {(['familiar', 'practicing', 'mastered'] as const).map((lvl) => {
                          const isSel = newSkillMastery === lvl;
                          const cfg = MASTERY_COLORS[lvl];
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setNewSkillMastery(lvl)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                                isSel
                                  ? `${cfg.bg} ${cfg.text} ${cfg.border} font-bold shadow-sm`
                                  : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
                              }`}
                            >
                              {MASTERY_LABELS[lvl]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Learning notes */}
                    <textarea
                      value={newSkillNotes}
                      onChange={(e) => setNewSkillNotes(e.target.value)}
                      rows={2}
                      placeholder="Notes (optional): key techniques, insights, parameters..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-sky-400"
                    />

                    {/* Optional Source or Linked Deliverable */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-white/40 block mb-1">Linked Deliverable:</span>
                        <select
                          value={newSkillProjectId}
                          onChange={(e) => {
                            setNewSkillProjectId(e.target.value);
                            const p = projects.find((proj) => proj.id === e.target.value);
                            if (p && !newSkillSource) {
                              setNewSkillSource(`Deliverable "${p.name}" practice`);
                            }
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
                        >
                          <option value="">None (independent)</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-white/40 block mb-1">Learning Source:</span>
                        <input
                          type="text"
                          value={newSkillSource}
                          onChange={(e) => setNewSkillSource(e.target.value)}
                          placeholder="e.g. Reference book, tutorial or deliverable"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-sky-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => setAddingSkillModuleId(null)}
                        className="px-2.5 py-1 text-xs text-white/40 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newSkillName.trim()}
                        className="px-3.5 py-1 rounded-xl text-xs bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-medium"
                      >
                        Save Skill
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>

        {/* Edit Skill Modal */}
        {editingSkillInfo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setEditingSkillInfo(null)}
          >
            <form
              onSubmit={handleSaveEditSkill}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass glass-glow rounded-3xl p-5 border border-purple-500/30 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-mono uppercase tracking-wider text-purple-200">
                  Edit Skill
                </span>
                <button
                  type="button"
                  onClick={() => setEditingSkillInfo(null)}
                  className="text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="text-[11px] font-mono text-white/60 block mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={editSkillName}
                  onChange={(e) => setEditSkillName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Mastery Level Selection */}
              <div>
                <label className="text-[11px] font-mono text-white/60 block mb-1.5">
                  Mastery
                </label>
                <div className="flex items-center gap-1.5">
                  {(['familiar', 'practicing', 'mastered'] as const).map((lvl) => {
                    const isSel = editSkillMastery === lvl;
                    const cfg = MASTERY_COLORS[lvl];
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setEditSkillMastery(lvl)}
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
                  Learning Notes
                </label>
                <textarea
                  value={editSkillNotes}
                  onChange={(e) => setEditSkillNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-white/40 block mb-1">Linked Deliverable:</span>
                  <select
                    value={editSkillProjectId}
                    onChange={(e) => {
                      setEditSkillProjectId(e.target.value);
                      const p = projects.find((proj) => proj.id === e.target.value);
                      if (p && !editSkillSource) {
                        setEditSkillSource(`Deliverable "${p.name}" practice`);
                      }
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="">None (independent)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-white/40 block mb-1">Learning Source:</span>
                  <input
                    type="text"
                    value={editSkillSource}
                    onChange={(e) => setEditSkillSource(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingSkillInfo(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editSkillName.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </PageShell>
  );
}
