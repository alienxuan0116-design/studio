export default function NavDot({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
    >
      <span className="w-2.5 h-2.5 rounded-full bg-white/70 hover:bg-white transition-all shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
    </button>
  );
}
