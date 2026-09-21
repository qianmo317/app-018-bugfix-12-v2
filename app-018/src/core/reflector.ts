// 反光板效率估算（md §5：按距离与角度给「能补多少档」的粗略提示，标注为估算）
import type { Prop, Scene } from '../types';
import { dist, norm180 } from './geometry';
import type { RatioResult } from './ratio';

/**
 * 反光板给暗部补光能提亮多少档（估算）：
 * E_reflector ≈ η × max(cosα, 0) / d²（η 白/银面经验值 0.6，α 为反光板法线与「板→模特」方向的夹角）
 * 提升档数 = log2(1 + E_r / E_fill)
 * @returns null 表示几乎无贡献或无法估算
 */
export function reflectorLiftStops(scene: Scene, reflector: Prop, ratio: RatioResult): number | null {
  if (!ratio.fill || ratio.fill.relE <= 0) return null;
  const d = dist(reflector, scene.subject);
  if (d < 0.2) return null;
  // 反光板法线方向：rot + 90°（板面为长边 w 方向，法线垂直于板面）
  const normalDeg = reflector.rot + 90;
  const toSubjectDeg = (Math.atan2(scene.subject.y - reflector.y, scene.subject.x - reflector.x) * 180) / Math.PI;
  const alpha = (Math.abs(norm180(toSubjectDeg - normalDeg)) * Math.PI) / 180;
  const cosA = Math.cos(Math.min(alpha, Math.PI / 2));
  if (cosA <= 0.05) return null; // 板面几乎背对模特
  const ETA = 0.6; // 白/银反光板经验效率（估算）
  const eR = ETA * cosA / (d * d);
  const lift = Math.log2(1 + eR / ratio.fill.relE);
  return lift < 0.05 ? null : lift;
}
