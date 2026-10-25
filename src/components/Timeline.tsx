import { useRef, useMemo, useEffect, useState } from 'react';
import { events as defaultEvents } from '@/data';
import NavDot from './NavDot';
import { getAllScheduleTasks, type UnifiedScheduleTask } from '@/lib/tasks';
import { getTodayDateString } from './DateTimePicker';
import { Sparkles, GraduationCap, Calendar, Clock } from 'lucide-react';
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

function addDays(dateStr: string, offset: number): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateHeading(dateStr: string, isToday: boolean): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return isToday ? `Today · ${weekday}, ${monthDay}` : `${weekday}, ${monthDay}`;
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
  const [viewDays, setViewDays] = useState<1 | 7>(1);

  useEffect(() => {
    setScheduleTasks(getAllScheduleTasks());
    setTimetableClasses(loadTimetableClasses());
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

    const handleTimetableVisibilityChanged = () => {
      setTimetableClasses(loadTimetableClasses());
    };

    window.addEventListener('studio_os_timezone_changed', handleTzChange);
    window.addEventListener('studio_os_tasks_changed', handleTasksChanged);
    window.addEventListener('studio_os_timetable_changed', handleTimetableChanged);
    window.addEventListener('studio_os_timetable_visibility_changed', handleTimetableVisibilityChanged);
    return () => {
      window.removeEventListener('studio_os_timezone_changed', handleTzChange);
      window.removeEventListener('studio_os_tasks_changed', handleTasksChanged);
      window.removeEventListener('studio_os_timetable_changed', handleTimetableChanged);
      window.removeEventListener('studio_os_timetable_visibility_changed', handleTimetableVisibilityChanged);
    };
  }, []);

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Compute events for any given date string
  const getEventsForDate = (dateStr: string): TimelineDisplayEvent[] => {
    const list: TimelineDisplayEvent[] = [];

    // 1. Recurring timetable classes for this date
    const classesForDate = getClassesForDate(dateStr);
    classesForDate.forEach((cls) => {
      const start = parseHourFromTime(cls.startTime);
      const end = parseHourFromTime(cls.endTime);
      if (start !== null && end !== null) {
        list.push({
          id: `class-${cls.id}-${dateStr}`,
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

    // 2. Scheduled tasks for this date
    scheduleTasks.forEach((t) => {
      if (t.done || (!t.due_time && !t.start_time)) return;

      const startDate = t.start_date || t.due_date;
      const dueDate = t.due_date || t.start_date;
      if (!startDate || !dueDate) return;
      if (dateStr < startDate || dateStr > dueDate) return;

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
          id: `sched-ev-${t.id}-${dateStr}`,
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
  };

  // Today's events
  const todayEvents = useMemo(() => {
    const list = getEventsForDate(todayStr);
    if (list.length > 0) return list;
    return defaultEvents.map((e) => ({ ...e, isPriority: false }));
  }, [todayStr, scheduleTasks, timetableClasses]);

  // Multi-day events grouped by day
  const multiDayList = useMemo(() => {
    const days: Array<{
      dateStr: string;
      heading: string;
      isToday: boolean;
      events: TimelineDisplayEvent[];
    }> = [];

    for (let i = 0; i < viewDays; i++) {
      const dStr = addDays(todayStr, i);
      const isToday = i === 0;
      const heading = formatDateHeading(dStr, isToday);
      const evs = getEventsForDate(dStr);
      days.push({
        dateStr: dStr,
        heading,
        isToday,
        events: evs,
      });
    }

    return days;
  }, [viewDays, todayStr, scheduleTasks, timetableClasses]);

  // Single-day collision-free track allocation algorithm:
  const { positionedEvents, totalTracks } = useMemo(() => {
    const sorted = [...todayEvents].sort((a, b) => {
      if (Math.abs(a.startHour - b.startHour) > 0.001) {
        return a.startHour - b.startHour;
      }
      return (b.endHour - b.startHour) - (a.endHour - a.startHour);
    });

    const trackEndHours: number[] = [];
    const positioned: PositionedEvent[] = [];

    for (const ev of sorted) {
      const naturalWidth = (ev.endHour - ev.startHour) * HOUR_PX - 6;
      const width = Math.max(MIN_EVENT_WIDTH_PX, naturalWidth);
      const visualDurationHours = width / HOUR_PX;
      const visualEndHour = ev.startHour + visualDurationHours;

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
  }, [todayEvents]);

  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  const containerHeight = Math.max(140, TOP_OFFSET_PX + totalTracks * (TRACK_HEIGHT_PX + TRACK_GAP_PX) + 10);

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-timeline-event="true"]')) return;
        if ((e.target as HTMLElement).closest('button')) return;
        onNavigate('timeline');
      }}
      className="glass glass-glow rounded-3xl p-4 sm:p-6 cursor-pointer group/timeline hover:border-white/20 transition-all relative"
    >
      {/* Top-Right Circle Button (NavDot) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <NavDot label="Open Timeline page" onClick={() => onNavigate('timeline')} />
      </div>

      {/* Header with Title and event count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pr-12">
        <div>
          <h2 className="text-xs sm:text-sm tracking-[0.2em] uppercase text-white/50">Schedule</h2>
          <p className="text-base sm:text-lg font-light text-white/90 mt-0.5 group-hover/timeline:text-white transition-colors">
            Timeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-[11px] tracking-wide text-white/40 px-2.5 sm:px-3 py-1 rounded-full border border-white/10 shrink-0">
            {todayEvents.length} events
          </span>
        </div>
      </div>

      {/* Single Day 24h Continuous Track View */}
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
