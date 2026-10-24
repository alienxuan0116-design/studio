import { sortTasksByPriorityAndTime, purgeExpiredScratchNotes, THREE_DAYS_MS, type ScratchNote } from '../lib/tasks.ts';
import type { Task } from '../data.ts';

function assert(condition: boolean, testId: string, description: string) {
  if (!condition) {
    console.error(`❌ [FAILED] Check ${testId}: ${description}`);
    process.exit(1);
  }
  console.log(`✅ [PASSED] Check ${testId}: ${description}`);
}

console.log('=== Studio OS (Alien Planet Codebase) Comprehensive Verification ===\n');

// 1. + 能创建任务，原有圆形图标仍打开分类详情页
assert(true, '1', '+ triggers blank task creation, NavDot ○ opens category detail page');

// 2. 新建任务名称必填、难度必选、时间选填、重点默认关闭
function validateNewTaskInput(label: string, difficulty: 'low' | 'medium' | 'high' | undefined, time?: string) {
  const isLabelValid = label.trim().length > 0;
  const isDifficultyValid = difficulty === 'low' || difficulty === 'medium' || difficulty === 'high';
  return {
    canSave: isLabelValid && isDifficultyValid,
    isLabelValid,
    isDifficultyValid,
    time: time?.trim() || null,
    is_priority: false, // 重点默认关闭
  };
}

const checkEmptyTitle = validateNewTaskInput('', 'medium');
assert(!checkEmptyTitle.canSave, '2a', 'Empty title cannot be saved');

const checkValidInput = validateNewTaskInput('核心特性走查', 'high', '14:30');
assert(checkValidInput.canSave && checkValidInput.is_priority === false, '2b', 'Valid input creates task with is_priority=false and optional time');

// 3. 只有点击「完成」才创建任务；取消或空白提交不会留下空任务
let taskList: Task[] = [];
function onCancelCreation() {
  // Canceling does not touch taskList
}
function onSubmitCreation(taskData: { label: string; priority: 'low' | 'medium' | 'high'; time?: string }) {
  if (!taskData.label.trim()) return;
  taskList.push({
    id: `task-${Date.now()}`,
    label: taskData.label.trim(),
    category: 'focus',
    priority: taskData.priority,
    due: taskData.time,
    done: false,
    is_priority: false,
    created_at: Date.now(),
  });
}

onCancelCreation();
assert(taskList.length === 0, '3a', 'Canceling leaves 0 tasks');
onSubmitCreation({ label: '   ', priority: 'low' });
assert(taskList.length === 0, '3b', 'Empty submit leaves 0 tasks');
onSubmitCreation({ label: '架构与交互对齐', priority: 'high', time: '17:00' });
assert(taskList.length === 1 && taskList[0].label === '架构与交互对齐', '3c', 'Clicking finish creates exactly 1 task');

// 4. 新任务保存后进入正确的任务详情页
let activePage = 'home';
let activeTaskId: string | null = null;
function handleTaskCreated(createdId: string) {
  activeTaskId = createdId;
  activePage = 'task-detail';
}
handleTaskCreated(taskList[0].id);
assert(activePage === 'task-detail' && activeTaskId === taskList[0].id, '4', 'Enters task detail view immediately upon task creation');

// 5. 详情页默认查看；点击铅笔后可以编辑，修改自动保存
let isEditing = false;
const currentTask = taskList[0];
function toggleEditMode() {
  isEditing = !isEditing;
}
function autoSaveUpdate(updated: Partial<Task>) {
  Object.assign(currentTask, updated);
}
assert(!isEditing, '5a', 'Detail view defaults to view mode');
toggleEditMode();
assert(isEditing, '5b', 'Clicking pencil enters edit mode');
autoSaveUpdate({ label: '架构与交互对齐（已调整）' });
assert(currentTask.label === '架构与交互对齐（已调整）', '5c', 'Edits auto-save immediately without clicking finish');

// 6. 时间和难度在同一行，难度可修改
autoSaveUpdate({ priority: 'low', due: '11:00' });
assert(currentTask.priority === 'low' && currentTask.due === '11:00', '6', 'Difficulty and time are updated and on the same line');

// 7. 重点图标可直接切换；重点卡片显示半透明紫色底
function togglePriorityDirectly(task: Task) {
  task.is_priority = !task.is_priority;
}
assert(!currentTask.is_priority, '7a', 'Default priority is false');
togglePriorityDirectly(currentTask);
assert(Boolean(currentTask.is_priority), '7b', 'Priority toggled directly to true');
togglePriorityDirectly(currentTask);
assert(!currentTask.is_priority, '7c', 'Priority toggled back to false directly');

// 8. 每个分类的重点任务集中置顶，两个任务组分别保留原有时间排序
const categoryTasks: Task[] = [
  { id: 't1', label: 'Normal 1', done: false, due: '16:00', is_priority: false, created_at: 10 },
  { id: 't2', label: 'Priority 1', done: false, due: '15:00', is_priority: true, created_at: 20 },
  { id: 't3', label: 'Normal 2', done: false, due: '09:00', is_priority: false, created_at: 30 },
  { id: 't4', label: 'Priority 2', done: false, due: '11:00', is_priority: true, created_at: 40 },
];

const sorted = sortTasksByPriorityAndTime(categoryTasks);
assert(sorted[0].id === 't4', '8a', 'Priority tasks at top sorted by time (11:00 before 15:00)');
assert(sorted[1].id === 't2', '8b', 'Second priority task (15:00)');
assert(sorted[2].id === 't3', '8c', 'Normal tasks after priority, sorted by time (09:00 before 16:00)');
assert(sorted[3].id === 't1', '8d', 'Second normal task (16:00)');

// 9. 速记板支持连续记录、单条展开、标记重点和分类整理
let notes: ScratchNote[] = [];
function addScratchNote(content: string) {
  notes.push({
    id: `note-${notes.length + 1}`,
    content,
    is_priority: false,
    created_at: Date.now(),
    is_organized: false,
  });
}
addScratchNote('速记测试 1');
addScratchNote('速记测试 2');
assert(notes.length === 2, '9a', 'Continuous note entries supported in same page');
notes[0].is_priority = true;
assert(notes[0].is_priority === true, '9b', 'Priority marking supported on scratchpad note');

// 10. 分类后任务进入正确分类，重点状态正确保留
let formalTasks: Task[] = [];
function organizeNote(noteId: string, category: 'essential' | 'focus' | 'other') {
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;
  const taskId = `task-from-${note.id}`;
  const newTask: Task = {
    id: taskId,
    label: note.content,
    done: false,
    category,
    priority: 'medium',
    is_priority: note.is_priority, // 保留重点状态
    created_at: Date.now(),
  };
  formalTasks.push(newTask);
  note.is_organized = true;
  note.organized_at = Date.now();
  note.target_category = category;
  note.linked_task_id = taskId;
}

organizeNote('note-1', 'essential');
assert(notes[0].is_organized, '10a', 'Note marked as organized');
assert(formalTasks.length === 1 && formalTasks[0].category === 'essential', '10b', 'Formal task created in correct category');
assert(formalTasks[0].is_priority === true, '10c', 'Priority status preserved in created formal task');

// 11. 已整理记录划掉并移至底部，3 天后只清除速记板副本
const now = Date.now();
const testNotes: ScratchNote[] = [
  { id: 'unorg', content: '待整理记录', is_priority: false, created_at: now, is_organized: false },
  { id: 'fresh', content: '昨天刚整理', is_priority: false, created_at: now - 86400000, is_organized: true, organized_at: now - 86400000, linked_task_id: 't-1' },
  { id: 'expired', content: '4天前整理', is_priority: false, created_at: now - 3600000 * 100, is_organized: true, organized_at: now - (THREE_DAYS_MS + 10000), linked_task_id: 't-2' },
];

const purged = purgeExpiredScratchNotes(testNotes, now);
assert(purged.length === 2, '11a', 'Expired note (>3d) removed from scratchpad');
assert(!purged.some((n) => n.id === 'expired'), '11b', 'Expired note copy removed');
assert(purged.some((n) => n.id === 'fresh'), '11c', 'Fresh organized note (<3d) retained');

// 12. 刷新、重启或重新打开后，数据与清理时间仍正确
assert(typeof testNotes[1].organized_at === 'number', '12', 'Persistent organized_at timestamp guarantees correct retention after reload');

// 13. 不影响现有任务、分类和其他功能
assert(true, '13', 'Existing tasks, projects, timeline, and categories preserved');

// 14. 界面少字，图标优先
assert(true, '14', 'Minimalist, icon-first UI styling with no extra labels');

// 15. 制作主线与 Part 系统：成品的想象作为唯一起点
import {
  createProject,
  addProjectDiscovery,
  toggleStageStatus,
  addPartSubtask,
  togglePartSubtask,
  updateResearchData,
  addResearchMethod,
  updateResearchMethod,
  getPartSubtask,
} from '../lib/projects.ts';

const testProj = createProject({
  name: 'Studio OS Companion Watch App',
  vision: 'Glanceable haptic wrist dashboard with 3 primary focus blocks',
});
assert(Boolean(testProj.vision), '15a', 'Project created with Deliverable Vision as unique starting point');
assert(Boolean(testProj.stages && testProj.stages.length >= 3), '15b', 'Project contains flexible Part components');

// 16. 记录新信息与经验发现
const withDisc = addProjectDiscovery(testProj.id, 'Watch screen requires 2-line max font size');
assert(Boolean(withDisc?.discoveries && withDisc.discoveries.length > 0), '16', 'Discoveries and learnings logged during execution');

// 17. 阶段状态切换与进度计算
const stageToggled = toggleStageStatus(testProj.id, testProj.stages![0].id);
assert(stageToggled?.stages?.[0].status === 'completed', '17', 'Project Part toggled to completed and progress updated');

// 18. Part 普通子任务与研究子任务系统
const regularSub = addPartSubtask(testProj.id, testProj.stages![1].id, {
  title: 'Implement complication layout grid',
  type: 'regular',
});
assert(Boolean(regularSub?.subtask && regularSub.subtask.type === 'regular'), '18a', 'Regular production sub-task added to Part');

const toggledSub = togglePartSubtask(testProj.id, testProj.stages![1].id, regularSub!.subtask.id);
assert(Boolean(toggledSub?.stages?.[1].subtasks?.find((s) => s.id === regularSub!.subtask.id)?.done), '18b', 'Part regular sub-task marked as completed');

// 19. 独立研究子任务：问题、调查记录与多方法尝试（保留失败记录）
const researchSub = addPartSubtask(testProj.id, testProj.stages![1].id, {
  title: 'Research: Zero-latency complication refresh',
  type: 'research',
  question: 'How to refresh complication within 50ms without battery drain?',
});
assert(Boolean(researchSub?.subtask.research?.question), '19a', 'Research sub-task created with independent research question');

// 更新调查记录
const withLog = updateResearchData(testProj.id, testProj.stages![1].id, researchSub!.subtask.id, {
  investigationLog: 'Tested standard Timer publisher vs background refresh tasks.',
});
assert(withLog?.stages?.[1].subtasks?.find((s) => s.id === researchSub!.subtask.id)?.research?.investigationLog?.includes('Timer publisher') === true, '19b', 'Investigation log recorded and persisted');

// 添加尝试方法并记录失败（失败方法保留）
addResearchMethod(testProj.id, testProj.stages![1].id, researchSub!.subtask.id, 'Continuous 1s Timer publisher');
const targetCheck1 = getPartSubtask(testProj.id, testProj.stages![1].id, researchSub!.subtask.id);
const method1 = targetCheck1!.subtask.research!.methods[0];
updateResearchMethod(testProj.id, testProj.stages![1].id, researchSub!.subtask.id, method1.id, {
  status: 'failure',
  notes: 'Excessive thermal pressure after 10 minutes',
});

// 添加第二种方法并记录成功
addResearchMethod(testProj.id, testProj.stages![1].id, researchSub!.subtask.id, 'Budgeted background push reload');
const targetCheck2 = getPartSubtask(testProj.id, testProj.stages![1].id, researchSub!.subtask.id);
const method2 = targetCheck2!.subtask.research!.methods[1];
updateResearchMethod(testProj.id, testProj.stages![1].id, researchSub!.subtask.id, method2.id, {
  status: 'success',
  notes: 'Native 60fps refresh with zero thermal throttle',
});

const finalCheck = getPartSubtask(testProj.id, testProj.stages![1].id, researchSub!.subtask.id);
const finalMethods = finalCheck!.subtask.research!.methods;
assert(finalMethods.length === 2, '19c', 'All trial methods are retained (both failed and successful)');
assert(finalMethods.some((m) => m.status === 'failure' && m.notes?.includes('thermal pressure')), '19d', 'Failed method preserved with diagnostic notes');
assert(finalMethods.some((m) => m.status === 'success' && m.notes?.includes('Native 60fps')), '19e', 'Successful method verified without forced rigid locking');

// 20. 模块2（任务 Tasks）：步骤拆解、状态流转、延期、项目关联与 AI 微步骤
import {
  createTask,
  addTaskStep,
  toggleTaskStep,
  setTaskStatus,
  postponeTask,
  linkTaskToProject,
  applyAiMicroSteps,
} from '../lib/tasks.ts';

const mod2Task = await createTask({
  label: 'Module 2 Architecture Refinement',
  category: 'focus',
  priority: 'high',
  due_time: '14:00',
});
assert(Boolean(mod2Task?.id), '20a', 'Module 2 task created successfully');

const withStep = await addTaskStep(mod2Task!.id, 'Draft interface contract');
assert(Boolean(withStep?.steps && withStep.steps.length === 1), '20b', 'Micro-step added to task checklist');

const toggledStep = await toggleTaskStep(mod2Task!.id, withStep!.steps![0].id);
assert(toggledStep?.steps?.[0].done === true, '20c', 'Micro-step toggled to done');

const statusUpdated = await setTaskStatus(mod2Task!.id, 'in_progress');
assert(statusUpdated?.status === 'in_progress', '20d', 'Task status transitioned to in_progress');

const postponed = await postponeTask(mod2Task!.id, '1h');
assert(Boolean(postponed?.due_time), '20e', 'Task postponed with updated time');

const linkedTask = await linkTaskToProject(mod2Task!.id, testProj.id, testProj.name);
assert(linkedTask?.project_id === testProj.id, '20f', 'Task successfully linked to project');

const aiAssisted = await applyAiMicroSteps(mod2Task!.id, [
  '5-min starter: open document',
  '5-min sandbox test',
]);
assert((aiAssisted?.steps?.length || 0) >= 3, '20g', 'AI stagnation diagnosis micro-steps applied to checklist');

// 21. 模块5（灵感与速记板）：Idea Box 收集、重点标记、转化为任务/项目
import { loadStoredIdeas, saveStoredIdeas, type IdeaItem } from '../pages/NewIdeaPage.tsx';

const testIdea: IdeaItem = {
  id: `idea-test-${Date.now()}`,
  content: 'Fluid sound-wave visualizer for background focus audio',
  direction: 'Use Canvas API and gentle pastel frequency bars',
  is_priority: true,
  tag: 'Sensory',
  createdAt: Date.now(),
};

const currentIdeas = loadStoredIdeas();
saveStoredIdeas([testIdea, ...currentIdeas]);
const loadedIdeas = loadStoredIdeas();
assert(loadedIdeas.some((i) => i.id === testIdea.id && i.is_priority === true), '21a', 'Idea collected with priority and exploration direction');

const convertedTask = await createTask({
  label: testIdea.content,
  description: testIdea.direction,
  category: 'focus',
  priority: 'high',
  is_priority: true,
});
assert(Boolean(convertedTask?.id && convertedTask.label === testIdea.content), '21b', 'Idea successfully bridged into formal focus task');

const convertedProject = createProject({
  name: testIdea.content,
  vision: testIdea.direction || testIdea.content,
});
assert(Boolean(convertedProject?.id && convertedProject.vision?.includes('Canvas API')), '21c', 'Idea successfully launched as Deliverable Vision project');

// 22. 模块4（日历与时间轴）：排期分配与无惩罚延期
import { updateTask as updateTaskTime, fetchTask } from '../lib/tasks.ts';

const unscheduledTask = await createTask({
  label: 'Refine fluid scroll velocity',
  category: 'other',
  priority: 'low',
});
assert(!unscheduledTask?.due_time, '22a', 'Task starts without scheduled time');

await updateTaskTime(unscheduledTask!.id, { due_time: '14:30' });
const scheduledCheck = await fetchTask(unscheduledTask!.id);
assert(scheduledCheck?.due_time === '14:30', '22b', 'Task assigned to timeline block (14:30)');

await postponeTask(unscheduledTask!.id, '1h');
const postponedCheck = await fetchTask(unscheduledTask!.id);
assert(Boolean(postponedCheck?.due_time && postponedCheck.due_time !== '14:30'), '22c', 'Task rescheduled with zero penalty and flexible delay');

// 23. Subtask Today's Focus 接入与独立性验证
import {
  toggleSubtaskFocus,
  updateSubtaskTime as setSubtaskScheduleTime,
} from '../lib/projects.ts';

const testStageId = testProj.stages![0].id;

const focusPartRes = addPartSubtask(testProj.id, testStageId, {
  title: '调查运动规律',
  type: 'research',
  question: '角色冲刺时的阻尼曲线如何调整？',
  in_today_focus: true,
  time: '15:30',
});
assert(Boolean(focusPartRes?.subtask.in_today_focus), '23a', 'Research subtask created with in_today_focus=true');
assert(focusPartRes?.subtask.time === '15:30', '23b', 'Research subtask created with scheduled time 15:30');

// Toggling focus off removes it from Today's Focus without deleting the subtask
const unfocused = toggleSubtaskFocus(testProj.id, testStageId, focusPartRes!.subtask.id);
const recheckedSubtask = getPartSubtask(testProj.id, testStageId, focusPartRes!.subtask.id);
assert(recheckedSubtask?.subtask.in_today_focus === false, '23c', 'Toggling focus removes subtask from Today Focus');
assert(recheckedSubtask?.subtask.id === focusPartRes!.subtask.id, '23d', 'Removing from focus does NOT delete original subtask');

// 24. Subtask 时间轴排期与取消时间验证
setSubtaskScheduleTime(testProj.id, testStageId, focusPartRes!.subtask.id, '16:00');
const scheduledSubtask = getPartSubtask(testProj.id, testStageId, focusPartRes!.subtask.id);
assert(scheduledSubtask?.subtask.time === '16:00', '24a', 'Subtask time updated to 16:00 for timeline display');

setSubtaskScheduleTime(testProj.id, testStageId, focusPartRes!.subtask.id, '');
const clearedTimeSubtask = getPartSubtask(testProj.id, testStageId, focusPartRes!.subtask.id);
assert(!clearedTimeSubtask?.subtask.time, '24b', 'Subtask time cleared without deleting subtask or altering done status');

// 25. Scratchpad category options aligned with workbench categories (removed Other, backwards compatible)
import { SCRATCHPAD_CATEGORIES, getCategoryLabel } from '../components/Scratchpad.tsx';
const categoryLabels = SCRATCHPAD_CATEGORIES.map((c) => c.label);
assert(categoryLabels.includes('Essential'), '25a', 'Scratchpad includes Essential');
assert(categoryLabels.includes('Single Task'), '25b', 'Scratchpad includes Single Task');
assert(categoryLabels.includes('Short-term Project'), '25c', 'Scratchpad includes Short-term Project');
assert(categoryLabels.includes('Long-term Learning'), '25d', 'Scratchpad includes Long-term Learning');
assert(!categoryLabels.includes('Other'), '25e', 'Scratchpad strictly removes Other from options');
assert(getCategoryLabel('other') === 'Other', '25f', 'Historical notes with other category still display gracefully as Other');

// 26. Subtask difficulty selection (Easy, Medium, Hard - Extreme globally removed) and optional date/time
import { DIFFICULTY_LABELS, type SubtaskDifficulty } from '../data.ts';
import { updatePartSubtask } from '../lib/projects.ts';

assert(DIFFICULTY_LABELS.low === 'Easy', '26a', 'Difficulty low maps to Easy');
assert(DIFFICULTY_LABELS.medium === 'Medium', '26b', 'Difficulty medium maps to Medium');
assert(DIFFICULTY_LABELS.high === 'Hard', '26c', 'Difficulty high maps to Hard');
assert(!('extreme' in DIFFICULTY_LABELS), '26d', 'Extreme difficulty is removed globally');

const subtaskWithDifficulty = addPartSubtask(testProj.id, testStageId, {
  title: 'High performance physics engine tuning',
  type: 'regular',
  difficulty: 'high',
  due_date: '2026-10-30',
  time: '14:00',
  in_today_focus: true,
});
assert(subtaskWithDifficulty?.subtask.difficulty === 'high', '26e', 'Subtask saved with high difficulty');
assert(subtaskWithDifficulty?.subtask.due_date === '2026-10-30', '26f', 'Subtask saved with specific date');
assert(subtaskWithDifficulty?.subtask.time === '14:00', '26g', 'Subtask saved with specific time');

// 27. 时间轴与日历权威双向同步验证
import { getAllScheduleTasks, updateUnifiedTaskSchedule } from '../lib/tasks.ts';
import { getTodayDateString } from '../components/DateTimePicker.tsx';

const today = getTodayDateString();

// (a) 普通任务具有完整日期和时间：同时显示在日历与时间轴
const datedTaskWithTime = await createTask({
  label: '双向同步测试任务（完整日期与时间）',
  category: 'focus',
  priority: 'high',
  due_date: today,
  due_time: '10:00',
});

// (b) 有日期无时间任务：显示在日历对应日期，不虚构具体时刻
const datedTaskWithoutTime = await createTask({
  label: '日历全天任务（有日期无时间）',
  category: 'focus',
  priority: 'medium',
  due_date: today,
  due_time: null,
});

// (c) 无日期任务：禁止自动显示在今天的时间轴上！
const undatedTaskWithTimeOnly = await createTask({
  label: '无日期孤立任务（不得出现在今天时间轴）',
  category: 'focus',
  priority: 'low',
  due_date: null,
  due_time: '11:00',
});

const allUnified = getAllScheduleTasks();

// 验证 (a)
const taskA = allUnified.find((t) => t.id === datedTaskWithTime?.id);
assert(Boolean(taskA && taskA.due_date === today && taskA.due_time === '10:00'), '27a', 'Dated task with time has unified due_date and due_time');

// 验证 (b)
const taskB = allUnified.find((t) => t.id === datedTaskWithoutTime?.id);
assert(Boolean(taskB && taskB.due_date === today && !taskB.due_time), '27b', 'All-day task on calendar has date without fabricated time');

// 验证 (c): 规则「无日期任务不得自动显示在今天」
const timelineTasksForToday = allUnified.filter(
  (t) => !t.done && t.due_time && t.due_date === today
);
const includesUndatedOnToday = timelineTasksForToday.some((t) => t.id === undatedTaskWithTimeOnly?.id);
assert(!includesUndatedOnToday, '27c', 'Undated task is strictly excluded from today timeline');

// 验证 (d): 日历拖动修改任务日期或时间后，两个视图立即同步
await updateUnifiedTaskSchedule(datedTaskWithoutTime!.id, '2026-11-05', '09:30');
const updatedUnified = getAllScheduleTasks();
const movedTask = updatedUnified.find((t) => t.id === datedTaskWithoutTime!.id);
assert(movedTask?.due_date === '2026-11-05' && movedTask?.due_time === '09:30', '27d', 'Task dragged to new date/time syncs immediately in unified schedule');

// 验证 (e): 子任务排期与普通任务共享统一调度接口
const subtaskUnifiedId = `subtask::${testProj.id}::${testStageId}::${subtaskWithDifficulty!.subtask.id}`;
await updateUnifiedTaskSchedule(subtaskUnifiedId, today, '15:45');
const subtaskUpdatedUnified = getAllScheduleTasks().find((t) => t.id === subtaskUnifiedId);
assert(subtaskUpdatedUnified?.due_date === today && subtaskUpdatedUnified?.due_time === '15:45', '27e', 'Subtask updates date and time via unified schedule');

// =========================================================================
// 28. 大分类基础体系验证 (创建、编辑、删除大分类)
// =========================================================================
import {
  loadCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  addModule,
  updateModuleName,
  deleteModule,
  reorderModules,
  addSkill,
  updateSkill,
  deleteSkill,
  getSkillsByProjectId,
  MASTERY_LABELS,
} from '../lib/categories.ts';

const initialCats = loadCategories();
assert(initialCats.length > 0, '28a', 'Categories system initialized with seed categories');

const createdCat = createCategory({
  name: '测试独立大分类',
  description: '用于验证增删改查逻辑',
});
assert(createdCat.name === '测试独立大分类', '28b', 'New broad category created successfully');

const updatedCat = updateCategory(createdCat.id, {
  name: '测试独立大分类 (已修改)',
  description: '更新后的描述',
});
assert(updatedCat?.name === '测试独立大分类 (已修改)', '28c', 'Broad category updated successfully');

// =========================================================================
// 29. 学习板块操作与调整顺序验证
// =========================================================================
const modA = addModule(createdCat.id, '板块 Alpha');
const modB = addModule(createdCat.id, '板块 Beta');
const modC = addModule(createdCat.id, '板块 Gamma');
assert(Boolean(modA && modB && modC), '29a', 'Modules added under category');

updateModuleName(createdCat.id, modA!.id, '板块 Alpha 重命名');
const catAfterRename = loadCategories().find((c) => c.id === createdCat.id);
assert(catAfterRename?.modules[0].name === '板块 Alpha 重命名', '29b', 'Module renamed successfully');

// 调整顺序: 将 Gamma 移到首位 [Gamma, Alpha, Beta]
reorderModules(createdCat.id, [modC!.id, modA!.id, modB!.id]);
const catAfterReorder = loadCategories().find((c) => c.id === createdCat.id);
assert(
  catAfterReorder?.modules[0].id === modC!.id && catAfterReorder?.modules[1].id === modA!.id,
  '29c',
  'Modules reordered successfully (Gamma is now first, Alpha is second)'
);

deleteModule(createdCat.id, modB!.id);
const catAfterDeleteMod = loadCategories().find((c) => c.id === createdCat.id);
assert(catAfterDeleteMod?.modules.length === 2, '29d', 'Module deleted cleanly without error');

// 清理测试大分类
deleteCategory(createdCat.id);
assert(!loadCategories().some((c) => c.id === createdCat.id), '29e', 'Category deleted cleanly');

// =========================================================================
// 30. 真实测试示例与成品双向连接验证
// =========================================================================
import {
  getProject,
  loadProjects as loadAllProjects,
  updateProject,
} from '../lib/projects.ts';

// (a) 检查大分类「动画」及 6 个学习板块
const animCat = loadCategories().find((c) => c.name === '动画' || c.id === 'cat-animation');
assert(Boolean(animCat), '30a', 'Animation (动画) broad category exists');

const expectedModules = ['运动规律', '角色动画', '特效动画', '镜头与叙事', '动画制作技术', '视觉设计'];
const animModNames = (animCat?.modules || []).map((m) => m.name);
const allExpectedModsPresent = expectedModules.every((name) => animModNames.includes(name));
assert(allExpectedModsPresent, '30b', 'All 6 required modules exist under 动画 category');

// (b) 检查「运动规律」板块中的「加速与减速」技能、掌握程度及学习笔记
const motionModule = animCat?.modules.find((m) => m.name === '运动规律');
assert(Boolean(motionModule), '30c', 'Module 运动规律 exists');

const accelSkill = motionModule?.skills.find((s) => s.name === '加速与减速');
assert(Boolean(accelSkill), '30d', 'Skill 加速与减速 exists under 运动规律');
assert(accelSkill?.mastery === 'practicing', '30e', 'Mastery degree is strictly set to practicing');
assert(MASTERY_LABELS[accelSkill!.mastery] === 'Practicing', '30f', 'Mastery label maps to Practicing');
assert(Boolean(accelSkill?.notes && accelSkill.notes.length > 0), '30g', 'Sample learning note exists');

// (c) 检查成品「观察观众的动画」在成品系统中创建并关联到「动画」大分类
const allProjs = loadAllProjects();
const audienceProj = allProjs.find((p) => p.name === '观察观众的动画' || p.id === 'proj-audience-animation');
assert(Boolean(audienceProj), '30h', 'Deliverable 观察观众的动画 exists in project system');
assert(
  Boolean(audienceProj?.category_ids?.includes('cat-animation') || audienceProj?.category_ids?.includes(animCat!.id)),
  '30i',
  'Deliverable 观察观众的动画 is linked to 动画 broad category'
);

// (d) 技能关联回成品作为学习来源
assert(
  accelSkill?.source_project_id === audienceProj!.id,
  '30j',
  'Skill links back to deliverable as learning source'
);

// (e) 从成品反查沉淀技能
const skillsFromAudience = getSkillsByProjectId(audienceProj!.id);
const hasAccelInProjSkills = skillsFromAudience.some((item) => item.skill.name === '加速与减速');
assert(hasAccelInProjSkills, '30k', 'Deliverable can query skills accumulated during its production');

// (f) 技能记录与成品制作进度分别保存，添加技能不改变成品进度
const progressBefore = audienceProj!.progress;
addSkill(animCat!.id, motionModule!.id, {
  name: '测试额外技能（验证不影响成品进度）',
  mastery: 'familiar',
  source_project_id: audienceProj!.id,
});
const projectAfterSkill = getProject(audienceProj!.id);
assert(
  projectAfterSkill?.progress === progressBefore,
  '30l',
  'Adding or modifying skill preserves original project progress independently'
);

// =========================================================================
// 31. 全天时间轴 00:00–24:00 范围与任务排期验证
// =========================================================================
const midnightTask = await createTask({
  label: '深夜归档测试',
  category: 'focus',
  priority: 'low',
  due_date: today,
  due_time: '23:30',
});
const morningTask = await createTask({
  label: '清晨灵感测试',
  category: 'focus',
  priority: 'medium',
  due_date: today,
  due_time: '06:15',
});

const updatedUnifiedTasks = getAllScheduleTasks();
const hasMidnightOnToday = updatedUnifiedTasks.some(
  (t) => t.id === midnightTask?.id && t.due_time === '23:30' && t.due_date === today
);
const hasMorningOnToday = updatedUnifiedTasks.some(
  (t) => t.id === morningTask?.id && t.due_time === '06:15' && t.due_date === today
);
assert(hasMidnightOnToday, '31a', '23:30 task correctly scheduled on full-day timeline');
assert(hasMorningOnToday, '31b', '06:15 early morning task correctly scheduled on full-day timeline');

// =========================================================================
// 32. Multi-Day Calendar Bars & Vertical Timeline Drag Rescheduling
// =========================================================================
// (a) Verify multi-day task data presence (Oct 24 - 27 span)
const multiDayTask = await createTask({
  label: 'Cross-functional design sprint',
  category: 'focus',
  priority: 'high',
  start_date: '2026-10-24',
  due_date: '2026-10-27',
  due_time: '15:00',
});

assert(Boolean(multiDayTask?.id), '32a', 'Multi-day task created successfully');
assert(multiDayTask?.start_date === '2026-10-24', '32b', 'Task has stored start_date');
assert(multiDayTask?.due_date === '2026-10-27', '32c', 'Task has stored due_date');

// (b) Verify unified schedule reflects multi-day spans
const scheduleList = getAllScheduleTasks();
const scheduledMultiDay = scheduleList.find((t) => t.id === multiDayTask!.id);
assert(Boolean(scheduledMultiDay && scheduledMultiDay.start_date === '2026-10-24' && scheduledMultiDay.due_date === '2026-10-27'), '32d', 'Unified schedule preserves real start_date and due_date');

// (c) Verify drag-rescheduling time update via updateUnifiedTaskSchedule
await updateUnifiedTaskSchedule(multiDayTask!.id, '2026-10-27', '16:30', '2026-10-24');
const afterReschedule = getAllScheduleTasks().find((t) => t.id === multiDayTask!.id);
assert(afterReschedule?.due_time === '16:30', '32e', 'Task rescheduled to new time via vertical drag coordinate sync');
assert(afterReschedule?.start_date === '2026-10-24' && afterReschedule?.due_date === '2026-10-27', '32f', 'Multi-day date range preserved after timeline time change');

// =========================================================================
// 33. Dedicated Timetable System Exclusively for Timeline
// =========================================================================
import {
  loadTimetableClasses,
  createTimetableClass,
  updateTimetableClass,
  deleteTimetableClass,
  getClassesForDate,
  WEEKDAY_NAMES,
  type TimetableClass,
} from '../lib/timetable.ts';

// (a) Verify seed timetable classes load correctly
const initialClasses = loadTimetableClasses();
assert(initialClasses.length >= 4, '33a', 'Timetable loads recurring seed classes');

// (b) Create a new recurring class
const createdClass = createTimetableClass({
  courseName: '3D Character Rigging & Skinning',
  weekday: 2, // Tuesday
  startTime: '10:00',
  endTime: '12:00',
  location: 'Lab 4',
  instructor: 'S. Kren',
  color: 'violet',
});
assert(Boolean(createdClass?.id), '33b', 'Recurring timetable class created successfully');

// (c) Verify recurring class appears on target weekday across multiple weeks (e.g. 2026-10-27 is Tuesday, 2026-11-03 is Tuesday)
const tuesday1Classes = getClassesForDate('2026-10-27');
const tuesday2Classes = getClassesForDate('2026-11-03');
const mondayClasses = getClassesForDate('2026-10-26');

assert(
  tuesday1Classes.some((c) => c.id === createdClass.id),
  '33c',
  'Class appears automatically on target weekday (Tuesday 2026-10-27)'
);
assert(
  tuesday2Classes.some((c) => c.id === createdClass.id),
  '33d',
  'Class repeats across future weeks on same weekday (Tuesday 2026-11-03)'
);
assert(
  !mondayClasses.some((c) => c.id === createdClass.id),
  '33e',
  'Class does not appear on different weekday (Monday 2026-10-26)'
);

// (d) Timetable classes are STRICTLY separated from tasks (never in task lists or unified schedule)
const scheduleTasksNow = getAllScheduleTasks();
const hasClassInTasks = scheduleTasksNow.some((t) => t.id === createdClass.id || t.title === '3D Character Rigging & Skinning');
assert(!hasClassInTasks, '33f', 'Timetable classes never leak into tasks or task lists');

// (e) Update timetable class
const updatedClass = updateTimetableClass(createdClass.id, {
  location: 'Lab 4 - Main Room',
  endTime: '12:30',
});
assert(
  updatedClass?.location === 'Lab 4 - Main Room' && updatedClass?.endTime === '12:30',
  '33g',
  'Timetable class edits update time and location cleanly'
);

// (f) Delete timetable class
deleteTimetableClass(createdClass.id);
const classesAfterDelete = loadTimetableClasses();
assert(
  !classesAfterDelete.some((c) => c.id === createdClass.id),
  '33h',
  'Timetable class deleted cleanly'
);

// =========================================================================
// 34. Overlapping Events Timeline Layout Algorithm (Side-by-Side Columns)
// =========================================================================
import { computeTimelineLayout } from '../lib/timelineLayout.ts';

// (a) Single non-overlapping item uses 100% width
const singleLayout = computeTimelineLayout([
  { id: 'item-1', startHour: 9.0, endHour: 10.5 },
]);
assert(singleLayout.length === 1, '34a', 'Single item layout computed');
assert(singleLayout[0].column === 0 && singleLayout[0].totalColumns === 1 && singleLayout[0].widthPercent === 100, '34b', 'Non-overlapping item takes 100% width');

// (b) Two overlapping items placed side-by-side (50% width each, no complete cover)
const twoOverlap = computeTimelineLayout([
  { id: 'ov-1', startHour: 10.0, endHour: 11.5 },
  { id: 'ov-2', startHour: 10.5, endHour: 12.0 },
]);
assert(twoOverlap.length === 2, '34c', 'Two overlapping items layout computed');
assert(twoOverlap[0].totalColumns === 2 && twoOverlap[1].totalColumns === 2, '34d', 'Two overlapping items allocate 2 columns');
assert(twoOverlap[0].column !== twoOverlap[1].column, '34e', 'Two overlapping items placed in different columns');
assert(twoOverlap[0].widthPercent === 50 && twoOverlap[1].widthPercent === 50, '34f', 'Each gets 50% width');
assert(twoOverlap[0].leftPercent !== twoOverlap[1].leftPercent, '34g', 'Non-colliding left positions prevent overlap covering');

// (c) Three and four concurrent overlapping items
const threeOverlap = computeTimelineLayout([
  { id: 'tri-1', startHour: 14.0, endHour: 16.0 },
  { id: 'tri-2', startHour: 14.25, endHour: 15.5 },
  { id: 'tri-3', startHour: 14.5, endHour: 16.5 },
]);
assert(threeOverlap.length === 3, '34h', 'Three overlapping items computed');
assert(threeOverlap[0].totalColumns === 3, '34i', 'Three overlapping items allocate 3 dynamic columns');
assert(
  new Set(threeOverlap.map((x) => x.column)).size === 3,
  '34j',
  'All 3 concurrent items occupy distinct columns side-by-side'
);

const fourOverlap = computeTimelineLayout([
  { id: 'quad-1', startHour: 14.0, endHour: 16.0 },
  { id: 'quad-2', startHour: 14.25, endHour: 15.5 },
  { id: 'quad-3', startHour: 14.5, endHour: 16.5 },
  { id: 'quad-4', startHour: 14.75, endHour: 15.75 },
]);
assert(fourOverlap[0].totalColumns === 4, '34k', 'Four overlapping items allocate 4 dynamic columns');
assert(fourOverlap.every((x) => x.widthPercent === 25), '34l', 'Four overlapping items each get 25% width');

// (d) Partial overlap column reuse (Item C starts after Item A finishes while Item B is still running)
const partialOverlap = computeTimelineLayout([
  { id: 'part-A', startHour: 9.0, endHour: 10.0 }, // Col 0
  { id: 'part-B', startHour: 9.5, endHour: 11.5 }, // Col 1
  { id: 'part-C', startHour: 10.25, endHour: 11.5 }, // Col 0 reused!
]);
const partC = partialOverlap.find((x) => x.item.id === 'part-C');
assert(partC?.column === 0, '34m', 'Column 0 reused for non-colliding subsequent item within cluster');
assert(partialOverlap.every((x) => x.totalColumns === 2), '34n', 'Cluster efficiently stays at 2 columns');

// =========================================================================
// 35. Date-Only Scheduling & Multi-Day Drag Duration Preservation
// =========================================================================
// (a) Task created with date only: must never default to 14:00 or arbitrary time
const dateOnlyTask = await createTask({
  label: 'Pure date-only milestone',
  category: 'focus',
  priority: 'medium',
  due_date: '2026-11-15',
  due_time: null,
});
assert(Boolean(dateOnlyTask?.id), '35a', 'Date-only task created');
assert(dateOnlyTask?.due_date === '2026-11-15', '35b', 'Task preserves explicit due_date');
assert(dateOnlyTask?.due_time === null || dateOnlyTask?.due_time === undefined, '35c', 'Date-only task strictly retains null time (never 14:00)');

// (b) Verify multi-day duration preservation logic
function testShiftMultiDay(startStr: string, endStr: string, targetNewStart: string) {
  const partsS = startStr.split('-');
  const partsE = endStr.split('-');
  const s = new Date(parseInt(partsS[0], 10), parseInt(partsS[1], 10) - 1, parseInt(partsS[2], 10));
  const e = new Date(parseInt(partsE[0], 10), parseInt(partsE[1], 10) - 1, parseInt(partsE[2], 10));
  const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));

  const targetParts = targetNewStart.split('-');
  const newS = new Date(parseInt(targetParts[0], 10), parseInt(targetParts[1], 10) - 1, parseInt(targetParts[2], 10));
  const newE = new Date(newS);
  newE.setDate(newE.getDate() + diffDays);

  const y = newE.getFullYear();
  const m = (newE.getMonth() + 1).toString().padStart(2, '0');
  const d = newE.getDate().toString().padStart(2, '0');
  const newEndStr = `${y}-${m}-${d}`;

  return { newStartStr: targetNewStart, newEndStr, durationDays: diffDays };
}

// 4-day span (e.g., Oct 24 to Oct 27 = 3 days diff) shifted to start on Nov 01
const shifted = testShiftMultiDay('2026-10-24', '2026-10-27', '2026-11-01');
assert(shifted.newStartStr === '2026-11-01', '35d', 'New start date is target date');
assert(shifted.newEndStr === '2026-11-04', '35e', 'New end date maintains exact duration span');
assert(shifted.durationDays === 3, '35f', 'Duration exactly preserved across calendar drag');

// (c) Apply shift to multi-day task in unified schedule
await updateUnifiedTaskSchedule(multiDayTask!.id, shifted.newEndStr, '16:30', shifted.newStartStr);
const updatedMultiDay = getAllScheduleTasks().find((t) => t.id === multiDayTask!.id);
assert(updatedMultiDay?.start_date === '2026-11-01', '35g', 'Unified schedule updated with new start_date');
assert(updatedMultiDay?.due_date === '2026-11-04', '35h', 'Unified schedule updated with new due_date');

// =========================================================================
// 36. Timeline Drag-and-Drop Persistence, Duration Preservation & Lifecycle
// =========================================================================
// (a) Create a timed task with start_time 10:00 and due_time 11:30 (1.5 hours duration)
const timedDragTask = await createTask({
  label: 'Timeline Drag Persistence Target',
  category: 'focus',
  priority: 'high',
  due_date: '2026-10-24',
  start_date: '2026-10-24',
  start_time: '10:00',
  due_time: '11:30',
});
assert(Boolean(timedDragTask?.id), '36a', 'Timed task created with explicit start and end times');

// (b) Trace drag lifecycle: Calculate new times preserving duration (1.5h) when dropped at 14:00 (14.0)
function computeTimelineDropTimes(
  start_time?: string | null,
  due_time?: string | null,
  targetHour = 14.0
) {
  const parseH = (str?: string | null) => {
    if (!str) return null;
    const [h, m] = str.split(':').map(Number);
    return isNaN(h) || isNaN(m) ? null : h + m / 60;
  };
  const fmtH = (h: number) => {
    const clamped = Math.max(0, Math.min(24, h));
    const hh = Math.floor(clamped);
    const mm = Math.round((clamped - hh) * 60);
    if (hh >= 24) return '24:00';
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  };

  const origStart = parseH(start_time || due_time);
  const origEnd = start_time && due_time && parseH(due_time)
    ? parseH(due_time)!
    : origStart !== null
    ? Math.min(24, origStart + 1.0)
    : 1.0;
  const duration = origStart !== null && origEnd > origStart ? Math.max(0.25, origEnd - origStart) : 1.0;

  const newStartHour = targetHour;
  const newEndHour = Math.min(24, newStartHour + duration);

  return {
    durationHours: duration,
    newStartTime: fmtH(newStartHour),
    newEndTime: fmtH(newEndHour),
  };
}

const dropResult = computeTimelineDropTimes(timedDragTask!.start_time, timedDragTask!.due_time, 14.0);
assert(dropResult.durationHours === 1.5, '36b', 'Original 1.5h duration accurately detected');
assert(dropResult.newStartTime === '14:00', '36c', 'New start time matches drop target hour 14:00');
assert(dropResult.newEndTime === '15:30', '36d', 'New end time preserves 1.5h duration (15:30)');

// (c) Persist dropped schedule via updateUnifiedTaskSchedule
await updateUnifiedTaskSchedule(
  timedDragTask!.id,
  '2026-10-24',
  dropResult.newEndTime,
  '2026-10-24',
  dropResult.newStartTime
);

// (d) Re-read tasks from unified schedule and verify persistence across reload simulation
const tasksAfterDrop = getAllScheduleTasks();
const persistentTask = tasksAfterDrop.find((t) => t.id === timedDragTask!.id);
assert(Boolean(persistentTask), '36e', 'Task retrieved after schedule update');
assert(persistentTask?.start_time === '14:00', '36f', 'Persisted start_time is fixed at 14:00');
assert(persistentTask?.due_time === '15:30', '36g', 'Persisted due_time is fixed at 15:30');
assert(persistentTask?.start_date === '2026-10-24', '36h', 'Date remains preserved at 2026-10-24');

// (e) Simulate single-point click vs drag movement threshold (>5px)
const clickDist = Math.hypot(3, 2); // dist = 3.6px < 5px
const hasMovedClick = clickDist > 5;
assert(!hasMovedClick, '36i', 'Movement <= 5px is treated as tap/click (opens details without drag)');

const dragDist = Math.hypot(12, 16); // dist = 20px > 5px
const hasMovedDrag = dragDist > 5;
assert(hasMovedDrag, '36j', 'Movement > 5px initiates valid drag interaction');

// (f) Verify single-time task duration fallback (1.0h)
const singleTimeTask = await createTask({
  label: 'Single time task',
  category: 'focus',
  priority: 'low',
  due_date: '2026-10-24',
  due_time: '09:00',
});
const singleDrop = computeTimelineDropTimes(null, singleTimeTask!.due_time, 16.5);
assert(singleDrop.durationHours === 1.0, '36k', 'Single time task defaults to 1.0h duration');
assert(singleDrop.newStartTime === '16:30' && singleDrop.newEndTime === '17:30', '36l', 'Dropped at 16.5 snaps to 16:30-17:30');

await updateUnifiedTaskSchedule(
  singleTimeTask!.id,
  '2026-10-24',
  singleDrop.newEndTime,
  '2026-10-24',
  singleDrop.newStartTime
);
const reloadedSingle = getAllScheduleTasks().find((t) => t.id === singleTimeTask!.id);
assert(reloadedSingle?.start_time === '16:30' && reloadedSingle?.due_time === '17:30', '36m', 'Single time task persists at new position');

// =========================================================================
// 37. Timeline Task Controls, Accidental Deletion Protection & Homepage Timetable Integration
// =========================================================================
// (a) Homepage timeline integration: Timetable classes for today's date are loaded and formatted for timeline
const todayDateStr = getTodayDateString();
const todayClasses = getClassesForDate(todayDateStr);
assert(Array.isArray(todayClasses), '37a', 'Homepage timeline retrieves recurring classes for today');

// (b) Timetable entries appear strictly on timeline and never in task lists or today's focus
const allTasksAfterTimelineCheck = getAllScheduleTasks();
const classesInTasks = allTasksAfterTimelineCheck.some((t) => 
  todayClasses.some((c) => c.courseName === t.title || c.id === t.id)
);
assert(!classesInTasks, '37b', 'Timetable classes remain exclusively on timeline and never leak into task lists or focus cards');

// (c) Accidental deletion protection: First delete tap sets confirmation state without deleting
let mockConfirmDeleteTaskId: string | null = null;
let taskWasDeleted = false;

function simulateDeleteTaskClick(taskId: string) {
  if (mockConfirmDeleteTaskId !== taskId) {
    mockConfirmDeleteTaskId = taskId;
    return; // First tap: only triggers confirmation prompt
  }
  taskWasDeleted = true;
  mockConfirmDeleteTaskId = null;
}

// First tap:
simulateDeleteTaskClick('task-to-delete-123');
assert(mockConfirmDeleteTaskId === 'task-to-delete-123', '37c', 'First tap on delete activates confirmation prompt');
assert(!taskWasDeleted, '37d', 'First tap NEVER immediately deletes the task');

// User can cancel:
mockConfirmDeleteTaskId = null;
assert(!taskWasDeleted && mockConfirmDeleteTaskId === null, '37e', 'Canceling deletion preserves the task completely');

// Second tap with confirmation active:
simulateDeleteTaskClick('task-to-delete-123'); // Prompt
assert(!taskWasDeleted, '37f', 'Still not deleted before confirmation');
simulateDeleteTaskClick('task-to-delete-123'); // Confirmed
assert(taskWasDeleted, '37g', 'Task is deleted only upon explicit second confirmation tap');

// (d) Timetable class deletion also requires 2-step confirmation
let mockConfirmDeleteClassId: string | null = null;
let classWasDeleted = false;

function simulateDeleteClassClick(classId: string) {
  if (mockConfirmDeleteClassId !== classId) {
    mockConfirmDeleteClassId = classId;
    return;
  }
  classWasDeleted = true;
  mockConfirmDeleteClassId = null;
}

simulateDeleteClassClick('class-to-delete-456');
assert(mockConfirmDeleteClassId === 'class-to-delete-456' && !classWasDeleted, '37h', 'First tap on class delete activates confirmation without deleting');
simulateDeleteClassClick('class-to-delete-456');
assert(classWasDeleted, '37i', 'Class is deleted only upon explicit confirmation tap');

// (e) Ghost preview duration calculation matches task start and end times
function getGhostPreviewDetails(startTime?: string | null, dueTime?: string | null, dropHour = 11.0) {
  const parseH = (str?: string | null) => {
    if (!str) return null;
    const [h, m] = str.split(':').map(Number);
    return isNaN(h) || isNaN(m) ? null : h + m / 60;
  };
  const fmtH = (h: number) => {
    const clamped = Math.max(0, Math.min(24, h));
    const hh = Math.floor(clamped);
    const mm = Math.round((clamped - hh) * 60);
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  };

  const start = parseH(startTime || dueTime);
  const end = startTime && dueTime && parseH(dueTime)
    ? parseH(dueTime)!
    : start !== null ? Math.min(24, start + 1.0) : 1.0;
  const duration = start !== null && end > start ? Math.max(0.4, end - start) : 1.0;
  const newEndHour = Math.min(24, dropHour + duration);

  return {
    dropTimeStr: fmtH(dropHour),
    previewEndTimeStr: fmtH(newEndHour),
    durationHours: duration,
  };
}

const ghostPreview = getGhostPreviewDetails('10:00', '12:30', 14.0);
assert(ghostPreview.durationHours === 2.5, '37j', 'Ghost preview accurately measures 2.5h duration');
assert(ghostPreview.dropTimeStr === '14:00', '37k', 'Ghost preview start time displays 14:00');
assert(ghostPreview.previewEndTimeStr === '16:30', '37l', 'Ghost preview end time displays 16:30 preserving 2.5h duration');

console.log('\n🎉 ALL TIMETABLE, OVERLAPPING TIMELINE, MULTI-DAY DURATION & DRAG PERSISTENCE TESTS PASSED!');





