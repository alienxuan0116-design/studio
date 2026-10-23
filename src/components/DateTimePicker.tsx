import React, { useMemo } from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

export interface DateInputFieldProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  min?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  showLabel?: boolean;
  showTodayShortcut?: boolean;
  onSelectToday?: () => void;
  onClear?: () => void;
}

export interface TimeInputFieldProps {
  value: string; // 'HH:mm'
  onChange: (time: string) => void;
  min?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  showLabel?: boolean;
  onClear?: () => void;
  isPastWarning?: boolean;
}

export interface DateTimePickerProps {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:mm'
  onChange: (date: string, time: string) => void;
  compact?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatMonthDayTime(dateStr?: string | null, timeStr?: string | null): string {
  if (!dateStr && !timeStr) return '';
  const todayStr = getTodayDateString();

  let datePart = '';
  if (dateStr) {
    if (dateStr === todayStr) {
      datePart = 'Today';
    } else {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const mIdx = parseInt(parts[1], 10) - 1;
        const mName = MONTH_NAMES[mIdx] || parts[1];
        datePart = `${mName} ${parseInt(parts[2], 10)}`;
      } else {
        datePart = dateStr;
      }
    }
  }

  if (datePart && timeStr) {
    return `${datePart} ${timeStr}`;
  }
  return datePart || timeStr || '';
}

/**
 * Standardized Date Input Field component
 * Conforms to Studio OS global design standards:
 * - Height: 46px (2.875rem)
 * - Width: 100% of parent container (w-full max-w-full min-w-0)
 * - Icon: 16px at left-3.5 vertically centered
 * - Border radius: rounded-2xl (16px)
 * - Background & Border: bg-white/5, border-white/10, focus:border-purple-400
 */
export const DateInputField: React.FC<DateInputFieldProps> = ({
  value,
  onChange,
  min,
  disabled = false,
  id,
  className = '',
  showLabel = true,
  showTodayShortcut = true,
  onSelectToday,
  onClear,
}) => {
  const todayStr = useMemo(() => getTodayDateString(), []);
  const isToday = value === todayStr;

  return (
    <div className={`space-y-1.5 w-full max-w-full min-w-0 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-white/50">
          <label htmlFor={id} className="flex items-center gap-1.5 cursor-pointer">
            <Calendar size={13} className="text-purple-300 shrink-0" />
            <span>Date</span>
          </label>
          <div className="flex items-center gap-2">
            {showTodayShortcut && onSelectToday && (
              <button
                type="button"
                onClick={onSelectToday}
                disabled={disabled}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono transition-all flex items-center gap-1 ${
                  isToday
                    ? 'bg-purple-600/35 text-purple-200 border border-purple-500/50 shadow-sm font-medium'
                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
                }`}
              >
                Today
              </button>
            )}
            {value && onClear && (
              <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                className="text-[10px] font-mono text-white/40 hover:text-rose-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <div className="relative w-full max-w-full min-w-0">
        <Calendar
          size={16}
          className="text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0 z-10"
        />
        <input
          id={id}
          type="date"
          min={min ?? todayStr}
          disabled={disabled}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="studio-datetime-input"
          aria-label="Select date"
        />
      </div>
    </div>
  );
};

/**
 * Standardized Time Input Field component
 * Conforms to Studio OS global design standards:
 * - Height: 46px (2.875rem)
 * - Width: 100% of parent container (w-full max-w-full min-w-0)
 * - Icon: 16px at left-3.5 vertically centered
 * - Border radius: rounded-2xl (16px)
 * - Background & Border: bg-white/5, border-white/10, focus:border-purple-400
 */
export const TimeInputField: React.FC<TimeInputFieldProps> = ({
  value,
  onChange,
  min,
  disabled = false,
  id,
  className = '',
  showLabel = true,
  onClear,
  isPastWarning = false,
}) => {
  return (
    <div className={`space-y-1.5 w-full max-w-full min-w-0 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-white/50">
          <label htmlFor={id} className="flex items-center gap-1.5 cursor-pointer">
            <Clock size={13} className="text-sky-300 shrink-0" />
            <span>Time</span>
          </label>
          {value && onClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="text-[10px] font-mono text-white/40 hover:text-rose-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="relative w-full max-w-full min-w-0">
        <Clock
          size={16}
          className="text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0 z-10"
        />
        <input
          id={id}
          type="time"
          min={min}
          disabled={disabled}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="studio-datetime-input"
          aria-label="Select time"
        />
      </div>

      {isPastWarning && (
        <div className="flex items-center gap-1.5 text-xs text-amber-300/80 font-mono pt-1">
          <AlertCircle size={13} className="shrink-0 text-amber-300" />
          <span>Only today or future time allowed</span>
        </div>
      )}
    </div>
  );
};

/**
 * Unified DateTimePicker component used across Studio OS:
 * New Task, Task Detail, Scratchpad, Schedule, etc.
 * Ensures consistent height, padding, borders, icons, and equal vertical spacing between inputs.
 */
export default function DateTimePicker({
  date,
  time,
  onChange,
  compact = false,
  className = '',
}: DateTimePickerProps) {
  const todayStr = useMemo(() => getTodayDateString(), []);
  const currentTimeStr = useMemo(() => getCurrentTimeString(), []);

  // Validation: if selected date is today, time point cannot be in the past
  const isToday = date === todayStr;
  const isPastTimeToday = isToday && Boolean(time) && time < currentTimeStr;

  const handleSelectToday = () => {
    let nextTime = time;
    if (nextTime && nextTime < currentTimeStr) {
      nextTime = currentTimeStr;
    }
    onChange(todayStr, nextTime);
  };

  const handleDateChange = (newDate: string) => {
    if (newDate && newDate < todayStr) {
      newDate = todayStr;
    }
    let nextTime = time;
    if (newDate === todayStr && nextTime && nextTime < currentTimeStr) {
      nextTime = currentTimeStr;
    }
    onChange(newDate, nextTime);
  };

  const handleTimeChange = (newTime: string) => {
    if (isToday && newTime && newTime < currentTimeStr) {
      onChange(date || todayStr, currentTimeStr);
      return;
    }
    const targetDate = date || todayStr;
    onChange(targetDate, newTime);
  };

  return (
    <div className={`${compact ? 'space-y-3.5' : 'space-y-5'} w-full max-w-full min-w-0 ${className}`}>
      {/* 1. Date Field */}
      <DateInputField
        value={date}
        min={todayStr}
        onChange={handleDateChange}
        onSelectToday={handleSelectToday}
        onClear={() => onChange('', time)}
      />

      {/* 2. Time Field (with equal distance and identical styling) */}
      <TimeInputField
        value={time}
        min={isToday ? currentTimeStr : undefined}
        onChange={handleTimeChange}
        onClear={() => onChange(date, '')}
        isPastWarning={isPastTimeToday}
      />
    </div>
  );
}
