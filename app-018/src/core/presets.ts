// 经典布光模板（md §4.5：伦勃朗光、蝴蝶光、夹光、三灯白底、静物顶光等）
import type { Scene } from '../types';
import { newLamp, newProp, newScene } from './factory';

export interface Preset {
  id: string;
  name: string;
  desc: string;
  tags: string[];
  build: () => Scene;
}

/** 房间 6×5，模特 (3, 3.1) 朝向相机 (-90°)，相机 (3, 1.0)；灯位角度按「模特朝向/相机—模特轴」设计 */
function baseScene(title: string, subjectKind: 'human' | 'product' = 'human', lensMm = 85): Scene {
  const s = newScene(title);
  s.subject.kind = subjectKind;
  s.camera.lensMm = lensMm;
  return s;
}

export const PRESETS: Preset[] = [
  {
    id: 'tpl-rembrandt',
    name: '伦勃朗光',
    desc: '主光 45° 侧上方，暗侧脸颊出现倒三角光斑；辅光弱补，配轮廓光与背景光。经典人像布光。',
    tags: ['人像', '单主光', '经典'],
    build: () => {
      const s = baseScene('伦勃朗光');
      s.lamps = [
        newLamp(1.73, 1.83, { role: 'key', powerStep: '1/2', gnAtFull: 60, modifier: { type: 'softbox', w: 0.6, h: 0.9 }, heightMm: 1500 }),
        newLamp(4.6, 1.7, { role: 'fill', powerStep: '1/8', gnAtFull: 60, modifier: { type: 'softbox', w: 0.9, h: 0.9 }, heightMm: 1200 }),
        newLamp(4.3, 4.3, { role: 'rim', powerStep: '1/4', gnAtFull: 58, modifier: { type: 'bare', w: 0.2, h: 0.2 }, heightMm: 1600 }),
        newLamp(3.0, 4.35, { role: 'bg', powerStep: '1/8', gnAtFull: 60, modifier: { type: 'bare', w: 0.2, h: 0.2 }, heightMm: 1000 }),
      ];
      s.lamps[0].rot = 45;
      s.lamps[1].rot = 138.8;
      s.lamps[2].rot = -137.3;
      s.lamps[3].rot = 90;
      s.props = [newProp('background', 3, 4.62)];
      return s;
    },
  },
  {
    id: 'tpl-butterfly',
    name: '蝴蝶光',
    desc: '主光在相机轴正上方高位，鼻子下方产生蝴蝶形阴影；下巴下方放反光板补颈部阴影。',
    tags: ['人像', '美容片', '对称'],
    build: () => {
      const s = baseScene('蝴蝶光', 'human', 105);
      s.lamps = [
        newLamp(3.0, 1.95, { role: 'key', powerStep: '1/2', gnAtFull: 60, modifier: { type: 'beauty', w: 0.55, h: 0.55 }, heightMm: 1900 }),
        newLamp(3.6, 4.25, { role: 'rim', powerStep: '1/4', gnAtFull: 58, modifier: { type: 'bare', w: 0.2, h: 0.2 }, heightMm: 1800 }),
      ];
      s.lamps[0].rot = 90;
      s.lamps[1].rot = -117.6;
      const r = newProp('reflector', 3.0, 1.75);
      r.rot = 0; // 法线朝向 +y（模特）
      s.props = [r, newProp('background', 3, 4.62)];
      return s;
    },
  },
  {
    id: 'tpl-clamshell',
    name: '夹光（Clamshell）',
    desc: '上下两盏灯像贝壳一样夹住面部：上主光下补光，皮肤通透、几乎无影，美妆与电商人像常用。',
    tags: ['人像', '美妆', '无影'],
    build: () => {
      const s = baseScene('夹光', 'human', 105);
      s.lamps = [
        newLamp(2.95, 2.05, { role: 'key', powerStep: '1/2', gnAtFull: 60, modifier: { type: 'softbox', w: 0.9, h: 1.2 }, heightMm: 1700 }),
        newLamp(3.05, 2.15, { role: 'fill', powerStep: '1/8', gnAtFull: 60, modifier: { type: 'beauty', w: 0.55, h: 0.55 }, heightMm: 900 }),
        newLamp(3.8, 4.2, { role: 'rim', powerStep: '1/8', gnAtFull: 58, modifier: { type: 'bare', w: 0.2, h: 0.2 }, heightMm: 1700 }),
      ];
      s.lamps[0].rot = 90;
      s.lamps[1].rot = 90;
      s.lamps[2].rot = -120;
      s.props = [newProp('background', 3, 4.62)];
      return s;
    },
  },
  {
    id: 'tpl-whitebg-3light',
    name: '三灯白底（产品/电商）',
    desc: '两盏边缘灯夹住主体勾勒轮廓，背景两侧灯把白纸打穿过曝，得到干净的白底图。',
    tags: ['电商', '白底', '产品'],
    build: () => {
      const s = baseScene('三灯白底产品图', 'product', 100);
      s.iso = 100;
      s.lamps = [
        newLamp(1.73, 1.83, { role: 'key', powerStep: '1/2', gnAtFull: 60, modifier: { type: 'softbox', w: 0.6, h: 0.9 }, heightMm: 1400 }),
        newLamp(4.27, 1.83, { role: 'fill', powerStep: '1/2', gnAtFull: 60, modifier: { type: 'softbox', w: 0.6, h: 0.9 }, heightMm: 1400 }),
        newLamp(1.1, 4.1, { role: 'bg', powerStep: '1/4', gnAtFull: 60, modifier: { type: 'bare', w: 0.2, h: 0.2 }, heightMm: 1100 }),
        newLamp(4.9, 4.1, { role: 'bg', powerStep: '1/4', gnAtFull: 60, modifier: { type: 'bare', w: 0.2, h: 0.2 }, heightMm: 1100 }),
      ];
      s.lamps[0].rot = 45;
      s.lamps[1].rot = -45;
      s.lamps[2].rot = 35;
      s.lamps[3].rot = 145;
      s.props = [newProp('background', 3, 4.62)];
      s.props[0].w = 3.4;
      return s;
    },
  },
  {
    id: 'tpl-still-top',
    name: '静物顶光',
    desc: '大面积柔光箱从正前上方俯射，两侧白反光板收阴影细节，后方腰位灯勾亮轮廓。',
    tags: ['静物', '产品', '白底'],
    build: () => {
      const s = baseScene('静物顶光', 'product', 90);
      s.subject.y = 3.2;
      s.lamps = [
        newLamp(3.0, 2.6, { role: 'key', powerStep: '1/2', gnAtFull: 60, modifier: { type: 'softbox', w: 1.2, h: 0.9 }, heightMm: 1300 }),
        newLamp(3.0, 4.15, { role: 'rim', powerStep: '1/8', gnAtFull: 60, modifier: { type: 'softbox', w: 0.3, h: 1.2 }, heightMm: 900 }),
      ];
      s.lamps[0].rot = 90;
      s.lamps[1].rot = -90;
      const r1 = newProp('reflector', 1.9, 3.4);
      r1.rot = -90; // 法线 +x 朝向产品
      const r2 = newProp('reflector', 4.1, 3.4);
      r2.rot = 90; // 法线 -x 朝向产品
      s.props = [r1, r2, newProp('background', 3, 4.62)];
      return s;
    },
  },
  {
    id: 'tpl-loop',
    name: '环形光（Loop）',
    desc: '比伦勃朗更靠近相机轴（约 30–40°），鼻侧阴影小而柔和，是最常用的通用气质光。',
    tags: ['人像', '通用'],
    build: () => {
      const s = baseScene('环形光');
      s.lamps = [
        newLamp(1.9, 1.85, { role: 'key', powerStep: '1/2', gnAtFull: 60, modifier: { type: 'softbox', w: 0.9, h: 1.2 }, heightMm: 1500 }),
        newLamp(4.6, 1.7, { role: 'fill', powerStep: '1/8', gnAtFull: 60, modifier: { type: 'softbox', w: 1.0, h: 1.0 }, heightMm: 1200 }),
        newLamp(4.2, 4.3, { role: 'rim', powerStep: '1/4', gnAtFull: 58, modifier: { type: 'bare', w: 0.2, h: 0.2 }, heightMm: 1600 }),
        newLamp(3.0, 4.35, { role: 'bg', powerStep: '1/8', gnAtFull: 60, modifier: { type: 'bare', w: 0.2, h: 0.2 }, heightMm: 1000 }),
      ];
      s.lamps[0].rot = 48.6;
      s.lamps[1].rot = 138.8;
      s.lamps[2].rot = -135;
      s.lamps[3].rot = 90;
      s.props = [newProp('background', 3, 4.62)];
      return s;
    },
  },
  {
    id: 'tpl-split',
    name: '分割光（Split）',
    desc: '主光 90° 正侧方，脸一半亮一半暗，戏剧感强；暗侧用旗板压住环境反光。',
    tags: ['人像', '男士', '戏剧'],
    build: () => {
      const s = baseScene('分割光');
      s.lamps = [
        newLamp(1.5, 3.1, { role: 'key', powerStep: '1/2', gnAtFull: 60, modifier: { type: 'softbox', w: 0.6, h: 0.9 }, heightMm: 1500 }),
        newLamp(3.0, 4.35, { role: 'bg', powerStep: '1/16', gnAtFull: 60, modifier: { type: 'bare', w: 0.2, h: 0.2 }, heightMm: 1000 }),
      ];
      s.lamps[0].rot = 0;
      s.lamps[1].rot = 90;
      const f = newProp('flag', 4.5, 3.1);
      f.w = 1.0;
      f.h = 0.1;
      s.props = [f, newProp('background', 3, 4.62)];
      s.props[1].w = 2.4;
      return s;
    },
  },
  {
    id: 'tpl-live-flat',
    name: '主播平光（持续灯）',
    desc: '两盏持续灯左右 ±35° 等功率平铺，光比 1:1，画面干净不闪频，适合直播与口播。',
    tags: ['直播', '持续灯', '平光'],
    build: () => {
      const s = baseScene('主播平光', 'human', 50);
      s.lamps = [
        newLamp(1.9, 1.9, { role: 'key', kind: 'continuous', modifier: { type: 'softbox', w: 0.9, h: 0.9 }, heightMm: 1400 }),
        newLamp(4.1, 1.9, { role: 'fill', kind: 'continuous', modifier: { type: 'softbox', w: 0.9, h: 0.9 }, heightMm: 1400 }),
      ];
      s.lamps[0].rot = 45;
      s.lamps[1].rot = -45;
      s.lamps[0].lumens = 12000;
      s.lamps[1].lumens = 12000;
      s.props = [newProp('background', 3, 4.62)];
      return s;
    },
  },
];

/** 用模板生成一个新方案（新 id） */
export function presetScene(preset: Preset, title?: string): Scene {
  const s = preset.build();
  s.id = `plan_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  if (title) s.title = title;
  return s;
}
