// 房间边界夹取：宽高两个方向各按各的边长卡边界
import { describe, it, expect } from 'vitest';
import { clampToRoom, newScene } from '../factory';

describe('clampToRoom', () => {
  it('宽高不等时两个方向使用各自的边长（房间矮于宽：纵向按 h 卡）', () => {
    const s = newScene();
    s.room = { w: 8, h: 3 };
    // y=2.9 在 3m 高的房间内合法，但曾被误按宽度 8m 之外的逻辑影响；这里重点验证越界值
    expect(clampToRoom(s, 0, 0)).toEqual({ x: 0.1, y: 0.1 });
    expect(clampToRoom(s, 99, 99)).toEqual({ x: 7.9, y: 2.9 });
  });

  it('房间高于宽：横向按 w、纵向按 h', () => {
    const s = newScene();
    s.room = { w: 3, h: 8 };
    expect(clampToRoom(s, 99, 99)).toEqual({ x: 2.9, y: 7.9 });
    expect(clampToRoom(s, -5, 5)).toEqual({ x: 0.1, y: 5 });
  });

  it('室内坐标原样保留', () => {
    const s = newScene(); // 6×5
    expect(clampToRoom(s, 3, 2.5)).toEqual({ x: 3, y: 2.5 });
  });

  it('缩小房间后贴墙元素被夹回新边界', () => {
    const s = newScene(); // 6×5
    s.room = { w: 4, h: 3 };
    // 元素原在 (5.5, 4.5)（旧房间贴墙），缩小后必须回到新房间内
    expect(clampToRoom(s, 5.5, 4.5)).toEqual({ x: 3.9, y: 2.9 });
  });
});
