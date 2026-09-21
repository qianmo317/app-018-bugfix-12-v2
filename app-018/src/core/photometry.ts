// GN 与功率档换算（md §8：换算关系必须写成可测函数）
import type { PowerStep } from '../types';

export const POWER_STEPS: PowerStep[] = ['1/1', '1/2', '1/4', '1/8', '1/16', '1/32', '1/64', '1/128'];

/** 功率档 → 光量占比。'1/4' → 0.25 */
export function powerFraction(step: PowerStep): number {
  const m = /^(\d+)\/(\d+)$/.exec(step);
  if (!m) throw new Error(`非法功率档: ${step}`);
  const n = Number(m[1]);
  const d = Number(m[2]);
  if (!d || n <= 0 || n > d) throw new Error(`非法功率档: ${step}`);
  return n / d;
}

/** GN ∝ √光量：降到 1/4 档 GN 减半。gnAtStep(60, '1/4') === 30 */
export function gnAtStep(gnFull: number, step: PowerStep): number {
  return gnFull * Math.sqrt(powerFraction(step));
}

/**
 * 闪光灯所需光圈：f = GN × √(ISO/100) × √(功率占比) / 距离(m)
 * @param gnFull 全功率 GN（ISO100, m）
 * @param distanceM 灯到模特距离（米），> 0
 */
export function apertureFromGN(gnFull: number, distanceM: number, iso: number, step: PowerStep): number {
  if (!(gnFull > 0) || !(distanceM > 0) || !(iso > 0)) throw new Error('GN/距离/ISO 必须为正数');
  return (gnAtStep(gnFull, step) * Math.sqrt(iso / 100)) / distanceM;
}

/** 光圈序列（全档 1/3 步进近似标注用）：返回最接近的常用光圈值 */
export function nearestFStop(f: number): number {
  const stops = [1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22];
  let best = stops[0];
  let bestErr = Infinity;
  for (const s of stops) {
    const err = Math.abs(Math.log2(s / f));
    if (err < bestErr) {
      bestErr = err;
      best = s;
    }
  }
  return best;
}

/** 光量占比 → 最接近的功率档 */
export function nearestStep(fraction: number): PowerStep {
  let best: PowerStep = '1/1';
  let bestErr = Infinity;
  for (const s of POWER_STEPS) {
    const err = Math.abs(Math.log2(powerFraction(s) / fraction));
    if (err < bestErr) {
      bestErr = err;
      best = s;
    }
  }
  return best;
}

/**
 * 反解功率档：已知目标光圈 / 距离 / ISO / 全功率 GN，求所需功率档。
 * 光量占比 fraction = ( f × d / (GN × √(ISO/100)) )²，再吸附到最近档位。
 */
export function solvePowerStep(
  targetF: number,
  distanceM: number,
  iso: number,
  gnFull: number,
): { exactFraction: number; exactGN: number; step: PowerStep; stepGN: number; achievedF: number } {
  if (!(targetF > 0) || !(distanceM > 0) || !(gnFull > 0) || !(iso > 0)) throw new Error('光圈/距离/GN/ISO 必须为正数');
  const gnNeeded = targetF * distanceM / Math.sqrt(iso / 100); // 所需等效全功率 GN
  const exactFraction = Math.min(1, (gnNeeded / gnFull) ** 2);
  const step = nearestStep(exactFraction);
  const stepGN = gnAtStep(gnFull, step);
  return {
    exactFraction,
    exactGN: gnNeeded,
    step,
    stepGN,
    achievedF: stepGN * Math.sqrt(iso / 100) / distanceM,
  };
}
