import React, { useState } from 'react';
import { Sparkles, X, Plus, FolderInput, CheckCircle2 } from 'lucide-react';
import { ScratchNote, THREE_DAYS_MS } from '@/lib/tasks';
import DateTimePicker from '@/components/DateTimePicker';

export type ScratchpadCategoryOption =
  | 'essential'
  | 'single'
  | 'project'
  | 'learning'
  | 'other'
  | 'focus';

export interface ScratchpadCategoryDef {
  id: ScratchpadCategoryOption;
  label: string;
  category: 'essential' | 'focus' | 'other';
  task_type: 'essential' | 'single' | 'project' | 'learning';
}

export const SCRATCHPAD_CATEGORIES: ScratchpadCategoryDef[] = [
  { id: 'essential', label: 'Essential', category: 'essential', task_type: 'essential' },
  { id: 'single', label: 'Single Task', category: 'focus', task_type: 'single' },
  { id: 'project', label: 'Short-term Project', category: 'focus', task_type: 'project' },
  { id: 'learning', label: 'Long-term Learning', category: 'focus', task_type: 'learning' },
];

export function getCategoryLabel(target?: string): string {
  if (!target) return 'Unorganized';
  if (target === 'essential') return 'Essential';
  if (target === 'single') return 'Single Task';
  if (target === 'project' || target === 'focus') return 'Short-term Project';
  if (target === 'learning') return 'Long-term Learning';
  if (target === 'other') return 'Other';
  return target;
}

interface ScratchpadProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ScratchNote[];
  onAddNote: (content: string) => void;
  onToggleNotePriority: (noteId: string) => void;
  onOrganizeNote: (
    noteId: string,
    category: ScratchpadCategoryOption,
    options?: { priority?: 'high' | 'medium' | 'low'; time?: string; date?: string }
  ) => void;
  onDeleteNote: (noteId: string) => void;
}

export function Scratchpad({
  isOpen,
  onClose,
  notes,
  onAddNote,
  onToggleNotePriority,
  onOrganizeNote,
  onDeleteNote,
}: ScratchpadProps) {
  const [newContent, setNewContent] = useState('');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [organizeDate, setOrganizeDate] = useState('');
  const [organizeTime, setOrganizeTime] = useState('');
  const [organizeDifficulty, setOrganizeDifficulty] = useState<'low' | 'medium' | 'high'>('medium');

  if (!isOpen) return null;

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newContent.trim()) return;
    onAddNote(newContent.trim());
    setNewContent('');
  };

  const handleToggleExpand = (noteId: string) => {
    if (expandedNoteId === noteId) {
      setExpandedNoteId(null);
    } else {
      setExpandedNoteId(noteId);
      setOrganizeTime('');
      setOrganizeDifficulty('medium');
    }
  };

  const unorganizedNotes = notes.filter((n) => !n.is_organized);
  const organizedNotes = notes.filter((n) => n.is_organized);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md h-[100dvh] bg-[#0a0d1f]/95 border-l border-white/10 flex flex-col shadow-2xl relative pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-sky-400 to-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
            <h3 className="text-sm font-medium tracking-wide text-white">Scratchpad</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scratchpad"
            className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Continuous Quick Input at Top */}
        <form onSubmit={handleAdd} className="p-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Quick note..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400/80"
            />
            <button
              type="submit"
              disabled={!newContent.trim()}
              aria-label="Add"
              className={`p-2.5 rounded-2xl transition-all ${
                newContent.trim()
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40'
                  : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
              }`}
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
        </form>

        {/* Continuous Memo Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notes.length === 0 ? (
            <div className="text-center py-24 text-white/30 text-xs">
              No notes yet
            </div>
          ) : (
            <>
              {/* 1. Unorganized Notes (Top) */}
              <div className="space-y-2.5">
                {unorganizedNotes.map((note) => {
                  const isExpanded = expandedNoteId === note.id;
                  return (
                    <div
                      key={note.id}
                      className={`group rounded-2xl border p-3.5 transition-all ${
                        note.is_priority
                          ? 'bg-purple-950/35 border-purple-500/40 text-purple-100 shadow-[0_4px_20px_rgba(168,85,247,0.12)]'
                          : 'bg-white/[0.03] border-white/5 text-white/90 hover:border-white/15 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div
                          className="flex-1 cursor-pointer text-xs leading-relaxed select-none"
                          onClick={() => handleToggleExpand(note.id)}
                        >
                          {note.content}
                        </div>

                        {/* Priority Toggle Sparkles Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleNotePriority(note.id);
                          }}
                          aria-label={note.is_priority ? 'Remove priority' : 'Mark priority'}
                          className={`shrink-0 p-1.5 rounded-xl transition-colors ${
                            note.is_priority
                              ? 'text-purple-300 bg-purple-500/20'
                              : 'text-white/30 hover:text-white/70'
                          }`}
                        >
                          <Sparkles size={14} className={note.is_priority ? 'fill-purple-400' : ''} />
                        </button>
                      </div>

                      {/* Inline Organization Drawer on Same Page */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-3 animate-in fade-in duration-100">
                          <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                            <FolderInput size={13} className="text-white/40" />
                            <span>Organize with Task Options:</span>
                          </div>

                          {/* Options: 1. Month/Day + Time (Supports Today, Future Only) */}
                          <div className="space-y-2.5">
                            <DateTimePicker
                              compact
                              date={organizeDate}
                              time={organizeTime}
                              onChange={(d, t) => {
                                setOrganizeDate(d);
                                setOrganizeTime(t);
                              }}
                            />

                            {/* 2. Difficulty: Low / Mid / High */}
                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-white/45">
                                2. Difficulty
                              </span>
                              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 gap-1 shrink-0">
                                {(['low', 'medium', 'high'] as const).map((level) => {
                                  const isSel = organizeDifficulty === level;
                                  const label = level === 'low' ? 'Easy' : level === 'medium' ? 'Medium' : 'Hard';
                                  return (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() => setOrganizeDifficulty(level)}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                                        isSel
                                          ? level === 'high'
                                            ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                            : level === 'medium'
                                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                                            : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                                          : 'text-white/40 hover:text-white'
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Target Category Buttons to Save */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {SCRATCHPAD_CATEGORIES.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    onOrganizeNote(note.id, cat.id, {
                                      priority: organizeDifficulty,
                                      time: organizeTime.trim() || undefined,
                                      date: organizeDate.trim() || undefined,
                                    });
                                    setExpandedNoteId(null);
                                    setOrganizeDate('');
                                    setOrganizeTime('');
                                    setOrganizeDifficulty('medium');
                                  }}
                                  className="flex-1 min-w-[90px] px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-purple-600/30 hover:text-purple-200 text-white/70 border border-white/10 hover:border-purple-500/40 transition-colors text-center"
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 2. Organized Notes (Moved to Bottom, Strikethrough) */}
              {organizedNotes.length > 0 && (
                <div className="pt-6 border-t border-white/10 mt-6 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-white/40 px-1 mb-2">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-white/40" />
                      Organized (clears in 3 days)
                    </span>
                    <span className="font-mono text-[10px]">{organizedNotes.length} notes</span>
                  </div>

                  {organizedNotes.map((note) => {
                    const categoryLabel = getCategoryLabel(note.target_category);
                    const elapsed = note.organized_at ? Date.now() - note.organized_at : 0;
                    const remainingMs = Math.max(0, THREE_DAYS_MS - elapsed);
                    const remainingHours = Math.ceil(remainingMs / (3600 * 1000));

                    return (
                      <div
                        key={note.id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/[0.02] text-white/40"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          <span className="line-through truncate text-xs text-white/45">
                            {note.content}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] shrink-0 font-mono">
                          {categoryLabel && (
                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/60">
                              {categoryLabel}
                            </span>
                          )}
                          <span className="text-white/35" title="Remaining time before scratchpad purge">
                            {remainingHours}h
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteNote(note.id)}
                            aria-label="Delete note"
                            className="text-white/30 hover:text-rose-400 p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
