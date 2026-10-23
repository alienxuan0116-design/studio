import PageShell from '../components/PageShell';
import TaskList from '../components/TaskList';
import { sortTasksByPriorityAndTime } from '@/lib/tasks';
import type { Task } from '@/data';

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
  onOpenTask: (id: string) => void;
  onTogglePriority?: (id: string, e: React.MouseEvent) => void;
  onBack: () => void;
}

export default function OtherTasksPage({ tasks, onToggle, onOpenTask, onTogglePriority, onBack }: Props) {
  const sorted = sortTasksByPriorityAndTime(tasks);

  return (
    <PageShell title="Other Tasks" subtitle="Lower-priority tasks for later" onBack={onBack}>
      <TaskList
        tasks={sorted}
        onToggle={onToggle}
        onOpenTask={onOpenTask}
        onTogglePriority={onTogglePriority}
      />
    </PageShell>
  );
}
