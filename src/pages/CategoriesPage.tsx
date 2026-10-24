import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import {
  loadCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type BroadCategory,
  MASTERY_LABELS,
} from '@/lib/categories';

interface Props {
  onBack: () => void;
  onOpenCategory: (categoryId: string) => void;
}

const ACCENT_OPTIONS = [
  { label: 'Amber / Orange', value: 'from-amber-400 to-orange-500' },
  { label: 'Sky / Indigo', value: 'from-sky-400 to-indigo-500' },
  { label: 'Purple / Pink', value: 'from-purple-400 to-pink-500' },
  { label: 'Emerald / Teal', value: 'from-emerald-400 to-teal-500' },
  { label: 'Rose / Red', value: 'from-rose-400 to-red-500' },
  { label: 'Violet / Fuchsia', value: 'from-violet-500 to-fuchsia-600' },
];

export default function CategoriesPage({ onBack, onOpenCategory }: Props) {
  const [categories, setCategories] = useState<BroadCategory[]>(() => loadCategories());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAccent, setNewAccent] = useState(ACCENT_OPTIONS[0].value);

  // Edit category modal/drawer
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAccent, setEditAccent] = useState('');

  const refresh = () => setCategories(loadCategories());

  useEffect(() => {
    window.addEventListener('studio_os_categories_changed', refresh);
    return () => window.removeEventListener('studio_os_categories_changed', refresh);
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = createCategory({
      name: newName.trim(),
      description: newDesc.trim(),
      accent: newAccent,
    });
    setNewName('');
    setNewDesc('');
    setCreating(false);
    refresh();
    onOpenCategory(created.id);
  };

  const handleStartEdit = (cat: BroadCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || '');
    setEditAccent(cat.accent || ACCENT_OPTIONS[0].value);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatId || !editName.trim()) return;
    updateCategory(editingCatId, {
      name: editName.trim(),
      description: editDesc.trim(),
      accent: editAccent,
    });
    setEditingCatId(null);
    refresh();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this major category and all its modules and skills?')) {
      deleteCategory(id);
      refresh();
    }
  };

  return (
    <PageShell
      title="Major Categories"
      subtitle="Disciplines, learning modules, and accumulated skills"
      onBack={onBack}
    >
      <div className="space-y-6 max-w-xl mx-auto pb-24">
        {/* Header CTA */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white/90">All Categories</h3>
            <p className="text-xs text-white/40 mt-0.5">
              Organized learning modules and skills accumulated during practice
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-lg shadow-purple-600/30 transition-all"
          >
            <Plus size={14} />
            <span>New Category</span>
          </button>
        </div>

        {/* Create Modal / Form */}
        {creating && (
          <form
            onSubmit={handleCreate}
            className="glass glass-glow rounded-3xl p-5 border border-purple-500/30 space-y-4 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-purple-200">
                New Major Category
              </span>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-mono text-white/60 block mb-1.5">
                Category Name (Required)
              </label>
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Animation, Game Design, 3D Rendering..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-white/60 block mb-1.5">
                Description / Scope (Optional)
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Principles of motion, dynamic timing, and visual narrative"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-white/60 block mb-1.5">
                Theme Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_OPTIONS.map((acc) => (
                  <button
                    key={acc.value}
                    type="button"
                    onClick={() => setNewAccent(acc.value)}
                    className={`h-7 px-2.5 rounded-lg text-[10px] font-mono border flex items-center gap-1.5 transition-all ${
                      newAccent === acc.value
                        ? 'border-white text-white font-medium shadow-md'
                        : 'border-white/10 text-white/40 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full bg-gradient-to-r ${acc.value}`}
                    />
                    <span>{acc.label.split(' / ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newName.trim()}
                className="px-4 py-1.5 rounded-xl text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-medium"
              >
                Create Category
              </button>
            </div>
          </form>
        )}

        {/* Edit Modal */}
        {editingCatId && (
          <form
            onSubmit={handleSaveEdit}
            className="glass glass-glow rounded-3xl p-5 border border-amber-500/30 space-y-4 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-200">
                Edit Category
              </span>
              <button
                type="button"
                onClick={() => setEditingCatId(null)}
                className="text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-mono text-white/60 block mb-1.5">
                Category Name
              </label>
              <input
                type="text"
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-white/60 block mb-1.5">
                Description / Scope
              </label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-white/60 block mb-1.5">
                Theme Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_OPTIONS.map((acc) => (
                  <button
                    key={acc.value}
                    type="button"
                    onClick={() => setEditAccent(acc.value)}
                    className={`h-7 px-2.5 rounded-lg text-[10px] font-mono border flex items-center gap-1.5 transition-all ${
                      editAccent === acc.value
                        ? 'border-white text-white font-medium shadow-md'
                        : 'border-white/10 text-white/40 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full bg-gradient-to-r ${acc.value}`}
                    />
                    <span>{acc.label.split(' / ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingCatId(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editName.trim()}
                className="px-4 py-1.5 rounded-xl text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Categories List */}
        <div className="space-y-4">
          {categories.map((cat) => {
            const allSkills = cat.modules.flatMap((m) => m.skills);
            const familiarCount = allSkills.filter((s) => s.mastery === 'familiar').length;
            const practicingCount = allSkills.filter((s) => s.mastery === 'practicing').length;
            const masteredCount = allSkills.filter((s) => s.mastery === 'mastered').length;

            return (
              <div
                key={cat.id}
                onClick={() => onOpenCategory(cat.id)}
                className="glass glass-glow rounded-3xl p-5 border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${cat.accent || 'from-amber-400 to-orange-500'} flex items-center justify-center text-white shadow-lg shadow-black/20 shrink-0 mt-0.5`}
                    >
                      <BookOpen size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-medium text-white/95 group-hover:text-white transition-colors">
                          {cat.name}
                        </h2>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
                          {cat.modules.length} modules
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
                          {allSkills.length} skills
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-white/50 mt-1 line-clamp-2">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleStartEdit(cat, e)}
                      title="Edit Category"
                      className="p-1.5 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(cat.id, e)}
                      title="Delete Category"
                      className="p-1.5 rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={18} className="text-white/30 group-hover:text-white/80 transition-transform group-hover:translate-x-0.5 ml-1" />
                  </div>
                </div>

                {/* Mastery breakdown badges */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-white/5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/40">Mastery:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/15 text-sky-300 border border-sky-500/25">
                      {familiarCount} Familiar
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/25">
                      {practicingCount} Practicing
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      {masteredCount} Mastered
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-purple-300/80 group-hover:text-purple-200 transition-colors flex items-center gap-1">
                    <span>View Modules</span>
                    <span>→</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
