import { describe, expect, it } from 'vitest';
import { clampToRoom } from '../factory';

describe('clampToRoom', () => {
  it('x/y 各按房间的宽/高分别卡边界', () => {
    // 宽 6、高 3（矮房间）：y 不能按宽度夹
    expect(clampToRoom({ w: 6, h: 3 }, 3, 5)).toEqual({ x: 3, y: 2.9 });
    // 窄房间：x 不能按高度夹
    expect(clampToRoom({ w: 3, h: 6 }, 5, 3)).toEqual({ x: 2.9, y: 3 });
    expect(clampToRoom({ w: 6, h: 3 }, -2, -2)).toEqual({ x: 0.1, y: 0.1 });
  });

  it('缩小房间后越界元素被夹回新边界', () => {
    expect(clampToRoom({ w: 4, h: 2.5 }, 5.5, 4.5)).toEqual({ x: 3.9, y: 2.4 });
  });

  it('边界极小的房间不会产出非法区间', () => {
    expect(clampToRoom({ w: 0.05, h: 0.05 }, 2, 2)).toEqual({ x: 0.1, y: 0.1 });
  });
});
