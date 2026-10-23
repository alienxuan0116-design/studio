import { useRef, useMemo, useEffect, useState } from 'react';
import { events as defaultEvents } from '@/data';
import NavDot from './NavDot';
import { loadLocalTasks, type TaskRow } from '@/lib/tasks';
import { getTodayDateString } from './DateTimePicker';
import { Sparkles } from 'lucide-react';

const START_HOUR = 8;
const END_HOUR = 18;
const HOUR_PX = 120;
const TOTAL_PX = (END_HOUR - START_HOUR) * HOUR_PX;

function formatHour(h: number) {
  const hh = Math.floor(h);
  const m = Math.round((h - hh) * 60);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function parseHourFromTime(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return h + m / 60;
  }
  return null;
}

interface TimelineDisplayEvent {
  id: string;
  title: string;
  startHour: number;
  endHour: number;
  color: string;
  isPriority?: boolean;
}

interface Props {
  onNavigate: (page: string) => void;
}

export default function Timeline({ onNavigate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  useEffect(() => {
    setTasks(loadLocalTasks());
  }, []);

  const todayStr = useMemo(() => getTodayDateString(), []);

  const todayTaskEvents = useMemo<TimelineDisplayEvent[]>(() => {
    const list: TimelineDisplayEvent[] = [];
    tasks
      .filter((t) => !t.done && (t.due_time || t.start_time))
      .filter((t) => !t.due_date || t.due_date === todayStr)
      .forEach((t) => {
        const hour = parseHourFromTime(t.due_time || t.start_time);
        if (hour !== null && hour >= START_HOUR && hour < END_HOUR) {
          list.push({
            id: `task-ev-${t.id}`,
            title: t.label,
            startHour: hour,
            endHour: Math.min(END_HOUR, hour + 1),
            color: t.is_priority
              ? 'from-purple-600/80 to-fuchsia-600/80'
              : 'from-sky-600/80 to-indigo-600/80',
            isPriority: Boolean(t.is_priority),
          });
        }
      });
    return list;
  }, [tasks, todayStr]);

  const allDisplayEvents = useMemo<TimelineDisplayEvent[]>(() => {
    return [
      ...defaultEvents.map((e) => ({ ...e, isPriority: false })),
      ...todayTaskEvents,
    ];
  }, [todayTaskEvents]);

  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  const now = new Date();
  const nowDecimal = now.getHours() + now.getMinutes() / 60;
  const nowVisible = nowDecimal >= START_HOUR && nowDecimal <= END_HOUR;
  const nowLeft = (nowDecimal - START_HOUR) * HOUR_PX;

  return (
    <div className="glass glass-glow rounded-3xl p-4 sm:p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xs sm:text-sm tracking-[0.2em] uppercase text-white/50">Schedule</h2>
          <p className="text-base sm:text-lg font-light text-white/90 mt-0.5">Today's Timeline</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] sm:text-[11px] tracking-wide text-white/40 px-2.5 sm:px-3 py-1 rounded-full border border-white/10">
            {allDisplayEvents.length} events
          </span>
          <NavDot label="Open Schedule page" onClick={() => onNavigate('schedule')} />
        </div>
      </div>

      <div ref={scrollRef} className="no-scrollbar overflow-x-auto pb-2 -mx-1 px-1 touch-pan-x">
        <div className="relative" style={{ width: TOTAL_PX, height: 132 }}>
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute top-0 bottom-0 border-l border-white/8"
              style={{ left: i * HOUR_PX }}
            >
              <span className="absolute top-0 -translate-x-1/2 text-[10px] tracking-wide text-white/40 whitespace-nowrap bg-[#0a0e1f]/80 px-1 rounded">
                {formatHour(h)}
              </span>
            </div>
          ))}

          <div className="absolute left-0 right-0 top-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {allDisplayEvents.map((ev, index) => {
            const left = (ev.startHour - START_HOUR) * HOUR_PX;
            const width = Math.max(50, (ev.endHour - ev.startHour) * HOUR_PX - 6);
            const top = 34 + (index % 3) * 26;
            return (
              <div
                key={ev.id}
                className={`absolute h-10 rounded-xl bg-gradient-to-br ${ev.color} border border-white/15 backdrop-blur-md flex flex-col items-center justify-center gap-0.5 px-2 shadow-lg overflow-hidden transition-transform hover:scale-102`}
                style={{ left: left + 3, width, top }}
              >
                <div className="flex items-center gap-1 max-w-full">
                  {Boolean(ev.isPriority) && (
                    <Sparkles size={10} className="text-amber-300 shrink-0 fill-amber-300" />
                  )}
                  <span className="text-[11px] font-medium text-white/95 truncate max-w-full leading-none text-center">
                    {ev.title}
                  </span>
                </div>
                <span className="text-[9px] text-white/65 whitespace-nowrap leading-none font-mono">
                  {formatHour(ev.startHour)}
                </span>
              </div>
            );
          })}

          {nowVisible && (
            <div className="absolute top-0 bottom-0 z-10" style={{ left: nowLeft }}>
              <div className="w-px h-full bg-gradient-to-b from-rose-400/90 to-rose-500/30" />
              <div className="absolute top-0 -left-1 w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
