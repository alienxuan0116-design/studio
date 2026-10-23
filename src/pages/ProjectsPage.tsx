import { useState, useEffect } from 'react';
import { Plus, Compass, ChevronRight, X, Check } from 'lucide-react';
import PageShell from '../components/PageShell';
import { loadProjects, createProject } from '@/lib/projects';
import type { Project } from '@/data';

interface Props {
  onBack: () => void;
  onOpenProject: (projectId: string) => void;
}

export default function ProjectsPage({ onBack, onOpenProject }: Props) {
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newVision, setNewVision] = useState('');

  useEffect(() => {
    setProjectList(loadProjects());
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newVision.trim()) return;

    const created = createProject({
      name: newName.trim(),
      vision: newVision.trim(),
    });
    setProjectList(loadProjects());
    setNewName('');
    setNewVision('');
    setShowCreateModal(false);
    onOpenProject(created.id);
  };

  return (
    <PageShell title="Projects" subtitle="Workspaces & Parts Progress" onBack={onBack}>
      <div className="flex flex-col gap-5 max-w-xl mx-auto">
        {/* Header Action: Create New Project */}
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-white/40 font-mono">
            Active Projects ({projectList.length})
          </span>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-purple-600/30 text-purple-200 border border-purple-500/40 hover:bg-purple-600/50 transition-colors"
          >
            <Plus size={14} />
            <span>New Project</span>
          </button>
        </div>

        {/* Project Cards */}
        <div className="space-y-4">
          {projectList.map((p) => (
            <div
              key={p.id}
              onClick={() => onOpenProject(p.id)}
              className="glass glass-glow rounded-3xl p-5 border border-white/10 hover:border-purple-500/40 cursor-pointer transition-all duration-200 group relative"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-medium text-white/95 group-hover:text-purple-200 transition-colors">
                      {p.name}
                    </span>
                  </div>
                  {p.vision && (
                    <p className="text-xs text-white/50 line-clamp-1 italic font-light">
                      "{p.vision}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[13px] tabular-nums font-mono text-white/70">
                    {p.progress}%
                  </span>
                  <ChevronRight size={16} className="text-white/40 group-hover:text-white transition-colors" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${p.accent} shadow-[0_0_12px_rgba(120,150,255,0.4)]`}
                  style={{ width: `${p.progress}%`, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }}
                />
              </div>

              {/* Bottom stage counters */}
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40 mt-3 pt-2 border-t border-white/5">
                <span>
                  {p.stages ? `${p.stages.filter((s) => s.status === 'completed').length}/${p.stages.length} parts` : 'Parts setup'}
                </span>
                <span>
                  {p.discoveries ? `${p.discoveries.length} discoveries` : '0 discoveries'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="w-full max-w-md glass glass-glow rounded-3xl p-6 border border-white/10 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-mono text-purple-300">
                <Compass size={15} />
                <span>New Project</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Project name"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <textarea
                  value={newVision}
                  onChange={(e) => setNewVision(e.target.value)}
                  placeholder="Deliverable Vision: What does the finished product look & feel like?"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 resize-none min-h-[90px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-white/50 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || !newVision.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs bg-purple-600 text-white disabled:opacity-30 shadow-lg shadow-purple-900/40"
                >
                  <Check size={14} />
                  <span>Create Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
