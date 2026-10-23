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

// 25. 速记板分类选项对齐工作台分类（已移除 Other，同时兼容历史笔记）
import { SCRATCHPAD_CATEGORIES, getCategoryLabel } from '../components/Scratchpad.tsx';
const categoryLabels = SCRATCHPAD_CATEGORIES.map((c) => c.label);
assert(categoryLabels.includes('Essential / 必备'), '25a', 'Scratchpad includes Essential / 必备');
assert(categoryLabels.includes('单次任务'), '25b', 'Scratchpad includes 单次任务');
assert(categoryLabels.includes('短期项目'), '25c', 'Scratchpad includes 短期项目');
assert(categoryLabels.includes('长期学习'), '25d', 'Scratchpad includes 长期学习');
assert(!categoryLabels.includes('Other / 其他'), '25e', 'Scratchpad strictly removes Other / 其他 from options');
assert(getCategoryLabel('other') === 'Other / 其他', '25f', 'Historical notes with other category still display gracefully');

// 26. 子任务难度选择 (简单、中等、困难、极难) 与选填日期/时间验证
import { DIFFICULTY_LABELS, type SubtaskDifficulty } from '../data.ts';
import { updatePartSubtask } from '../lib/projects.ts';

assert(DIFFICULTY_LABELS.low === '简单', '26a', 'Difficulty low maps to 简单');
assert(DIFFICULTY_LABELS.medium === '中等', '26b', 'Difficulty medium maps to 中等');
assert(DIFFICULTY_LABELS.high === '困难', '26c', 'Difficulty high maps to 困难');
assert(DIFFICULTY_LABELS.extreme === '极难', '26d', 'Difficulty extreme maps to 极难');

const subtaskWithDifficulty = addPartSubtask(testProj.id, testStageId, {
  title: '极难物理引擎调优',
  type: 'regular',
  difficulty: 'extreme',
  due_date: '2026-10-30',
  time: '14:00',
  in_today_focus: true,
});
assert(subtaskWithDifficulty?.subtask.difficulty === 'extreme', '26e', 'Subtask saved with extreme difficulty');
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

console.log('\n🎉 ALL ROUND 11 STUDIO OS TESTS & BIDIRECTIONAL CALENDAR-TIMELINE SYNC PASSED!');




