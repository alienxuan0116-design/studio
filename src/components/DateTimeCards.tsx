import { useEffect, useState } from 'react';
import NavDot from './NavDot';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

interface Props {
  onNavigate: (page: string) => void;
}

export default function DateTimeCards({ onNavigate }: Props) {
  const now = useClock();

  const dayName = DAYS[now.getDay()];
  const monthName = MONTHS[now.getMonth()];
  const dayNum = now.getDate();
  const year = now.getFullYear();

  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ');

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Date card — watch-face composition */}
        <div className="glass glass-glow glass-hover rounded-3xl p-3.5 sm:p-6 aspect-square flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] tracking-[0.25em] sm:tracking-[0.3em] uppercase text-white/50">{dayName}</span>
            <NavDot label="Open Date detail page" onClick={() => onNavigate('date-detail')} />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1">
            <span className="font-extralight leading-none tracking-tight text-[2.75rem] xs:text-[3.25rem] sm:text-[5rem] lg:text-[6rem] bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent tabular-nums">
              {dayNum}
            </span>
            <span className="text-[9px] sm:text-sm tracking-[0.25em] sm:tracking-[0.35em] uppercase text-white/55 font-light">
              {monthName}
            </span>
          </div>
          <span className="text-[9px] sm:text-[11px] tracking-[0.2em] uppercase text-white/30 text-center">
            {year}
          </span>
        </div>

        {/* Time card — watch-face composition */}
        <div className="glass glass-glow glass-hover rounded-3xl p-3.5 sm:p-6 aspect-square flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] tracking-[0.25em] sm:tracking-[0.3em] uppercase text-white/50">{ampm}</span>
            <NavDot label="Open Time detail page" onClick={() => onNavigate('time-detail')} />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1 tabular-nums">
            <span className="font-extralight leading-none tracking-tight text-[2.15rem] xs:text-[2.6rem] sm:text-[4rem] lg:text-[4.5rem] bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              {h12}:{minutes}
            </span>
            <span className="text-[10px] sm:text-base font-light text-white/40 tabular-nums tracking-wider">
              :{seconds}
            </span>
          </div>
          <span className="text-[8px] sm:text-[11px] tracking-[0.1em] sm:tracking-[0.15em] uppercase text-white/30 text-center truncate px-1">
            {tz}
          </span>
        </div>
      </div>
    </div>
  );
}
