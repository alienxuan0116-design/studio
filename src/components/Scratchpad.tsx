import React, { useState } from 'react';
import { Sparkles, X, Plus, FolderInput, CheckCircle2, ExternalLink, ArrowRightLeft } from 'lucide-react';
import { ScratchNote, THREE_DAYS_MS } from '@/lib/tasks';

export type ScratchpadCategoryOption =
  | 'essential'
  | 'finished_product'
  | 'major_category_learning';

export interface ScratchpadCategoryDef {
  id: ScratchpadCategoryOption;
  label: string;
  destinationPage: 'routine' | 'projects' | 'categories';
  description: string;
}

export const SCRATCHPAD_CATEGORIES: ScratchpadCategoryDef[] = [
  {
    id: 'essential',
    label: 'Essential',
    destinationPage: 'routine',
    description: 'Connect to Daily Essentials module',
  },
  {
    id: 'finished_product',
    label: 'Finished Product',
    destinationPage: 'projects',
    description: 'Connect to Finished Product / Projects system',
  },
  {
    id: 'major_category_learning',
    label: 'Major Category / Learning',
    destinationPage: 'categories',
    description: 'Connect to Major Category & Learning system',
  },
];

export function getCategoryLabel(target?: string): string {
  if (!target) return 'Unorganized';
  if (target === 'essential' || target === 'single') return 'Essential';
  if (target === 'finished_product' || target === 'project' || target === 'focus') return 'Finished Product';
  if (target === 'major_category_learning' || target === 'learning') return 'Major Category / Learning';
  if (target === 'other') return 'Other';
  return target;
}

export function getCategoryDestination(target?: string): 'routine' | 'projects' | 'categories' {
  if (target === 'essential' || target === 'single') return 'routine';
  if (target === 'finished_product' || target === 'project' || target === 'focus') return 'projects';
  if (target === 'major_category_learning' || target === 'learning') return 'categories';
  return 'routine';
}

interface ScratchpadProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ScratchNote[];
  onAddNote: (content: string) => void;
  onToggleNotePriority: (noteId: string) => void;
  onOrganizeNote: (
    noteId: string,
    category: ScratchpadCategoryOption
  ) => void;
  onDeleteNote: (noteId: string) => void;
  onNavigate?: (page: string) => void;
}

export function Scratchpad({
  isOpen,
  onClose,
  notes,
  onAddNote,
  onToggleNotePriority,
  onOrganizeNote,
  onDeleteNote,
  onNavigate,
}: ScratchpadProps) {
  const [newContent, setNewContent] = useState('');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [reclassifyingNoteId, setReclassifyingNoteId] = useState<string | null>(null);

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
    }
  };

  const handleOpenDestination = (targetCategory?: string) => {
    const dest = getCategoryDestination(targetCategory);
    if (onNavigate) {
      onNavigate(dest);
      onClose();
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

                      {/* Classification Options: Exactly 3 Options */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2 animate-in fade-in duration-100">
                          <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-1.5">
                            <FolderInput size={13} className="text-white/40" />
                            <span>Connect to system:</span>
                          </div>

                          <div className="grid grid-cols-1 gap-1.5">
                            {SCRATCHPAD_CATEGORIES.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  onOrganizeNote(note.id, cat.id);
                                  setExpandedNoteId(null);
                                }}
                                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-purple-600/30 hover:text-purple-200 text-white/80 border border-white/10 hover:border-purple-500/40 transition-all text-left group/btn"
                              >
                                <span className="font-semibold text-white/90">{cat.label}</span>
                                <span className="text-[10px] text-white/40 group-hover/btn:text-purple-300 font-mono">
                                  {cat.id === 'essential'
                                    ? '→ Daily Essentials'
                                    : cat.id === 'finished_product'
                                    ? '→ Projects & Vision'
                                    : '→ Categories & Learning'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 2. Organized Notes (Preserved content, connects to module, allows reclassification) */}
              {organizedNotes.length > 0 && (
                <div className="pt-6 border-t border-white/10 mt-6 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-white/40 px-1 mb-2">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400/70" />
                      Connected Notes (clears in 3 days)
                    </span>
                    <span className="font-mono text-[10px]">{organizedNotes.length} notes</span>
                  </div>

                  {organizedNotes.map((note) => {
                    const categoryLabel = getCategoryLabel(note.target_category);
                    const elapsed = note.organized_at ? Date.now() - note.organized_at : 0;
                    const remainingMs = Math.max(0, THREE_DAYS_MS - elapsed);
                    const remainingHours = Math.ceil(remainingMs / (3600 * 1000));
                    const isReclassifying = reclassifyingNoteId === note.id;

                    return (
                      <div
                        key={note.id}
                        className="p-3 rounded-2xl border border-white/5 bg-white/[0.02] text-white/70 space-y-2 hover:border-white/15 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <span className="text-xs text-white/80 block leading-relaxed break-words">
                              {note.content}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onDeleteNote(note.id)}
                            aria-label="Delete note"
                            className="text-white/30 hover:text-rose-400 p-0.5 shrink-0"
                            title="Remove note"
                          >
                            <X size={13} />
                          </button>
                        </div>

                        {/* Controls & Connection Row */}
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            {/* Clickable Destination Badge to Open Connected Module */}
                            <button
                              type="button"
                              onClick={() => handleOpenDestination(note.target_category)}
                              title={`Open ${categoryLabel} destination`}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 font-medium transition-colors"
                            >
                              <span>{categoryLabel}</span>
                              <ExternalLink size={10} className="text-purple-300" />
                            </button>

                            {/* Reclassify button */}
                            <button
                              type="button"
                              onClick={() => setReclassifyingNoteId(isReclassifying ? null : note.id)}
                              title="Reclassify note destination"
                              className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors font-mono"
                            >
                              <ArrowRightLeft size={10} />
                              <span>Reclassify</span>
                            </button>
                          </div>

                          <span className="text-white/30 font-mono" title="Retention period">
                            {remainingHours}h left
                          </span>
                        </div>

                        {/* Reclassify Drawer: Allow switching between the 3 options */}
                        {isReclassifying && (
                          <div className="pt-2 border-t border-white/5 grid grid-cols-1 gap-1 animate-in fade-in duration-100">
                            <div className="text-[10px] text-white/40 font-mono mb-1">
                              Switch destination to:
                            </div>
                            {SCRATCHPAD_CATEGORIES.map((cat) => {
                              const isCurrent = note.target_category === cat.id;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  disabled={isCurrent}
                                  onClick={() => {
                                    onOrganizeNote(note.id, cat.id);
                                    setReclassifyingNoteId(null);
                                  }}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-all text-left ${
                                    isCurrent
                                      ? 'bg-purple-600/30 text-purple-200 border border-purple-400/40 cursor-default'
                                      : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
                                  }`}
                                >
                                  <span>{cat.label}</span>
                                  {isCurrent && <span className="text-[9px] font-mono text-purple-300">Current</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
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
