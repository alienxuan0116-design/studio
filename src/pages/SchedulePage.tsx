import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CalendarClock,
  CheckCircle2,
  Plus,
  ArrowRight,
} from 'lucide-react';
import PageShell from '../components/PageShell';
import { events as initialEvents } from '@/data';
import { fetchTasksByCategory, updateTask, type TaskRow } from '@/lib/tasks';
import DateTimePicker, { formatMonthDayTime, getTodayDateString } from '@/components/DateTimePicker';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatHour(h: number) {
  const hh = Math.floor(h);
  const m = Math.round((h - hh) * 60);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

interface Props {
  onBack: () => void;
  onOpenTask?: (taskId: string) => void;
}

export default function SchedulePage({ onBack, onOpenTask }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick schedule dock state for unscheduled tasks
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');

  // Load all tasks
  const loadScheduleData = async () => {
    try {
      const [ess, focus, other] = await Promise.all([
        fetchTasksByCategory('essential'),
        fetchTasksByCategory('focus'),
        fetchTasksByCategory('other'),
      ]);
      setTasks([...ess, ...focus, ...other]);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScheduleData();
  }, []);

  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
  const year = currentDate.getFullYear();
  const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(year, currentDate.getMonth(), 1).getDay();
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
    setSelectedDate(1);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
    setSelectedDate(1);
  };

  const selectedDateStr = `${year}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.toString().padStart(2, '0')}`;
  const isSelectedDayToday = isCurrentMonth && selectedDate === todayDate;

  // Scheduled tasks filtered for selected calendar date
  const scheduledTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.due_time && !t.start_time) return false;
      if (t.due_date) {
        return t.due_date === selectedDateStr;
      }
      return isSelectedDayToday;
    });
  }, [tasks, selectedDateStr, isSelectedDayToday]);

  // Unscheduled tasks (waiting for time allocation)
  const unscheduledTasks = useMemo(() => {
    return tasks.filter((t) => !t.due_time && !t.start_time && !t.done);
  }, [tasks]);

  // Quick assign time and date to an unscheduled task
  const handleAssignTime = async (taskId: string, time: string, dateStr?: string) => {
    await updateTask(taskId, {
      due_time: time,
      due_date: dateStr || selectedDateStr,
    });
    setSchedulingTaskId(null);
    setSchedDate('');
    setSchedTime('');
    loadScheduleData();
  };

  // Flexible postpone (zero penalty)
  const handlePostponeTask = async (taskId: string, amountHours = 1) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let newTime = '16:00';
    if (task.due_time && task.due_time.includes(':')) {
      const parts = task.due_time.split(':');
      const hour = (parseInt(parts[0], 10) + amountHours) % 24;
      newTime = `${hour.toString().padStart(2, '0')}:${parts[1] || '00'}`;
    } else {
      const nextH = (new Date().getHours() + amountHours) % 24;
      newTime = `${nextH.toString().padStart(2, '0')}:00`;
    }

    await updateTask(taskId, { due_time: newTime });
    loadScheduleData();
  };

  return (
    <PageShell title="Calendar" subtitle={`${monthName} ${year}`} onBack={onBack}>
      <div className="max-w-xl mx-auto space-y-6 pb-28">
        {/* =====================================================================
            1. MONTH CALENDAR GRID (Interactive with Aurora Glass style)
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-purple-400" />
              <span className="text-xs font-mono font-medium text-white/90">
                {monthName} {year}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous month"
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date().getDate());
                }}
                className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
              >
                Today
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {DAYS.map((d) => (
              <span key={d} className="text-[10px] font-mono tracking-wider text-white/35 uppercase">
                {d}
              </span>
            ))}
            {cells.map((d, i) => {
              if (d === null) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }
              const isToday = d === todayDate;
              const isSelected = d === selectedDate;

              return (
                <div
                  key={`day-${d}`}
                  onClick={() => setSelectedDate(d)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-xs font-mono cursor-pointer transition-all duration-200 select-none relative ${
                    isSelected
                      ? 'bg-purple-600 text-white font-medium shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400'
                      : isToday
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                      : 'bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{d}</span>
                  {/* Activity dot: check if any tasks scheduled on this day */}
                  {tasks.some((t) => {
                    const cellDateStr = `${year}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                    return t.due_date ? t.due_date === cellDateStr : (isCurrentMonth && d === todayDate && (t.due_time || t.start_time));
                  }) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-0.5 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            2. SYNCHRONIZED TIMELINE & EVENTS (日程与排期任务同步时间轴)
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-sky-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-sky-200">
                Timeline ({monthName} {selectedDate})
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/40">
              {initialEvents.length + scheduledTasks.length} timeline blocks
            </span>
          </div>

          {/* Synchronized Timeline Items */}
          <div className="space-y-3">
            {/* Calendar Event Blocks */}
            {initialEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all"
              >
                <div className={`w-1.5 h-10 rounded-full bg-gradient-to-b ${ev.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/90 truncate">{ev.title}</p>
                  <p className="text-[11px] text-white/40 font-mono mt-0.5">
                    {formatHour(ev.startHour)} – {formatHour(ev.endHour)}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-white/5 text-white/40 border border-white/5">
                  Calendar Event
                </span>
              </div>
            ))}

            {/* Synchronized Scheduled Tasks */}
            {scheduledTasks.map((t) => {
              const isPriority = Boolean(t.is_priority);
              return (
                <div
                  key={t.id}
                  onClick={() => onOpenTask?.(t.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                    isPriority
                      ? 'bg-purple-950/30 border-purple-500/40 text-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.12)]'
                      : 'bg-white/[0.03] border-white/5 hover:border-white/15 text-white/85'
                  }`}
                >
                  <div
                    className={`w-1.5 h-10 rounded-full shrink-0 ${
                      isPriority
                        ? 'bg-gradient-to-b from-purple-400 to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]'
                        : 'bg-gradient-to-b from-sky-400 to-indigo-500'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-xs font-medium truncate ${
                          t.done ? 'line-through opacity-50' : ''
                        }`}
                      >
                        {t.label}
                      </p>
                      {isPriority && <Sparkles size={11} className="text-purple-400 shrink-0 fill-purple-400/40" />}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-white/45">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatMonthDayTime(t.due_date, t.due_time || t.start_time)}
                      </span>
                      {t.tag && <span>• {t.tag}</span>}
                    </div>
                  </div>

                  {/* Flexible Quick Postpone Control (Zero-anxiety rescheduling) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePostponeTask(t.id, 1);
                    }}
                    title="Flexible delay +1 hour"
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/5 transition-colors text-[10px] font-mono flex items-center gap-1"
                  >
                    <CalendarClock size={12} />
                    <span>+1h</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            3. UNSCHEDULED TASKS DOCK (未排期任务快速分派)
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <CalendarClock size={15} className="text-amber-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-amber-200">
                Unscheduled Queue ({unscheduledTasks.length})
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/40">Month/Day + Time Point</span>
          </div>

          {unscheduledTasks.length === 0 ? (
            <div className="py-4 text-center text-xs font-mono text-white/30">
              All tasks have scheduled time blocks. Great pace!
            </div>
          ) : (
            <div className="space-y-2.5">
              {unscheduledTasks.map((t) => {
                const isScheduling = schedulingTaskId === t.id;
                return (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-white/90 truncate flex-1 font-medium">{t.label}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (isScheduling) {
                            setSchedulingTaskId(null);
                          } else {
                            setSchedulingTaskId(t.id);
                            const todayStr = getTodayDateString();
                            setSchedDate(selectedDateStr >= todayStr ? selectedDateStr : todayStr);
                            setSchedTime('14:00');
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-mono bg-purple-500/20 text-purple-200 border border-purple-500/30 hover:bg-purple-500/30 transition-colors shrink-0"
                      >
                        {isScheduling ? 'Cancel' : 'Schedule'}
                      </button>
                    </div>

                    {/* Month/Day + Time Point assignment */}
                    {isScheduling && (
                      <div className="pt-2 border-t border-white/5 space-y-3 animate-in fade-in duration-150">
                        <DateTimePicker
                          date={schedDate || (selectedDateStr >= getTodayDateString() ? selectedDateStr : getTodayDateString())}
                          time={schedTime || '14:00'}
                          onChange={(d, tm) => {
                            setSchedDate(d);
                            setSchedTime(tm);
                          }}
                          compact
                        />
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                            {['09:00', '11:00', '14:00', '16:30', '20:00'].map((quickTm) => (
                              <button
                                key={quickTm}
                                type="button"
                                onClick={() => setSchedTime(quickTm)}
                                className="px-2 py-0.5 rounded-lg text-[9px] font-mono bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5 transition-all shrink-0"
                              >
                                {quickTm}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const finalDate = schedDate || (selectedDateStr >= getTodayDateString() ? selectedDateStr : getTodayDateString());
                              const finalTime = schedTime || '14:00';
                              handleAssignTime(t.id, finalTime, finalDate);
                            }}
                            className="px-3 py-1.5 rounded-xl text-[10px] font-mono font-medium bg-gradient-to-r from-sky-500 to-purple-600 text-white hover:from-sky-400 hover:to-purple-500 shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all flex items-center gap-1 shrink-0"
                          >
                            <CalendarClock size={12} />
                            <span>Sync to Calendar</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
