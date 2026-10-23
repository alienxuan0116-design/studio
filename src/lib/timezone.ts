export interface TimezoneOption {
  id: string; // IANA identifier, e.g. "Europe/London"
  label: string; // e.g. "London (GMT / BST)"
  city: string; // e.g. "London"
  region: string; // e.g. "Europe"
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { id: 'Europe/London', label: 'London (GMT / BST)', city: 'London', region: 'Europe' },
  { id: 'Europe/Paris', label: 'Paris (CET / CEST)', city: 'Paris', region: 'Europe' },
  { id: 'Europe/Berlin', label: 'Berlin (CET / CEST)', city: 'Berlin', region: 'Europe' },
  { id: 'Europe/Zurich', label: 'Zurich (CET / CEST)', city: 'Zurich', region: 'Europe' },
  { id: 'America/New_York', label: 'New York (EST / EDT)', city: 'New York', region: 'Americas' },
  { id: 'America/Chicago', label: 'Chicago (CST / CDT)', city: 'Chicago', region: 'Americas' },
  { id: 'America/Denver', label: 'Denver (MST / MDT)', city: 'Denver', region: 'Americas' },
  { id: 'America/Los_Angeles', label: 'Los Angeles (PST / PDT)', city: 'Los Angeles', region: 'Americas' },
  { id: 'America/Toronto', label: 'Toronto (EST / EDT)', city: 'Toronto', region: 'Americas' },
  { id: 'America/Sao_Paulo', label: 'São Paulo (BRT)', city: 'São Paulo', region: 'Americas' },
  { id: 'Asia/Shanghai', label: 'Shanghai / Beijing (CST)', city: 'Shanghai', region: 'Asia' },
  { id: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', city: 'Hong Kong', region: 'Asia' },
  { id: 'Asia/Tokyo', label: 'Tokyo (JST)', city: 'Tokyo', region: 'Asia' },
  { id: 'Asia/Seoul', label: 'Seoul (KST)', city: 'Seoul', region: 'Asia' },
  { id: 'Asia/Singapore', label: 'Singapore (SGT)', city: 'Singapore', region: 'Asia' },
  { id: 'Asia/Dubai', label: 'Dubai (GST)', city: 'Dubai', region: 'Asia' },
  { id: 'Asia/Kolkata', label: 'India (IST)', city: 'Kolkata', region: 'Asia' },
  { id: 'Australia/Sydney', label: 'Sydney (AEST / AEDT)', city: 'Sydney', region: 'Pacific' },
  { id: 'Australia/Melbourne', label: 'Melbourne (AEST / AEDT)', city: 'Melbourne', region: 'Pacific' },
  { id: 'Pacific/Auckland', label: 'Auckland (NZST / NZDT)', city: 'Auckland', region: 'Pacific' },
  { id: 'Pacific/Honolulu', label: 'Honolulu (HST)', city: 'Honolulu', region: 'Pacific' },
  { id: 'UTC', label: 'UTC (Coordinated Universal Time)', city: 'UTC', region: 'Universal' },
];

export const STORAGE_TIMEZONE_KEY = 'studio_os_user_timezone';

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function getStoredTimezone(): string {
  if (typeof localStorage === 'undefined') {
    return getDeviceTimezone();
  }
  try {
    const stored = localStorage.getItem(STORAGE_TIMEZONE_KEY);
    if (stored && isValidTimezone(stored)) {
      return stored;
    }
  } catch {
    // fallback
  }
  return getDeviceTimezone();
}

export function saveStoredTimezone(tz: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (isValidTimezone(tz)) {
      localStorage.setItem(STORAGE_TIMEZONE_KEY, tz);
      window.dispatchEvent(new CustomEvent('studio_os_timezone_changed', { detail: tz }));
    }
  } catch (e) {
    console.error('Failed to save timezone', e);
  }
}

export interface TimezoneDateTimeData {
  dayName: string;
  monthName: string;
  dayNum: number;
  year: number;
  hours24: number;
  h12: number;
  minutes: string;
  seconds: string;
  ampm: string;
  tzCity: string;
  timeZone: string;
}

export function formatDateTimeInTimezone(date: Date, timeZone: string): TimezoneDateTimeData {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }

    const hours24 = parseInt(map.hour || '0', 10);
    const h12 = hours24 % 12 || 12;
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const dayNum = parseInt(map.day || '1', 10);
    const year = parseInt(map.year || `${date.getFullYear()}`, 10);

    const tzCity = timeZone.split('/').pop()?.replace(/_/g, ' ') || timeZone;

    return {
      dayName: map.weekday || 'Mon',
      monthName: map.month || 'January',
      dayNum,
      year,
      hours24,
      h12,
      minutes: map.minute || '00',
      seconds: map.second || '00',
      ampm,
      tzCity,
      timeZone,
    };
  } catch {
    // Fallback to local
    const hours = date.getHours();
    return {
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
      monthName: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ][date.getMonth()],
      dayNum: date.getDate(),
      year: date.getFullYear(),
      hours24: hours,
      h12: hours % 12 || 12,
      minutes: date.getMinutes().toString().padStart(2, '0'),
      seconds: date.getSeconds().toString().padStart(2, '0'),
      ampm: hours >= 12 ? 'PM' : 'AM',
      tzCity: timeZone.split('/').pop()?.replace(/_/g, ' ') || 'LOCAL',
      timeZone,
    };
  }
}
