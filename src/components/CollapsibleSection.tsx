import { useState, type ReactNode } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import NavDot from './NavDot';

interface Props {
  kicker: string;
  title: string;
  /** Number of children to show when collapsed. 0 = fully collapsed (header only). */
  defaultVisibleCount?: number;
  onNavigate?: () => void;
  onAdd?: () => void;
  /** Controlled expansion state */
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  /** Render function: receives how many items to show (0 = hidden, -1 = all). */
  children: (visibleCount: number) => ReactNode;
}

export default function CollapsibleSection({
  kicker,
  title,
  defaultVisibleCount = 0,
  onNavigate,
  onAdd,
  isExpanded,
  onToggleExpand,
  children,
}: Props) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = isExpanded !== undefined ? isExpanded : internalExpanded;
  const visibleCount = expanded ? -1 : defaultVisibleCount;

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand(!expanded);
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const showChevron = defaultVisibleCount !== -1;

  return (
    <section className="glass glass-glow rounded-3xl p-4 sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={handleToggle}
          className="flex-1 flex items-center justify-between text-left group rounded-2xl p-1.5 -m-1.5 hover:bg-white/5 transition-colors"
          aria-expanded={expanded}
        >
          <div>
            <h2 className="text-xs sm:text-sm tracking-[0.2em] uppercase text-white/50">{kicker}</h2>
            <p className="text-base sm:text-lg font-light text-white/90 mt-0.5">{title}</p>
          </div>
          {showChevron && (
            <span
              className={`collapsible-motion w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 text-white/55 group-hover:bg-white/10 transition-transform duration-300 ${
                expanded ? 'rotate-180' : ''
              }`}
            >
              <ChevronDown size={16} strokeWidth={1.8} />
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              aria-label="Add task"
              title="Add task"
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          )}
          {onNavigate && <NavDot label={`Open ${title} page`} onClick={onNavigate} />}
        </div>
      </div>
      <div
        className={`collapsible-motion overflow-hidden transition-all duration-300 ${
          visibleCount !== 0 ? 'max-h-[1200px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        {children(visibleCount)}
      </div>
    </section>
  );
}
