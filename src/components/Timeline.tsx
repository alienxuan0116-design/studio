import { useRef, useMemo, useEffect, useState } from 'react';
import { events as defaultEvents } from '@/data';
import NavDot from './NavDot';
import { getAllScheduleTasks, type UnifiedScheduleTask } from '@/lib/tasks';
import { getTodayDateString } from './DateTimePicker';
import { Sparkles, GraduationCap, MapPin } from 'lucide-react';
import {
  getClassesForDate,
  loadTimetableClasses,
  type TimetableClass,
} from '@/lib/timetable';
import {
  getStoredTimezone,
  formatDateTimeInTimezone,
} from '@/lib/timezone';

const START_HOUR = 0;
const END_HOUR = 24;
const HOUR_PX = 96;
const TOTAL_PX = (END_HOUR - START_HOUR) * HOUR_PX;
const MIN_EVENT_WIDTH_PX = 92;
const TRACK_HEIGHT_PX = 46;
const TRACK_GAP_PX = 8;
const TOP_OFFSET_PX = 36;

function formatHour(h: number) {
  const hh = Math.floor(h);
  const m = Math.round((h - hh) * 60);
  if (hh === 24 && m === 0) return '24:00';
  const ampm = hh >= 12 && hh < 24 ? 'PM' : 'AM';
  const h12 = hh === 0 || hh === 24 ? 12 : hh > 12 ? hh - 12 : hh;
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
  isClass?: boolean;
  location?: string;
  timeRange?: string;
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
  const [timetableClasses, setTimetableClasses] = useState<TimetableClass[]>(() => loadTimetableClasses());
  const [timezone, setTimezone] = useState(() => getStoredTimezone());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    setScheduleTasks(getAllScheduleTasks());
    setTimetableClasses(loadTimetableClasses());
    // Auto-scroll to near current hour so user is not stuck at 00:00 midnight
    if (scrollRef.current) {
      const now = new Date();
      const currentH = now.getHours() + now.getMinutes() / 60;
      const targetScroll = Math.max(0, (currentH - 1.5) * HOUR_PX);
      scrollRef.current.scrollLeft = targetScroll;
    }
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
    const handleTimetableChanged = () => {
      setTimetableClasses(loadTimetableClasses());
    };

    window.addEventListener('studio_os_timezone_changed', handleTzChange);
    window.addEventListener('studio_os_tasks_changed', handleTasksChanged);
    window.addEventListener('studio_os_timetable_changed', handleTimetableChanged);
    return () => {
      window.removeEventListener('studio_os_timezone_changed', handleTzChange);
      window.removeEventListener('studio_os_tasks_changed', handleTasksChanged);
      window.removeEventListener('studio_os_timetable_changed', handleTimetableChanged);
    };
  }, []);

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Recurring timetable classes for today's weekday
  const todayClassEvents = useMemo<TimelineDisplayEvent[]>(() => {
    const list: TimelineDisplayEvent[] = [];
    const classesForToday = getClassesForDate(todayStr);

    classesForToday.forEach((cls) => {
      const start = parseHourFromTime(cls.startTime);
      const end = parseHourFromTime(cls.endTime);
      if (start !== null && end !== null) {
        list.push({
          id: `class-${cls.id}`,
          title: cls.courseName,
          startHour: start,
          endHour: Math.max(start + 0.4, end),
          color: 'from-emerald-700/85 via-teal-700/85 to-emerald-800/90',
          isPriority: false,
          category: 'class',
          isClass: true,
          location: cls.location,
          timeRange: `${cls.startTime} - ${cls.endTime}`,
        });
      }
    });

    return list;
  }, [todayStr, timetableClasses]);

  const todayTaskEvents = useMemo<TimelineDisplayEvent[]>(() => {
    const list: TimelineDisplayEvent[] = [];

    // Unified tasks: ordinary tasks, regular subtasks, research subtasks
    scheduleTasks.forEach((t) => {
      if (t.done || (!t.due_time && !t.start_time)) return;

      const startDate = t.start_date || t.due_date;
      const dueDate = t.due_date || t.start_date;
      if (!startDate || !dueDate) return;
      if (todayStr < startDate || todayStr > dueDate) return;

      const start = parseHourFromTime(t.start_time || t.due_time);
      if (start !== null && start >= START_HOUR && start < END_HOUR) {
        const end =
          t.start_time && t.due_time && parseHourFromTime(t.due_time)
            ? Math.max(start + 0.4, parseHourFromTime(t.due_time)!)
            : Math.min(END_HOUR, start + 1);

        let color = 'from-sky-600/80 to-blue-600/80';
        if (t.sourceType === 'subtask_research') {
          color = 'from-indigo-600/85 to-purple-600/85';
        } else if (t.is_priority) {
          color = 'from-purple-600/85 to-fuchsia-600/85';
        } else if (t.category === 'essential') {
          color = 'from-teal-600/80 to-emerald-600/80';
        }

        const displayTitle = t.part_name ? `${t.part_name} · ${t.title}` : t.title;

        list.push({
          id: `sched-ev-${t.id}`,
          title: displayTitle,
          startHour: start,
          endHour: end,
          color,
          isPriority: Boolean(t.is_priority),
          category: t.category,
          timeRange: t.start_time && t.due_time ? `${t.start_time} - ${t.due_time}` : t.due_time || undefined,
        });
      }
    });

    return list;
  }, [scheduleTasks, todayStr]);

  const allDisplayEvents = useMemo<TimelineDisplayEvent[]>(() => {
    const realEvents = [...todayClassEvents, ...todayTaskEvents];
    if (realEvents.length > 0) {
      return realEvents;
    }
    return defaultEvents.map((e) => ({ ...e, isPriority: false }));
  }, [todayClassEvents, todayTaskEvents]);

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
    <div
      onClick={(e) => {
        // If clicking on an event card, let its own handler execute
        if ((e.target as HTMLElement).closest('[data-timeline-event="true"]')) return;
        onNavigate('timeline');
      }}
      className="glass glass-glow rounded-3xl p-4 sm:p-6 cursor-pointer group/timeline hover:border-white/20 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xs sm:text-sm tracking-[0.2em] uppercase text-white/50">Schedule</h2>
          <p className="text-base sm:text-lg font-light text-white/90 mt-0.5 group-hover/timeline:text-white transition-colors">
            Today's Timeline
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] sm:text-[11px] tracking-wide text-white/40 px-2.5 sm:px-3 py-1 rounded-full border border-white/10">
            {allDisplayEvents.length} events
          </span>
          <NavDot label="Open Schedule page" onClick={() => onNavigate('timeline')} />
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
                data-timeline-event="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEventId(isSelected ? null : ev.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onNavigate('timeline');
                }}
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
                {/* Event Title with wrap & Sparkles / GraduationCap icon */}
                <div className="flex items-start gap-1 min-w-0">
                  {Boolean(ev.isPriority) && (
                    <Sparkles size={11} className="text-amber-300 shrink-0 fill-amber-300 mt-0.5" />
                  )}
                  {Boolean(ev.isClass) && (
                    <GraduationCap size={11} className="text-emerald-300 shrink-0 mt-0.5" />
                  )}
                  <span className="text-[11px] font-medium text-white/95 leading-tight line-clamp-2 break-words text-left">
                    {ev.title}
                  </span>
                </div>

                {/* Event Time and Badge */}
                <div className="flex items-center justify-between text-[9px] text-white/70 font-mono tracking-tight mt-0.5">
                  <span>{ev.timeRange || formatHour(ev.startHour)}</span>
                  {Boolean(ev.isClass) && (
                    <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/70 px-1 py-0.2 rounded border border-emerald-500/30">
                      Class
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

