import { useState, useEffect, useCallback } from 'react';
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudFog, Zap, CloudDrizzle,
  MapPin, Search, Loader2,
} from 'lucide-react';

type Status = 'loading' | 'granted' | 'denied' | 'error';

interface WeatherData {
  temperature: number;
  code: number;
  locationName: string;
}

function weatherInfo(code: number): { icon: typeof Sun; label: string } {
  if (code === 0) return { icon: Sun, label: 'Clear' };
  if (code <= 3) return { icon: Cloud, label: 'Partly cloudy' };
  if (code <= 48) return { icon: CloudFog, label: 'Fog' };
  if (code <= 57) return { icon: CloudDrizzle, label: 'Drizzle' };
  if (code <= 67) return { icon: CloudRain, label: 'Rain' };
  if (code <= 77) return { icon: CloudSnow, label: 'Snow' };
  if (code <= 82) return { icon: CloudRain, label: 'Showers' };
  if (code <= 86) return { icon: CloudSnow, label: 'Snow showers' };
  if (code >= 95) return { icon: Zap, label: 'Thunderstorm' };
  return { icon: Cloud, label: 'Cloudy' };
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
  );
  if (!res.ok) throw new Error('Weather request failed');
  const data = await res.json();
  let locationName = 'Current location';
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`
    );
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData?.results?.[0]?.name) {
        locationName = geoData.results[0].name;
      }
    }
  } catch {
    // reverse geocoding is best-effort
  }
  return {
    temperature: Math.round(data.current.temperature_2m),
    code: data.current.weather_code,
    locationName,
  };
}

async function geocodeCity(name: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data?.results?.[0];
  if (!hit) return null;
  return { lat: hit.latitude, lon: hit.longitude, label: hit.name };
}

export default function WeatherStrip() {
  const [status, setStatus] = useState<Status>('loading');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [cityInput, setCityInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadByCoords = useCallback(async (lat: number, lon: number) => {
    try {
      setStatus('loading');
      const data = await fetchWeather(lat, lon);
      setWeather(data);
      setStatus('granted');
    } catch {
      setStatus('error');
      setErrorMsg('Could not load weather.');
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => loadByCoords(pos.coords.latitude, pos.coords.longitude),
      () => setStatus('denied'),
      { timeout: 8000 }
    );
  }, [loadByCoords]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;
    setSearching(true);
    setErrorMsg('');
    try {
      const result = await geocodeCity(cityInput.trim());
      if (!result) {
        setErrorMsg('City not found.');
      } else {
        await loadByCoords(result.lat, result.lon);
      }
    } catch {
      setErrorMsg('Search failed.');
    }
    setSearching(false);
  };

  const info = weather ? weatherInfo(weather.code) : null;
  const Icon = info?.icon ?? Cloud;

  // Loading state
  if (status === 'loading') {
    return (
      <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-white/50">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-[13px]">Loading weather…</span>
      </div>
    );
  }

  // Granted — show weather
  if (status === 'granted' && weather && info) {
    return (
      <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2.5 overflow-hidden">
        <Icon size={18} strokeWidth={1.6} className="text-white/70 flex-shrink-0" />
        <span className="text-[15px] font-light tabular-nums text-white/90">{weather.temperature}°</span>
        <span className="text-white/20">·</span>
        <span className="text-[13px] text-white/60 truncate">{info.label}</span>
        <span className="text-white/15">·</span>
        <span className="text-[12px] text-white/40 truncate flex items-center gap-1">
          <MapPin size={11} strokeWidth={1.5} />
          {weather.locationName}
        </span>
      </div>
    );
  }

  // Denied or error — show city search
  return (
    <div className="glass rounded-2xl px-3 py-2 flex items-center gap-2">
      <MapPin size={15} strokeWidth={1.6} className="text-white/40 flex-shrink-0" />
      <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-0">
        <input
          type="text"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          placeholder="Enter city for weather…"
          className="flex-1 min-w-0 bg-transparent text-[13px] text-white/80 placeholder:text-white/30 outline-none"
        />
        <button
          type="submit"
          disabled={searching || !cityInput.trim()}
          aria-label="Search city"
          className="rail-icon w-7 h-7 rounded-lg flex items-center justify-center text-white/50 disabled:opacity-30 flex-shrink-0"
        >
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} strokeWidth={1.8} />}
        </button>
      </form>
      {errorMsg && <span className="text-[11px] text-rose-300/60 flex-shrink-0">{errorMsg}</span>}
    </div>
  );
}
