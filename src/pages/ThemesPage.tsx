import { Palette } from 'lucide-react';
import PageShell from '../components/PageShell';

interface Props {
  onBack: () => void;
}

const THEMES = [
  { name: 'Aurora', colors: 'from-sky-400 via-violet-500 to-fuchsia-500' },
  { name: 'Ocean', colors: 'from-cyan-400 via-blue-500 to-indigo-500' },
  { name: 'Sunset', colors: 'from-amber-400 via-rose-500 to-fuchsia-500' },
  { name: 'Forest', colors: 'from-emerald-400 via-teal-500 to-cyan-500' },
];

export default function ThemesPage({ onBack }: Props) {
  return (
    <PageShell title="Themes" subtitle="Wallpaper and colour settings" onBack={onBack}>
      <div className="flex items-center gap-2 text-white/40 mb-5">
        <Palette size={16} strokeWidth={1.6} />
        <span className="text-[13px]">Theme switching is not yet connected.</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {THEMES.map((theme) => (
          <div
            key={theme.name}
            className="rounded-2xl overflow-hidden border border-white/10 hover:border-white/25 transition-colors"
          >
            <div className={`h-24 bg-gradient-to-br ${theme.colors}`} />
            <div className="p-3 bg-white/5">
              <span className="text-[13px] text-white/80">{theme.name}</span>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
