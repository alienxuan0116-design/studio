import { useRef, useMemo, useEffect, useState } from 'react';
import { events as defaultEvents } from '@/data';
import NavDot from './NavDot';
import { getAllScheduleTasks, type UnifiedScheduleTask } from '@/lib/tasks';
import { getTodayDateString } from './DateTimePicker';
import { Sparkles } from 'lucide-react';
import {
  getStoredTimezone,
  formatDateTimeInTimezone,
} from '@/lib/timezone';

const START_HOUR = 8;
const END_HOUR = 18;
const HOUR_PX = 120;
const TOTAL_PX = (END_HOUR - START_HOUR) * HOUR_PX;
const MIN_EVENT_WIDTH_PX = 92;
const TRACK_HEIGHT_PX = 46;
const TRACK_GAP_PX = 8;
const TOP_OFFSET_PX = 36;

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
  category?: string;
}

interface PositionedEvent extends TimelineDisplayEvent {
  track: number;
  left: number;
  width: number;
  top: number;
}

interface Props {
  onNavigate: (page: string) => void;
}

export default function Timeline({ onNavigate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scheduleTasks, setScheduleTasks] = useState<UnifiedScheduleTask[]>(() => getAllScheduleTasks());
  const [timezone, setTimezone] = useState(() => getStoredTimezone());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    setScheduleTasks(getAllScheduleTasks());
  }, []);

  useEffect(() => {
    const handleTzChange = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setTimezone(custom.detail);
      }
    };
    const handleTasksChanged = () => {
      setScheduleTasks(getAllScheduleTasks());
    };
    window.addEventListener('studio_os_timezone_changed', handleTzChange);
    window.addEventListener('studio_os_tasks_changed', handleTasksChanged);
    return () => {
      window.removeEventListener('studio_os_timezone_changed', handleTzChange);
      window.removeEventListener('studio_os_tasks_changed', handleTasksChanged);
    };
  }, []);

  const todayStr = useMemo(() => getTodayDateString(), []);

  const todayTaskEvents = useMemo<TimelineDisplayEvent[]>(() => {
    const list: TimelineDisplayEvent[] = [];

    // Unified tasks: ordinary tasks, regular subtasks, research subtasks
    scheduleTasks.forEach((t) => {
      // Rule: Must not be done, must have due_time, and MUST have due_date === todayStr!
      // "清除日期或时间后，相关视图正确更新；无日期任务不得自动显示在今天。有完整日期和时间：同时显示在日历与时间轴。"
      if (t.done || !t.due_time) return;
      if (t.due_date !== todayStr) return;

      const hour = parseHourFromTime(t.due_time);
      if (hour !== null && hour >= START_HOUR && hour < END_HOUR) {
        let color = 'from-sky-600/80 to-blue-600/80';
        if (t.sourceType === 'subtask_research') {
          color = 'from-indigo-600/85 to-purple-600/85';
        } else if (t.is_priority) {
          color = 'from-purple-600/85 to-fuchsia-600/85';
        } else if (t.category === 'essential') {
          color = 'from-emerald-600/80 to-teal-600/80';
        }

        const displayTitle = t.part_name ? `${t.part_name} · ${t.title}` : t.title;

        list.push({
          id: `sched-ev-${t.id}`,
          title: displayTitle,
          startHour: hour,
          endHour: Math.min(END_HOUR, hour + 1),
          color,
          isPriority: Boolean(t.is_priority),
          category: t.category,
        });
      }
    });

    return list;
  }, [scheduleTasks, todayStr]);

  const allDisplayEvents = useMemo<TimelineDisplayEvent[]>(() => {
    return [
      ...defaultEvents.map((e) => ({ ...e, isPriority: false })),
      ...todayTaskEvents,
    ];
  }, [todayTaskEvents]);

  // Collision-free track allocation algorithm:
  // Staggers concurrent items across vertical tracks (lanes) so they never overlap.
  const { positionedEvents, totalTracks } = useMemo(() => {
    // Sort events by startHour ascending, then by duration descending
    const sorted = [...allDisplayEvents].sort((a, b) => {
      if (Math.abs(a.startHour - b.startHour) > 0.001) {
        return a.startHour - b.startHour;
      }
      return (b.endHour - b.startHour) - (a.endHour - a.startHour);
    });

    // Track ending time array (stores the right-most visual hour for each lane)
    const trackEndHours: number[] = [];
    const positioned: PositionedEvent[] = [];

    for (const ev of sorted) {
      const naturalWidth = (ev.endHour - ev.startHour) * HOUR_PX - 6;
      const width = Math.max(MIN_EVENT_WIDTH_PX, naturalWidth);
      const visualDurationHours = width / HOUR_PX;
      const visualEndHour = ev.startHour + visualDurationHours;

      // Find first track that is free (ends before ev.startHour with tiny 2-min clearance)
      let chosenTrack = -1;
      for (let t = 0; t < trackEndHours.length; t++) {
        if (trackEndHours[t] <= ev.startHour + 0.03) {
          chosenTrack = t;
          break;
        }
      }

      if (chosenTrack === -1) {
        chosenTrack = trackEndHours.length;
        trackEndHours.push(visualEndHour);
      } else {
        trackEndHours[chosenTrack] = visualEndHour;
      }

      const left = (ev.startHour - START_HOUR) * HOUR_PX + 3;
      const top = TOP_OFFSET_PX + chosenTrack * (TRACK_HEIGHT_PX + TRACK_GAP_PX);

      positioned.push({
        ...ev,
        track: chosenTrack,
        left,
        width,
        top,
      });
    }

    const total = Math.max(2, trackEndHours.length);
    return { positionedEvents: positioned, totalTracks: total };
  }, [allDisplayEvents]);

  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  // Timezone-aware current time indicator
  const now = new Date();
  const tzTime = formatDateTimeInTimezone(now, timezone);
  const nowDecimal = tzTime.hours24 + parseInt(tzTime.minutes, 10) / 60;
  const nowVisible = nowDecimal >= START_HOUR && nowDecimal <= END_HOUR;
  const nowLeft = (nowDecimal - START_HOUR) * HOUR_PX;

  const containerHeight = Math.max(140, TOP_OFFSET_PX + totalTracks * (TRACK_HEIGHT_PX + TRACK_GAP_PX) + 10);

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
        <div className="relative" style={{ width: TOTAL_PX, height: containerHeight }}>
          {/* Vertical hour scale dividers */}
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute top-0 bottom-0 border-l border-white/8"
              style={{ left: i * HOUR_PX }}
            >
              <span className="absolute top-0 -translate-x-1/2 text-[10px] tracking-wide text-white/40 whitespace-nowrap bg-[#0a0e1f]/80 px-1 rounded font-mono">
                {formatHour(h)}
              </span>
            </div>
          ))}

          {/* Timeline separator line */}
          <div className="absolute left-0 right-0 top-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Staggered, collision-free event cards */}
          {positionedEvents.map((ev) => {
            const isSelected = selectedEventId === ev.id;
            return (
              <div
                key={ev.id}
                onClick={() => setSelectedEventId(isSelected ? null : ev.id)}
                title={`${ev.title} (${formatHour(ev.startHour)} - ${formatHour(ev.endHour)})`}
                className={`absolute rounded-xl bg-gradient-to-br ${ev.color} border border-white/15 backdrop-blur-md flex flex-col justify-between py-1.5 px-2.5 shadow-lg overflow-hidden transition-all duration-200 cursor-pointer select-none ${
                  isSelected ? 'ring-2 ring-white/60 scale-[1.02] z-20 shadow-purple-500/20' : 'hover:scale-[1.01] hover:border-white/30 z-10'
                }`}
                style={{
                  left: ev.left,
                  width: ev.width,
                  top: ev.top,
                  height: TRACK_HEIGHT_PX,
                }}
              >
                {/* Event Title with wrap & Sparkles icon if priority */}
                <div className="flex items-start gap-1 min-w-0">
                  {Boolean(ev.isPriority) && (
                    <Sparkles size={11} className="text-amber-300 shrink-0 fill-amber-300 mt-0.5" />
                  )}
                  <span className="text-[11px] font-medium text-white/95 leading-tight line-clamp-2 break-words text-left">
                    {ev.title}
                  </span>
                </div>

                {/* Event Time */}
                <span className="text-[9px] text-white/65 whitespace-nowrap leading-none font-mono tracking-tight mt-0.5">
                  {formatHour(ev.startHour)}
                </span>
              </div>
            );
          })}

          {/* Current time vertical indicator needle */}
          {nowVisible && (
            <div className="absolute top-0 bottom-0 z-30 pointer-events-none" style={{ left: nowLeft }}>
              <div className="w-px h-full bg-gradient-to-b from-rose-400/90 to-rose-500/30" />
              <div className="absolute top-0 -left-1 w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

