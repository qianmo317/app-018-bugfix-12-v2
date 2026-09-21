// 照度平方反比 / 光比 / EV（md §8：给出计算过程，不只给数字）
import type { Lamp, Scene } from '../types';
import { powerFraction, apertureFromGN, nearestFStop } from './photometry';
import { lampDistanceToSubject } from './geometry';

/** 相对照度（相对单位）：E ∝ 功率占比 / d²（d 米）。参考：1/1 功率 @1m → 1 */
export function relIlluminance(fraction: number, distanceM: number): number {
  const d = Math.max(distanceM, 0.1); // 防除零：物理上灯不会贴到 0
  return fraction / (d * d);
}

export interface LampContribution {
  lamp: Lamp;
  distanceM: number;
  fraction: number;
  relE: number; // 相对照度（1/1 @1m = 1）
}

export interface RatioResult {
  strobes: LampContribution[];
  continuous: LampContribution[];
  key?: LampContribution; // 主光
  fill?: LampContribution; // 辅光
  ratio: number | null; // 光比 E_key / E_fill
  ratioText: string; // '2.25 : 1'
  ev: number | null; // 档位差 log2(光比)
  fStop: number | null; // 主光 GN 推荐光圈（ISO/功率折算后）
  fStopNearest: number | null;
  syncWarning: string | null; // 快门超过同步速度提示
  shutterNote: string | null; // 持续灯快门影响提示
}

/** 汇总场景中所有灯在模特处的贡献并计算光比 */
export function computeRatio(scene: Scene): RatioResult {
  const strobes: LampContribution[] = [];
  const continuous: LampContribution[] = [];
  for (const lamp of scene.lamps) {
    const distanceM = lampDistanceToSubject(scene, lamp);
    if (lamp.kind === 'strobe') {
      const fraction = powerFraction(lamp.powerStep);
      strobes.push({ lamp, distanceM, fraction, relE: relIlluminance(fraction, distanceM) });
    } else {
      // 持续灯：以光通量（lm）为强度来源；只填 W 时按 20 lm/W 粗估（标注为估算）
      const lm = lamp.lumens ?? (lamp.watts != null ? lamp.watts * 20 : 0);
      const relE = lm / 10000 / (Math.max(distanceM, 0.1) ** 2); // 10000lm @1m = 1
      continuous.push({ lamp, distanceM, fraction: lm, relE });
    }
  }

  const key = pickRole(strobes, 'key') ?? maxBy(strobes, (c) => c.relE);
  const fill = pickRole(strobes, 'fill') ?? maxBy(strobes.filter((c) => c !== key), (c) => c.relE);

  let ratio: number | null = null;
  let ev: number | null = null;
  if (key && fill && fill.relE > 0) {
    ratio = key.relE / fill.relE;
    ev = Math.log2(ratio);
  }

  // 主光 GN 推荐光圈
  let fStop: number | null = null;
  let fStopNearest: number | null = null;
  if (key && key.lamp.gnAtFull) {
    fStop = apertureFromGN(key.lamp.gnAtFull, key.distanceM, scene.iso, key.lamp.powerStep);
    fStopNearest = nearestFStop(fStop);
  }

  const SYNC_LIMIT = 250; // 默认闪光同步速度 1/250s
  let syncWarning: string | null = null;
  if (scene.shutterDenom > SYNC_LIMIT && strobes.length > 0) {
    syncWarning = `快门 1/${scene.shutterDenom}s 超过常用同步速度 1/${SYNC_LIMIT}s，可能出现快门帘黑边`;
  }
  let shutterNote: string | null = null;
  if (continuous.length > 0) {
    const stops = Math.log2(scene.shutterDenom / 125);
    shutterNote = `闪光灯曝光不受快门影响；持续灯受快门影响（相对 1/125s：${stops >= 0 ? '+' : ''}${stops.toFixed(1)} EV）`;
  }

  return {
    strobes,
    continuous,
    key,
    fill,
    ratio,
    ratioText: ratio ? `${trimNum(ratio)} : 1` : '—',
    ev,
    fStop,
    fStopNearest,
    syncWarning,
    shutterNote,
  };
}

function pickRole(list: LampContribution[], role: string): LampContribution | undefined {
  return list.find((c) => c.lamp.role === role);
}

function maxBy(list: LampContribution[], fn: (c: LampContribution) => number): LampContribution | undefined {
  let best: LampContribution | undefined;
  for (const c of list) if (!best || fn(c) > fn(best)) best = c;
  return best;
}

function trimNum(n: number): string {
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return (Math.round(n * 100) / 100).toString();
}
