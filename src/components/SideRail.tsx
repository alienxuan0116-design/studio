import { PenLine } from 'lucide-react';

interface Props {
  onOpenScratchpad: () => void;
  hasUnorganizedNotes?: boolean;
}

export default function SideRail({ onOpenScratchpad, hasUnorganizedNotes }: Props) {
  return (
    <div className="fixed bottom-6 right-5 z-40 sm:relative sm:bottom-auto sm:right-auto sm:top-6 sm:z-30 sm:h-fit flex flex-col items-center">
      <div className="glass glass-glow rounded-2xl p-1.5 sm:p-1 flex flex-col items-center shadow-lg shadow-black/50">
        <button
          type="button"
          onClick={onOpenScratchpad}
          title="Scratchpad"
          aria-label="Scratchpad"
          className="relative w-11 h-11 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-200 group"
        >
          <PenLine size={17} strokeWidth={1.8} className="group-hover:scale-110 transition-transform" />
          {hasUnorganizedNotes && (
            <span className="absolute top-2 right-2 sm:top-1.5 sm:right-1.5 w-2 h-2 rounded-full bg-purple-400 ring-2 ring-black/40 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
