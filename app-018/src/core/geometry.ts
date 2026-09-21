// 平面几何：距离 / 方位角 / 相对角度（md §8：按相机—模特轴与模特朝向计算）
import type { Pt, Scene } from '../types';

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 方位角（度）：from → to，0°=+x（画布右），90°=+y（画布下），范围 (-180, 180] */
export function azimuthDeg(from: Pt, to: Pt): number {
  const deg = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return deg === -180 ? 180 : deg;
}

/** 归一化到 (-180, 180] */
export function norm180(deg: number): number {
  let d = ((deg + 180) % 360 + 360) % 360 - 180;
  if (d === -180) d = 180;
  return d;
}

/** 归一化到 [0, 360) */
export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** 灯相对模特朝向的角度 = 方位角(模特→灯) − 模特朝向（md §4/§8 公式） */
export function relativeAngleToSubject(scene: Scene, p: Pt): number {
  const az = azimuthDeg(scene.subject, p);
  return norm180(az - scene.subject.facing);
}

/** 灯相对「相机—模特轴」的角度（布光语言：45° 侧光 / 90° 侧逆光） */
export function angleFromCameraAxis(scene: Scene, p: Pt): number {
  const azLamp = azimuthDeg(scene.subject, p);
  const azCam = azimuthDeg(scene.subject, scene.camera);
  return norm180(azLamp - azCam);
}

/** 灯到模特的平面距离（米） */
export function lampDistanceToSubject(scene: Scene, p: Pt): number {
  return dist(scene.subject, p);
}

/** 灯的朝向是否大致指向目标（用于覆盖范围绘制等） */
export function bearingFromTo(from: Pt, to: Pt): number {
  return azimuthDeg(from, to);
}
