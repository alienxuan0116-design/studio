import { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CalendarClock,
  Check,
  Plus,
  X,
  GripVertical,
  FlaskConical,
} from 'lucide-react';
import PageShell from '../components/PageShell';
import { events as initialEvents, DIFFICULTY_LABELS, type SubtaskDifficulty } from '@/data';
import {
  getAllScheduleTasks,
  updateUnifiedTaskSchedule,
  type UnifiedScheduleTask,
} from '@/lib/tasks';
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
  onOpenResearch?: (projectId: string, partId: string, subtaskId: string) => void;
  onOpenProject?: (projectId: string) => void;
}

export default function SchedulePage({
  onBack,
  onOpenTask,
  onOpenResearch,
  onOpenProject,
}: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [tasks, setTasks] = useState<UnifiedScheduleTask[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Quick schedule dock state for unscheduled tasks
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');

  // Load all tasks (bidirectional unified authoritative data)
  const loadScheduleData = () => {
    const all = getAllScheduleTasks();
    setTasks(all);
  };

  useEffect(() => {
    loadScheduleData();
    window.addEventListener('studio_os_tasks_changed', loadScheduleData);
    return () => {
      window.removeEventListener('studio_os_tasks_changed', loadScheduleData);
    };
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

  // 1. Scheduled tasks with specific time on selected date
  const scheduledTasksWithTime = useMemo(() => {
    return tasks.filter((t) => !t.done && t.due_date === selectedDateStr && Boolean(t.due_time));
  }, [tasks, selectedDateStr]);

  // 2. All-day tasks (has date, but no specific time) on selected date
  const allDayTasksWithoutTime = useMemo(() => {
    return tasks.filter((t) => !t.done && t.due_date === selectedDateStr && !t.due_time);
  }, [tasks, selectedDateStr]);

  // 3. Unscheduled tasks (has no due_date) - not assigned to any date
  const unscheduledTasks = useMemo(() => {
    return tasks.filter((t) => !t.done && !t.due_date);
  }, [tasks]);

  // Handle Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnDay = async (targetDateStr: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Update due_date to targetDateStr, retaining due_time
    await updateUnifiedTaskSchedule(taskId, targetDateStr, task.due_time);
    setSelectedDate(parseInt(targetDateStr.split('-')[2], 10));
    setDraggedTaskId(null);
    loadScheduleData();
  };

  // Quick assign time and date
  const handleAssignTime = async (taskId: string, time?: string, dateStr?: string) => {
    await updateUnifiedTaskSchedule(taskId, dateStr || selectedDateStr, time || null);
    setSchedulingTaskId(null);
    setSchedDate('');
    setSchedTime('');
    loadScheduleData();
  };

  // Flexible postpone (+1h)
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

    await updateUnifiedTaskSchedule(taskId, task.due_date || selectedDateStr, newTime);
    loadScheduleData();
  };

  // Clear date or time
  const handleClearSchedule = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await updateUnifiedTaskSchedule(taskId, null, null);
    loadScheduleData();
  };

  const handleClearTimeOnly = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await updateUnifiedTaskSchedule(taskId, task.due_date, null);
    loadScheduleData();
  };

  const handleItemClick = (item: UnifiedScheduleTask) => {
    if (item.sourceType === 'task') {
      onOpenTask?.(item.rawId);
    } else if (item.sourceType === 'subtask_research' && item.projectId && item.stageId && item.subtaskId) {
      if (onOpenResearch) {
        onOpenResearch(item.projectId, item.stageId, item.subtaskId);
      } else {
        onOpenTask?.(item.id);
      }
    } else if (item.projectId) {
      if (onOpenProject) {
        onOpenProject(item.projectId);
      } else {
        onOpenTask?.(item.id);
      }
    }
  };

  const getDifficultyBadge = (diff?: string) => {
    if (!diff) return null;
    const label = DIFFICULTY_LABELS[diff as SubtaskDifficulty] || diff;
    let colorClasses = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (diff === 'low') colorClasses = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (diff === 'high') colorClasses = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    if (diff === 'extreme') colorClasses = 'bg-purple-500/20 text-purple-300 border-purple-500/30';

    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${colorClasses}`}>
        {label}
      </span>
    );
  };

  return (
    <PageShell title="Calendar & Timeline" subtitle={`${monthName} ${year}`} onBack={onBack}>
      <div className="max-w-xl mx-auto space-y-6 pb-28">
        {/* =====================================================================
            1. MONTH CALENDAR GRID (Interactive with Drag & Drop Target)
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <CalendarIcon size={15} className="text-purple-400" />
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
              const cellDateStr = `${year}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
              const isDragOver = dragOverDate === cellDateStr;
              const hasTasksOnDay = tasks.some((t) => !t.done && t.due_date === cellDateStr);

              return (
                <div
                  key={`day-${d}`}
                  onClick={() => setSelectedDate(d)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverDate !== cellDateStr) setDragOverDate(cellDateStr);
                  }}
                  onDragLeave={() => {
                    if (dragOverDate === cellDateStr) setDragOverDate(null);
                  }}
                  onDrop={(e) => handleDropOnDay(cellDateStr, e)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-xs font-mono cursor-pointer transition-all duration-200 select-none relative ${
                    isDragOver
                      ? 'bg-purple-600/50 border-2 border-purple-300 scale-105 shadow-[0_0_20px_rgba(168,85,247,0.7)] text-white'
                      : isSelected
                      ? 'bg-purple-600 text-white font-medium shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400'
                      : isToday
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                      : 'bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  title={`Drop task here to schedule for ${cellDateStr}`}
                >
                  <span>{d}</span>
                  {/* Activity dot: only if tasks have this exact due_date */}
                  {hasTasksOnDay && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-0.5 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[10px] font-mono text-center text-white/35">
            Tip: Drag any task and drop onto any calendar day to reschedule immediately
          </p>
        </div>

        {/* =====================================================================
            2. ALL-DAY TASKS (有日期无时间：显示在日历对应日期，不虚构具体时刻)
            ===================================================================== */}
        {allDayTasksWithoutTime.length > 0 && (
          <div className="glass glass-glow rounded-3xl p-5 border border-sky-500/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <CalendarIcon size={14} className="text-sky-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-sky-200">
                  All-Day Tasks ({allDayTasksWithoutTime.length})
                </span>
              </div>
              <span className="text-[10px] font-mono text-white/40">No specific time set</span>
            </div>

            <div className="space-y-2">
              {allDayTasksWithoutTime.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  onClick={() => handleItemClick(t)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
                    <GripVertical size={13} className="text-white/20 group-hover:text-white/50 cursor-grab shrink-0" />

                    {t.sourceType === 'subtask_research' && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                        <FlaskConical size={10} />
                        <span>Research</span>
                      </span>
                    )}

                    {t.part_name && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-500/15 text-sky-300 border border-sky-500/25 shrink-0 max-w-[120px] truncate">
                        {t.part_name}
                      </span>
                    )}

                    <span className="text-xs font-medium text-white/90 truncate flex-1">
                      {t.title}
                    </span>

                    {getDifficultyBadge(t.priority)}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSchedulingTaskId(t.id);
                        setSchedDate(selectedDateStr);
                        setSchedTime('14:00');
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-sky-300 hover:text-white hover:bg-sky-500/20 transition-all border border-sky-500/30"
                      title="Assign specific time"
                    >
                      + Time
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleClearSchedule(t.id, e)}
                      className="p-1 rounded-lg text-white/30 hover:text-rose-400 hover:bg-white/5 transition-all"
                      title="Clear date"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            3. SYNCHRONIZED TIMELINE & EVENTS (日程与排期任务同步时间轴)
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-purple-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-purple-200">
                Timeline ({monthName} {selectedDate})
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/40">
              {initialEvents.length + scheduledTasksWithTime.length} timeline blocks
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
                  Event
                </span>
              </div>
            ))}

            {/* Synchronized Scheduled Tasks */}
            {scheduledTasksWithTime.map((t) => {
              const isPriority = Boolean(t.is_priority);
              const isResearch = t.sourceType === 'subtask_research';

              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  onClick={() => handleItemClick(t)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                    isPriority
                      ? 'bg-purple-950/30 border-purple-500/40 text-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.12)]'
                      : isResearch
                      ? 'bg-indigo-950/25 border-indigo-500/35 text-indigo-100'
                      : 'bg-white/[0.03] border-white/5 hover:border-white/15 text-white/85'
                  }`}
                >
                  <GripVertical size={13} className="text-white/20 group-hover:text-white/50 cursor-grab shrink-0" />

                  <div
                    className={`w-1.5 h-10 rounded-full shrink-0 ${
                      isResearch
                        ? 'bg-gradient-to-b from-indigo-400 to-purple-500'
                        : isPriority
                        ? 'bg-gradient-to-b from-purple-400 to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]'
                        : 'bg-gradient-to-b from-sky-400 to-indigo-500'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isResearch && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                          <FlaskConical size={10} />
                          <span>Research</span>
                        </span>
                      )}

                      {t.part_name && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-500/15 text-sky-300 border border-sky-500/25 shrink-0 max-w-[120px] truncate">
                          {t.part_name}
                        </span>
                      )}

                      <p
                        className={`text-xs font-medium truncate ${
                          t.done ? 'line-through opacity-50' : ''
                        }`}
                      >
                        {t.title}
                      </p>
                      {isPriority && <Sparkles size={11} className="text-purple-400 shrink-0 fill-purple-400/40" />}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-white/45">
                      <span className="flex items-center gap-1 text-sky-300">
                        <Clock size={10} />
                        {t.due_time}
                      </span>
                      {getDifficultyBadge(t.priority)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Flexible Quick Postpone Control */}
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

                    <button
                      type="button"
                      onClick={(e) => handleClearTimeOnly(t.id, e)}
                      title="Remove specific time (keep on date)"
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/30 hover:text-rose-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            4. UNSCHEDULED TASKS DOCK (未排期任务快速分派与拖拽)
            ===================================================================== */}
        <div className="glass glass-glow rounded-3xl p-5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <CalendarClock size={15} className="text-amber-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-amber-200">
                Unscheduled Queue ({unscheduledTasks.length})
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/40">Drag onto any date or click schedule</span>
          </div>

          {unscheduledTasks.length === 0 ? (
            <div className="py-4 text-center text-xs font-mono text-white/30">
              All tasks have scheduled dates. Great pace!
            </div>
          ) : (
            <div className="space-y-2.5">
              {unscheduledTasks.map((t) => {
                const isScheduling = schedulingTaskId === t.id;
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t.id)}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                        <GripVertical size={13} className="text-white/20 hover:text-white/50 cursor-grab shrink-0" />
                        {t.sourceType === 'subtask_research' && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                            <FlaskConical size={10} />
                            <span>Research</span>
                          </span>
                        )}
                        {t.part_name && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-500/15 text-sky-300 border border-sky-500/25 shrink-0 max-w-[120px] truncate">
                            {t.part_name}
                          </span>
                        )}
                        <span className="text-xs text-white/90 truncate font-medium">{t.title}</span>
                        {getDifficultyBadge(t.priority)}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isScheduling) {
                            setSchedulingTaskId(null);
                          } else {
                            setSchedulingTaskId(t.id);
                            setSchedDate(selectedDateStr);
                            setSchedTime('');
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-mono bg-purple-500/20 text-purple-200 border border-purple-500/30 hover:bg-purple-500/30 transition-colors shrink-0"
                      >
                        {isScheduling ? 'Cancel' : 'Schedule'}
                      </button>
                    </div>

                    {/* Quick date & time assignment */}
                    {isScheduling && (
                      <div className="pt-2 border-t border-white/5 space-y-3 animate-in fade-in duration-150">
                        <DateTimePicker
                          date={schedDate || selectedDateStr}
                          time={schedTime}
                          onChange={(d, tm) => {
                            setSchedDate(d);
                            setSchedTime(tm);
                          }}
                          compact
                        />
                        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                            {['09:00', '11:00', '14:00', '16:30', '20:00'].map((quickTm) => (
                              <button
                                key={quickTm}
                                type="button"
                                onClick={() => setSchedTime(quickTm)}
                                className={`px-2 py-0.5 rounded-lg text-[9px] font-mono border transition-all shrink-0 ${
                                  schedTime === quickTm
                                    ? 'bg-purple-600 text-white border-purple-400'
                                    : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border-white/5'
                                }`}
                              >
                                {quickTm}
                              </button>
                            ))}
                            {schedTime && (
                              <button
                                type="button"
                                onClick={() => setSchedTime('')}
                                className="px-2 py-0.5 rounded-lg text-[9px] font-mono text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 shrink-0"
                              >
                                Clear time
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const finalDate = schedDate || selectedDateStr;
                              handleAssignTime(t.id, schedTime || undefined, finalDate);
                            }}
                            className="px-3 py-1.5 rounded-xl text-[10px] font-mono font-medium bg-gradient-to-r from-sky-500 to-purple-600 text-white hover:from-sky-400 hover:to-purple-500 shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all flex items-center gap-1 shrink-0"
                          >
                            <CalendarClock size={12} />
                            <span>Save to Calendar</span>
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
