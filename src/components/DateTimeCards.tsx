import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import {
  getStoredTimezone,
  formatDateTimeInTimezone,
  STORAGE_TIMEZONE_KEY,
} from '@/lib/timezone';
import TimezoneModal from './TimezoneModal';

export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

interface Props {
  onNavigate?: (page: string) => void;
}

export default function DateTimeCards({ onNavigate }: Props) {
  const now = useClock();
  const [timezone, setTimezone] = useState(() => getStoredTimezone());
  const [isTimezoneModalOpen, setIsTimezoneModalOpen] = useState(false);

  useEffect(() => {
    const handleTzChange = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setTimezone(custom.detail);
      }
    };
    window.addEventListener('studio_os_timezone_changed', handleTzChange);
    return () => window.removeEventListener('studio_os_timezone_changed', handleTzChange);
  }, []);

  const data = formatDateTimeInTimezone(now, timezone);

  return (
    <>
      <div className="relative">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Date card — watch-face composition with main Calendar icon */}
          <div
            onClick={() => onNavigate?.('calendar')}
            title="Open Calendar"
            className="glass glass-glow glass-hover rounded-3xl p-3.5 sm:p-6 aspect-square flex flex-col justify-between overflow-hidden cursor-pointer group/date hover:border-purple-500/40 transition-all select-none"
          >
            <div className="flex items-center justify-between min-h-[20px]">
              <span className="text-[9px] sm:text-[11px] tracking-[0.25em] sm:tracking-[0.3em] uppercase text-white/50 group-hover/date:text-purple-300 transition-colors">
                {data.dayName}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.('calendar');
                }}
                aria-label="Open Calendar"
                title="Open Calendar"
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Calendar size={14} className="text-purple-300/80 group-hover/date:text-purple-200 transition-colors" />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1">
              <span className="font-extralight leading-none tracking-tight text-[2.75rem] xs:text-[3.25rem] sm:text-[5rem] lg:text-[6rem] bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent tabular-nums">
                {data.dayNum}
              </span>
              <span className="text-[9px] sm:text-sm tracking-[0.25em] sm:tracking-[0.35em] uppercase text-white/55 font-light">
                {data.monthName}
              </span>
            </div>
            <span className="text-[9px] sm:text-[11px] tracking-[0.2em] uppercase text-white/30 text-center">
              {data.year}
            </span>
          </div>

          {/* Time card — watch-face composition with top-right circle removed */}
          <div className="glass glass-glow glass-hover rounded-3xl p-3.5 sm:p-6 aspect-square flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between min-h-[20px]">
              <span className="text-[9px] sm:text-[11px] tracking-[0.25em] sm:tracking-[0.3em] uppercase text-white/50">
                {data.ampm}
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1 tabular-nums">
              <span className="font-extralight leading-none tracking-tight text-[2.15rem] xs:text-[2.6rem] sm:text-[4rem] lg:text-[4.5rem] bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                {data.h12}:{data.minutes}
              </span>
              <span className="text-[10px] sm:text-base font-light text-white/40 tabular-nums tracking-wider">
                :{data.seconds}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTimezoneModalOpen(true)}
              title="Change Timezone"
              className="text-[8px] sm:text-[11px] tracking-[0.1em] sm:tracking-[0.15em] uppercase text-white/35 hover:text-white/80 transition-colors text-center truncate px-1 py-0.5 rounded-lg hover:bg-white/5"
            >
              {data.tzCity}
            </button>
          </div>
        </div>
      </div>

      <TimezoneModal
        isOpen={isTimezoneModalOpen}
        currentTimezone={timezone}
        onClose={() => setIsTimezoneModalOpen(false)}
        onSelectTimezone={(newTz) => setTimezone(newTz)}
      />
    </>
  );
}
