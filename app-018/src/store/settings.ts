// 全局设置：localStorage（影棚尺寸、单位 m/ft、GN 表、同步速度）
import { useSyncExternalStore } from 'react';

export interface GnEntry { name: string; gn: number }

export interface AppSettings {
  unit: 'm' | 'ft';
  syncDenom: number; // 闪光同步速度 1/N s
  defaultRoom: { w: number; h: number };
  gnTable: GnEntry[];
  defaultGN: number; // 新建闪光灯默认 GN
}

const KEY = 'slp-settings';

export const DEFAULT_SETTINGS: AppSettings = {
  unit: 'm',
  syncDenom: 250,
  defaultRoom: { w: 6, h: 5 },
  gnTable: [
    { name: 'Godox AD600Pro', gn: 87 },
    { name: 'Godox AD200Pro', gn: 60 },
    { name: 'Godox V860III', gn: 60 },
    { name: 'Profoto B10X', gn: 60 },
    { name: '金贝 EP-400', gn: 64 },
  ],
  defaultGN: 60,
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      defaultRoom: { ...DEFAULT_SETTINGS.defaultRoom, ...(parsed.defaultRoom ?? {}) },
      gnTable: Array.isArray(parsed.gnTable) && parsed.gnTable.length > 0 ? parsed.gnTable : DEFAULT_SETTINGS.gnTable,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let current: AppSettings = typeof localStorage !== 'undefined' ? load() : { ...DEFAULT_SETTINGS };
const listeners = new Set<() => void>();

export function getSettings(): AppSettings {
  return current;
}

export function saveSettings(patch: Partial<AppSettings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* 隐私模式等场景忽略 */
  }
  listeners.forEach((l) => l());
}

export function useSettings(): [AppSettings, (patch: Partial<AppSettings>) => void] {
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
  return [s, saveSettings];
}

/** 单位换算显示：内部一律米 */
export function fmtLen(meters: number, unit: 'm' | 'ft'): string {
  if (unit === 'ft') {
    const ft = meters * 3.28084;
    return `${ft.toFixed(ft < 10 ? 2 : 1)} ft`;
  }
  return `${(Math.round(meters * 100) / 100).toString()} m`;
}
