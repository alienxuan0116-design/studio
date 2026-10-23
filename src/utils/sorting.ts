import { Task } from '../types.ts';

/**
 * Sorts tasks according to Studio OS rules:
 * 1. Priority tasks first (isPriority === true)
 * 2. Normal tasks after (isPriority === false)
 * 3. Priority tasks retain their time ordering
 * 4. Normal tasks retain their time ordering
 */
export function sortTasksByPriorityAndTime(tasks: Task[]): Task[] {
  const priorityTasks: Task[] = [];
  const normalTasks: Task[] = [];

  for (const task of tasks) {
    if (task.isPriority) {
      priorityTasks.push(task);
    } else {
      normalTasks.push(task);
    }
  }

  // Internal time sorting: if time is defined, order by time, else fallback to createdAt
  const timeComparator = (a: Task, b: Task) => {
    if (a.time && b.time) {
      const cmp = a.time.localeCompare(b.time);
      if (cmp !== 0) return cmp;
    } else if (a.time) {
      return -1;
    } else if (b.time) {
      return 1;
    }
    return (a.createdAt || 0) - (b.createdAt || 0);
  };

  priorityTasks.sort(timeComparator);
  normalTasks.sort(timeComparator);

  return [...priorityTasks, ...normalTasks];
}
