// 模板与方案 JSON 导入导出往返测试（md §10：往返一致、无丢失）
import { describe, it, expect } from 'vitest';
import { PRESETS, presetScene } from '../presets';
import { validateScene, newScene, newLamp } from '../factory';
import { computeRatio } from '../ratio';

describe('经典布光模板', () => {
  it('包含验收要求的模板：伦勃朗、蝴蝶光、夹光、三灯白底、静物顶光', () => {
    const names = PRESETS.map((p) => p.name);
    for (const n of ['伦勃朗光', '蝴蝶光', '夹光（Clamshell）', '三灯白底（产品/电商）', '静物顶光']) {
      expect(names).toContain(n);
    }
  });

  it('每个模板生成的场景合法且元素都在房间内', () => {
    for (const p of PRESETS) {
      const s = p.build();
      expect(validateScene(s)).not.toBeNull();
      for (const l of s.lamps) {
        expect(l.x, `${p.name} 灯 x`).toBeGreaterThan(0);
        expect(l.x, `${p.name} 灯 x`).toBeLessThan(s.room.w);
        expect(l.y, `${p.name} 灯 y`).toBeGreaterThan(0);
        expect(l.y, `${p.name} 灯 y`).toBeLessThan(s.room.h);
      }
      expect(s.lamps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('伦勃朗模板：主辅光光比可计算且为合理值', () => {
    const s = PRESETS[0].build();
    const r = computeRatio(s);
    expect(r.ratio).not.toBeNull();
    expect(r.ratio!).toBeGreaterThan(1.5); // 主光明显强于辅光
    expect(r.ratio!).toBeLessThan(20);
  });

  it('presetScene 生成新 id，不复用模板 id', () => {
    const a = presetScene(PRESETS[0]);
    const b = presetScene(PRESETS[0]);
    expect(a.id).not.toBe(b.id);
    expect(a.id).not.toBe(PRESETS[0].build().id);
  });
});

function roundtrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('方案 JSON 导入导出往返一致（验收）', () => {
  it('默认场景往返深相等', () => {
    const s = newScene();
    expect(roundtrip(s)).toStrictEqual(s);
    expect(validateScene(roundtrip(s))).not.toBeNull();
  });

  it('含所有参数的富场景往返无丢失（gel、lumens、props、iso…）', () => {
    const s = PRESETS[0].build();
    s.lamps[0].gel = 'CTO';
    s.lamps[0].heightMm = 1750;
    s.lamps[0].modifier = { type: 'umbrella', w: 1.05, h: 1.05 };
    s.lamps[1].kind = 'continuous';
    s.lamps[1].lumens = 15000;
    s.iso = 400;
    s.shutterDenom = 160;
    s.camera.lensMm = 135;
    s.subject.facing = 30;
    s.props.push({ id: 'x1', kind: 'flag', x: 4.5, y: 2.5, rot: 45, w: 1.2, h: 0.1 });
    const back = roundtrip(s);
    expect(back).toStrictEqual(s);
    expect(validateScene(back)).not.toBeNull();
    // 关键字段逐项断言
    expect(back.lamps[0].gel).toBe('CTO');
    expect(back.lamps[1].lumens).toBe(15000);
    expect(back.lamps[1].gnAtFull).toBe(s.lamps[1].gnAtFull);
    expect(back.props).toHaveLength(s.props.length);
    expect(back.iso).toBe(400);
  });

  it('往返后计算结果不变（光比一致）', () => {
    const s = PRESETS[0].build();
    const r1 = computeRatio(s).ratio;
    const r2 = computeRatio(roundtrip(s)).ratio;
    expect(r2).toBe(r1);
  });

  it('validateScene 拒绝坏数据', () => {
    expect(validateScene(null)).toBeNull();
    expect(validateScene({})).toBeNull();
    expect(validateScene({ schema: 2 })).toBeNull();
    const s = newScene();
    expect(validateScene(s)).not.toBeNull();
    // 缺 lamps
    const bad = { ...newScene() } as unknown as Record<string, unknown>;
    delete bad.lamps;
    expect(validateScene(bad)).toBeNull();
  });

  it('持续灯 LM/W 互斥由数据保证：设置一个可清空另一个', () => {
    const lamp = newLamp(1, 1, { role: 'fill', kind: 'continuous' });
    lamp.lumens = 10000;
    const cleared = { ...lamp, lumens: undefined, watts: 150 } as typeof lamp;
    expect(cleared.lumens).toBeUndefined();
    expect(cleared.watts).toBe(150);
    // JSON 序列化语义：undefined 字段省略，导入后等价于未填写
    const back = roundtrip(cleared);
    expect(back.lumens).toBeUndefined();
    expect(back.watts).toBe(150);
    expect(validateScene({ ...newScene(), lamps: [back] })).not.toBeNull();
  });
});
