import type { Project } from '@/data';
import NavDot from './NavDot';

interface Props {
  projects: Project[];
  onNavigate?: (page: string) => void;
}

export default function ProjectProgress({ projects, onNavigate }: Props) {
  return (
    <div className="glass glass-glow rounded-3xl p-5 sm:p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-sm tracking-[0.2em] uppercase text-white/50">Progress</h2>
          <p className="text-lg font-light text-white/90 mt-0.5">Projects</p>
        </div>
        {onNavigate && <NavDot label="Open Projects page" onClick={() => onNavigate('projects')} />}
      </div>

      <div className="flex flex-col gap-5">
        {projects.map((p) => (
          <div key={p.id}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] text-white/85">{p.name}</span>
              <span className="text-[13px] tabular-nums text-white/55">{p.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/8 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${p.accent} shadow-[0_0_12px_rgba(120,150,255,0.4)]`}
                style={{ width: `${p.progress}%`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
