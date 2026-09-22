// 元素工厂与默认场景
import type { Lamp, LampRole, ModifierType, PowerStep, Prop, PropKind, Scene } from '../types';

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export interface NewLampOptions {
  role?: LampRole;
  kind?: 'strobe' | 'continuous';
  gnAtFull?: number;
  powerStep?: PowerStep;
  modifier?: { type: ModifierType; w: number; h: number };
  heightMm?: number;
}

export function newLamp(x: number, y: number, opts: NewLampOptions = {}): Lamp {
  const role = opts.role ?? 'key';
  const kind = opts.kind ?? 'strobe';
  const modifier = opts.modifier ?? { type: 'softbox', w: 0.6, h: 0.9 };
  return {
    id: uid('lamp'),
    kind,
    role,
    x,
    y,
    rot: 0,
    powerStep: opts.powerStep ?? '1/2',
    gnAtFull: kind === 'strobe' ? (opts.gnAtFull ?? 60) : undefined,
    modifier,
    heightMm: opts.heightMm ?? 1200,
  };
}

export function newProp(kind: PropKind, x: number, y: number): Prop {
  const defaults: Record<PropKind, { w: number; h: number; rot: number }> = {
    reflector: { w: 1.0, h: 0.12, rot: 0 },
    background: { w: 3.0, h: 0.15, rot: 0 },
    flag: { w: 0.8, h: 0.1, rot: 0 },
  };
  return { id: uid('prop'), kind, x, y, ...defaults[kind] };
}

export function newScene(title = '未命名布光方案'): Scene {
  return {
    schema: 1,
    id: uid('plan'),
    title,
    room: { w: 6, h: 5 },
    subject: { kind: 'human', x: 3, y: 3.1, facing: -90 },
    camera: { x: 3, y: 1.0, rot: 90, lensMm: 85 },
    lamps: [],
    props: [],
    iso: 100,
    shutterDenom: 200,
  };
}

/** 把元素位置夹到房间内（两个方向各按房间的宽/高卡边界，避免拖出房间/调整房间尺寸后越界） */
export function clampToRoom(room: { w: number; h: number }, x: number, y: number): { x: number; y: number } {
  const minX = 0.1;
  const minY = 0.1;
  const cx = Math.min(Math.max(x, minX), Math.max(minX, room.w - 0.1));
  const cy = Math.min(Math.max(y, minY), Math.max(minY, room.h - 0.1));
  return { x: cx, y: cy };
}

/** 校验导入的场景 JSON（md §10：导入导出往返一致且无丢失） */
export function validateScene(input: unknown): Scene | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Partial<Scene>;
  if (o.schema !== 1) return null;
  if (typeof o.id !== 'string' || typeof o.title !== 'string') return null;
  if (!o.room || typeof o.room.w !== 'number' || typeof o.room.h !== 'number') return null;
  if (!o.subject || !o.camera || typeof o.subject.x !== 'number' || typeof o.camera.lensMm !== 'number') return null;
  if (!Array.isArray(o.lamps) || !Array.isArray(o.props)) return null;
  if (!o.lamps.every((l) => l && typeof l.id === 'string' && typeof l.x === 'number' && typeof l.y === 'number')) return null;
  if (!o.props.every((p) => p && typeof p.id === 'string' && typeof p.kind === 'string')) return null;
  if (typeof o.iso !== 'number' || typeof o.shutterDenom !== 'number') return null;
  return o as Scene;
}
