// 覆盖范围估算（md §4.4 / §8）：光斑 ≈ 箱体尺寸 + 2 × d × tan(发散角/2)，标注为示意估算
import type { Lamp, ModifierType } from '../types';
import { MODIFIER_INFO } from '../types';

export function beamAngleOf(type: ModifierType): number {
  return MODIFIER_INFO[type].beamDeg;
}

/** 距离 d 处的光斑尺寸（米） */
export function spotSize(modW: number, modH: number, distanceM: number, beamDeg: number): { w: number; h: number } {
  const spread = 2 * Math.max(distanceM, 0.1) * Math.tan((beamDeg / 2) * (Math.PI / 180));
  return { w: modW + spread, h: modH + spread };
}

/** 照度均匀区：取光斑中心的约 60%（示意估算） */
export function uniformZone(spot: { w: number; h: number }): { w: number; h: number } {
  return { w: spot.w * 0.6, h: spot.h * 0.6 };
}

/** 灯在模特处的覆盖范围（沿灯头朝向投影到模特距离处） */
export function lampCoverage(lamp: Lamp, distanceM: number): {
  spot: { w: number; h: number };
  uniform: { w: number; h: number };
  beamDeg: number;
} {
  const beamDeg = beamAngleOf(lamp.modifier.type);
  const spot = spotSize(lamp.modifier.w, lamp.modifier.h, distanceM, beamDeg);
  return { spot, uniform: uniformZone(spot), beamDeg };
}
