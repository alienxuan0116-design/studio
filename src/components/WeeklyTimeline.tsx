import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Sparkles, GraduationCap } from 'lucide-react';
import NavDot from './NavDot';
import { getAllScheduleTasks, type UnifiedScheduleTask } from '@/lib/tasks';
import { getTodayDateString } from './DateTimePicker';
import { getClassesForDate, loadTimetableClasses, type TimetableClass } from '@/lib/timetable';

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

function formatDateHeader(dateStr: string, isToday: boolean): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return isToday ? `Today · ${weekday}, ${monthDay}` : `${weekday}, ${monthDay}`;
}

interface WeeklyItem {
  id: string;
  title: string;
  timeRange: string;
  isPriority: boolean;
  color: string;
  isClass?: boolean;
}

interface Props {
  onNavigate: (page: string) => void;
}

export default function WeeklyTimeline({ onNavigate }: Props) {
  const [scheduleTasks, setScheduleTasks] = useState<UnifiedScheduleTask[]>(() => getAllScheduleTasks());
  const [, setTimetableClasses] = useState<TimetableClass[]>(() => loadTimetableClasses());

  useEffect(() => {
    setScheduleTasks(getAllScheduleTasks());
    setTimetableClasses(loadTimetableClasses());

    const handleTasksChanged = () => {
      setScheduleTasks(getAllScheduleTasks());
    };
    const handleTimetableChanged = () => {
      setTimetableClasses(loadTimetableClasses());
    };

    window.addEventListener('studio_os_tasks_changed', handleTasksChanged);
    window.addEventListener('studio_os_timetable_changed', handleTimetableChanged);
    window.addEventListener('studio_os_timetable_visibility_changed', handleTimetableChanged);

    return () => {
      window.removeEventListener('studio_os_tasks_changed', handleTasksChanged);
      window.removeEventListener('studio_os_timetable_changed', handleTimetableChanged);
      window.removeEventListener('studio_os_timetable_visibility_changed', handleTimetableChanged);
    };
  }, []);

  const todayStr = useMemo(() => getTodayDateString(), []);

  const daysData = useMemo(() => {
    const list: Array<{
      dateStr: string;
      heading: string;
      isToday: boolean;
      items: WeeklyItem[];
    }> = [];

    for (let i = 0; i < 7; i++) {
      const dStr = addDays(todayStr, i);
      const isToday = i === 0;
      const heading = formatDateHeader(dStr, isToday);
      const items: WeeklyItem[] = [];

      // 1. Timetable classes
      const classesForDate = getClassesForDate(dStr);
      classesForDate.forEach((cls) => {
        items.push({
          id: `class-${cls.id}-${dStr}`,
          title: cls.courseName,
          timeRange: `${cls.startTime} - ${cls.endTime}`,
          isPriority: false,
          color: 'from-emerald-800/80 to-teal-800/80 border-emerald-500/40 text-emerald-200',
          isClass: true,
        });
      });

      // 2. Tasks
      scheduleTasks.forEach((t) => {
        if (t.done) return;
        const startDate = t.start_date || t.due_date;
        const dueDate = t.due_date || t.start_date;
        if (!startDate || !dueDate) return;
        if (dStr < startDate || dStr > dueDate) return;

        const isPriority = Boolean(t.is_priority);
        let color = 'from-sky-700/80 to-blue-800/80 border-sky-400/40 text-sky-100';
        if (t.sourceType === 'subtask_research') {
          color = 'from-indigo-700/80 to-purple-800/80 border-indigo-400/40 text-indigo-100';
        } else if (isPriority) {
          color = 'from-purple-700/85 to-fuchsia-800/85 border-purple-400/50 text-purple-100';
        } else if (t.category === 'essential') {
          color = 'from-teal-700/80 to-emerald-800/80 border-teal-400/40 text-teal-100';
        }

        const displayTitle = t.part_name ? `${t.part_name} · ${t.title}` : t.title;
        const timeRange =
          t.start_time && t.due_time && t.start_time !== t.due_time
            ? `${t.start_time} - ${t.due_time}`
            : t.due_time || t.start_time || 'All day';

        items.push({
          id: `task-${t.id}-${dStr}`,
          title: displayTitle,
          timeRange,
          isPriority,
          color,
          isClass: false,
        });
      });

      list.push({
        dateStr: dStr,
        heading,
        isToday,
        items,
      });
    }

    return list;
  }, [todayStr, scheduleTasks]);

  const totalEvents = useMemo(() => {
    return daysData.reduce((acc, d) => acc + d.items.length, 0);
  }, [daysData]);

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onNavigate('weekly');
      }}
      className="glass glass-glow rounded-3xl p-4 sm:p-6 cursor-pointer group/weekly hover:border-white/20 transition-all relative"
    >
      {/* Top-Right Circle Button (NavDot) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <NavDot label="Open Weekly Timeline page" onClick={() => onNavigate('weekly')} />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pr-12">
        <div>
          <h2 className="text-xs sm:text-sm tracking-[0.2em] uppercase text-white/50">Schedule</h2>
          <p className="text-base sm:text-lg font-light text-white/90 mt-0.5 group-hover/weekly:text-white transition-colors">
            Weekly Timeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-[11px] tracking-wide text-white/40 px-2.5 sm:px-3 py-1 rounded-full border border-white/10 shrink-0">
            {totalEvents} events
          </span>
        </div>
      </div>

      {/* 7 Separate Day Boxes: One Box Per Day, NOT an hourly timeline, NO hourly slots or time scales */}
      <div className="overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 touch-pan-x">
        <div className="flex gap-2.5 min-w-[700px]">
          {daysData.map((day) => (
            <div
              key={day.dateStr}
              className={`rounded-2xl border p-2.5 flex-1 min-w-[130px] flex flex-col justify-between transition-all select-none ${
                day.isToday
                  ? 'bg-sky-950/20 border-sky-500/40 ring-1 ring-sky-500/20'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              {/* Day Heading */}
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10">
                <div className="flex items-center gap-1 min-w-0">
                  <CalendarIcon size={11} className={day.isToday ? 'text-sky-400' : 'text-white/40'} />
                  <span className={`text-[11px] font-semibold truncate ${day.isToday ? 'text-sky-300' : 'text-white/80'}`}>
                    {day.heading}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-white/40 px-1 rounded bg-white/5">
                  {day.items.length}
                </span>
              </div>

              {/* Day Events: readable complete titles, time badge */}
              <div className="space-y-1.5 min-h-[90px] max-h-[180px] overflow-y-auto no-scrollbar flex-1">
                {day.items.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-6 text-white/20 text-[10px] font-mono">
                    No events
                  </div>
                ) : (
                  day.items.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg bg-gradient-to-r ${item.color} border p-1.5 flex flex-col gap-0.5 shadow-sm text-left`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        {item.isClass ? (
                          <GraduationCap size={10} className="text-emerald-300 shrink-0" />
                        ) : item.isPriority ? (
                          <Sparkles size={10} className="text-amber-300 fill-amber-300 shrink-0" />
                        ) : null}
                        <span className="text-[11px] font-medium leading-tight truncate">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono opacity-80 pt-0.5">
                        <span className="bg-black/35 px-1 py-0.2 rounded text-[8px] truncate">
                          {item.timeRange}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
