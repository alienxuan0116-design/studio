export type SkillMastery = 'familiar' | 'practicing' | 'mastered';

export const MASTERY_LABELS: Record<SkillMastery, string> = {
  familiar: 'Familiar',
  practicing: 'Practicing',
  mastered: 'Mastered',
};

export const MASTERY_COLORS: Record<SkillMastery, { bg: string; text: string; border: string }> = {
  familiar: {
    bg: 'bg-sky-500/20',
    text: 'text-sky-300',
    border: 'border-sky-500/30',
  },
  practicing: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
  },
  mastered: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
  },
};

export interface SkillRecord {
  id: string;
  name: string;
  notes?: string;
  mastery: SkillMastery;
  source?: string;
  source_project_id?: string;
  source_project_name?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface LearningModule {
  id: string;
  name: string;
  order: number;
  skills: SkillRecord[];
}

export interface BroadCategory {
  id: string;
  name: string;
  description?: string;
  accent?: string;
  modules: LearningModule[];
  createdAt: number;
}

const CATEGORIES_STORAGE_KEY = 'planetwork_broad_categories_v1';

export const seedBroadCategories: BroadCategory[] = [
  {
    id: 'cat-animation',
    name: '动画',
    description: '时间与空间的运动造型艺术，涵盖规律、动态节奏与视听叙事',
    accent: 'from-amber-400 to-orange-500',
    createdAt: Date.now() - 86400000 * 7,
    modules: [
      {
        id: 'mod-motion-rules',
        name: '运动规律',
        order: 0,
        skills: [
          {
            id: 'skill-accel-decel',
            name: '加速与减速',
            notes: '关键帧之间的间距决定物体速度，靠近极限位置增加缓冲帧以产生自然的加减速感与惯性。',
            mastery: 'practicing',
            source: '成品《观察观众的动画》制作实践',
            source_project_id: 'proj-audience-animation',
            source_project_name: '观察观众的动画',
            createdAt: Date.now() - 86400000 * 2,
          },
        ],
      },
      {
        id: 'mod-character-anim',
        name: '角色动画',
        order: 1,
        skills: [],
      },
      {
        id: 'mod-fx-anim',
        name: '特效动画',
        order: 2,
        skills: [],
      },
      {
        id: 'mod-camera-narrative',
        name: '镜头与叙事',
        order: 3,
        skills: [],
      },
      {
        id: 'mod-tech-anim',
        name: '动画制作技术',
        order: 4,
        skills: [],
      },
      {
        id: 'mod-visual-design',
        name: '视觉设计',
        order: 5,
        skills: [],
      },
    ],
  },
];

let memoryCategories: BroadCategory[] = seedBroadCategories;

function dispatchCategoriesChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studio_os_categories_changed'));
  }
}

export function loadCategories(): BroadCategory[] {
  if (typeof localStorage === 'undefined') {
    return memoryCategories;
  }
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) {
      saveCategories(seedBroadCategories);
      return seedBroadCategories;
    }
    const parsed: BroadCategory[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure seed animation category exists if user hasn't deleted it
      const hasAnim = parsed.some((c) => c.id === 'cat-animation');
      if (!hasAnim && !localStorage.getItem('planetwork_cat_animation_deleted')) {
        const merged = [...seedBroadCategories, ...parsed];
        saveCategories(merged);
        return merged;
      }
      return parsed;
    }
    saveCategories(seedBroadCategories);
    return seedBroadCategories;
  } catch {
    return seedBroadCategories;
  }
}

export function saveCategories(categories: BroadCategory[]): void {
  if (typeof localStorage === 'undefined') {
    memoryCategories = categories;
    dispatchCategoriesChanged();
    return;
  }
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    dispatchCategoriesChanged();
  } catch (e) {
    console.error('Failed to save broad categories', e);
  }
}

export function getCategory(id: string): BroadCategory | null {
  const cats = loadCategories();
  return cats.find((c) => c.id === id) || null;
}

export function createCategory(data: {
  name: string;
  description?: string;
  accent?: string;
}): BroadCategory {
  const cats = loadCategories();
  const accents = [
    'from-amber-400 to-orange-500',
    'from-sky-400 to-indigo-500',
    'from-purple-400 to-pink-500',
    'from-emerald-400 to-teal-500',
    'from-rose-400 to-red-500',
  ];
  const chosenAccent = data.accent || accents[cats.length % accents.length];
  const newCat: BroadCategory = {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: data.name.trim(),
    description: data.description?.trim() || '',
    accent: chosenAccent,
    modules: [],
    createdAt: Date.now(),
  };
  const updated = [newCat, ...cats];
  saveCategories(updated);
  return newCat;
}

export function updateCategory(
  id: string,
  updates: Partial<Pick<BroadCategory, 'name' | 'description' | 'accent'>>
): BroadCategory | null {
  const cats = loadCategories();
  let result: BroadCategory | null = null;
  const updated = cats.map((c) => {
    if (c.id === id) {
      result = {
        ...c,
        ...updates,
      };
      return result;
    }
    return c;
  });
  if (result) {
    saveCategories(updated);
  }
  return result;
}

export function deleteCategory(id: string): boolean {
  const cats = loadCategories();
  const filtered = cats.filter((c) => c.id !== id);
  if (filtered.length !== cats.length) {
    if (id === 'cat-animation' && typeof localStorage !== 'undefined') {
      localStorage.setItem('planetwork_cat_animation_deleted', 'true');
    }
    saveCategories(filtered);
    return true;
  }
  return false;
}

// Learning Module operations
export function addModule(categoryId: string, name: string): LearningModule | null {
  const cats = loadCategories();
  let createdMod: LearningModule | null = null;
  const updated = cats.map((cat) => {
    if (cat.id === categoryId) {
      const order = cat.modules.length;
      createdMod = {
        id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        order,
        skills: [],
      };
      return {
        ...cat,
        modules: [...cat.modules, createdMod],
      };
    }
    return cat;
  });
  if (createdMod) {
    saveCategories(updated);
  }
  return createdMod;
}

export function updateModuleName(
  categoryId: string,
  moduleId: string,
  name: string
): boolean {
  const cats = loadCategories();
  let found = false;
  const updated = cats.map((cat) => {
    if (cat.id === categoryId) {
      const nextMods = cat.modules.map((m) => {
        if (m.id === moduleId) {
          found = true;
          return { ...m, name: name.trim() };
        }
        return m;
      });
      return { ...cat, modules: nextMods };
    }
    return cat;
  });
  if (found) {
    saveCategories(updated);
  }
  return found;
}

export function deleteModule(categoryId: string, moduleId: string): boolean {
  const cats = loadCategories();
  let found = false;
  const updated = cats.map((cat) => {
    if (cat.id === categoryId) {
      const nextMods = cat.modules
        .filter((m) => m.id !== moduleId)
        .map((m, idx) => ({ ...m, order: idx }));
      found = true;
      return { ...cat, modules: nextMods };
    }
    return cat;
  });
  if (found) {
    saveCategories(updated);
  }
  return found;
}

export function reorderModules(categoryId: string, moduleIds: string[]): boolean {
  const cats = loadCategories();
  let changed = false;
  const updated = cats.map((cat) => {
    if (cat.id === categoryId) {
      const modMap = new Map(cat.modules.map((m) => [m.id, m]));
      const ordered: LearningModule[] = [];
      moduleIds.forEach((id, idx) => {
        const m = modMap.get(id);
        if (m) {
          ordered.push({ ...m, order: idx });
        }
      });
      changed = true;
      return { ...cat, modules: ordered };
    }
    return cat;
  });
  if (changed) {
    saveCategories(updated);
  }
  return changed;
}

// Skills operations
export function addSkill(
  categoryId: string,
  moduleId: string,
  skillData: {
    name: string;
    notes?: string;
    mastery: SkillMastery;
    source?: string;
    source_project_id?: string;
    source_project_name?: string;
  }
): SkillRecord | null {
  const cats = loadCategories();
  let createdSkill: SkillRecord | null = null;
  const updated = cats.map((cat) => {
    if (cat.id === categoryId) {
      const nextMods = cat.modules.map((m) => {
        if (m.id === moduleId) {
          createdSkill = {
            id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: skillData.name.trim(),
            notes: skillData.notes?.trim() || undefined,
            mastery: skillData.mastery,
            source: skillData.source?.trim() || undefined,
            source_project_id: skillData.source_project_id,
            source_project_name: skillData.source_project_name,
            createdAt: Date.now(),
          };
          return {
            ...m,
            skills: [createdSkill, ...m.skills],
          };
        }
        return m;
      });
      return { ...cat, modules: nextMods };
    }
    return cat;
  });
  if (createdSkill) {
    saveCategories(updated);
  }
  return createdSkill;
}

export function updateSkill(
  categoryId: string,
  moduleId: string,
  skillId: string,
  updates: Partial<Pick<SkillRecord, 'name' | 'notes' | 'mastery' | 'source' | 'source_project_id' | 'source_project_name'>>
): boolean {
  const cats = loadCategories();
  let found = false;
  const updated = cats.map((cat) => {
    if (cat.id === categoryId) {
      const nextMods = cat.modules.map((m) => {
        if (m.id === moduleId) {
          const nextSkills = m.skills.map((s) => {
            if (s.id === skillId) {
              found = true;
              return {
                ...s,
                ...updates,
                updatedAt: Date.now(),
              };
            }
            return s;
          });
          return { ...m, skills: nextSkills };
        }
        return m;
      });
      return { ...cat, modules: nextMods };
    }
    return cat;
  });
  if (found) {
    saveCategories(updated);
  }
  return found;
}

export function deleteSkill(
  categoryId: string,
  moduleId: string,
  skillId: string
): boolean {
  const cats = loadCategories();
  let found = false;
  const updated = cats.map((cat) => {
    if (cat.id === categoryId) {
      const nextMods = cat.modules.map((m) => {
        if (m.id === moduleId) {
          const nextSkills = m.skills.filter((s) => s.id !== skillId);
          if (nextSkills.length !== m.skills.length) {
            found = true;
          }
          return { ...m, skills: nextSkills };
        }
        return m;
      });
      return { ...cat, modules: nextMods };
    }
    return cat;
  });
  if (found) {
    saveCategories(updated);
  }
  return found;
}

// Find all skills associated with a specific project
export function getSkillsByProjectId(projectId: string): {
  category: BroadCategory;
  module: LearningModule;
  skill: SkillRecord;
}[] {
  const cats = loadCategories();
  const results: { category: BroadCategory; module: LearningModule; skill: SkillRecord }[] = [];
  cats.forEach((cat) => {
    cat.modules.forEach((mod) => {
      mod.skills.forEach((sk) => {
        if (sk.source_project_id === projectId) {
          results.push({ category: cat, module: mod, skill: sk });
        }
      });
    });
  });
  return results;
}
