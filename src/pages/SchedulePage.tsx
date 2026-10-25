import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Plus,
  X,
  GripVertical,
  GraduationCap,
  MapPin,
  Pencil,
  Trash2,
  BookOpen,
  Inbox,
  Eye,
  EyeOff,
} from 'lucide-react';
import PageShell from '../components/PageShell';
import NavDot from '../components/NavDot';
import NewTaskPage from './NewTaskPage';
import { DIFFICULTY_LABELS, type SubtaskDifficulty } from '@/data';
import {
  getAllScheduleTasks,
  updateUnifiedTaskSchedule,
  deleteTask,
  type UnifiedScheduleTask,
} from '@/lib/tasks';
import { getTodayDateString } from '@/components/DateTimePicker';
import {
  loadTimetableClasses,
  getClassesForDate,
  getTimetableVisible,
  setTimetableVisible,
  createTimetableClass,
  updateTimetableClass,
  deleteTimetableClass,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  type TimetableClass,
} from '@/lib/timetable';
import {
  computeTimelineLayout,
  type TimelineLayoutInput,
  type PositionedTimelineItem,
} from '@/lib/timelineLayout';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_HEIGHT = 60; // Pixels per hour for 00:00 - 24:00 vertical timeline
const TOTAL_HOURS = 24;

function formatHour(h: number) {
  const hh = Math.floor(h);
  const m = Math.round((h - hh) * 60);
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

function formatTimeFromHour(h: number): string {
  const clamped = Math.max(0, Math.min(24, h));
  const hh = Math.floor(clamped);
  const mm = Math.round((clamped - hh) * 60);
  if (hh >= 24) return '24:00';
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDaysDifference(startStr: string, endStr: string): number {
  const sParts = startStr.split('-');
  const eParts = endStr.split('-');
  if (sParts.length !== 3 || eParts.length !== 3) return 0;
  const s = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10));
  const e = new Date(parseInt(eParts[0], 10), parseInt(eParts[1], 10) - 1, parseInt(eParts[2], 10));
  const diffTime = e.getTime() - s.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function formatDateHeader(dateStr: string, isToday: boolean): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return isToday ? `Today · ${weekday}, ${monthDay}` : `${weekday}, ${monthDay}`;
}

interface DayCell {
  date: Date;
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

interface Props {
  initialFocus?: 'timeline' | 'calendar' | 'weekly';
  onBack: () => void;
  onOpenTask?: (taskId: string) => void;
  onOpenResearch?: (projectId: string, partId: string, subtaskId: string) => void;
  onOpenProject?: (projectId: string) => void;
}

// Unified item type for overlapping layout on timeline
type TimelineItem =
  | {
      id: string;
      kind: 'task';
      task: UnifiedScheduleTask;
      startHour: number;
      endHour: number;
    }
  | {
      id: string;
      kind: 'class';
      classData: TimetableClass;
      startHour: number;
      endHour: number;
    };

export default function SchedulePage({
  initialFocus = 'calendar',
  onBack,
  onOpenTask,
  onOpenResearch,
  onOpenProject,
}: Props) {
  // Mutually exclusive collapsing sections state: 'calendar' | 'timeline' | 'weekly'
  type CollapsibleSectionType = 'calendar' | 'timeline' | 'weekly';
  const [expandedSection, setExpandedSection] = useState<CollapsibleSectionType>(() => {
    if (initialFocus === 'weekly') return 'weekly';
    if (initialFocus === 'timeline') return 'timeline';
    return 'calendar';
  });

  const toggleSection = (section: CollapsibleSectionType) => {
    // When section A is expanded, automatically collapse B and C
    // Collapsed sections must remain accessible and can be opened manually
    setExpandedSection(section);
  };

  // Timetable visibility configuration (persistent across all pages)
  const [isTimetableVisible, setIsTimetableVisible] = useState<boolean>(() => getTimetableVisible());

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => getTodayDateString());
  const [tasks, setTasks] = useState<UnifiedScheduleTask[]>(() => getAllScheduleTasks());
  const [timetableClasses, setTimetableClasses] = useState<TimetableClass[]>(() => loadTimetableClasses());

  // Timetable manager modal & class edit modal state
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TimetableClass | null>(null);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [classFormCourse, setClassFormCourse] = useState('');
  const [classFormWeekday, setClassFormWeekday] = useState(1);
  const [classFormStartTime, setClassFormStartTime] = useState('09:00');
  const [classFormEndTime, setClassFormEndTime] = useState('10:30');
  const [classFormLocation, setClassFormLocation] = useState('');
  const [classFormNotes, setClassFormNotes] = useState('');

  const [isPendingExpanded, setIsPendingExpanded] = useState(true);

  // Dragging across empty time range on the timeline to create events
  const [creationDrag, setCreationDrag] = useState<{
    dateStr: string;
    startHour: number;
    currentHour: number;
  } | null>(null);

  const creationDragRef = useRef<{
    active: boolean;
    dateStr: string;
    startHour: number;
    currentHour: number;
    startX: number;
    startY: number;
  }>({
    active: false,
    dateStr: '',
    startHour: 0,
    currentHour: 0,
    startX: 0,
    startY: 0,
  });

  // Modal for NewTaskPage (from drag-to-create or timeline Add Card button)
  const [newTaskModal, setNewTaskModal] = useState<{
    isOpen: boolean;
    date: string;
    startTime: string;
    endTime: string;
    category: 'focus' | 'essential' | 'other';
  }>({
    isOpen: false,
    date: '',
    startTime: '',
    endTime: '',
    category: 'focus',
  });

  // Active Drag State for Universal Pointer (mouse, touch, iPad)
  const [activeDrag, setActiveDrag] = useState<{
    task: UnifiedScheduleTask;
    pointerX: number;
    pointerY: number;
    hasMoved: boolean;
    dropTarget:
      | { type: 'calendar'; dateStr: string }
      | { type: 'timeline'; dateStr: string; hour: number; timeStr: string }
      | { type: 'pending' }
      | null;
  } | null>(null);

  const dragRef = useRef<{
    task: UnifiedScheduleTask | null;
    startX: number;
    startY: number;
    hasMoved: boolean;
    dropTarget:
      | { type: 'calendar'; dateStr: string }
      | { type: 'timeline'; dateStr: string; hour: number; timeStr: string }
      | { type: 'pending' }
      | null;
  }>({
    task: null,
    startX: 0,
    startY: 0,
    hasMoved: false,
    dropTarget: null,
  });

  const verticalTimelineRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);

  // Accidental deletion prevention: require confirmation before deleting
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmDeleteTaskId) return;
    const timer = setTimeout(() => setConfirmDeleteTaskId(null), 3500);
    return () => clearTimeout(timer);
  }, [confirmDeleteTaskId]);

  useEffect(() => {
    if (!confirmDeleteClassId) return;
    const timer = setTimeout(() => setConfirmDeleteClassId(null), 3500);
    return () => clearTimeout(timer);
  }, [confirmDeleteClassId]);

  // Load all tasks & timetable data
  const loadScheduleData = useCallback(() => {
    setTasks(getAllScheduleTasks());
    setTimetableClasses(loadTimetableClasses());
    setIsTimetableVisible(getTimetableVisible());
  }, []);

  const handleToggleTimetableVisibility = () => {
    const next = !isTimetableVisible;
    setIsTimetableVisible(next);
    setTimetableVisible(next);
    loadScheduleData();
  };

  useEffect(() => {
    loadScheduleData();
    window.addEventListener('studio_os_tasks_changed', loadScheduleData);
    window.addEventListener('studio_os_timetable_changed', loadScheduleData);
    window.addEventListener('studio_os_timetable_visibility_changed', loadScheduleData);
    return () => {
      window.removeEventListener('studio_os_tasks_changed', loadScheduleData);
      window.removeEventListener('studio_os_timetable_changed', loadScheduleData);
      window.removeEventListener('studio_os_timetable_visibility_changed', loadScheduleData);
    };
  }, [loadScheduleData]);

  // Auto-scroll vertical timeline to current hour on load or expand
  useEffect(() => {
    if (verticalTimelineRef.current && expandedSection === 'timeline') {
      const now = new Date();
      const currentH = now.getHours() + now.getMinutes() / 60;
      const targetScroll = Math.max(0, (currentH - 1.5) * HOUR_HEIGHT);
      verticalTimelineRef.current.scrollTop = targetScroll;
    }
  }, [expandedSection]);

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
  const todayDateStr = getTodayDateString();

  const prevMonth = () => {
    setCurrentDate(new Date(year, monthIndex - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, monthIndex + 1, 1));
  };

  // Generate 2D array of weeks for Month view
  const weeks = useMemo<DayCell[][]>(() => {
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const firstWeekday = firstDayOfMonth.getDay();
    const startDate = new Date(year, monthIndex, 1 - firstWeekday);

    const result: DayCell[][] = [];
    const curr = new Date(startDate);

    while (true) {
      const week: DayCell[] = [];
      for (let i = 0; i < 7; i++) {
        const y = curr.getFullYear();
        const m = (curr.getMonth() + 1).toString().padStart(2, '0');
        const d = curr.getDate().toString().padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;
        week.push({
          date: new Date(curr),
          dateStr: dStr,
          dayNum: curr.getDate(),
          isCurrentMonth: curr.getMonth() === monthIndex,
          isToday: dStr === todayDateStr,
          isSelected: dStr === selectedDateStr,
        });
        curr.setDate(curr.getDate() + 1);
      }
      result.push(week);
      if (curr.getMonth() !== monthIndex && result.length >= 4) {
        break;
      }
      if (result.length >= 6) break;
    }
    return result;
  }, [year, monthIndex, todayDateStr, selectedDateStr]);

  // Task click handler (opens details only when NOT dragging)
  const handleItemClick = useCallback(
    (item: UnifiedScheduleTask) => {
      if (dragRef.current.hasMoved) return;
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
    },
    [onOpenTask, onOpenResearch, onOpenProject]
  );

  // =========================================================================
  // UNIVERSAL POINTER DRAG & DROP CONTROLLER
  // Works on Mouse, Trackpad, iPad Touch, Apple Pencil
  // =========================================================================
  const getDropTargetAtPoint = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);

    // 0. Check pending drop zone
    if (el?.closest('[data-drop-zone="pending"]')) {
      return { type: 'pending' as const };
    }

    // 1. Check vertical timeline (within its scrollable viewport)
    if (verticalTimelineRef.current && timelineContentRef.current) {
      const containerRect = verticalTimelineRef.current.getBoundingClientRect();
      if (
        clientX >= containerRect.left &&
        clientX <= containerRect.right &&
        clientY >= containerRect.top &&
        clientY <= containerRect.bottom
      ) {
        const contentRect = timelineContentRef.current.getBoundingClientRect();
        const relY = clientY - contentRect.top;
        const rawHour = relY / HOUR_HEIGHT;
        // Snap to 30-minute intervals (clamped between 00:00 and 23:30)
        const snappedHour = Math.max(0, Math.min(23.5, Math.round(rawHour * 2) / 2));
        const timeStr = formatTimeFromHour(snappedHour);

        // Check if inside a specific day column
        const dayColEl = el?.closest('[data-timeline-day-col]') as HTMLElement | null;
        const dateStr = dayColEl?.dataset.timelineDayCol || selectedDateStr;

        return { type: 'timeline' as const, dateStr, hour: snappedHour, timeStr };
      }
    }

    // 2. Check calendar day cell
    const dayCellEl = el?.closest('[data-calendar-date]') as HTMLElement | null;
    if (dayCellEl && dayCellEl.dataset.calendarDate) {
      return { type: 'calendar' as const, dateStr: dayCellEl.dataset.calendarDate };
    }

    return null;
  }, [selectedDateStr]);

  const handlePendingDrop = useCallback(async (task: UnifiedScheduleTask) => {
    await updateUnifiedTaskSchedule(task.id, null, null, null, null);
    const freshTasks = getAllScheduleTasks();
    setTasks(freshTasks);
  }, []);

  const handleTimelineDrop = useCallback(
    async (task: UnifiedScheduleTask, targetDateStr: string, targetHour: number) => {
      // 1. Calculate original task duration in hours
      const origStartHour = parseHourFromTime(task.start_time || task.due_time);
      const origEndHour =
        task.start_time && task.due_time && parseHourFromTime(task.due_time)
          ? parseHourFromTime(task.due_time)!
          : origStartHour !== null
          ? Math.min(24, origStartHour + 1.0)
          : 1.0;

      const durationHours =
        origStartHour !== null && origEndHour > origStartHour
          ? Math.max(0.25, origEndHour - origStartHour)
          : 1.0;

      // 2. Calculate new start and end time based on actual drop position
      const newStartHour = targetHour;
      const newEndHour = Math.min(24, newStartHour + durationHours);

      const newStartTimeStr = formatTimeFromHour(newStartHour);
      const newEndTimeStr = formatTimeFromHour(newEndHour);

      // 3. Multi-day span preservation or single-day target
      const origStart = task.start_date || task.due_date || targetDateStr;
      const origEnd = task.due_date || task.start_date || targetDateStr;
      const diffDays = getDaysDifference(origStart, origEnd);

      const newStart = targetDateStr;
      const newEnd = diffDays > 0 ? addDaysToDateStr(newStart, diffDays) : newStart;

      // 4. Persist to existing data layer with both start_time and due_time
      await updateUnifiedTaskSchedule(
        task.id,
        newEnd,
        newEndTimeStr,
        newStart,
        newStartTimeStr
      );

      // 5. Update local state immediately with fresh tasks
      setSelectedDateStr(newStart);
      const freshTasks = getAllScheduleTasks();
      setTasks(freshTasks);
    },
    []
  );

  const handleCalendarDrop = useCallback(
    async (task: UnifiedScheduleTask, targetDateStr: string) => {
      const origStart = task.start_date || task.due_date || targetDateStr;
      const origEnd = task.due_date || task.start_date || targetDateStr;
      const diffDays = getDaysDifference(origStart, origEnd);

      const newStart = targetDateStr;
      const newEnd = diffDays > 0 ? addDaysToDateStr(newStart, diffDays) : newStart;

      // Preserve original times and duration across calendar drag
      await updateUnifiedTaskSchedule(
        task.id,
        newEnd,
        task.due_time,
        newStart,
        task.start_time
      );

      setSelectedDateStr(newStart);
      const freshTasks = getAllScheduleTasks();
      setTasks(freshTasks);
    },
    []
  );

  // Timeline surface drag to create new event
  const handleTimelineSurfacePointerDown = (
    e: React.PointerEvent,
    dateStr: string
  ) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-timeline-card="true"]')) return;
    if ((e.target as HTMLElement).closest('button, input, select')) return;

    if (!timelineContentRef.current) return;
    const contentRect = timelineContentRef.current.getBoundingClientRect();
    const relY = e.clientY - contentRect.top;
    const rawHour = relY / HOUR_HEIGHT;
    const snappedHour = Math.max(0, Math.min(23.5, Math.round(rawHour * 2) / 2));

    creationDragRef.current = {
      active: false,
      dateStr,
      startHour: snappedHour,
      currentHour: snappedHour,
      startX: e.clientX,
      startY: e.clientY,
    };

    const handleCreationMove = (moveEv: PointerEvent) => {
      const dy = moveEv.clientY - creationDragRef.current.startY;
      const dist = Math.abs(dy);

      if (dist > 10 && !creationDragRef.current.active) {
        creationDragRef.current.active = true;
      }

      if (creationDragRef.current.active && timelineContentRef.current) {
        if (moveEv.cancelable) moveEv.preventDefault();
        const rect = timelineContentRef.current.getBoundingClientRect();
        const currRelY = moveEv.clientY - rect.top;
        const currRawHour = currRelY / HOUR_HEIGHT;
        const currSnapped = Math.max(0, Math.min(24, Math.round(currRawHour * 2) / 2));
        creationDragRef.current.currentHour = currSnapped;

        setCreationDrag({
          dateStr: creationDragRef.current.dateStr,
          startHour: creationDragRef.current.startHour,
          currentHour: currSnapped,
        });
      }
    };

    const handleCreationUp = () => {
      window.removeEventListener('pointermove', handleCreationMove);
      window.removeEventListener('pointerup', handleCreationUp);
      window.removeEventListener('pointercancel', handleCreationUp);

      const wasActive = creationDragRef.current.active;
      const dStr = creationDragRef.current.dateStr;
      const sH = Math.min(creationDragRef.current.startHour, creationDragRef.current.currentHour);
      const eH = Math.max(creationDragRef.current.startHour, creationDragRef.current.currentHour);
      const duration = Math.max(0.5, eH - sH);

      setCreationDrag(null);
      creationDragRef.current = {
        active: false,
        dateStr: '',
        startHour: 0,
        currentHour: 0,
        startX: 0,
        startY: 0,
      };

      if (wasActive && dStr) {
        const startTimeStr = formatTimeFromHour(sH);
        const endTimeStr = formatTimeFromHour(Math.min(24, sH + duration));
        setNewTaskModal({
          isOpen: true,
          date: dStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          category: 'focus',
        });
      }
    };

    window.addEventListener('pointermove', handleCreationMove, { passive: false });
    window.addEventListener('pointerup', handleCreationUp);
    window.addEventListener('pointercancel', handleCreationUp);
  };

  const handlePointerDown = (e: React.PointerEvent, task: UnifiedScheduleTask) => {
    // Only left clicks or primary touch
    if (e.button !== 0) return;

    dragRef.current = {
      task,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false,
      dropTarget: null,
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!dragRef.current.task) return;
      const dx = moveEv.clientX - dragRef.current.startX;
      const dy = moveEv.clientY - dragRef.current.startY;
      const dist = Math.hypot(dx, dy);

      if (!dragRef.current.hasMoved && dist > 5) {
        dragRef.current.hasMoved = true;
      }

      if (dragRef.current.hasMoved) {
        if (moveEv.cancelable) {
          moveEv.preventDefault();
        }

        const dropTarget = getDropTargetAtPoint(moveEv.clientX, moveEv.clientY);
        dragRef.current.dropTarget = dropTarget;

        if (verticalTimelineRef.current) {
          const containerRect = verticalTimelineRef.current.getBoundingClientRect();
          if (
            moveEv.clientX >= containerRect.left &&
            moveEv.clientX <= containerRect.right
          ) {
            if (moveEv.clientY >= containerRect.top && moveEv.clientY <= containerRect.top + 45) {
              verticalTimelineRef.current.scrollTop -= 10;
            } else if (
              moveEv.clientY <= containerRect.bottom &&
              moveEv.clientY >= containerRect.bottom - 45
            ) {
              verticalTimelineRef.current.scrollTop += 10;
            }
          }
        }

        setActiveDrag({
          task: dragRef.current.task,
          pointerX: moveEv.clientX,
          pointerY: moveEv.clientY,
          hasMoved: true,
          dropTarget,
        });
      }
    };

    const cleanupListeners = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };

    const handlePointerCancel = () => {
      cleanupListeners();
      setActiveDrag(null);
      dragRef.current = {
        task: null,
        startX: 0,
        startY: 0,
        hasMoved: false,
        dropTarget: null,
      };
    };

    const handlePointerUp = async (upEv: PointerEvent) => {
      cleanupListeners();

      const hadMoved = dragRef.current.hasMoved;
      const draggedTask = dragRef.current.task;
      const finalDropTarget =
        getDropTargetAtPoint(upEv.clientX, upEv.clientY) || dragRef.current.dropTarget;

      setActiveDrag(null);
      dragRef.current = {
        task: null,
        startX: 0,
        startY: 0,
        hasMoved: false,
        dropTarget: null,
      };

      if (!hadMoved && draggedTask) {
        // Pure click/tap: open detail view
        handleItemClick(draggedTask);
        return;
      }

      if (hadMoved && draggedTask && finalDropTarget) {
        if (finalDropTarget.type === 'pending') {
          await handlePendingDrop(draggedTask);
        } else if (finalDropTarget.type === 'timeline') {
          await handleTimelineDrop(draggedTask, finalDropTarget.dateStr, finalDropTarget.hour);
        } else if (finalDropTarget.type === 'calendar') {
          await handleCalendarDrop(draggedTask, finalDropTarget.dateStr);
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
  };

  // Quick schedule dock: schedule an unscheduled task for selected date as ALL-DAY (no arbitrary time)
  const handleScheduleForDateOnly = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await updateUnifiedTaskSchedule(taskId, selectedDateStr, null, selectedDateStr);
    loadScheduleData();
  };

  // Accidental deletion prevention: 2-step confirmed delete
  const handleDeleteTask = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirmDeleteTaskId !== taskId) {
      setConfirmDeleteTaskId(taskId);
      return;
    }
    if (taskId.startsWith('subtask::')) {
      await updateUnifiedTaskSchedule(taskId, null, null, null);
    } else {
      await deleteTask(taskId);
    }
    setConfirmDeleteTaskId(null);
    loadScheduleData();
  };

  const draggedTaskDuration = useMemo(() => {
    if (!activeDrag?.task) return 1.0;
    const t = activeDrag.task;
    const start = parseHourFromTime(t.start_time || t.due_time);
    const end = t.start_time && t.due_time && parseHourFromTime(t.due_time)
      ? parseHourFromTime(t.due_time)!
      : start !== null ? Math.min(24, start + 1.0) : 1.0;
    return start !== null && end > start ? Math.max(0.4, end - start) : 1.0;
  }, [activeDrag?.task]);

  const previewEndTimeStr = useMemo(() => {
    if (!activeDrag?.dropTarget || activeDrag.dropTarget.type !== 'timeline') return '';
    const newEnd = Math.min(24, activeDrag.dropTarget.hour + draggedTaskDuration);
    return formatTimeFromHour(newEnd);
  }, [activeDrag?.dropTarget, draggedTaskDuration]);

  // Clear date/time schedule
  const handleClearSchedule = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await updateUnifiedTaskSchedule(taskId, null, null, null);
    loadScheduleData();
  };

  const handleClearTimeOnly = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await updateUnifiedTaskSchedule(taskId, task.due_date, null, task.start_date);
    loadScheduleData();
  };

  const getDifficultyBadge = (diff?: string) => {
    if (!diff) return null;
    const norm = diff === 'extreme' ? 'high' : diff;
    const label = DIFFICULTY_LABELS[norm as SubtaskDifficulty] || norm;
    let colorClasses = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (norm === 'low') colorClasses = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (norm === 'high') colorClasses = 'bg-rose-500/20 text-rose-300 border-rose-500/30';

    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${colorClasses}`}>
        {label}
      </span>
    );
  };

  // =========================================================================
  // MULTI-DAY CALENDAR BARS CALCULATION (Month View)
  // Partitions multi-day spans across week rows cleanly
  // =========================================================================
  const weekBarsMap = useMemo(() => {
    return weeks.map((week) => {
      const weekStart = week[0].dateStr;
      const weekEnd = week[6].dateStr;

      const overlapping: Array<{
        task: UnifiedScheduleTask;
        startCol: number;
        endCol: number;
        span: number;
        isStart: boolean;
        isEnd: boolean;
        isMultiDay: boolean;
      }> = [];

      tasks.forEach((t) => {
        if (t.done) return;
        const rawStart = t.start_date || t.due_date;
        const rawEnd = t.due_date || t.start_date;
        if (!rawStart || !rawEnd) return;

        let start = rawStart;
        let end = rawEnd;
        if (start > end) {
          const temp = start;
          start = end;
          end = temp;
        }

        if (start <= weekEnd && end >= weekStart) {
          let sCol = week.findIndex((d) => d.dateStr === start);
          const isStart = sCol !== -1;
          if (sCol === -1) sCol = 0;

          let eCol = week.findIndex((d) => d.dateStr === end);
          const isEnd = eCol !== -1;
          if (eCol === -1) eCol = 6;

          const span = Math.max(1, eCol - sCol + 1);
          overlapping.push({
            task: t,
            startCol: sCol,
            endCol: eCol,
            span,
            isStart,
            isEnd,
            isMultiDay: start !== end,
          });
        }
      });

      overlapping.sort((a, b) => {
        if (a.isMultiDay !== b.isMultiDay) return a.isMultiDay ? -1 : 1;
        if (b.span !== a.span) return b.span - a.span;
        return a.startCol - b.startCol;
      });

      const lanes: (string | null)[][] = [];
      const positionedBars: Array<{
        task: UnifiedScheduleTask;
        startCol: number;
        endCol: number;
        span: number;
        isStart: boolean;
        isEnd: boolean;
        isMultiDay: boolean;
        laneIndex: number;
      }> = [];

      overlapping.forEach((item) => {
        let laneIndex = 0;
        while (true) {
          if (!lanes[laneIndex]) {
            lanes[laneIndex] = new Array(7).fill(null);
          }
          let isFree = true;
          for (let c = item.startCol; c <= item.endCol; c++) {
            if (lanes[laneIndex][c] !== null) {
              isFree = false;
              break;
            }
          }
          if (isFree) {
            for (let c = item.startCol; c <= item.endCol; c++) {
              lanes[laneIndex][c] = item.task.id;
            }
            positionedBars.push({ ...item, laneIndex });
            break;
          }
          laneIndex++;
        }
      });

      return {
        bars: positionedBars,
        totalLanes: Math.max(1, lanes.length),
      };
    });
  }, [weeks, tasks]);

  // 7 consecutive days for the 7-day day overview
  const sevenDaysList = useMemo(() => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDaysToDateStr(selectedDateStr, i));
    }
    return dates;
  }, [selectedDateStr]);

  // Tasks in Pending area (unscheduled or missing date/time)
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => !t.done && (!t.due_date || !t.due_time));
  }, [tasks]);

  // Tasks for Selected Date
  const scheduledTasksForSelectedDate = useMemo(() => {
    return tasks.filter((t) => {
      if (t.done || !t.due_time) return false;
      const start = t.start_date || t.due_date;
      const end = t.due_date || t.start_date;
      if (!start || !end) return false;
      return selectedDateStr >= start && selectedDateStr <= end;
    });
  }, [tasks, selectedDateStr]);

  const allDayTasksForSelectedDate = useMemo(() => {
    return tasks.filter((t) => {
      if (t.done || t.due_time) return false;
      const start = t.start_date || t.due_date;
      const end = t.due_date || t.start_date;
      if (!start || !end) return false;
      return selectedDateStr >= start && selectedDateStr <= end;
    });
  }, [tasks, selectedDateStr]);

  const unscheduledTasks = useMemo(() => {
    return tasks.filter((t) => !t.done && !t.due_date && !t.start_date);
  }, [tasks]);

  // Recurring timetable classes for the selected date's weekday (respecting visibility setting)
  const recurringClassesForSelectedDate = useMemo(() => {
    return isTimetableVisible ? getClassesForDate(selectedDateStr) : [];
  }, [selectedDateStr, timetableClasses, isTimetableVisible]);

  // =========================================================================
  // OVERLAPPING TIMELINE LAYOUT COMPUTATION
  // Arranges overlapping tasks and recurring classes side-by-side without collision
  // =========================================================================
  const getTimelineItemsForDate = useCallback(
    (targetDate: string): PositionedTimelineItem<TimelineItem>[] => {
      const rawItems: TimelineItem[] = [];

      tasks.forEach((t) => {
        if (t.done || !t.due_time) return;
        const start = t.start_date || t.due_date;
        const end = t.due_date || t.start_date;
        if (!start || !end) return;
        if (targetDate < start || targetDate > end) return;

        const startHour = parseHourFromTime(t.start_time || t.due_time);
        if (startHour !== null) {
          const endHour =
            t.start_time && t.due_time && parseHourFromTime(t.due_time)
              ? Math.max(startHour + 0.4, parseHourFromTime(t.due_time)!)
              : Math.min(24, startHour + 1.0);

          rawItems.push({
            id: `task-${t.id}`,
            kind: 'task',
            task: t,
            startHour,
            endHour,
          });
        }
      });

      if (isTimetableVisible) {
        const classesForTarget = getClassesForDate(targetDate);
        classesForTarget.forEach((c) => {
          const start = parseHourFromTime(c.startTime);
          const end = parseHourFromTime(c.endTime);
          if (start !== null && end !== null) {
            rawItems.push({
              id: `class-${c.id}`,
              kind: 'class',
              classData: c,
              startHour: start,
              endHour: Math.max(start + 0.4, end),
            });
          }
        });
      }

      return computeTimelineLayout(rawItems);
    },
    [tasks, timetableClasses, isTimetableVisible]
  );

  const positionedTimelineItems = useMemo<PositionedTimelineItem<TimelineItem>[]>(() => {
    return getTimelineItemsForDate(selectedDateStr);
  }, [getTimelineItemsForDate, selectedDateStr]);

  const legacyPositionedTimelineItems = useMemo<PositionedTimelineItem<TimelineItem>[]>(() => {
    const rawItems: TimelineItem[] = [];

    // 1. Add scheduled tasks
    scheduledTasksForSelectedDate.forEach((t) => {
      const start = parseHourFromTime(t.start_time || t.due_time);
      if (start !== null) {
        const end =
          t.start_time && t.due_time && parseHourFromTime(t.due_time)
            ? Math.max(start + 0.4, parseHourFromTime(t.due_time)!)
            : Math.min(24, start + 1.0);

        rawItems.push({
          id: `task-${t.id}`,
          kind: 'task',
          task: t,
          startHour: start,
          endHour: end,
        });
      }
    });

    // 2. Add recurring timetable classes (appear exclusively on the vertical timeline)
    recurringClassesForSelectedDate.forEach((c) => {
      const start = parseHourFromTime(c.startTime);
      const end = parseHourFromTime(c.endTime);
      if (start !== null && end !== null) {
        rawItems.push({
          id: `class-${c.id}`,
          kind: 'class',
          classData: c,
          startHour: start,
          endHour: Math.max(start + 0.4, end),
        });
      }
    });

    return computeTimelineLayout(rawItems);
  }, [scheduledTasksForSelectedDate, recurringClassesForSelectedDate]);

  // Timetable Class Form Handlers
  const handleOpenCreateClassModal = () => {
    const parts = selectedDateStr.split('-');
    const currentWeekday = parts.length === 3 ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getDay() : 1;
    setClassFormCourse('');
    setClassFormWeekday(currentWeekday);
    setClassFormStartTime('09:00');
    setClassFormEndTime('10:30');
    setClassFormLocation('');
    setClassFormNotes('');
    setEditingClass(null);
    setIsCreatingClass(true);
    setIsTimetableModalOpen(true);
  };

  const handleOpenEditClassModal = (cls: TimetableClass) => {
    setEditingClass(cls);
    setClassFormCourse(cls.courseName);
    setClassFormWeekday(cls.weekday);
    setClassFormStartTime(cls.startTime);
    setClassFormEndTime(cls.endTime);
    setClassFormLocation(cls.location || '');
    setClassFormNotes(cls.notes || '');
    setIsCreatingClass(false);
    setIsTimetableModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classFormCourse.trim()) return;

    if (editingClass) {
      updateTimetableClass(editingClass.id, {
        courseName: classFormCourse.trim(),
        weekday: classFormWeekday,
        startTime: classFormStartTime,
        endTime: classFormEndTime,
        location: classFormLocation.trim() || undefined,
        notes: classFormNotes.trim() || undefined,
      });
    } else {
      createTimetableClass({
        courseName: classFormCourse.trim(),
        weekday: classFormWeekday,
        startTime: classFormStartTime,
        endTime: classFormEndTime,
        location: classFormLocation.trim() || undefined,
        notes: classFormNotes.trim() || undefined,
      });
    }

    setIsTimetableModalOpen(false);
    setEditingClass(null);
    setIsCreatingClass(false);
    loadScheduleData();
  };

  const handleDeleteClass = (id: string) => {
    if (window.confirm('Delete this timetable class?')) {
      deleteTimetableClass(id);
      setIsTimetableModalOpen(false);
      setEditingClass(null);
      loadScheduleData();
    }
  };

  return (
    <PageShell
      title="Calendar & Timeline"
      subtitle={`${monthName} ${year}`}
      onBack={onBack}
    >
      <div className="w-full max-w-6xl mx-auto space-y-5 pb-28 select-none">
        {/* Top Control Bar: Mutually Exclusive Section Toggles & Timetable Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 glass glass-glow rounded-2xl p-2.5 px-4 border border-white/10 relative">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Section A: Calendar */}
            <button
              type="button"
              onClick={() => toggleSection('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                expandedSection === 'calendar'
                  ? 'bg-purple-600/35 text-purple-200 border border-purple-500/50 font-medium'
                  : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
              }`}
            >
              <CalendarIcon size={14} className="text-purple-300" />
              <span>Calendar</span>
              {expandedSection === 'calendar' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Section B: Timeline */}
            <button
              type="button"
              onClick={() => toggleSection('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                expandedSection === 'timeline'
                  ? 'bg-sky-600/35 text-sky-200 border border-sky-500/50 font-medium'
                  : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
              }`}
            >
              <Clock size={14} className="text-sky-300" />
              <span>Timeline</span>
              {expandedSection === 'timeline' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Section C: Weekly Overview */}
            <button
              type="button"
              onClick={() => toggleSection('weekly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                expandedSection === 'weekly'
                  ? 'bg-emerald-600/35 text-emerald-200 border border-emerald-500/50 font-medium'
                  : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
              }`}
            >
              <CalendarIcon size={14} className="text-emerald-300" />
              <span>Weekly Overview</span>
              {expandedSection === 'weekly' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Timetable Visibility Toggle Control (Persisted across pages) */}
            <button
              type="button"
              onClick={handleToggleTimetableVisibility}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all ${
                isTimetableVisible
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/5 text-white/40 hover:text-white border border-white/10'
              }`}
              title={isTimetableVisible ? 'Timetable displayed on timeline (Click to hide)' : 'Timetable hidden (Click to show)'}
            >
              <GraduationCap size={13} className={isTimetableVisible ? 'text-emerald-300' : 'text-white/40'} />
              <span>Timetable: {isTimetableVisible ? 'Show' : 'Hide'}</span>
            </button>

            {/* Timetable manager button */}
            <button
              type="button"
              onClick={() => {
                setEditingClass(null);
                setIsCreatingClass(false);
                setIsTimetableModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono text-emerald-300/80 hover:text-emerald-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              title="Manage timetable recurring classes"
            >
              <Pencil size={11} />
              <span>Classes</span>
            </button>

            {/* Today jump */}
            <button
              type="button"
              onClick={() => {
                setCurrentDate(new Date());
                setSelectedDateStr(getTodayDateString());
              }}
              className="px-2.5 py-1 rounded-xl text-[11px] font-mono bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10"
            >
              Today
            </button>

            {/* Move timeline detail button / Circle button in top-right corner */}
            <NavDot label="Back to home" onClick={onBack} />
          </div>
        </div>

        {/* =========================================================================
            MUTUALLY EXCLUSIVE COLLAPSING SECTIONS CONTAINER
            Expanding A collapses B & C; expanding B collapses A & C; expanding C collapses A & B.
            Collapsed sections remain accessible and can be opened manually.
            ========================================================================= */}
        <div className="space-y-4">
          {/* =====================================================================
              SECTION A: CALENDAR
              ===================================================================== */}
          {expandedSection === 'calendar' ? (
            <div className="space-y-4">
              <div className="glass glass-glow rounded-3xl p-4 sm:p-5 border border-purple-500/30 space-y-4">
              {/* Calendar Header with Collapse */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={15} className="text-purple-400" />
                    <span className="text-xs font-mono font-medium text-white/90">
                      {monthName} {year}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
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
                      onClick={nextMonth}
                      aria-label="Next month"
                      className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSection('timeline')}
                    className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    title="Collapse calendar"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {DAYS.map((d) => (
                    <span key={d} className="text-[10px] font-mono tracking-wider text-white/35 uppercase py-1">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Weeks Grid with Multi-day Bars */}
                <div className="space-y-1.5">
                  {weeks.map((week, wIdx) => {
                    const weekData = weekBarsMap[wIdx] || { bars: [], totalLanes: 1 };
                    return (
                      <div
                        key={`week-${wIdx}`}
                        className="rounded-2xl bg-white/[0.015] border border-white/5 p-1 relative"
                      >
                        {/* Day numbers header row */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {week.map((day) => {
                            const isDragTarget =
                              activeDrag?.dropTarget?.type === 'calendar' &&
                              activeDrag.dropTarget.dateStr === day.dateStr;

                            return (
                              <div
                                key={day.dateStr}
                                data-calendar-date={day.dateStr}
                                onClick={() => setSelectedDateStr(day.dateStr)}
                                title={`Select ${day.dateStr} or drop task to reschedule`}
                                className={`py-1.5 rounded-xl text-xs font-mono transition-all duration-150 cursor-pointer flex flex-col items-center ${
                                  isDragTarget
                                    ? 'bg-purple-600/70 border-2 border-purple-300 scale-105 shadow-lg shadow-purple-500/40 text-white font-bold ring-2 ring-purple-400'
                                    : day.isSelected
                                    ? 'bg-purple-600 text-white font-medium shadow-md shadow-purple-900/40 border border-purple-400'
                                    : day.isToday
                                    ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                                    : day.isCurrentMonth
                                    ? 'text-white/80 hover:bg-white/10 hover:text-white'
                                    : 'text-white/25 hover:bg-white/5'
                                }`}
                              >
                                <span>{day.dayNum}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Multi-day and single-day horizontal bars area */}
                        {weekData.bars.length > 0 && (
                          <div
                            className="relative mt-1"
                            style={{ height: weekData.totalLanes * 26 }}
                          >
                            {weekData.bars.map((bar) => {
                              const t = bar.task;
                              const isPriority = Boolean(t.is_priority);
                              const isResearch = t.sourceType === 'subtask_research';

                              const roundedClass =
                                bar.isStart && bar.isEnd
                                  ? 'rounded-lg'
                                  : bar.isStart && !bar.isEnd
                                  ? 'rounded-l-lg rounded-r-none border-r-0'
                                  : !bar.isStart && bar.isEnd
                                  ? 'rounded-r-lg rounded-l-none border-l-0'
                                  : 'rounded-none border-x-0';

                              let bgGlow = 'from-sky-600/85 to-blue-700/85 border-sky-400/35 text-sky-100';
                              if (isResearch) {
                                bgGlow = 'from-indigo-600/90 to-purple-700/90 border-indigo-400/45 text-indigo-100';
                              } else if (isPriority) {
                                bgGlow = 'from-purple-600/90 to-fuchsia-700/90 border-purple-400/50 text-purple-100 shadow-[0_0_8px_rgba(168,85,247,0.4)]';
                              } else if (t.category === 'essential') {
                                bgGlow = 'from-emerald-600/85 to-teal-700/85 border-emerald-400/35 text-emerald-100';
                              }

                              const leftColPercent = (bar.startCol / 7) * 100;
                              const widthPercent = (bar.span / 7) * 100;

                              return (
                                <div
                                  key={`bar-${t.id}-w${wIdx}`}
                                  onPointerDown={(e) => handlePointerDown(e, t)}
                                  title={`${t.title} (${t.start_date || t.due_date} - ${t.due_date || t.start_date})`}
                                  className={`absolute h-[22px] bg-gradient-to-r ${bgGlow} border px-1.5 flex items-center justify-between gap-1 text-[10px] font-mono cursor-pointer transition-all hover:brightness-110 shadow-sm z-10 touch-none ${roundedClass}`}
                                  style={{
                                    left: `${leftColPercent}%`,
                                    width: `${widthPercent}%`,
                                    top: bar.laneIndex * 26,
                                  }}
                                >
                                  <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden pointer-events-none">
                                    {!bar.isStart && (
                                      <span className="text-[9px] text-white/50 shrink-0">◀</span>
                                    )}
                                    {isPriority && (
                                      <Sparkles size={10} className="text-amber-300 fill-amber-300 shrink-0" />
                                    )}
                                    <span className="truncate font-medium leading-none">
                                      {t.part_name ? `${t.part_name} · ${t.title}` : t.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 pointer-events-none">
                                    {t.due_time && !bar.isMultiDay && (
                                      <span className="text-[9px] text-white/60 font-mono hidden sm:inline">
                                        {t.due_time}
                                      </span>
                                    )}
                                    {!bar.isEnd && (
                                      <span className="text-[9px] text-white/50 shrink-0">▶</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            {/* 2. All-Day Tasks on Selected Date */}
            {allDayTasksForSelectedDate.length > 0 && (
              <div className="glass glass-glow rounded-3xl p-4 border border-sky-500/20 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={14} className="text-sky-400" />
                    <span className="text-xs font-mono uppercase tracking-wider text-sky-200">
                      All-Day Tasks ({allDayTasksForSelectedDate.length})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">{selectedDateStr}</span>
                </div>

                <div className="flex flex-col gap-1.5 w-full">
                  {allDayTasksForSelectedDate.map((t) => {
                    const isBeingDragged = activeDrag?.task?.id === t.id && activeDrag.hasMoved;
                    return (
                      <div
                        key={t.id}
                        onPointerDown={(e) => handlePointerDown(e, t)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 cursor-pointer group transition-all touch-none text-left ${
                          isBeingDragged ? 'opacity-0 pointer-events-none invisible' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2 pointer-events-none">
                          <GripVertical size={12} className="text-white/20 group-hover:text-white/50 cursor-grab shrink-0" />
                          <span className="text-xs font-medium text-white/90 truncate flex-1">{t.title}</span>
                          {getDifficultyBadge(t.priority)}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleClearSchedule(t.id, e)}
                            className="p-1 rounded-lg text-white/30 hover:text-rose-400 transition-colors"
                            title="Clear date"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Unscheduled Tasks Dock (1 per row, left-aligned) */}
            {unscheduledTasks.length > 0 && (
              <div className="glass glass-glow rounded-3xl p-4 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-200">
                    Unscheduled Tasks ({unscheduledTasks.length})
                  </span>
                  <span className="text-[10px] font-mono text-white/40">Drag onto Day or Hour</span>
                </div>

                <div className="flex flex-col gap-1.5 w-full max-h-48 overflow-y-auto no-scrollbar">
                  {unscheduledTasks.map((t) => {
                    const isBeingDragged = activeDrag?.task?.id === t.id && activeDrag.hasMoved;
                    return (
                      <div
                        key={t.id}
                        onPointerDown={(e) => handlePointerDown(e, t)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 cursor-pointer group transition-all touch-none text-left ${
                          isBeingDragged ? 'opacity-0 pointer-events-none invisible' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2 pointer-events-none">
                          <GripVertical size={12} className="text-white/20 group-hover:text-white/50 cursor-grab shrink-0" />
                          <span className="text-xs font-medium text-white/80 truncate flex-1">{t.title}</span>
                          {getDifficultyBadge(t.priority)}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleScheduleForDateOnly(t.id, e)}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-amber-300 hover:text-white hover:bg-amber-500/20 transition-all border border-amber-500/30 shrink-0"
                          title="Schedule as date-only task"
                        >
                          + Date
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Collapsed Section A: Accessible Bar */
          <div
            onClick={() => toggleSection('calendar')}
            className="glass glass-glow rounded-2xl p-3.5 px-5 border border-white/10 hover:border-purple-400/40 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform">
                <CalendarIcon size={15} />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-mono font-medium text-white/90 block group-hover:text-white">
                  Calendar · {monthName} {year}
                </span>
                <span className="text-[10px] font-mono text-white/40">
                  {selectedDateStr} selected · Click to expand
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/40 px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                {tasks.length} tasks
              </span>
              <span className="p-1 rounded-lg text-white/40 group-hover:text-white transition-colors">
                <ChevronDown size={15} />
              </span>
            </div>
          </div>
        )}

          {/* =====================================================================
              SECTION B: DAY TIMELINE (Time-Based Vertical Axis 00:00–24:00)
              ===================================================================== */}
          {expandedSection === 'timeline' ? (
            <div className="glass glass-glow rounded-3xl p-4 sm:p-5 border border-sky-500/30 space-y-4">
              {/* Timeline Header Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-sky-400 shrink-0" />
                  <span className="text-xs font-mono font-medium text-white/90">
                    Day Timeline · {selectedDateStr}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDateStr(addDaysToDateStr(selectedDateStr, -1))}
                      className="p-1 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors"
                      title="Previous day"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDateStr(addDaysToDateStr(selectedDateStr, 1))}
                      className="p-1 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors"
                      title="Next day"
                    >
                      <ChevronRight size={14} />
                    </button>
                    {selectedDateStr !== todayDateStr && (
                      <button
                        type="button"
                        onClick={() => setSelectedDateStr(todayDateStr)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/40"
                      >
                        Today
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTaskModal({
                        isOpen: true,
                        date: selectedDateStr,
                        startTime: '09:00',
                        endTime: '10:00',
                        category: 'focus',
                      });
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono font-medium text-purple-200 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 transition-all shadow-sm"
                    title="Add new task card to timeline"
                  >
                    <Plus size={13} className="text-purple-300" />
                    <span>Add Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingClass(null);
                      setIsCreatingClass(false);
                      setIsTimetableModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all shadow-sm"
                    title="Manage recurring weekly timetable classes"
                  >
                    <GraduationCap size={13} className="text-emerald-400" />
                    <span>Timetable</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSection('timeline')}
                    className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    title="Collapse timeline"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>
              </div>

              {/* Requirement 7: Queued tasks must always align to the left. Exactly one queued task per row. Never place queued tasks side by side. */}
              <div
                data-drop-zone="pending"
                className={`rounded-2xl p-2.5 sm:p-3 border transition-all ${
                  activeDrag?.dropTarget?.type === 'pending'
                    ? 'border-amber-400 bg-amber-500/25 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/20'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Inbox size={13} className="text-amber-400" />
                    <span className="text-xs font-mono font-medium text-amber-200">
                      Queued Tasks ({pendingTasks.length})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">
                    {activeDrag ? 'Drop here to queue / unschedule' : 'Drag into Queued to unschedule · Drag onto timeline to schedule'}
                  </span>
                </div>

                {pendingTasks.length === 0 ? (
                  <div className="py-2 text-center text-[10px] font-mono text-white/30 border border-dashed border-white/5 rounded-xl mt-1.5">
                    No queued tasks · Drag any task here to unschedule
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 w-full max-h-36 overflow-y-auto no-scrollbar pt-1.5">
                    {pendingTasks.map((t) => {
                      const isBeingDragged = activeDrag?.task?.id === t.id && activeDrag.hasMoved;
                      return (
                        <div
                          key={t.id}
                          onPointerDown={(e) => handlePointerDown(e, t)}
                          title={`Drag onto hour to schedule: ${t.title}`}
                          className={`w-full flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-amber-400/50 hover:bg-amber-500/10 cursor-grab active:cursor-grabbing text-xs font-mono text-white/80 transition-all select-none touch-none group text-left ${
                            isBeingDragged ? 'opacity-0 pointer-events-none invisible' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2 pointer-events-none">
                            <GripVertical size={12} className="text-white/30 group-hover:text-amber-300 shrink-0" />
                            <span className="truncate text-xs font-medium text-white/90">{t.title}</span>
                            {getDifficultyBadge(t.priority)}
                          </div>
                          <span className="text-[10px] font-mono text-white/40 shrink-0">
                            {t.due_time || 'No time'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 24-Hour Vertical Time Axis */}
              <div
                ref={verticalTimelineRef}
                className="max-h-[620px] overflow-y-auto no-scrollbar rounded-2xl border border-white/5 bg-[#0a0e1f]/75 p-2 relative touch-pan-y"
              >
                <div
                  ref={timelineContentRef}
                  data-timeline-surface="true"
                  onPointerDown={(e) => handleTimelineSurfacePointerDown(e, selectedDateStr)}
                  className="relative select-none"
                  style={{ height: (TOTAL_HOURS + 1) * HOUR_HEIGHT }}
                >
                  {/* Hour Rows (00:00 to 24:00) */}
                  {Array.from({ length: TOTAL_HOURS }).map((_, h) => {
                    const isHoveredHour =
                      activeDrag?.dropTarget?.type === 'timeline' &&
                      Math.floor(activeDrag.dropTarget.hour) === h;

                    return (
                      <div
                        key={`hour-row-${h}`}
                        className={`absolute left-0 right-0 border-t border-white/5 flex items-start transition-colors pointer-events-none ${
                          isHoveredHour ? 'bg-sky-500/10' : ''
                        }`}
                        style={{
                          top: h * HOUR_HEIGHT,
                          height: HOUR_HEIGHT,
                        }}
                      >
                        <div className="w-14 shrink-0 text-[10px] font-mono text-white/35 pt-1">
                          {formatHour(h)}
                        </div>
                        <div className="flex-1 h-full border-t border-dashed border-white/[0.03] mt-[30px]" />
                      </div>
                    );
                  })}

                  {/* 24:00 Bottom Line */}
                  <div
                    className="absolute left-0 right-0 border-t border-white/10 flex items-start pointer-events-none"
                    style={{ top: TOTAL_HOURS * HOUR_HEIGHT }}
                  >
                    <div className="w-14 shrink-0 text-[10px] font-mono text-white/35 pt-1">
                      24:00
                    </div>
                  </div>

                  {/* Drag-to-Create Preview */}
                  {creationDrag && creationDrag.dateStr === selectedDateStr && (() => {
                    const sH = Math.min(creationDrag.startHour, creationDrag.currentHour);
                    const eH = Math.max(creationDrag.startHour, creationDrag.currentHour);
                    const dur = Math.max(0.5, eH - sH);
                    return (
                      <div
                        className="absolute left-14 right-2 z-30 rounded-xl border-2 border-emerald-400 bg-emerald-500/25 backdrop-blur-sm p-2 flex flex-col justify-between pointer-events-none shadow-lg animate-in fade-in-50 duration-75"
                        style={{
                          top: sH * HOUR_HEIGHT,
                          height: Math.max(38, dur * HOUR_HEIGHT - 4),
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-emerald-100">+ New Event</span>
                          <span className="text-[10px] font-mono font-bold text-emerald-200 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-400/50">
                            {formatTimeFromHour(sH)} - {formatTimeFromHour(Math.min(24, sH + dur))}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-emerald-300/80">Release to create</span>
                      </div>
                    );
                  })()}

                  {/* Requirement 6: Active Drag Dashed Outline Preview on Timeline */}
                  {activeDrag?.dropTarget?.type === 'timeline' && activeDrag.hasMoved && (
                    <div
                      className="absolute left-14 right-2 z-30 rounded-xl border-2 border-dashed border-sky-400 bg-sky-500/20 backdrop-blur-sm p-2 flex flex-col justify-between pointer-events-none transition-all shadow-lg animate-in fade-in-50 duration-75"
                      style={{
                        top: activeDrag.dropTarget.hour * HOUR_HEIGHT,
                        height: Math.max(38, draggedTaskDuration * HOUR_HEIGHT - 4),
                      }}
                    >
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <span className="text-xs font-semibold text-white truncate">
                          {activeDrag.task.title}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-sky-200 bg-sky-950/85 px-2 py-0.5 rounded border border-sky-400/50 shrink-0">
                          {activeDrag.dropTarget.timeStr} - {previewEndTimeStr}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-sky-300/80">
                        Drop to reschedule
                      </span>
                    </div>
                  )}

                  {/* Positioned side-by-side timeline items (tasks & recurring classes) */}
                  {positionedTimelineItems.map((positioned) => {
                    const entry = positioned.item;
                    const top = entry.startHour * HOUR_HEIGHT;
                    const duration = Math.max(0.45, entry.endHour - entry.startHour);
                    const height = Math.max(38, duration * HOUR_HEIGHT - 4);

                    const leftCalc = `calc(56px + ${positioned.leftPercent}% * (100% - 64px) / 100 + 2px)`;
                    const widthCalc = `calc(${positioned.widthPercent}% * (100% - 64px) / 100 - 4px)`;

                    if (entry.kind === 'class') {
                      const cls = entry.classData;
                      return (
                        <div
                          key={entry.id}
                          data-timeline-card="true"
                          onClick={() => handleOpenEditClassModal(cls)}
                          title={`Weekly class: ${cls.courseName} (${cls.startTime} - ${cls.endTime})`}
                          className="absolute rounded-xl bg-gradient-to-br from-emerald-900/70 via-teal-900/70 to-emerald-950/80 border border-emerald-500/40 p-2 flex flex-col justify-between shadow-lg cursor-pointer hover:border-emerald-400 hover:scale-[1.01] transition-all z-20 group"
                          style={{
                            top,
                            height,
                            left: leftCalc,
                            width: widthCalc,
                          }}
                        >
                          <div className="flex items-start justify-between gap-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <GraduationCap size={12} className="text-emerald-300 shrink-0" />
                              <span className="text-xs font-semibold text-emerald-100 truncate leading-tight">
                                {cls.courseName}
                              </span>
                            </div>

                            <span className="text-[9px] font-mono text-emerald-300/90 shrink-0 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              {cls.startTime} - {cls.endTime}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-emerald-200/60 pt-0.5">
                            <div className="flex items-center gap-1 truncate">
                              <span className="px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Class
                              </span>
                              {cls.location && (
                                <span className="flex items-center gap-0.5 truncate text-[9px] text-white/50">
                                  <MapPin size={9} />
                                  <span>{cls.location}</span>
                                </span>
                              )}
                            </div>

                            <span className="text-[9px] text-emerald-400/50 group-hover:text-emerald-300 transition-colors">
                              Recurring
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Regular or Research Task
                    const t = entry.task;
                    const isPriority = Boolean(t.is_priority);
                    const isBeingDragged = activeDrag?.task?.id === t.id && activeDrag.hasMoved;

                    let color = 'from-sky-600/85 to-blue-700/85 border-sky-400/40 text-sky-100';
                    if (t.sourceType === 'subtask_research') {
                      color = 'from-indigo-600/85 to-purple-700/85 border-indigo-400/40 text-indigo-100';
                    } else if (isPriority) {
                      color = 'from-purple-600/85 to-fuchsia-700/85 border-purple-400/50 text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.35)]';
                    } else if (t.category === 'essential') {
                      color = 'from-teal-600/80 to-emerald-700/80 border-teal-400/40 text-teal-100';
                    }

                    return (
                      <div
                        key={entry.id}
                        data-timeline-card="true"
                        onPointerDown={(e) => handlePointerDown(e, t)}
                        title={`${t.title} (${t.due_time || 'No time'})`}
                        className={`absolute rounded-xl bg-gradient-to-r ${color} border backdrop-blur-md p-2 flex flex-col justify-between shadow-lg cursor-grab active:cursor-grabbing transition-all hover:border-white/40 z-20 touch-none group select-none ${
                          isBeingDragged ? 'opacity-0 pointer-events-none invisible' : ''
                        }`}
                        style={{
                          top,
                          height,
                          left: leftCalc,
                          width: widthCalc,
                        }}
                      >
                        {/* Requirement 1: Title, Scheduled Time, and Top-Right Circle Icon */}
                        <div className="flex items-start justify-between gap-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 pointer-events-none">
                            <GripVertical size={12} className="text-white/40 shrink-0 cursor-grab" />
                            {isPriority && <Sparkles size={11} className="text-amber-300 fill-amber-300 shrink-0" />}
                            <span className="text-xs font-medium text-white truncate leading-tight">
                              {t.part_name ? `${t.part_name} · ${t.title}` : t.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-mono text-white/80 shrink-0 bg-black/35 px-1.5 py-0.5 rounded-md pointer-events-none">
                              {t.start_time && t.due_time && t.start_time !== t.due_time
                                ? `${t.start_time} - ${t.due_time}`
                                : t.due_time || t.start_time}
                            </span>

                            {/* Top-Right Circle Icon: Opens task detail */}
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick(t);
                              }}
                              className="w-4 h-4 rounded-full border border-white/40 hover:border-white hover:bg-white/20 flex items-center justify-center transition-all shrink-0 ml-0.5"
                              title="Open task details"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Row: Difficulty Badge & Bottom-Right Delete Control */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-white/60 pt-0.5">
                          <div>{getDifficultyBadge(t.priority)}</div>

                          <div className="flex items-center gap-1">
                            {confirmDeleteTaskId === t.id ? (
                              <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-rose-500/50 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => handleDeleteTask(t.id, e)}
                                  className="text-[9px] font-mono font-bold text-white bg-rose-600 hover:bg-rose-500 px-1.5 py-0.5 rounded transition-colors"
                                >
                                  Delete?
                                </button>
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteTaskId(null);
                                  }}
                                  className="text-[9px] text-white/50 hover:text-white px-0.5"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => handleDeleteTask(t.id, e)}
                                className="p-1 rounded-md text-white/25 hover:text-rose-300 hover:bg-white/10 transition-colors"
                                title="Delete task"
                              >
                                <Trash2 size={11} strokeWidth={1.8} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-white/40 pt-1">
                <span>• Drag empty space to create new event</span>
                <span>• Drag card vertically to reschedule time</span>
              </div>
            </div>
          ) : (
            /* Collapsed Section B: Accessible Bar */
            <div
              onClick={() => toggleSection('timeline')}
              className="glass glass-glow rounded-2xl p-3.5 px-5 border border-white/10 hover:border-sky-400/40 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-300 group-hover:scale-105 transition-transform">
                  <Clock size={15} />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-mono font-medium text-white/90 block group-hover:text-white">
                    Day Timeline · {selectedDateStr}
                  </span>
                  <span className="text-[10px] font-mono text-white/40">
                    24-hour time schedule · Click to expand
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/40 px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                  {scheduledTasksForSelectedDate.length} scheduled
                </span>
                <span className="p-1 rounded-lg text-white/40 group-hover:text-white transition-colors">
                  <ChevronDown size={15} />
                </span>
              </div>
            </div>
          )}

          {/* =====================================================================
              SECTION C: WEEKLY OVERVIEW (7 Separate Day Boxes, NOT a time axis)
              ===================================================================== */}
          {expandedSection === 'weekly' ? (
            <div className="glass glass-glow rounded-3xl p-4 sm:p-5 border border-emerald-500/30 space-y-4">
              {/* Weekly Header Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className="text-emerald-400 shrink-0" />
                  <span className="text-xs font-mono font-medium text-white/90">
                    Weekly Overview · 7 Days ({sevenDaysList[0]} to {sevenDaysList[6]})
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDateStr(addDaysToDateStr(selectedDateStr, -7))}
                      className="p-1 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors"
                      title="Previous 7 days"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDateStr(addDaysToDateStr(selectedDateStr, 7))}
                      className="p-1 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors"
                      title="Next 7 days"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDateStr(todayDateStr)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                    >
                      Today
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTaskModal({
                        isOpen: true,
                        date: selectedDateStr,
                        startTime: '09:00',
                        endTime: '10:00',
                        category: 'focus',
                      });
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono font-medium text-purple-200 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 transition-all shadow-sm"
                    title="Add new task card"
                  >
                    <Plus size={13} className="text-purple-300" />
                    <span>Add Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSection('weekly')}
                    className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    title="Collapse weekly overview"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>
              </div>

              {/* Requirement 2 & 3: 7 separate day boxes, one box per day, NOT a time axis, No hourly slots, No time scale */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                {sevenDaysList.map((dStr) => {
                  const isToday = dStr === todayDateStr;
                  const isSelected = dStr === selectedDateStr;
                  const itemsForDay = getTimelineItemsForDate(dStr);

                  return (
                    <div
                      key={`weekly-box-${dStr}`}
                      data-calendar-date={dStr}
                      onClick={() => setSelectedDateStr(dStr)}
                      className={`rounded-2xl border p-3 flex flex-col justify-between transition-all min-h-[220px] select-none ${
                        isSelected
                          ? 'bg-purple-950/25 border-purple-500/40 ring-1 ring-purple-500/30 shadow-lg'
                          : isToday
                          ? 'bg-sky-950/20 border-sky-500/30 ring-1 ring-sky-500/20'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CalendarIcon size={13} className={isToday ? 'text-sky-400' : 'text-white/40'} />
                          <span className={`text-xs font-semibold truncate ${isToday ? 'text-sky-300' : 'text-white/85'}`}>
                            {formatDateHeader(dStr, isToday)}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-white/40 px-1.5 py-0.5 rounded bg-white/5 shrink-0">
                          {itemsForDay.length}
                        </span>
                      </div>

                      {/* Day Events: readable, sufficiently complete titles */}
                      <div className="space-y-2 min-h-[140px] max-h-[460px] overflow-y-auto no-scrollbar flex-1">
                        {/* Requirement 6: Dashed outline preview when dragging over this day box */}
                        {activeDrag?.dropTarget?.type === 'calendar' && activeDrag.dropTarget.dateStr === dStr && activeDrag.hasMoved && (
                          <div className="rounded-xl border-2 border-dashed border-sky-400 bg-sky-500/20 p-2.5 flex flex-col justify-between gap-1 pointer-events-none shadow-md animate-in fade-in-50 duration-75">
                            <div className="flex items-start justify-between gap-1 min-w-0">
                              <span className="text-xs font-semibold text-sky-100 truncate leading-tight">
                                {activeDrag.task.title}
                              </span>
                              <span className="text-[9px] font-mono text-sky-200 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-400/40 shrink-0">
                                {activeDrag.task.start_time && activeDrag.task.due_time && activeDrag.task.start_time !== activeDrag.task.due_time
                                  ? `${activeDrag.task.start_time} - ${activeDrag.task.due_time}`
                                  : activeDrag.task.due_time || activeDrag.task.start_time || 'All day'}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-sky-300/80">Move to this day</span>
                          </div>
                        )}

                        {itemsForDay.length === 0 && !(activeDrag?.dropTarget?.type === 'calendar' && activeDrag.dropTarget.dateStr === dStr && activeDrag.hasMoved) ? (
                          <div className="h-full flex flex-col items-center justify-center text-center py-8 text-white/25 text-[11px] font-mono">
                            <span>No events</span>
                          </div>
                        ) : (
                          itemsForDay.map((pos) => {
                            const entry = pos.item;
                            if (entry.kind === 'class') {
                              const cls = entry.classData;
                              return (
                                <div
                                  key={entry.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditClassModal(cls);
                                  }}
                                  className="rounded-xl bg-gradient-to-br from-emerald-900/70 via-teal-900/70 to-emerald-950/80 border border-emerald-500/40 p-2.5 flex flex-col justify-between gap-1 shadow-md hover:border-emerald-400 hover:scale-[1.01] transition-all cursor-pointer"
                                >
                                  <div className="flex items-start gap-1 min-w-0">
                                    <GraduationCap size={12} className="text-emerald-300 shrink-0 mt-0.5" />
                                    <span className="text-xs font-semibold text-emerald-100 leading-tight truncate">
                                      {cls.courseName}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] font-mono text-emerald-300/80 pt-0.5">
                                    <span className="bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                      {cls.startTime} - {cls.endTime}
                                    </span>
                                    <span className="text-[8px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                      Class
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            const t = entry.task;
                            const isPriority = Boolean(t.is_priority);
                            const isBeingDragged = activeDrag?.task?.id === t.id && activeDrag.hasMoved;
                            let color = 'from-sky-600/85 to-blue-700/85 border-sky-400/40 text-sky-100';
                            if (t.sourceType === 'subtask_research') {
                              color = 'from-indigo-600/85 to-purple-700/85 border-indigo-400/40 text-indigo-100';
                            } else if (isPriority) {
                              color = 'from-purple-600/85 to-fuchsia-700/85 border-purple-400/50 text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.35)]';
                            } else if (t.category === 'essential') {
                              color = 'from-teal-600/80 to-emerald-700/80 border-teal-400/40 text-teal-100';
                            }

                            return (
                              <div
                                key={entry.id}
                                data-timeline-card="true"
                                onPointerDown={(e) => handlePointerDown(e, t)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleItemClick(t);
                                }}
                                className={`rounded-xl bg-gradient-to-r ${color} border backdrop-blur-md p-2.5 flex flex-col justify-between gap-1 shadow-md hover:border-white/40 cursor-grab active:cursor-grabbing touch-none select-none transition-all ${
                                  isBeingDragged ? 'opacity-0 pointer-events-none invisible' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1 min-w-0">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1 pointer-events-none">
                                    <GripVertical size={11} className="text-white/40 shrink-0" />
                                    {isPriority && <Sparkles size={11} className="text-amber-300 fill-amber-300 shrink-0" />}
                                    <span className="text-xs font-medium text-white leading-tight truncate">
                                      {t.part_name ? `${t.part_name} · ${t.title}` : t.title}
                                    </span>
                                  </div>
                                  {/* Requirement 1: Top-Right Circle Detail Button */}
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleItemClick(t);
                                    }}
                                    className="w-4 h-4 rounded-full border border-white/40 hover:border-white hover:bg-white/20 flex items-center justify-center transition-all shrink-0 ml-0.5"
                                    title="Open task details"
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-mono text-white/80 pt-0.5 pointer-events-none">
                                  <span className="bg-black/35 px-1.5 py-0.5 rounded text-[9px]">
                                    {t.start_time && t.due_time && t.start_time !== t.due_time
                                      ? `${t.start_time} - ${t.due_time}`
                                      : t.due_time || t.start_time || 'All day'}
                                  </span>
                                  <div>{getDifficultyBadge(t.priority)}</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-white/40 pt-1">
                <span>• 7-day overview: Click any day box to focus date</span>
                <span>• Drag task cards between day boxes to reschedule date</span>
              </div>
            </div>
          ) : (
            /* Collapsed Section C: Accessible Bar */
            <div
              onClick={() => toggleSection('weekly')}
              className="glass glass-glow rounded-2xl p-3.5 px-5 border border-white/10 hover:border-emerald-400/40 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform">
                  <CalendarIcon size={15} />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-mono font-medium text-white/90 block group-hover:text-white">
                    Weekly Overview · 7 Days
                  </span>
                  <span className="text-[10px] font-mono text-white/40">
                    {sevenDaysList[0]} to {sevenDaysList[6]} · Click to expand
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/40 px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                  7 Days
                </span>
                <span className="p-1 rounded-lg text-white/40 group-hover:text-white transition-colors">
                  <ChevronDown size={15} />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Drag Ghost element following pointer */}
      {activeDrag?.hasMoved && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 p-3 shadow-2xl border border-white/40 text-white font-mono text-xs flex items-center gap-2 max-w-xs animate-in zoom-in-95 duration-75"
          style={{
            left: activeDrag.pointerX,
            top: activeDrag.pointerY,
          }}
        >
          <GripVertical size={14} className="text-white/60" />
          <div className="truncate flex-1">
            <span className="font-medium block truncate">{activeDrag.task.title}</span>
            <span className="text-[10px] text-white/70">
              {activeDrag.dropTarget?.type === 'timeline'
                ? `Drop at ${activeDrag.dropTarget.timeStr}`
                : activeDrag.dropTarget?.type === 'calendar'
                ? `Drop on ${activeDrag.dropTarget.dateStr}`
                : 'Dragging task...'}
            </span>
          </div>
        </div>
      )}

      {/* =====================================================================
          WEEKLY TIMETABLE MANAGER MODAL
          ===================================================================== */}
      {isTimetableModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => {
            setIsTimetableModalOpen(false);
            setEditingClass(null);
            setIsCreatingClass(false);
          }}
        >
          <div
            className="w-full max-w-lg glass glass-glow rounded-3xl p-5 sm:p-6 border border-emerald-500/30 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-emerald-400" />
                <h3 className="text-sm font-mono font-medium text-white uppercase tracking-wider">
                  Weekly Class Timetable
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTimetableModalOpen(false);
                  setEditingClass(null);
                  setIsCreatingClass(false);
                }}
                className="text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* List or Form Toggle */}
            {!isCreatingClass && !editingClass ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/50 font-mono">
                    Recurring weekly classes appear automatically on the timeline.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateClassModal}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    <Plus size={13} />
                    <span>Add Class</span>
                  </button>
                </div>

                {/* Grouped by Weekday */}
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 0].map((w) => {
                    const classesForDay = timetableClasses.filter((c) => c.weekday === w);
                    if (classesForDay.length === 0) return null;

                    return (
                      <div key={`weekday-${w}`} className="space-y-1.5">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300/70 block">
                          {WEEKDAY_NAMES[w]}
                        </span>
                        <div className="space-y-1.5">
                          {classesForDay.map((cls) => (
                            <div
                              key={cls.id}
                              className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-white/95 truncate">
                                    {cls.courseName}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    {cls.startTime} - {cls.endTime}
                                  </span>
                                </div>
                                {cls.location && (
                                  <div className="flex items-center gap-1 text-[10px] font-mono text-white/50">
                                    <MapPin size={10} className="text-emerald-400" />
                                    <span>{cls.location}</span>
                                    {cls.instructor && <span>· {cls.instructor}</span>}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditClassModal(cls)}
                                  className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors"
                                  title="Edit class"
                                >
                                  <Pencil size={13} />
                                </button>
                                {confirmDeleteClassId === cls.id ? (
                                  <div className="flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-lg border border-rose-500/50 animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleDeleteClass(cls.id);
                                        setConfirmDeleteClassId(null);
                                      }}
                                      className="text-[9px] font-mono font-bold text-white bg-rose-600 hover:bg-rose-500 px-1.5 py-0.5 rounded transition-colors"
                                    >
                                      Confirm?
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteClassId(null)}
                                      className="text-[9px] text-white/50 hover:text-white px-0.5"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteClassId(cls.id)}
                                    className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-white/5 transition-colors"
                                    title="Delete class (requires confirmation)"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Class Create / Edit Form */
              <form onSubmit={handleSaveClass} className="space-y-3.5">
                <div className="text-xs font-mono text-emerald-300">
                  {editingClass ? `Edit Class: ${editingClass.courseName}` : 'Add New Recurring Class'}
                </div>

                <div>
                  <label className="text-[11px] font-mono text-white/50 block mb-1">
                    Course Name (required)
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    value={classFormCourse}
                    onChange={(e) => setClassFormCourse(e.target.value)}
                    placeholder="e.g. Animation Principles, Storyboarding..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-mono text-white/50 block mb-1">
                      Weekday
                    </label>
                    <select
                      value={classFormWeekday}
                      onChange={(e) => setClassFormWeekday(parseInt(e.target.value, 10))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                      <option value={0}>Sunday</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-white/50 block mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={classFormStartTime}
                      onChange={(e) => setClassFormStartTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-white/50 block mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={classFormEndTime}
                      onChange={(e) => setClassFormEndTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-white/50 block mb-1">
                    Location / Room (optional)
                  </label>
                  <input
                    type="text"
                    value={classFormLocation}
                    onChange={(e) => setClassFormLocation(e.target.value)}
                    placeholder="e.g. Studio 3B, Room 204..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-white/50 block mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={classFormNotes}
                    onChange={(e) => setClassFormNotes(e.target.value)}
                    placeholder="Notes or requirements..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  {editingClass ? (
                    confirmDeleteClassId === editingClass.id ? (
                      <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-xl border border-rose-500/40 animate-in fade-in zoom-in-95 duration-100">
                        <span className="text-[11px] font-mono text-rose-300">Are you sure?</span>
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteClass(editingClass.id);
                            setConfirmDeleteClassId(null);
                          }}
                          className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteClassId(null)}
                          className="text-xs text-white/50 hover:text-white px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteClassId(editingClass.id)}
                        className="px-3 py-1.5 rounded-xl text-xs text-rose-300/60 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
                      >
                        Delete Class
                      </button>
                    )
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingClass(false);
                        setEditingClass(null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white"
                    >
                      Back to List
                    </button>
                    <button
                      type="submit"
                      disabled={!classFormCourse.trim()}
                      className="px-4 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                    >
                      Save Class
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          NEW TASK MODAL (from drag-to-create or Add Card on Timeline)
          ===================================================================== */}
      {newTaskModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() =>
            setNewTaskModal({
              isOpen: false,
              date: '',
              startTime: '',
              endTime: '',
              category: 'focus',
            })
          }
        >
          <div
            className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-purple-500/30 p-2 sm:p-4 shadow-2xl relative bg-[#0d1326]"
            onClick={(e) => e.stopPropagation()}
          >
            <NewTaskPage
              initialCategory={newTaskModal.category || 'focus'}
              initialDate={newTaskModal.date || selectedDateStr}
              initialStartTime={newTaskModal.startTime || '09:00'}
              initialDueTime={newTaskModal.endTime || '10:00'}
              onBack={() =>
                setNewTaskModal({
                  isOpen: false,
                  date: '',
                  startTime: '',
                  endTime: '',
                  category: 'focus',
                })
              }
              onCreated={() => {
                setNewTaskModal({
                  isOpen: false,
                  date: '',
                  startTime: '',
                  endTime: '',
                  category: 'focus',
                });
                loadScheduleData();
              }}
            />
          </div>
        </div>
      )}
    </PageShell>
  );
}
