import {
  projects as seedProjects,
  type Project,
  type ProjectStage,
  type ProjectDiscovery,
  type PartSubtask,
  type SubtaskDifficulty,
  type ResearchData,
  type ResearchMethod,
  type MethodResultStatus,
} from '@/data';

const PROJECTS_STORAGE_KEY = 'planetwork_projects_v2';

let memoryProjects: Project[] = seedProjects;

function migrateProjectData(rawProjects: Project[]): Project[] {
  let workingList = rawProjects;
  const hasAudienceAnim = rawProjects.some((p) => p.id === 'proj-audience-animation');
  if (!hasAudienceAnim) {
    const seedAudience = seedProjects.find((p) => p.id === 'proj-audience-animation');
    if (seedAudience) {
      workingList = [seedAudience, ...rawProjects];
    }
  }

  return workingList.map((p) => {
    const category_ids = Array.isArray(p.category_ids)
      ? p.category_ids
      : p.id === 'proj-audience-animation'
      ? ['cat-animation']
      : [];

    const stages = (p.stages || []).map((s) => {
      let subtasks: PartSubtask[] = (Array.isArray(s.subtasks) ? [...s.subtasks] : []).map((sub) => ({
        ...sub,
        difficulty: ((sub.difficulty as string) === 'extreme' ? 'high' : sub.difficulty) || 'medium',
      }));

      // Preserve any legacy learningBranch notes by migrating them to a research subtask
      if (s.learningBranch?.note && subtasks.length === 0) {
        subtasks.push({
          id: `sub-migrated-${s.id}`,
          title: `Research: ${s.name}`,
          type: 'research',
          done: Boolean(s.learningBranch.verified),
          difficulty: 'medium',
          createdAt: Date.now(),
          research: {
            question: `Investigate core challenges for ${s.name}`,
            investigationLog: s.learningBranch.note,
            methods: s.learningBranch.verified
              ? [
                  {
                    id: `m-migrated-${Date.now()}`,
                    content: 'Initial solution approach',
                    status: 'success',
                    notes: 'Verified and applied',
                    createdAt: Date.now(),
                  },
                ]
              : [],
          },
        });
      }

      return {
        ...s,
        subtasks,
      };
    });

    return {
      ...p,
      category_ids,
      stages,
    };
  });
}

export function loadProjects(): Project[] {
  if (typeof localStorage === 'undefined') {
    return migrateProjectData(memoryProjects);
  }
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) {
      const migrated = migrateProjectData(seedProjects);
      saveProjects(migrated);
      return migrated;
    }
    const parsed: Project[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return migrateProjectData(parsed);
    }
    const migrated = migrateProjectData(seedProjects);
    saveProjects(migrated);
    return migrated;
  } catch {
    return migrateProjectData(seedProjects);
  }
}

export function saveProjects(projects: Project[]): void {
  if (typeof localStorage === 'undefined') {
    memoryProjects = projects;
    return;
  }
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects to localStorage', e);
  }
}

export function getProject(id: string): Project | null {
  const all = loadProjects();
  return all.find((p) => p.id === id) ?? null;
}

export function createProject(data: {
  name: string;
  vision: string;
  stages?: string[];
  accent?: string;
}): Project {
  const all = loadProjects();
  const accents = [
    'from-sky-400 to-blue-500',
    'from-violet-400 to-purple-500',
    'from-fuchsia-400 to-pink-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
  ];
  const chosenAccent = data.accent || accents[all.length % accents.length];

  const initialStages: ProjectStage[] = (data.stages && data.stages.length > 0
    ? data.stages
    : ['Concept & Scope', 'Execution & Build', 'Refinement & Delivery']
  ).map((name, i) => ({
    id: `stage-${Date.now()}-${i}`,
    name,
    status: i === 0 ? 'in_progress' : 'pending',
    subtasks: [],
  }));

  const newProj: Project = {
    id: `proj-${Date.now()}`,
    name: data.name.trim(),
    vision: data.vision.trim(),
    progress: 0,
    accent: chosenAccent,
    status: 'in_progress',
    stages: initialStages,
    discoveries: [],
  };

  const next = [newProj, ...all];
  saveProjects(next);
  return newProj;
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const all = loadProjects();
  let updatedProject: Project | null = null;
  const next = all.map((p) => {
    if (p.id === id) {
      updatedProject = { ...p, ...updates };
      return updatedProject;
    }
    return p;
  });
  saveProjects(next);
  return updatedProject;
}

/**
 * 记录新信息、发现的问题与经验
 */
export function addProjectDiscovery(projectId: string, note: string): Project | null {
  const all = loadProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project) return null;

  const discovery: ProjectDiscovery = {
    id: `disc-${Date.now()}`,
    note: note.trim(),
    createdAt: Date.now(),
  };

  const updatedDiscoveries = [discovery, ...(project.discoveries || [])];
  return updateProject(projectId, { discoveries: updatedDiscoveries });
}

/**
 * Toggle stage (Part) status: pending -> in_progress -> completed
 */
export function toggleStageStatus(projectId: string, stageId: string): Project | null {
  const all = loadProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project || !project.stages) return null;

  const nextStages = project.stages.map((s) => {
    if (s.id === stageId) {
      const nextStatus: ProjectStage['status'] =
        s.status === 'pending'
          ? 'in_progress'
          : s.status === 'in_progress'
          ? 'completed'
          : 'pending';
      return { ...s, status: nextStatus };
    }
    return s;
  });

  const completedStages = nextStages.filter((s) => s.status === 'completed').length;
  const calcProgress = Math.round((completedStages / nextStages.length) * 100);

  return updateProject(projectId, {
    stages: nextStages,
    progress: calcProgress,
  });
}

/**
 * Part Subtasks & Research Subtasks Management
 */
export function addPartSubtask(
  projectId: string,
  stageId: string,
  data: {
    title: string;
    type: 'regular' | 'research';
    question?: string;
    in_today_focus?: boolean;
    time?: string;
    due_date?: string;
    difficulty?: SubtaskDifficulty;
  }
): { project: Project; subtask: PartSubtask } | null {
  const all = loadProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project || !project.stages) return null;

  let createdSubtask: PartSubtask | null = null;

  const nextStages = project.stages.map((s) => {
    if (s.id === stageId) {
      const isResearch = data.type === 'research';
      const newSub: PartSubtask = {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: data.title.trim() || (isResearch ? 'Research & Investigation' : 'New sub-task'),
        type: data.type,
        done: false,
        in_today_focus: Boolean(data.in_today_focus),
        time: data.time?.trim() || undefined,
        due_date: data.due_date?.trim() || undefined,
        difficulty: data.difficulty || 'medium',
        createdAt: Date.now(),
        ...(isResearch
          ? {
              research: {
                question: data.question?.trim() || data.title.trim() || 'What question are you investigating?',
                investigationLog: '',
                methods: [],
              },
            }
          : {}),
      };
      createdSubtask = newSub;
      const subtasks = [...(s.subtasks || []), newSub];
      return { ...s, subtasks };
    }
    return s;
  });

  const updatedProject = updateProject(projectId, { stages: nextStages });
  if (updatedProject && createdSubtask) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('studio_os_tasks_changed'));
    }
    return { project: updatedProject, subtask: createdSubtask };
  }
  return null;
}

export function toggleSubtaskFocus(
  projectId: string,
  stageId: string,
  subtaskId: string
): Project | null {
  const all = loadProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project || !project.stages) return null;

  const nextStages = project.stages.map((s) => {
    if (s.id === stageId) {
      const subtasks = (s.subtasks || []).map((sub) => {
        if (sub.id === subtaskId) {
          return { ...sub, in_today_focus: !sub.in_today_focus };
        }
        return sub;
      });
      return { ...s, subtasks };
    }
    return s;
  });

  const updated = updateProject(projectId, { stages: nextStages });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('studio_os_tasks_changed'));
  }
  return updated;
}

export function updateSubtaskTime(
  projectId: string,
  stageId: string,
  subtaskId: string,
  time?: string,
  due_date?: string,
  start_date?: string,
  start_time?: string
): Project | null {
  const all = loadProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project || !project.stages) return null;

  const nextStages = project.stages.map((s) => {
    if (s.id === stageId) {
      const subtasks = (s.subtasks || []).map((sub) => {
        if (sub.id === subtaskId) {
          return {
            ...sub,
            time: time?.trim() || undefined,
            due_date: due_date?.trim() || undefined,
            start_date: start_date?.trim() || sub.start_date || undefined,
            start_time: start_time?.trim() || sub.start_time || undefined,
          };
        }
        return sub;
      });
      return { ...s, subtasks };
    }
    return s;
  });

  const updated = updateProject(projectId, { stages: nextStages });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('studio_os_tasks_changed'));
  }
  return updated;
}

export function togglePartSubtask(
  projectId: string,
  stageId: string,
  subtaskId: string
): Project | null {
  const all = loadProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project || !project.stages) return null;

  const nextStages = project.stages.map((s) => {
    if (s.id === stageId) {
      const subtasks = (s.subtasks || []).map((sub) => {
        if (sub.id === subtaskId) {
          return { ...sub, done: !sub.done };
        }
        return sub;
      });
      return { ...s, subtasks };
    }
    return s;
  });

  const updated = updateProject(projectId, { stages: nextStages });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('studio_os_tasks_changed'));
  }
  return updated;
}

export function deletePartSubtask(
  projectId: string,
  stageId: string,
  subtaskId: string
): Project | null {
  const all = loadProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project || !project.stages) return null;

  const nextStages = project.stages.map((s) => {
    if (s.id === stageId) {
      const subtasks = (s.subtasks || []).filter((sub) => sub.id !== subtaskId);
      return { ...s, subtasks };
    }
    return s;
  });

  const updated = updateProject(projectId, { stages: nextStages });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('studio_os_tasks_changed'));
  }
  return updated;
}

export function updatePartSubtask(
  projectId: string,
  stageId: string,
  subtaskId: string,
  updates: Partial<PartSubtask>
): Project | null {
  const all = loadProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project || !project.stages) return null;

  const nextStages = project.stages.map((s) => {
    if (s.id === stageId) {
      const subtasks = (s.subtasks || []).map((sub) => {
        if (sub.id === subtaskId) {
          return { ...sub, ...updates };
        }
        return sub;
      });
      return { ...s, subtasks };
    }
    return s;
  });

  const updated = updateProject(projectId, { stages: nextStages });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('studio_os_tasks_changed'));
  }
  return updated;
}

export function getPartSubtask(
  projectId: string,
  stageId: string,
  subtaskId: string
): { project: Project; stage: ProjectStage; subtask: PartSubtask } | null {
  const project = getProject(projectId);
  if (!project || !project.stages) return null;
  const stage = project.stages.find((s) => s.id === stageId);
  if (!stage || !stage.subtasks) return null;
  const subtask = stage.subtasks.find((sub) => sub.id === subtaskId);
  if (!subtask) return null;
  return { project, stage, subtask };
}

/**
 * Research Subtask Specific Data Updates:
 * Question, Investigation Log, and Trial Methods
 */
export function updateResearchData(
  projectId: string,
  stageId: string,
  subtaskId: string,
  updates: Partial<ResearchData>
): Project | null {
  const all = loadProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project || !project.stages) return null;

  const nextStages = project.stages.map((s) => {
    if (s.id === stageId) {
      const subtasks = (s.subtasks || []).map((sub) => {
        if (sub.id === subtaskId) {
          const currentResearch: ResearchData = sub.research || {
            question: sub.title,
            investigationLog: '',
            methods: [],
          };
          return {
            ...sub,
            research: {
              ...currentResearch,
              ...updates,
            },
          };
        }
        return sub;
      });
      return { ...s, subtasks };
    }
    return s;
  });

  return updateProject(projectId, { stages: nextStages });
}

export function addResearchMethod(
  projectId: string,
  stageId: string,
  subtaskId: string,
  content: string
): Project | null {
  if (!content.trim()) return null;
  const target = getPartSubtask(projectId, stageId, subtaskId);
  if (!target) return null;

  const currentMethods = target.subtask.research?.methods || [];
  const newMethod: ResearchMethod = {
    id: `method-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    content: content.trim(),
    status: 'untried',
    notes: '',
    createdAt: Date.now(),
  };

  return updateResearchData(projectId, stageId, subtaskId, {
    methods: [...currentMethods, newMethod],
  });
}

export function updateResearchMethod(
  projectId: string,
  stageId: string,
  subtaskId: string,
  methodId: string,
  updates: Partial<ResearchMethod>
): Project | null {
  const target = getPartSubtask(projectId, stageId, subtaskId);
  if (!target || !target.subtask.research) return null;

  const currentMethods = target.subtask.research.methods || [];
  let methodChangedToSuccess = false;

  const nextMethods = currentMethods.map((m) => {
    if (m.id === methodId) {
      if (updates.status === 'success' && m.status !== 'success') {
        methodChangedToSuccess = true;
      }
      return { ...m, ...updates };
    }
    return m;
  });

  const updatedProj = updateResearchData(projectId, stageId, subtaskId, {
    methods: nextMethods,
  });

  // If a method succeeded, mark the subtask itself done as well (or let user keep it)
  if (methodChangedToSuccess) {
    updatePartSubtask(projectId, stageId, subtaskId, { done: true });
  }

  return updatedProj;
}

export function deleteResearchMethod(
  projectId: string,
  stageId: string,
  subtaskId: string,
  methodId: string
): Project | null {
  const target = getPartSubtask(projectId, stageId, subtaskId);
  if (!target || !target.subtask.research) return null;

  const nextMethods = (target.subtask.research.methods || []).filter(
    (m) => m.id !== methodId
  );

  return updateResearchData(projectId, stageId, subtaskId, {
    methods: nextMethods,
  });
}

export function linkProjectCategory(projectId: string, categoryId: string): Project | null {
  const p = getProject(projectId);
  if (!p) return null;
  const current = p.category_ids || [];
  if (!current.includes(categoryId)) {
    return updateProject(projectId, { category_ids: [...current, categoryId] });
  }
  return p;
}

export function unlinkProjectCategory(projectId: string, categoryId: string): Project | null {
  const p = getProject(projectId);
  if (!p) return null;
  const current = p.category_ids || [];
  return updateProject(projectId, { category_ids: current.filter((id) => id !== categoryId) });
}

export function updateProjectCategories(projectId: string, categoryIds: string[]): Project | null {
  return updateProject(projectId, { category_ids: categoryIds });
}
