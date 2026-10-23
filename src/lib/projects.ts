import { projects as seedProjects, type Project, type ProjectStage, type ProjectDiscovery, type Task } from '@/data';

const PROJECTS_STORAGE_KEY = 'planetwork_projects_v2';

let memoryProjects: Project[] = seedProjects;

export function loadProjects(): Project[] {
  if (typeof localStorage === 'undefined') {
    return memoryProjects;
  }
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) {
      saveProjects(seedProjects);
      return seedProjects;
    }
    const parsed: Project[] = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedProjects;
  } catch {
    return seedProjects;
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
  }));

  const newProj: Project = {
    id: `proj-${Date.now()}`,
    name: data.name.trim(),
    vision: data.vision.trim(),
    progress: 0,
    accent: chosenAccent,
    status: 'in_progress',
    cycleCount: 1, // Start at Loop Cycle #1
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
 * Deliverable Loop: 发现问题、记录新信息
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
 * Deliverable Loop: 回到「成品的想象」节点，重新审视目标，进入下一周目循环 (Cycle + 1)
 */
export function advanceProjectCycle(projectId: string, updatedVision?: string): Project | null {
  const all = loadProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project) return null;

  const nextCycle = (project.cycleCount || 1) + 1;
  const newVision = updatedVision?.trim() ? updatedVision.trim() : project.vision;

  return updateProject(projectId, {
    cycleCount: nextCycle,
    vision: newVision,
  });
}

/**
 * Toggle stage status: pending -> in_progress -> completed
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

  // Calculate progress based on stages
  const completedStages = nextStages.filter((s) => s.status === 'completed').length;
  const calcProgress = Math.round((completedStages / nextStages.length) * 100);

  return updateProject(projectId, {
    stages: nextStages,
    progress: calcProgress,
  });
}

/**
 * Step-embedded learning & exploration sub-process:
 * Learn ➔ Practice ➔ Verify
 */
export function updateStageLearningBranch(
  projectId: string,
  stageId: string,
  branchUpdates: Partial<{
    active: boolean;
    step: 1 | 2 | 3;
    verified: boolean;
    note: string;
  }>
): Project | null {
  const all = loadProjects();
  const project = all.find((p) => p.id === projectId);
  if (!project || !project.stages) return null;

  const nextStages = project.stages.map((s) => {
    if (s.id === stageId) {
      const current = s.learningBranch || { active: true, step: 1 as const, verified: false };
      return {
        ...s,
        learningBranch: {
          ...current,
          ...branchUpdates,
        },
      };
    }
    return s;
  });

  return updateProject(projectId, { stages: nextStages });
}
