import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Sparkles, ChevronRight, Layers } from 'lucide-react';
import NavDot from './NavDot';
import {
  loadCategories,
  type BroadCategory,
  MASTERY_LABELS,
  MASTERY_COLORS,
} from '@/lib/categories';

interface Props {
  onNavigate: (page: string) => void;
  onOpenCategory: (categoryId: string) => void;
  onOpenNewCategory?: () => void;
}

export default function BroadCategoriesSection({
  onNavigate,
  onOpenCategory,
  onOpenNewCategory,
}: Props) {
  const [categories, setCategories] = useState<BroadCategory[]>(() => loadCategories());

  useEffect(() => {
    const refresh = () => setCategories(loadCategories());
    window.addEventListener('studio_os_categories_changed', refresh);
    return () => window.removeEventListener('studio_os_categories_changed', refresh);
  }, []);

  const totalSkillsCount = categories.reduce((sum, cat) => {
    return sum + cat.modules.reduce((mSum, m) => mSum + m.skills.length, 0);
  }, 0);

  return (
    <section id="broad-categories" className="glass glass-glow rounded-3xl p-5 sm:p-6 border border-white/10">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xs sm:text-sm tracking-[0.2em] uppercase text-white/50">Disciplines</h2>
          <p className="text-base sm:text-lg font-light text-white/90 mt-0.5">Major Categories & Skills</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] sm:text-[11px] tracking-wide text-white/40 px-2.5 sm:px-3 py-1 rounded-full border border-white/10 font-mono">
            {categories.length} categories · {totalSkillsCount} skills
          </span>
          <NavDot label="Open Categories page" onClick={() => onNavigate('categories')} />
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const allSkills = cat.modules.flatMap((m) => m.skills);
          const practicingCount = allSkills.filter((s) => s.mastery === 'practicing').length;
          const masteredCount = allSkills.filter((s) => s.mastery === 'mastered').length;

          return (
            <div
              key={cat.id}
              onClick={() => onOpenCategory(cat.id)}
              className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.accent || 'from-amber-400 to-orange-500'} flex items-center justify-center text-white shadow-md shadow-black/20 shrink-0`}
                  >
                    <BookOpen size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-white/95 group-hover:text-white transition-colors truncate">
                        {cat.name}
                      </h3>
                      <span className="text-[10px] font-mono text-white/40 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 shrink-0">
                        {cat.modules.length} modules
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-white/45 truncate mt-0.5">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-mono text-white/80">
                      {allSkills.length} skills
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 mt-0.5">
                      {practicingCount > 0 && (
                        <span className="text-amber-300">
                          {practicingCount} practicing
                        </span>
                      )}
                      {masteredCount > 0 && (
                        <span className="text-emerald-300">
                          {masteredCount} mastered
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/30 group-hover:text-white/70 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              {/* Learning modules preview chips */}
              {cat.modules.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5 flex-wrap">
                  {cat.modules.slice(0, 6).map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-white/5 text-white/60 border border-white/5"
                    >
                      {m.name}
                      {m.skills.length > 0 && (
                        <span className="ml-1 text-white/35">({m.skills.length})</span>
                      )}
                    </span>
                  ))}
                  {cat.modules.length > 6 && (
                    <span className="text-[10px] font-mono text-white/30">
                      +{cat.modules.length - 6}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Create new category quick button */}
        <button
          type="button"
          onClick={() => {
            if (onOpenNewCategory) {
              onOpenNewCategory();
            } else {
              onNavigate('categories');
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-dashed border-white/15 text-xs text-white/50 hover:text-white transition-all"
        >
          <Plus size={14} />
          <span>New Category</span>
        </button>
      </div>
    </section>
  );
}
