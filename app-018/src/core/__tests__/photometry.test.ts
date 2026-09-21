// GN 换算验收测试（md §10：20 组用例，与手工核算 100% 一致）
import { describe, it, expect } from 'vitest';
import {
  POWER_STEPS,
  powerFraction,
  gnAtStep,
  apertureFromGN,
  nearestFStop,
  nearestStep,
  solvePowerStep,
} from '../photometry';

/** 手工核算：f = GN × √(ISO/100) × √(功率占比) / d */
const CASES: { gn: number; d: number; iso: number; step: Parameters<typeof apertureFromGN>[3]; expectedF: number }[] = [
  { gn: 58, d: 5.8, iso: 100, step: '1/1', expectedF: 10 },
  { gn: 32, d: 4, iso: 100, step: '1/1', expectedF: 8 },
  { gn: 32, d: 4, iso: 100, step: '1/4', expectedF: 4 },
  { gn: 60, d: 6, iso: 100, step: '1/2', expectedF: 7.0710678 },
  { gn: 60, d: 3, iso: 200, step: '1/2', expectedF: 20 },
  { gn: 87, d: 8.7, iso: 100, step: '1/1', expectedF: 10 },
  { gn: 87, d: 8.7, iso: 100, step: '1/4', expectedF: 5 },
  { gn: 87, d: 4.35, iso: 100, step: '1/16', expectedF: 5 },
  { gn: 45, d: 9, iso: 100, step: '1/1', expectedF: 5 },
  { gn: 45, d: 4.5, iso: 400, step: '1/8', expectedF: 7.0710678 },
  { gn: 24, d: 2, iso: 100, step: '1/1', expectedF: 12 },
  { gn: 24, d: 2, iso: 100, step: '1/64', expectedF: 1.5 },
  { gn: 50, d: 5, iso: 200, step: '1/1', expectedF: 14.142136 },
  { gn: 36, d: 6, iso: 100, step: '1/2', expectedF: 4.2426407 },
  { gn: 76, d: 7.6, iso: 100, step: '1/1', expectedF: 10 },
  { gn: 76, d: 3.8, iso: 100, step: '1/2', expectedF: 14.142136 },
  { gn: 12, d: 1.5, iso: 800, step: '1/32', expectedF: 4 },
  { gn: 60, d: 1.5, iso: 100, step: '1/128', expectedF: 3.5355339 },
  { gn: 33, d: 11, iso: 100, step: '1/1', expectedF: 3 },
  { gn: 100, d: 10, iso: 400, step: '1/4', expectedF: 10 },
];

describe('GN 换算（20 组验收用例）', () => {
  CASES.forEach((c, i) => {
    it(`用例 ${i + 1}: GN${c.gn} @${c.d}m ISO${c.iso} ${c.step} → f/${c.expectedF.toFixed(3)}`, () => {
      const f = apertureFromGN(c.gn, c.d, c.iso, c.step);
      expect(f).toBeCloseTo(c.expectedF, 3);
    });
  });

  it('功率档 → 光量占比', () => {
    expect(powerFraction('1/1')).toBe(1);
    expect(powerFraction('1/2')).toBe(0.5);
    expect(powerFraction('1/128')).toBeCloseTo(0.0078125, 8);
  });

  it('GN ∝ √光量：降到 1/4 档 GN 减半，1/16 档再减半', () => {
    expect(gnAtStep(60, '1/4')).toBe(30);
    expect(gnAtStep(60, '1/16')).toBe(15);
    expect(gnAtStep(58, '1/1')).toBe(58);
  });

  it('非法功率档抛错', () => {
    expect(() => powerFraction('2/1' as never)).toThrow();
    expect(() => powerFraction('abc' as never)).toThrow();
  });

  it('非法输入抛错（GN/距离/ISO 必须为正）', () => {
    expect(() => apertureFromGN(0, 5, 100, '1/1')).toThrow();
    expect(() => apertureFromGN(60, 0, 100, '1/1')).toThrow();
    expect(() => apertureFromGN(60, 5, 0, '1/1')).toThrow();
  });

  it('最近整档光圈标注', () => {
    expect(nearestFStop(8)).toBe(8);
    expect(nearestFStop(7.0710678)).toBe(7.1);
    expect(nearestFStop(4.2426407)).toBe(4.5);
    expect(nearestFStop(14.142136)).toBe(14);
  });
});

describe('反解功率档（验收：与手工核算一致）', () => {
  it('f/8 @4m ISO100 GN32 → 1/1', () => {
    const r = solvePowerStep(8, 4, 100, 32);
    expect(r.exactFraction).toBeCloseTo(1, 6);
    expect(r.step).toBe('1/1');
    expect(r.achievedF).toBeCloseTo(8, 3);
  });

  it('f/8 @4m ISO100 GN64 → 1/4（GN 减半即需 1/4 档）', () => {
    const r = solvePowerStep(8, 4, 100, 64);
    expect(r.exactFraction).toBeCloseTo(0.25, 6);
    expect(r.step).toBe('1/4');
    expect(r.stepGN).toBe(32);
    expect(r.achievedF).toBeCloseTo(8, 3);
  });

  it('f/11 @5.5m ISO200 GN58 → 精确占比 0.544，吸附 1/2 档', () => {
    const r = solvePowerStep(11, 5.5, 200, 58);
    expect(r.exactGN).toBeCloseTo(42.78, 1);
    expect(r.exactFraction).toBeCloseTo(0.544, 2);
    expect(r.step).toBe('1/2');
  });

  it('目标过亮时钳制到 1/1 档', () => {
    const r = solvePowerStep(32, 4, 100, 32);
    expect(r.exactFraction).toBe(1);
    expect(r.step).toBe('1/1');
  });

  it('nearestStep 往返一致：每档换算后仍吸附回自身', () => {
    for (const s of POWER_STEPS) {
      expect(nearestStep(powerFraction(s))).toBe(s);
    }
  });

  it('非法输入抛错', () => {
    expect(() => solvePowerStep(0, 4, 100, 32)).toThrow();
    expect(() => solvePowerStep(8, -1, 100, 32)).toThrow();
  });
});
