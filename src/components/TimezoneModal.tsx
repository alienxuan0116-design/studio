import React, { useState, useMemo } from 'react';
import { X, Search, Globe, Check, RotateCcw } from 'lucide-react';
import {
  COMMON_TIMEZONES,
  getDeviceTimezone,
  saveStoredTimezone,
  type TimezoneOption,
} from '@/lib/timezone';

interface TimezoneModalProps {
  isOpen: boolean;
  currentTimezone: string;
  onClose: () => void;
  onSelectTimezone: (tz: string) => void;
}

export default function TimezoneModal({
  isOpen,
  currentTimezone,
  onClose,
  onSelectTimezone,
}: TimezoneModalProps) {
  const [search, setSearch] = useState('');
  const deviceTz = useMemo(() => getDeviceTimezone(), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COMMON_TIMEZONES;
    return COMMON_TIMEZONES.filter(
      (tz) =>
        tz.city.toLowerCase().includes(q) ||
        tz.label.toLowerCase().includes(q) ||
        tz.id.toLowerCase().includes(q) ||
        tz.region.toLowerCase().includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  const handleSelect = (tzId: string) => {
    saveStoredTimezone(tzId);
    onSelectTimezone(tzId);
    onClose();
  };

  const handleResetDevice = () => {
    handleSelect(deviceTz);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-[#0d1124]/95 border border-white/15 p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-purple-300" />
            <h3 className="text-sm font-medium tracking-wide text-white">Select Timezone</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city or IANA zone (e.g. London, Shanghai)..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
          />
        </div>

        {/* Current device timezone banner */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-white/70 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] uppercase font-mono text-white/40">Device:</span>
            <span className="truncate text-white/90 text-xs font-mono">{deviceTz}</span>
          </div>
          {currentTimezone !== deviceTz && (
            <button
              type="button"
              onClick={handleResetDevice}
              className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-200 transition-colors shrink-0 font-medium ml-2"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Timezone List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-[160px] max-h-[340px]">
          {filtered.map((item: TimezoneOption) => {
            const isSelected = currentTimezone === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-purple-600/30 border border-purple-500/40 text-purple-200 shadow-sm'
                    : 'bg-white/[0.02] hover:bg-white/[0.06] border border-transparent text-white/80'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-medium truncate text-white">{item.label}</div>
                  <div className="text-[10px] text-white/40 font-mono truncate">{item.id}</div>
                </div>
                {isSelected && <Check size={14} className="text-purple-300 shrink-0" />}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-white/40 font-mono">
              No matching timezone found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
