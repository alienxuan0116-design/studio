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

export default function FocusPage({ tasks, onToggle, onOpenTask, onTogglePriority, onBack }: Props) {
  const sorted = sortTasksByPriorityAndTime(tasks);

  return (
    <PageShell title="Today's Focus" subtitle="Priority tasks for today" onBack={onBack}>
      <TaskList
        tasks={sorted}
        onToggle={onToggle}
        onOpenTask={onOpenTask}
        onTogglePriority={onTogglePriority}
      />
    </PageShell>
  );
}
