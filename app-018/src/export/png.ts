// PNG 导出：按固定 DPI（150px/米）绘制平面图 + 参数表，放大后文字清晰（md §8/§10）
import type { Lamp, Scene } from '../types';
import { ROLE_INFO, MODIFIER_INFO } from '../types';
import { computeRatio } from '../core/ratio';
import { relativeAngleToSubject, angleFromCameraAxis } from '../core/geometry';
import { lampCoverage } from '../core/coverage';

export interface DrawOptions {
  pxPerM?: number;
  title?: string;
  dateText?: string;
}

export function drawPlanToCanvas(scene: Scene, opts: DrawOptions = {}): HTMLCanvasElement {
  const px = opts.pxPerM ?? 150; // 固定 DPI：150px/m ≈ 150dpi
  const W = scene.room.w;
  const H = scene.room.h;
  const pad = 40;
  const headerH = 120;
  const ratio = computeRatio(scene);
  const rows = tableRows(scene);
  const rowH = 44;
  const tableH = 70 + rows.length * rowH + 60;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(W * px) + pad * 2;
  canvas.height = Math.ceil(headerH + H * px + pad + tableH);
  const ctx = canvas.getContext('2d')!;
  const fs = px / 150; // 基准字号缩放

  // 背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 标题与元信息
  ctx.fillStyle = '#111418';
  ctx.font = `bold ${30 * fs}px system-ui, sans-serif`;
  ctx.fillText(opts.title ?? scene.title, pad, 44 * fs);
  ctx.font = `${16 * fs}px system-ui, sans-serif`;
  ctx.fillStyle = '#4a5568';
  const meta = `影棚布光图 · 房间 ${scene.room.w}×${scene.room.h}m · ISO ${scene.iso} · 快门 1/${scene.shutterDenom}s · 光比 ${ratio.ratioText}${ratio.ev != null ? `（${ratio.ev.toFixed(2)} EV）` : ''} · ${opts.dateText ?? new Date().toLocaleString('zh-CN')}`;
  ctx.fillText(meta, pad, 76 * fs);
  if (ratio.fStopNearest != null) {
    ctx.fillText(`推荐光圈 f/${ratio.fStopNearest}`, pad, 102 * fs);
  }

  // 平面图区域
  const ox = pad;
  const oy = headerH;
  ctx.fillStyle = '#f3f5f8';
  ctx.fillRect(ox, oy, W * px, H * px);
  ctx.strokeStyle = '#d3d9e3';
  ctx.lineWidth = 1;
  for (let v = 0.5; v < W; v += 0.5) {
    ctx.beginPath();
    ctx.moveTo(ox + v * px, oy);
    ctx.lineTo(ox + v * px, oy + H * px);
    ctx.stroke();
  }
  for (let v = 0.5; v < H; v += 0.5) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + v * px);
    ctx.lineTo(ox + W * px, oy + v * px);
    ctx.stroke();
  }
  ctx.strokeStyle = '#7a8699';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, W * px, H * px);

  const X = (m: number) => ox + m * px;
  const Y = (m: number) => oy + m * px;

  // 道具
  for (const p of scene.props) {
    ctx.save();
    ctx.translate(X(p.x), Y(p.y));
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.strokeStyle = p.kind === 'reflector' ? '#5c6b80' : p.kind === 'background' ? '#333a46' : '#b3312f';
    ctx.lineWidth = p.kind === 'background' ? 6 : 4;
    ctx.beginPath();
    ctx.rect((-p.w / 2) * px, (-p.h / 2) * px, p.w * px, p.h * px);
    if (p.kind === 'reflector') {
      ctx.fillStyle = '#dfe6ee';
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#4a5568';
    ctx.font = `${13 * fs}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(p.kind === 'reflector' ? '反光板' : p.kind === 'background' ? '背景纸' : '旗板', X(p.x), Y(p.y) + (p.h / 2) * px + 18 * fs);
    ctx.textAlign = 'left';
  }

  // 主体
  ctx.save();
  ctx.translate(X(scene.subject.x), Y(scene.subject.y));
  ctx.rotate((scene.subject.facing * Math.PI) / 180);
  ctx.fillStyle = '#2f9e5b';
  if (scene.subject.kind === 'human') {
    ctx.beginPath();
    ctx.ellipse(0, 0.05 * px, 0.26 * px, 0.13 * px, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -0.02 * px, 0.115 * px, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect((-0.24) * px, (-0.24) * px, 0.48 * px, 0.48 * px);
  }
  ctx.strokeStyle = '#2f9e5b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0.18 * px, 0);
  ctx.lineTo(0.42 * px, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.5 * px, 0);
  ctx.lineTo(0.36 * px, -0.08 * px);
  ctx.lineTo(0.36 * px, 0.08 * px);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#2f9e5b';
  ctx.font = `bold ${13 * fs}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(scene.subject.kind === 'human' ? '模特' : '产品', X(scene.subject.x), Y(scene.subject.y) + 0.55 * px);
  ctx.textAlign = 'left';

  // 相机
  ctx.save();
  ctx.translate(X(scene.camera.x), Y(scene.camera.y));
  ctx.rotate((scene.camera.rot * Math.PI) / 180);
  ctx.fillStyle = '#1f242e';
  ctx.fillRect((-0.17) * px, (-0.11) * px, 0.34 * px, 0.22 * px);
  ctx.fillStyle = '#5c6b80';
  ctx.fillRect(0.17 * px, (-0.06) * px, 0.14 * px, 0.12 * px);
  ctx.restore();
  ctx.fillStyle = '#1f242e';
  ctx.textAlign = 'center';
  ctx.fillText(`相机 ${scene.camera.lensMm}mm`, X(scene.camera.x), Y(scene.camera.y) + 0.36 * px);
  ctx.textAlign = 'left';

  // 灯
  for (const lamp of scene.lamps) {
    const info = ROLE_INFO[lamp.role];
    const lx = X(lamp.x);
    const ly = Y(lamp.y);

    // 覆盖范围
    const d = Math.hypot(scene.subject.x - lamp.x, scene.subject.y - lamp.y);
    const cov = lampCoverage(lamp, d);
    const cx = X(lamp.x + d * Math.cos((lamp.rot * Math.PI) / 180));
    const cy = Y(lamp.y + d * Math.sin((lamp.rot * Math.PI) / 180));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((lamp.rot * Math.PI) / 180);
    ctx.strokeStyle = info.color;
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect((-cov.spot.w / 2) * px, (-cov.spot.h / 2) * px, cov.spot.w * px, cov.spot.h * px);
    ctx.setLineDash([]);
    ctx.restore();

    // 指向线
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx + 0.34 * px * Math.cos(lamp.rot * Math.PI / 180), ly + 0.34 * px * Math.sin(lamp.rot * Math.PI / 180));
    ctx.lineTo(lx + 0.52 * px * Math.cos(lamp.rot * Math.PI / 180), ly + 0.52 * px * Math.sin(lamp.rot * Math.PI / 180));
    ctx.stroke();

    // 灯体
    ctx.fillStyle = info.color;
    ctx.strokeStyle = '#10131a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const shape = ROLE_INFO[lamp.role].shape;
    if (shape === 'circle') {
      ctx.arc(lx, ly, 0.17 * px, 0, Math.PI * 2);
    } else if (shape === 'square') {
      ctx.rect(lx - 0.15 * px, ly - 0.15 * px, 0.3 * px, 0.3 * px);
    } else if (shape === 'triangle') {
      ctx.moveTo(lx, ly - 0.19 * px);
      ctx.lineTo(lx + 0.19 * px, ly + 0.13 * px);
      ctx.lineTo(lx - 0.19 * px, ly + 0.13 * px);
      ctx.closePath();
    } else {
      ctx.moveTo(lx, ly - 0.2 * px);
      ctx.lineTo(lx + 0.2 * px, ly);
      ctx.lineTo(lx, ly + 0.2 * px);
      ctx.lineTo(lx - 0.2 * px, ly);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    // 标签
    const label =
      lamp.kind === 'strobe'
        ? `${info.name} ${lamp.powerStep}`
        : `${info.name} ${lamp.lumens != null ? `${lamp.lumens}lm` : `${lamp.watts ?? 0}W`}`;
    ctx.fillStyle = '#1f242e';
    ctx.font = `bold ${14 * fs}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, lx, ly + 0.46 * px);
    ctx.textAlign = 'left';
  }

  // 图例
  let lgx = ox;
  const lgy = oy + H * px + 26 * fs;
  for (const role of ['key', 'fill', 'rim', 'bg'] as const) {
    ctx.fillStyle = ROLE_INFO[role].color;
    ctx.beginPath();
    ctx.arc(lgx + 7 * fs, lgy - 5 * fs, 7 * fs, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333a46';
    ctx.font = `${14 * fs}px system-ui, sans-serif`;
    ctx.fillText(ROLE_INFO[role].name, lgx + 20 * fs, lgy);
    lgx += 100 * fs;
  }

  // 参数表
  let ty = lgy + 30 * fs;
  ctx.fillStyle = '#111418';
  ctx.font = `bold ${20 * fs}px system-ui, sans-serif`;
  ctx.fillText('布光参数表', ox, ty);
  ty += 16 * fs;

  const cols = ['#', '灯位', '类型', '功率', 'GN', '距模特(m)', '相对角度', '相机轴角', '灯高(m)', '配件', '光斑(m)', '色片'];
  const colW = [40, 90, 90, 80, 70, 110, 100, 100, 100, 130, 140, 80].map((w) => w * fs);
  const totalW = colW.reduce((a, b) => a + b, 0);
  const tableScale = Math.min(1, (canvas.width - pad * 2) / totalW);
  ctx.font = `bold ${14 * fs}px system-ui, sans-serif`;
  ctx.fillStyle = '#eef1f6';
  ctx.fillRect(ox, ty, totalW * tableScale, 34 * fs);
  ctx.fillStyle = '#111418';
  let cx2 = ox;
  cols.forEach((c, i) => {
    ctx.fillText(c, cx2 + 6, ty + 22 * fs);
    cx2 += colW[i] * tableScale;
  });
  ty += 34 * fs;
  ctx.font = `${14 * fs}px system-ui, sans-serif`;
  rows.forEach((row, ri) => {
    if (ri % 2 === 1) {
      ctx.fillStyle = '#f6f8fb';
      ctx.fillRect(ox, ty, totalW * tableScale, rowH * 0.8);
    }
    ctx.fillStyle = ROLE_INFO[row.role]?.color ?? '#111418';
    ctx.fillRect(ox, ty + 4, 4, rowH * 0.8 - 8);
    ctx.fillStyle = '#1f242e';
    let cx3 = ox;
    cols.forEach((_, i) => {
      ctx.fillText(String(row.cells[i] ?? ''), cx3 + 12, ty + 22 * fs);
      cx3 += colW[i] * tableScale;
    });
    ty += rowH * 0.8;
  });

  return canvas;
}

export interface TableRow {
  role: Lamp['role'];
  cells: (string | number)[];
}

export function tableRows(scene: Scene): TableRow[] {
  const rows: TableRow[] = [];
  scene.lamps.forEach((lamp, i) => {
    const d = Math.hypot(scene.subject.x - lamp.x, scene.subject.y - lamp.y);
    const cov = lampCoverage(lamp, d);
    const info = ROLE_INFO[lamp.role];
    rows.push({
      role: lamp.role,
      cells: [
        i + 1,
        info.name,
        lamp.kind === 'strobe' ? '闪光灯' : '持续灯',
        lamp.kind === 'strobe' ? lamp.powerStep : lamp.lumens != null ? `${lamp.lumens}lm` : `${lamp.watts ?? 0}W`,
        lamp.kind === 'strobe' ? (lamp.gnAtFull ?? '—') : '—',
        d.toFixed(2),
        `${relativeAngleToSubject(scene, lamp).toFixed(0)}°`,
        `${angleFromCameraAxis(scene, lamp).toFixed(0)}°`,
        (lamp.heightMm / 1000).toFixed(2),
        `${MODIFIER_INFO[lamp.modifier.type].name} ${lamp.modifier.w.toFixed(2)}×${lamp.modifier.h.toFixed(2)}`,
        `${cov.spot.w.toFixed(2)}×${cov.spot.h.toFixed(2)}`,
        lamp.gel ?? '—',
      ],
    });
  });
  if (rows.length === 0) {
    rows.push({ role: 'key', cells: ['—', '无灯具', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—'] });
  }
  return rows;
}

export async function exportPlanPNG(scene: Scene): Promise<void> {
  const canvas = drawPlanToCanvas(scene);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  downloadBlob(blob, `${scene.title || '布光方案'}.png`);
}

export function exportSceneJSON(scene: Scene): void {
  const payload = JSON.stringify({ type: 'studio-lighting-plan', scene }, null, 2);
  downloadBlob(new Blob([payload], { type: 'application/json' }), `${scene.title || '布光方案'}.json`);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
