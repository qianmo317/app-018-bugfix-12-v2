// 影棚布光图编排 · 数据模型（md §7 扩展：灯位增加 role 角色字段，与 §9 颜色/形状规范对应）
export type Pt = { x: number; y: number };

export type LampRole = 'key' | 'fill' | 'rim' | 'bg';
export type LampKind = 'strobe' | 'continuous';
export type ModifierType = 'softbox' | 'umbrella' | 'beauty' | 'bare' | 'flag';
export type PowerStep = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32' | '1/64' | '1/128';

/** 灯位（rot 单位：度，0°=画布 +x 方向，顺时针为正，与 atan2(dy,dx) 一致） */
export interface Lamp {
  id: string;
  kind: LampKind;
  role: LampRole;
  x: number; // 米（画布平面坐标）
  y: number;
  rot: number; // 灯头朝向（度）
  powerStep: PowerStep; // 功率档 '1/1' | '1/2' | ...
  gnAtFull?: number; // 闪光指数（ISO100, m），仅闪光灯
  modifier: { type: ModifierType; w: number; h: number }; // 变光配件尺寸（米）
  heightMm: number; // 灯心高度
  gel?: string; // 色片
  lumens?: number; // 持续灯：光通量 lm（与 watts 互斥）
  watts?: number; // 持续灯：功率 W（与 lumens 互斥）
}

export type PropKind = 'reflector' | 'background' | 'flag';

export interface Prop {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  rot: number;
  w: number;
  h: number;
}

export interface Scene {
  schema: 1;
  id: string;
  title: string;
  room: { w: number; h: number }; // 米
  subject: { kind: 'human' | 'product'; x: number; y: number; facing: number }; // facing：模特朝向（度）
  camera: { x: number; y: number; rot: number; lensMm: number };
  lamps: Lamp[];
  props: Prop[];
  iso: number;
  shutterDenom: number; // 1/Ns，如 200 → 1/200s
}

export interface PlanRecord {
  id: string;
  title: string;
  scene: Scene;
  createdAt: number;
  updatedAt: number;
}

export const ROLE_INFO: Record<LampRole, { name: string; color: string; shape: 'circle' | 'square' | 'triangle' | 'diamond' }> = {
  key: { name: '主光', color: '#ff5a52', shape: 'circle' },
  fill: { name: '辅光', color: '#4d9fff', shape: 'square' },
  rim: { name: '轮廓光', color: '#ffa63d', shape: 'triangle' },
  bg: { name: '背景光', color: '#b06cff', shape: 'diamond' },
};

export const ROLE_ORDER: LampRole[] = ['key', 'fill', 'rim', 'bg'];

export const MODIFIER_INFO: Record<ModifierType, { name: string; beamDeg: number }> = {
  softbox: { name: '柔光箱', beamDeg: 60 },
  umbrella: { name: '反光伞', beamDeg: 75 },
  beauty: { name: '雷达罩', beamDeg: 45 },
  bare: { name: '裸灯', beamDeg: 55 },
  flag: { name: '旗板', beamDeg: 25 },
};
