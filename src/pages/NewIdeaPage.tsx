import { useState, useEffect } from 'react';
import {
  Lightbulb,
  Plus,
  Sparkles,
  FolderPlus,
  Trash2,
  Tag,
  ArrowRight,
  ClipboardList,
  Check,
} from 'lucide-react';
import PageShell from '../components/PageShell';
import { createTask, loadScratchNotes, ScratchNote } from '@/lib/tasks';
import { createProject } from '@/lib/projects';

export interface IdeaItem {
  id: string;
  content: string;
  direction?: string;
  is_priority?: boolean;
  tag?: string;
  createdAt: number;
}

const IDEAS_STORAGE_KEY = 'planetwork_ideas_v2';

let memoryIdeas: IdeaItem[] | null = null;

export function loadStoredIdeas(): IdeaItem[] {
  if (typeof localStorage === 'undefined') {
    if (!memoryIdeas) {
      memoryIdeas = [
        {
          id: 'idea-1',
          content: 'A haptic feedback pacing chime for deep work blocks',
          direction: 'Explore Web Audio API synthesized soft bell with Apple Watch vibration pattern.',
          is_priority: true,
          tag: 'Sensory',
          createdAt: Date.now() - 3600000 * 24,
        },
      ];
    }
    return memoryIdeas;
  }
  try {
    const raw = localStorage.getItem(IDEAS_STORAGE_KEY);
    if (!raw) {
      const initial: IdeaItem[] = [
        {
          id: 'idea-1',
          content: 'A haptic feedback pacing chime for deep work blocks',
          direction: 'Explore Web Audio API synthesized soft bell with Apple Watch vibration pattern.',
          is_priority: true,
          tag: 'Sensory',
          createdAt: Date.now() - 3600000 * 24,
        },
      ];
      saveStoredIdeas(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredIdeas(ideas: IdeaItem[]): void {
  if (typeof localStorage === 'undefined') {
    memoryIdeas = ideas;
    return;
  }
  try {
    localStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(ideas));
  } catch (e) {
    console.error('Failed to save ideas', e);
  }
}

interface Props {
  onBack: () => void;
  onOpenProject?: (projectId: string) => void;
  onRefreshTasks?: () => void;
}

const PRESET_TAGS = ['Concept', 'Design', 'Sensory', 'Feature', 'Architecture'];

export default function NewIdeaPage({ onBack, onOpenProject, onRefreshTasks }: Props) {
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [newText, setNewText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('Concept');
  const [editingDirectionId, setEditingDirectionId] = useState<string | null>(null);
  const [directionText, setDirectionText] = useState('');

  // Scratchpad notes available for import
  const [scratchNotes, setScratchNotes] = useState<ScratchNote[]>([]);
  const [showScratchDrawer, setShowScratchDrawer] = useState(false);

  useEffect(() => {
    setIdeas(loadStoredIdeas());
    const notes = loadScratchNotes().filter((n) => !n.is_organized);
    setScratchNotes(notes);
  }, []);

  const handleSaveIdea = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newText.trim()) return;

    const newIdea: IdeaItem = {
      id: `idea-${Date.now()}`,
      content: newText.trim(),
      tag: selectedTag,
      is_priority: false,
      createdAt: Date.now(),
    };

    const next = [newIdea, ...ideas];
    setIdeas(next);
    saveStoredIdeas(next);
    setNewText('');
  };

  const handleTogglePriority = (id: string) => {
    const next = ideas.map((i) =>
      i.id === id ? { ...i, is_priority: !i.is_priority } : i
    );
    setIdeas(next);
    saveStoredIdeas(next);
  };

  const handleDelete = (id: string) => {
    const next = ideas.filter((i) => i.id !== id);
    setIdeas(next);
    saveStoredIdeas(next);
  };

  const handleSaveDirection = (id: string) => {
    const next = ideas.map((i) =>
      i.id === id ? { ...i, direction: directionText.trim() || undefined } : i
    );
    setIdeas(next);
    saveStoredIdeas(next);
    setEditingDirectionId(null);
  };

  // Convert to Task
  const handleConvertToTask = async (idea: IdeaItem) => {
    await createTask({
      label: idea.content,
      description: idea.direction || null,
      category: 'focus',
      priority: idea.is_priority ? 'high' : 'medium',
      is_priority: idea.is_priority ?? false,
    });
    handleDelete(idea.id);
    onRefreshTasks?.();
  };

  // Convert to Project with Deliverable Vision
  const handleConvertToProject = (idea: IdeaItem) => {
    const created = createProject({
      name: idea.content.length > 30 ? `${idea.content.slice(0, 30)}...` : idea.content,
      vision: idea.direction || idea.content,
    });
    handleDelete(idea.id);
    if (onOpenProject) {
      onOpenProject(created.id);
    }
  };

  // Import from scratchpad
  const handleImportScratchNote = (note: ScratchNote) => {
    const newIdea: IdeaItem = {
      id: `idea-scratch-${Date.now()}`,
      content: note.content,
      is_priority: note.is_priority,
      tag: 'Sparks',
      createdAt: Date.now(),
    };
    const next = [newIdea, ...ideas];
    setIdeas(next);
    saveStoredIdeas(next);
    setScratchNotes(scratchNotes.filter((n) => n.id !== note.id));
  };

  // Sort ideas: priority first, then recency
  const sortedIdeas = [...ideas].sort((a, b) => {
    if (a.is_priority && !b.is_priority) return -1;
    if (!a.is_priority && b.is_priority) return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <PageShell title="Idea Box" subtitle="Sparks & Exploration Nursery" onBack={onBack}>
      <div className="flex flex-col gap-6 max-w-xl mx-auto pb-28">
        {/* =====================================================================
            1. QUICK IDEA CAPTURE INPUT (Zero execution pressure)
            ===================================================================== */}
        <form onSubmit={handleSaveIdea} className="glass glass-glow rounded-3xl p-5 border border-white/10 space-y-3.5">
          <div className="flex items-center justify-between text-white/50 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-400" />
              <span>Capture raw intuition without immediate execution</span>
            </div>

            {scratchNotes.length > 0 && (
              <button
                type="button"
                onClick={() => setShowScratchDrawer(!showScratchDrawer)}
                className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-200 transition-colors"
              >
                <ClipboardList size={12} />
                <span>Import Scratchpad ({scratchNotes.length})</span>
              </button>
            )}
          </div>

          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="What spark, aesthetic intuition, or creative hypothesis came to mind?..."
            className="w-full min-h-[85px] rounded-2xl bg-white/5 border border-white/10 p-3.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/60 transition-colors resize-none"
          />

          {/* Tag selector and submit */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {PRESET_TAGS.map((tg) => (
                <button
                  key={tg}
                  type="button"
                  onClick={() => setSelectedTag(tg)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono transition-all ${
                    selectedTag === tg
                      ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                      : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tg}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={!newText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/70 to-purple-600/70 text-white text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:from-amber-500 hover:to-purple-600 transition-all shadow-md shadow-amber-900/20 shrink-0"
            >
              <Plus size={15} strokeWidth={2} />
              <span>Collect Spark</span>
            </button>
          </div>
        </form>

        {/* Scratchpad Import Drawer */}
        {showScratchDrawer && scratchNotes.length > 0 && (
          <div className="glass rounded-3xl p-4 border border-purple-500/30 space-y-2.5 animate-in fade-in duration-150 bg-purple-950/20">
            <div className="flex items-center justify-between text-xs font-mono text-purple-200 px-1">
              <span>Unorganized Scratchpad Notes</span>
              <button
                type="button"
                onClick={() => setShowScratchDrawer(false)}
                className="text-white/40 hover:text-white text-[10px]"
              >
                Close
              </button>
            </div>
            <div className="space-y-1.5">
              {scratchNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/80"
                >
                  <span className="truncate flex-1 pr-2">{note.content}</span>
                  <button
                    type="button"
                    onClick={() => handleImportScratchNote(note)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-600/30 text-purple-200 border border-purple-500/40 text-[10px] hover:bg-purple-600/50 transition-all shrink-0"
                  >
                    <Plus size={11} />
                    <span>To Idea</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            2. STORED SPARKS & CONVERSION MATRIX
            ===================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-white/40">
              Collected Sparks ({ideas.length})
            </span>
            <span className="text-[10px] font-mono text-white/30">
              {ideas.filter((i) => i.is_priority).length} priority sparks
            </span>
          </div>

          {sortedIdeas.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-xs">
              Idea box is clear. Collect creative sparks above without any execution pressure.
            </div>
          ) : (
            sortedIdeas.map((idea) => {
              const isEditingDir = editingDirectionId === idea.id;
              const isPriority = Boolean(idea.is_priority);

              return (
                <div
                  key={idea.id}
                  className={`glass glass-glow rounded-3xl p-5 border transition-all duration-300 space-y-3.5 relative group ${
                    isPriority
                      ? 'bg-purple-950/25 border-purple-500/40 shadow-[0_4px_25px_rgba(168,85,247,0.15)]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Top Bar: Tag, Priority Sparkles & Delete */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {idea.tag && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Tag size={10} />
                          <span>{idea.tag}</span>
                        </span>
                      )}
                      <span className="text-[10px] text-white/30 font-mono">
                        {new Date(idea.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Priority toggle */}
                      <button
                        type="button"
                        onClick={() => handleTogglePriority(idea.id)}
                        aria-label="Toggle priority"
                        className={`p-1.5 rounded-xl transition-all ${
                          isPriority
                            ? 'text-purple-300 bg-purple-500/25'
                            : 'text-white/30 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Sparkles size={14} className={isPriority ? 'fill-purple-400' : ''} />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(idea.id)}
                        className="p-1.5 rounded-xl text-white/30 hover:text-rose-400 transition-colors"
                        aria-label="Delete idea"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Main Thought Content */}
                  <p className="text-sm text-white/95 leading-relaxed font-light pl-0.5">
                    {idea.content}
                  </p>

                  {/* Direction note */}
                  {idea.direction && !isEditingDir && (
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-white/70 leading-relaxed font-light">
                      <span className="text-amber-400/80 font-mono block text-[9px] uppercase tracking-wider mb-1">
                        Exploration Direction:
                      </span>
                      {idea.direction}
                    </div>
                  )}

                  {/* Direction Editing Form */}
                  {isEditingDir && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                      <input
                        type="text"
                        autoFocus
                        value={directionText}
                        onChange={(e) => setDirectionText(e.target.value)}
                        placeholder="Add direction, notes or technical curiosity..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingDirectionId(null)}
                          className="px-2.5 py-1 text-[11px] text-white/50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveDirection(idea.id)}
                          className="px-3 py-1 text-[11px] bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded-lg hover:bg-amber-500/30"
                        >
                          Save Direction
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Conversion Actions: Convert to Task OR Launch Project */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDirectionId(idea.id);
                        setDirectionText(idea.direction || '');
                      }}
                      className="text-white/40 hover:text-amber-300 transition-colors"
                    >
                      {idea.direction ? 'Edit direction' : '+ Add direction'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConvertToTask(idea)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all active:scale-95"
                      >
                        <Sparkles size={12} className="text-purple-400" />
                        <span>To Task</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConvertToProject(idea)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 transition-all shadow-md shadow-purple-950 active:scale-95"
                      >
                        <FolderPlus size={12} className="text-purple-300" />
                        <span>Launch Project</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PageShell>
  );
}
