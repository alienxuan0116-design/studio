import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Check, Plus, Sparkles, PenLine } from 'lucide-react';
import TaskList from '@/components/TaskList';
import DateTimeCards from '@/components/DateTimeCards';
import Timeline from '@/components/Timeline';
import ProjectProgress from '@/components/ProjectProgress';
import IdeaButton from '@/components/IdeaButton';
import CollapsibleSection from '@/components/CollapsibleSection';
import NavDot from '@/components/NavDot';
import WeatherStrip from '@/components/WeatherStrip';
import SchedulePage from '@/pages/SchedulePage';
import ProjectsPage from '@/pages/ProjectsPage';
import EssentialsPage from '@/pages/EssentialsPage';
import FocusPage from '@/pages/FocusPage';
import OtherTasksPage from '@/pages/OtherTasksPage';
import NewIdeaPage from '@/pages/NewIdeaPage';
import LearningPage from '@/pages/LearningPage';
import ThemesPage from '@/pages/ThemesPage';
import TaskDetailPage from '@/pages/TaskDetailPage';
import NewTaskPage from '@/pages/NewTaskPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import ResearchPage from '@/pages/ResearchPage';
import BroadCategoriesSection from '@/components/BroadCategoriesSection';
import CategoriesPage from '@/pages/CategoriesPage';
import CategoryDetailPage from '@/pages/CategoryDetailPage';
import {
  Scratchpad,
  SCRATCHPAD_CATEGORIES,
  type ScratchpadCategoryOption,
} from '@/components/Scratchpad';
import {
  loadProjects,
  toggleSubtaskFocus,
  togglePartSubtask,
  getPartSubtask,
} from '@/lib/projects';
import { type Task, type Project } from '@/data';
import {
  fetchTasksByCategory,
  toggleTaskDone,
  updateTask,
  createTask,
  rowToTask,
  sortTasksByPriorityAndTime,
  loadScratchNotes,
  saveScratchNotes,
  purgeExpiredScratchNotes,
  type ScratchNote,
  type TaskRow,
} from '@/lib/tasks';

function SectionHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm tracking-[0.2em] uppercase text-white/50">{kicker}</h2>
      <p className="text-lg font-light text-white/90 mt-0.5">{title}</p>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('home');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeResearch, setActiveResearch] = useState<{
    projectId: string;
    partId: string;
    subtaskId: string;
  } | null>(null);
  const [newTaskCategory, setNewTaskCategory] = useState<'essential' | 'focus' | null>(null);

  const [ess, setEss] = useState<Task[]>([]);
  const [focus, setFocus] = useState<Task[]>([]);
  const [other, setOther] = useState<Task[]>([]);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [scratchNotes, setScratchNotes] = useState<ScratchNote[]>([]);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

  const scrollRestoreRef = useRef<number | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [e, f, o] = await Promise.all([
        fetchTasksByCategory('essential'),
        fetchTasksByCategory('focus'),
        fetchTasksByCategory('other'),
      ]);
      setEss(e.map(rowToTask));
      setFocus(f.map(rowToTask));
      setOther(o.map(rowToTask));
      setProjectList(loadProjects());
    } catch {
      // keep
    }
  }, []);

  useEffect(() => {
    loadAll();
    setProjectList(loadProjects());
    const notes = loadScratchNotes();
    setScratchNotes(notes);

    // Periodic 3-day cleanup check for scratchpad
    const interval = setInterval(() => {
      setScratchNotes((prev) => {
        const cleaned = purgeExpiredScratchNotes(prev);
        if (cleaned.length !== prev.length) {
          saveScratchNotes(cleaned);
          return cleaned;
        }
        return prev;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [loadAll]);

  const toggleTask = (setter: React.Dispatch<React.SetStateAction<Task[]>>) =>
    async (id: string) => {
      let newDone = false;
      setter((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            newDone = !t.done;
            return { ...t, done: newDone };
          }
          return t;
        })
      );
      try {
        await toggleTaskDone(id, newDone);
      } catch {
        setter((prev) => prev.map((t) => (t.id === id ? { ...t, done: !newDone } : t)));
      }
    };

  // 重点图标直接切换重点状态
  const togglePriority = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updatedPriority = false;

    const updateList = (list: Task[]) =>
      list.map((t) => {
        if (t.id === id) {
          updatedPriority = !t.is_priority;
          return { ...t, is_priority: updatedPriority };
        }
        return t;
      });

    setEss((prev) => updateList(prev));
    setFocus((prev) => updateList(prev));
    setOther((prev) => updateList(prev));

    try {
      await updateTask(id, { is_priority: updatedPriority });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenNewTask = (cat: 'essential' | 'focus') => {
    setNewTaskCategory(cat);
  };

  const navigate = (p: string) => {
    if (page === 'home' && p !== 'home') {
      scrollRestoreRef.current = window.scrollY;
      setPage(p);
    } else if (p === 'home') {
      setPage('home');
    } else {
      setPage(p);
      window.scrollTo({ top: 0 });
    }
  };

  useEffect(() => {
    if (page === 'home' && scrollRestoreRef.current !== null) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollRestoreRef.current!, behavior: 'auto' });
        scrollRestoreRef.current = null;
      });
    }
  }, [page]);

  const previousPageRef = useRef<string>('home');

  const openTask = (id: string) => {
    if (page === 'home') scrollRestoreRef.current = window.scrollY;
    previousPageRef.current = page;
    setActiveTaskId(id);
    setPage('task-detail');
    window.scrollTo({ top: 0 });
  };

  const back = () => navigate('home');

  const backFromTask = () => {
    const returnTo = previousPageRef.current || 'home';
    if (returnTo === 'home') {
      navigate('home');
    } else {
      setPage(returnTo);
      window.scrollTo({ top: 0 });
    }
  };

  // Scratchpad actions
  const handleAddScratchNote = (content: string) => {
    const newNote: ScratchNote = {
      id: `note-${Date.now()}`,
      content,
      is_priority: false,
      created_at: Date.now(),
      is_organized: false,
    };
    const next = [newNote, ...scratchNotes];
    setScratchNotes(next);
    saveScratchNotes(next);
  };

  const handleToggleScratchNotePriority = (noteId: string) => {
    const next = scratchNotes.map((n) =>
      n.id === noteId ? { ...n, is_priority: !n.is_priority } : n
    );
    setScratchNotes(next);
    saveScratchNotes(next);
  };

  const handleOrganizeScratchNote = async (
    noteId: string,
    categoryOption: ScratchpadCategoryOption,
    options?: { priority?: 'high' | 'medium' | 'low'; time?: string; date?: string }
  ) => {
    const note = scratchNotes.find((n) => n.id === noteId);
    if (!note || note.is_organized) return;

    const catDef = SCRATCHPAD_CATEGORIES.find((c) => c.id === categoryOption) || {
      category: 'focus' as const,
      task_type: 'single' as const,
    };

    // 1. 创建正式任务进入对应分类与类型，保留重点状态，并应用指定的难度、时间与日期
    const created = await createTask({
      label: note.content,
      category: catDef.category,
      task_type: catDef.task_type,
      priority: options?.priority || 'medium',
      due_time: options?.time || null,
      due_date: options?.date || null,
      is_priority: note.is_priority, // 保留重点状态
      done: false,
    });

    // 2. 速记板中对应记录显示划掉状态，移动至底部，记录 organized_at 时间戳
    const nextNotes = scratchNotes.map((n) =>
      n.id === noteId
        ? {
            ...n,
            is_organized: true,
            organized_at: Date.now(),
            target_category: categoryOption,
            linked_task_id: created?.id,
          }
        : n
    );
    setScratchNotes(nextNotes);
    saveScratchNotes(nextNotes);

    // 刷新任务列表
    loadAll();
  };

  const handleDeleteScratchNote = (noteId: string) => {
    const next = scratchNotes.filter((n) => n.id !== noteId);
    setScratchNotes(next);
    saveScratchNotes(next);
  };

  // ---- Subtasks joined into Today's Focus ----
  const focusSubtasks = useMemo<Task[]>(() => {
    const list: Task[] = [];
    projectList.forEach((proj) => {
      (proj.stages || []).forEach((stage) => {
        (stage.subtasks || []).forEach((sub) => {
          if (sub.in_today_focus) {
            list.push({
              id: `subtask::${proj.id}::${stage.id}::${sub.id}`,
              label: `${stage.name} · ${sub.title}`,
              part_name: stage.name,
              subtask_title: sub.title,
              done: sub.done,
              tag: proj.name,
              start: sub.time,
              due: sub.time,
              due_date: sub.due_date,
              priority: sub.type === 'research' ? 'high' : 'medium',
              is_priority: sub.type === 'research',
              category: 'focus',
              is_subtask: true,
              subtask_type: sub.type,
              project_id: proj.id,
              part_id: stage.id,
              subtask_id: sub.id,
              created_at: sub.createdAt,
            });
          }
        });
      });
    });
    return list;
  }, [projectList]);

  // Combined Focus tasks (focus category tasks + Part subtasks added to focus)
  const combinedFocusTasks = useMemo(() => {
    return sortTasksByPriorityAndTime([...focus, ...focusSubtasks]);
  }, [focus, focusSubtasks]);

  // Handlers for Today's Focus items (handles both standalone tasks and subtasks)
  const handleToggleFocusTask = async (id: string) => {
    if (id.startsWith('subtask::')) {
      const parts = id.split('::');
      const projId = parts[1];
      const stageId = parts[2];
      const subId = parts[3];
      togglePartSubtask(projId, stageId, subId);
      setProjectList(loadProjects());
    } else {
      toggleTask(setFocus)(id);
    }
  };

  const handleOpenFocusTask = (id: string) => {
    if (id.startsWith('subtask::')) {
      const parts = id.split('::');
      const projId = parts[1];
      const stageId = parts[2];
      const subId = parts[3];
      const target = getPartSubtask(projId, stageId, subId);
      if (target?.subtask.type === 'research') {
        setActiveResearch({ projectId: projId, partId: stageId, subtaskId: subId });
        setPage('research');
      } else {
        setActiveProjectId(projId);
        setPage('project-detail');
      }
    } else {
      openTask(id);
    }
  };

  const handleToggleFocusPriority = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (id.startsWith('subtask::')) {
      const parts = id.split('::');
      const projId = parts[1];
      const stageId = parts[2];
      const subId = parts[3];
      // 移出 Today's Focus（不删除原任务）
      toggleSubtaskFocus(projId, stageId, subId);
      setProjectList(loadProjects());
    } else {
      togglePriority(id, e);
    }
  };

  // ---- Sorted Task Lists (Priority first, then time ordered) ----
  const sortedEss = sortTasksByPriorityAndTime(ess);
  const sortedOther = sortTasksByPriorityAndTime(other);

  // ---- Full pages ----
  if (page === 'schedule' || page === 'timeline')
    return (
      <SchedulePage
        initialFocus="timeline"
        onBack={back}
        onOpenTask={openTask}
        onOpenProject={(id) => {
          setActiveProjectId(id);
          setPage('project-detail');
        }}
        onOpenResearch={(projectId, partId, subtaskId) => {
          setActiveProjectId(projectId);
          setActiveResearch({ projectId, partId, subtaskId });
          setPage('research');
        }}
      />
    );
  if (page === 'calendar')
    return (
      <SchedulePage
        initialFocus="calendar"
        onBack={back}
        onOpenTask={openTask}
        onOpenProject={(id) => {
          setActiveProjectId(id);
          setPage('project-detail');
        }}
        onOpenResearch={(projectId, partId, subtaskId) => {
          setActiveProjectId(projectId);
          setActiveResearch({ projectId, partId, subtaskId });
          setPage('research');
        }}
      />
    );
  if (page === 'projects')
    return (
      <ProjectsPage
        onBack={back}
        onOpenProject={(id) => {
          setActiveProjectId(id);
          setPage('project-detail');
        }}
      />
    );
  if (page === 'project-detail' && activeProjectId)
    return (
      <ProjectDetailPage
        projectId={activeProjectId}
        onBack={() => {
          setProjectList(loadProjects());
          setPage('projects');
        }}
        onOpenResearch={(partId, subtaskId) => {
          setActiveResearch({ projectId: activeProjectId, partId, subtaskId });
          setPage('research');
        }}
        onOpenCategory={(catId) => {
          setActiveCategoryId(catId);
          setPage('category-detail');
        }}
      />
    );
  if (page === 'research' && activeResearch)
    return (
      <ResearchPage
        projectId={activeResearch.projectId}
        partId={activeResearch.partId}
        subtaskId={activeResearch.subtaskId}
        onBack={() => {
          setProjectList(loadProjects());
          setPage('project-detail');
        }}
      />
    );
  if (page === 'categories' || page === 'learning')
    return (
      <CategoriesPage
        onBack={back}
        onOpenCategory={(id) => {
          setActiveCategoryId(id);
          setPage('category-detail');
        }}
      />
    );
  if (page === 'category-detail' && activeCategoryId)
    return (
      <CategoryDetailPage
        categoryId={activeCategoryId}
        onBack={() => {
          setPage('categories');
        }}
        onOpenProject={(id) => {
          setActiveProjectId(id);
          setPage('project-detail');
        }}
      />
    );
  if (page === 'routine')
    return (
      <EssentialsPage
        tasks={sortedEss}
        onToggle={toggleTask(setEss)}
        onOpenTask={openTask}
        onTogglePriority={togglePriority}
        onBack={back}
      />
    );
  if (page === 'focus-detail')
    return (
      <FocusPage
        tasks={combinedFocusTasks}
        onToggle={handleToggleFocusTask}
        onOpenTask={handleOpenFocusTask}
        onTogglePriority={handleToggleFocusPriority}
        onBack={back}
      />
    );
  if (page === 'task-list')
    return (
      <OtherTasksPage
        tasks={sortedOther}
        onToggle={toggleTask(setOther)}
        onOpenTask={openTask}
        onTogglePriority={togglePriority}
        onBack={back}
      />
    );
  if (page === 'new-space')
    return (
      <NewIdeaPage
        onBack={back}
        onOpenProject={(id) => {
          setActiveProjectId(id);
          setPage('project-detail');
        }}
        onRefreshTasks={loadAll}
      />
    );
  if (page === 'themes') return <ThemesPage onBack={back} />;
  if (page === 'task-detail' && activeTaskId)
    return (
      <TaskDetailPage
        taskId={activeTaskId}
        onBack={backFromTask}
        onUpdated={loadAll}
        onOpenProject={(projId) => {
          setActiveProjectId(projId);
          setPage('project-detail');
        }}
      />
    );

  // ---- Homepage ----
  return (
    <>
      <div className="aurora-bg">
        <div className="aurora-blob blue" />
        <div className="aurora-blob violet" />
        <div className="aurora-blob magenta" />
      </div>

      <div id="top" className="relative z-10 min-h-screen flex justify-center">
        <main className="w-full max-w-2xl px-4 sm:px-7 py-6 sm:py-12 pb-24 sm:pb-12">
          {/* Header row: Studio OS (Left) - Inspiration (Center) - Scratchpad (Right) with Equal Distance */}
          <header className="mb-5 sm:mb-6 relative flex items-center justify-between">
            {/* Left: Studio OS */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-sky-400 via-violet-500 to-fuchsia-500 shadow-[0_0_18px_rgba(139,92,246,0.45)]" />
              <h1 className="text-lg sm:text-xl font-medium tracking-tight text-white">Studio OS</h1>
            </div>

            {/* Center: Inspiration Board (IdeaButton) - centered directly above Date & Time cards */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <IdeaButton onClick={() => navigate('new-space')} />
            </div>

            {/* Right: Scratchpad Icon (Equal distance from center, clean button without circular badge) */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setIsScratchpadOpen(true)}
                title="Scratchpad"
                aria-label="Scratchpad"
                className="relative w-11 h-11 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center bg-black/60 hover:bg-black/40 border border-white/20 glass glass-glow shadow-lg shadow-black/40 hover:scale-105 active:scale-95 transition-all group backdrop-blur-2xl"
              >
                <PenLine size={18} strokeWidth={1.8} className="text-purple-300 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </header>

          <div className="flex flex-col gap-5 sm:gap-6 min-w-0 w-full">
            {/* 1. Date & Time */}
            <DateTimeCards onNavigate={navigate} />

            {/* Weather strip */}
            <WeatherStrip />

            {/* 2. Schedule / Timeline */}
            <div id="schedule">
              <Timeline onNavigate={navigate} />
            </div>

            {/* 3. Essential / 必备: + 添加任务，○ 打开分类详情页 */}
            <CollapsibleSection
              kicker="Daily"
              title="Essentials"
              defaultVisibleCount={3}
              onAdd={() => handleOpenNewTask('essential')}
              onNavigate={() => navigate('routine')}
            >
              {(visible) => (
                <TaskList
                  tasks={visible === -1 ? sortedEss : sortedEss.slice(0, visible)}
                  onToggle={toggleTask(setEss)}
                  onOpenTask={openTask}
                  onTogglePriority={togglePriority}
                />
              )}
            </CollapsibleSection>


            {/* 4. 项目进度 (Project Progress) */}
            <div id="projects">
              <ProjectProgress projects={projectList} onNavigate={navigate} />
            </div>

            {/* 4.5. 大分类与技能积累系统 (Broad Categories) */}
            <div id="disciplines">
              <BroadCategoriesSection
                onNavigate={navigate}
                onOpenCategory={(catId) => {
                  setActiveCategoryId(catId);
                  setPage('category-detail');
                }}
                onOpenNewCategory={() => {
                  setPage('categories');
                }}
              />
            </div>

            {/* 5. Today's Focus: 包含独立焦点任务与加入 Today's Focus 的制作/研究子任务 */}
            <div id="focus">
              <CollapsibleSection
                kicker="Priority"
                title="Today's Focus"
                defaultVisibleCount={3}
                onAdd={() => handleOpenNewTask('focus')}
                onNavigate={() => navigate('focus-detail')}
              >
                {(visible) => (
                  <TaskList
                    tasks={visible === -1 ? combinedFocusTasks : combinedFocusTasks.slice(0, visible)}
                    onToggle={handleToggleFocusTask}
                    onOpenTask={handleOpenFocusTask}
                    onTogglePriority={handleToggleFocusPriority}
                    showTime={true}
                  />
                )}
              </CollapsibleSection>
            </div>

            <footer className="text-center text-[11px] text-white/25 tracking-wide py-4">
              {new Date().getFullYear()} Studio OS
            </footer>
          </div>
        </main>
      </div>

      {/* New Task Blank Modal:
          - 填写任务名称，选择难度，可选填时间。
          - 重点：默认关闭。
          - 必须点击「完成」才能保存，不自动创建。
          - 保存后进入现有的任务详情页。
      */}
      {newTaskCategory && (
        <NewTaskPage
          initialCategory={newTaskCategory}
          onBack={() => setNewTaskCategory(null)}
          onCreated={(created) => {
            setNewTaskCategory(null);
            loadAll();
            // 保存后进入现有的任务详情页
            openTask(created.id);
          }}
        />
      )}

      {/* Scratchpad Continuous Memo Drawer */}
      <Scratchpad
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
        notes={scratchNotes}
        onAddNote={handleAddScratchNote}
        onToggleNotePriority={handleToggleScratchNotePriority}
        onOrganizeNote={handleOrganizeScratchNote}
        onDeleteNote={handleDeleteScratchNote}
      />
    </>
  );
}
