import { Lightbulb } from 'lucide-react';

export default function IdeaButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Idea Box"
      title="Idea Box & Inspirations"
      className="relative w-12 h-12 rounded-2xl flex items-center justify-center bg-black/60 hover:bg-black/40 border border-white/20 glass glass-glow shadow-[0_0_20px_rgba(251,191,36,0.25)] hover:shadow-[0_0_30px_rgba(251,191,36,0.45)] hover:scale-110 active:scale-95 transition-all duration-300 group backdrop-blur-2xl"
    >
      <Lightbulb
        size={22}
        strokeWidth={1.8}
        className="text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] group-hover:scale-110 transition-transform"
      />
    </button>
  );
}
