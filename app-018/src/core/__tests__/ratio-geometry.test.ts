// 光比 / 平方反比 / 相对角度 / 覆盖范围 / 反光板 验收测试（md §10）
import { describe, it, expect } from 'vitest';
import { relIlluminance, computeRatio } from '../ratio';
import { azimuthDeg, norm180, relativeAngleToSubject, angleFromCameraAxis } from '../geometry';
import { spotSize, uniformZone, lampCoverage, beamAngleOf } from '../coverage';
import { reflectorLiftStops } from '../reflector';
import { newLamp, newProp, newScene } from '../factory';
import type { Scene } from '../../types';

/** 构造验收场景：主光 2m、辅光 3m、功率相同 */
function ratioScene(mainDist: number, fillDist: number): Scene {
  const s = newScene();
  s.lamps = [
    newLamp(3 - mainDist, 3.1, { role: 'key', powerStep: '1/2', gnAtFull: 60 }),
    newLamp(3, 3.1 - fillDist, { role: 'fill', powerStep: '1/2', gnAtFull: 60 }),
  ];
  return s;
}

describe('光比（验收：主光 2m、辅光 3m、功率相同 → 2.25:1）', () => {
  it('2.25 : 1，EV = log2(2.25) ≈ 1.17', () => {
    const r = computeRatio(ratioScene(2, 3));
    expect(r.ratio).toBeCloseTo(2.25, 6);
    expect(r.ratioText).toBe('2.25 : 1');
    expect(r.ev).toBeCloseTo(Math.log2(2.25), 6);
  });

  it('改距离后光比实时变化（验收用例断言）', () => {
    const near = computeRatio(ratioScene(2, 3)).ratio!;
    const equal = computeRatio(ratioScene(2, 2)).ratio!;
    const far = computeRatio(ratioScene(2, 4)).ratio!;
    expect(equal).toBeCloseTo(1, 6); // 等距等功率 → 1:1
    expect(far).toBeCloseTo(4, 6); // 辅光 4m → (1/4)/(1/16) = 4:1
    expect(far).toBeGreaterThan(near);
  });

  it('平方反比基础：E ∝ 1/d²', () => {
    expect(relIlluminance(1, 1)).toBeCloseTo(1, 9);
    expect(relIlluminance(1, 2)).toBeCloseTo(0.25, 9);
    expect(relIlluminance(0.5, 1)).toBeCloseTo(0.5, 9);
  });

  it('功率折算进入光比：辅光降 2 档（1/2→1/8）相当于距离 ×2', () => {
    const a = computeRatio(ratioScene(2, 3)); // 主 1/2 @2m，辅 1/2 @3m → 2.25
    const s = ratioScene(2, 3);
    s.lamps[1].powerStep = '1/8'; // 辅光降 2 档 → 光量 ×1/4 ≈ 距离 ×2
    const b = computeRatio(s);
    expect(b.ratio!).toBeCloseTo(a.ratio! * 4, 3);
  });

  it('计算过程可核对：明细含距离、档位、1/d²、相对照度', () => {
    const r = computeRatio(ratioScene(2, 3));
    expect(r.strobes).toHaveLength(2);
    const key = r.strobes.find((c) => c.lamp.role === 'key')!;
    expect(key.distanceM).toBeCloseTo(2, 6);
    expect(key.fraction).toBe(0.5);
    expect(key.relE).toBeCloseTo(0.125, 6); // 0.5 / 4
  });

  it('主光 GN 推荐光圈：GN60 1/2 @2m ISO100 → f/21.2（最近 f/22）', () => {
    const r = computeRatio(ratioScene(2, 3));
    expect(r.fStop).toBeCloseTo(21.213, 2);
    expect(r.fStopNearest).toBe(22);
  });

  it('同步速度提示：快门快于 1/250s 警告', () => {
    const s = ratioScene(2, 3);
    s.shutterDenom = 500;
    expect(computeRatio(s).syncWarning).toBeTruthy();
    s.shutterDenom = 200;
    expect(computeRatio(s).syncWarning).toBeNull();
  });

  it('持续灯不参与闪光光比，但有快门影响提示', () => {
    const s = ratioScene(2, 3);
    s.lamps = [newLamp(2, 2, { role: 'key', kind: 'continuous' })];
    s.lamps[0].lumens = 12000;
    const r = computeRatio(s);
    expect(r.strobes).toHaveLength(0);
    expect(r.continuous).toHaveLength(1);
    expect(r.ratio).toBeNull();
    expect(r.shutterNote).toBeTruthy();
  });

  it('LM 与 W 互斥启发：只填 W 按 20lm/W 粗估', () => {
    const s = ratioScene(2, 3);
    s.lamps = [newLamp(2, 2, { role: 'key', kind: 'continuous' })];
    s.lamps[0].watts = 100; // → 2000lm；灯(2,2) 到模特(3,3.1) 距离 √(1+1.1²)
    const r = computeRatio(s);
    const d = Math.hypot(2 - 3, 2 - 3.1);
    expect(r.continuous[0].relE).toBeCloseTo(0.2 / (d * d), 6);
  });
});

describe('相对角度（验收：模特转向 90° 后同一灯位相对角度必须改变）', () => {
  const scene = newScene(); // 模特 (3,3.1) 朝向 -90°，相机 (3,1)
  scene.lamps = [newLamp(1.73, 1.83, { role: 'key' })]; // 伦勃朗主光位

  it('方位角基准：右 0°、下 90°、左 180°、上 -90°', () => {
    const o = { x: 0, y: 0 };
    expect(azimuthDeg(o, { x: 1, y: 0 })).toBe(0);
    expect(azimuthDeg(o, { x: 0, y: 1 })).toBe(90);
    expect(azimuthDeg(o, { x: -1, y: 0 })).toBe(180);
    expect(azimuthDeg(o, { x: 0, y: -1 })).toBe(-90);
    expect(azimuthDeg(o, { x: 1, y: 1 })).toBe(45);
  });

  it('norm180 归一化', () => {
    expect(norm180(190)).toBe(-170);
    expect(norm180(-190)).toBe(170);
    expect(norm180(180)).toBe(180);
    expect(norm180(-180)).toBe(180);
  });

  it('朝向相机时：伦勃朗主光相对角度 -45°，相机轴角 -45°', () => {
    const rel = relativeAngleToSubject(scene, scene.lamps[0]);
    expect(rel).toBeCloseTo(-45, 1);
    const axis = angleFromCameraAxis(scene, scene.lamps[0]);
    expect(axis).toBeCloseTo(-45, 1);
  });

  it('模特转向 90°（facing: -90 → 0）后，相对角度改变为 -135°', () => {
    const before = relativeAngleToSubject(scene, scene.lamps[0]);
    scene.subject.facing = 0;
    const after = relativeAngleToSubject(scene, scene.lamps[0]);
    expect(after).not.toBeCloseTo(before, 3);
    expect(after).toBeCloseTo(-135, 1);
    // 相机轴角不随模特转向变化（相机与灯都没动）
    expect(angleFromCameraAxis(scene, scene.lamps[0])).toBeCloseTo(-45, 1);
    scene.subject.facing = -90;
  });
});

describe('覆盖范围（示意估算）', () => {
  it('柔光箱 60×90 @2m 发散角 60°：光斑 = 尺寸 + 2·d·tan30°', () => {
    const spot = spotSize(0.6, 0.9, 2, 60);
    const spread = 2 * 2 * Math.tan(Math.PI / 6);
    expect(spot.w).toBeCloseTo(0.6 + spread, 6);
    expect(spot.h).toBeCloseTo(0.9 + spread, 6);
    const uni = uniformZone(spot);
    expect(uni.w).toBeCloseTo(spot.w * 0.6, 6);
  });

  it('按配件类型给经验发散角', () => {
    expect(beamAngleOf('softbox')).toBe(60);
    expect(beamAngleOf('umbrella')).toBe(75);
    expect(beamAngleOf('beauty')).toBe(45);
    expect(beamAngleOf('bare')).toBe(55);
    expect(beamAngleOf('flag')).toBe(25);
  });

  it('灯位覆盖随距离增大', () => {
    const lamp = newLamp(0, 0, { role: 'key', modifier: { type: 'softbox', w: 0.6, h: 0.9 } });
    const near = lampCoverage(lamp, 1.5);
    const far = lampCoverage(lamp, 3);
    expect(far.spot.w).toBeGreaterThan(near.spot.w);
  });
});

describe('反光板效率估算（标注为估算）', () => {
  it('正对模特给出正提升，且随距离衰减', () => {
    const s = ratioScene(2, 3);
    const r = reflectorAt(s, 180); // 法线朝向模特（模特在反光板 -y 方向）
    const near = r(1.8);
    const far = r(2.6);
    expect(near).not.toBeNull();
    expect(far).not.toBeNull();
    expect(near!).toBeGreaterThan(far!);
    expect(near!).toBeLessThan(2.5);
  });

  it('背对模特时无贡献（null）', () => {
    const s = ratioScene(2, 3);
    const r = reflectorAt(s, 0); // 法线背向模特
    expect(r(1.8)).toBeNull();
  });

  function reflectorAt(s: Scene, rot: number) {
    const p = newProp('reflector', 3, 4.4);
    p.rot = rot;
    return (d: number) => {
      p.y = s.subject.y + d;
      const ratio = computeRatio(s);
      return reflectorLiftStops(s, p, ratio);
    };
  }
});
