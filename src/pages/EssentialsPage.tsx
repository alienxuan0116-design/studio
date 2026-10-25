import { useState, useEffect } from 'react';
import PageShell from '../components/PageShell';
import TaskList from '../components/TaskList';
import { sortTasksByPriorityAndTime, loadScratchNotes, ScratchNote } from '@/lib/tasks';
import type { Task } from '@/data';
import { Bookmark, Sparkles } from 'lucide-react';

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
  onOpenTask: (id: string) => void;
  onTogglePriority?: (id: string, e: React.MouseEvent) => void;
  onBack: () => void;
}

export default function EssentialsPage({ tasks, onToggle, onOpenTask, onTogglePriority, onBack }: Props) {
  const sorted = sortTasksByPriorityAndTime(tasks);
  const [connectedNotes, setConnectedNotes] = useState<ScratchNote[]>([]);

  useEffect(() => {
    const allNotes = loadScratchNotes();
    const filtered = allNotes.filter(
      (n) => n.is_organized && (n.target_category === 'essential' || n.target_category === 'single')
    );
    setConnectedNotes(filtered);
  }, []);

  return (
    <PageShell title="Daily Essentials" subtitle="Recurring tasks, routines & connected notes" onBack={onBack}>
      <div className="space-y-6">
        <TaskList
          tasks={sorted}
          onToggle={onToggle}
          onOpenTask={onOpenTask}
          onTogglePriority={onTogglePriority}
        />

        {/* Connected Scratchpad Notes */}
        {connectedNotes.length > 0 && (
          <div className="pt-4 border-t border-white/10 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono text-white/50 px-1">
              <Bookmark size={13} className="text-teal-400" />
              <span>Connected Scratchpad Notes ({connectedNotes.length})</span>
            </div>
            <div className="space-y-2">
              {connectedNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-2xl bg-teal-950/20 border border-teal-500/20 text-xs text-teal-100/90 flex items-start justify-between gap-2"
                >
                  <span className="leading-relaxed">{note.content}</span>
                  {note.is_priority && (
                    <Sparkles size={13} className="text-amber-300 fill-amber-300 shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
