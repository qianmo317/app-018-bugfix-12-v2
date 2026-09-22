// 场景 SVG 渲染：编辑器画布、方案缩略图、打印视图共用（米为单位的 viewBox）
import type { CSSProperties, PointerEvent as RPointerEvent, Ref } from 'react';
import type { Lamp, Scene } from '../types';
import type { Selection } from '../store/editor';
import { ROLE_INFO } from '../types';
import { azimuthDeg } from '../core/geometry';
import { lampCoverage } from '../core/coverage';

export interface SceneSvgProps {
  scene: Scene;
  selected?: Selection | null;
  interactive?: boolean;
  showLabels?: boolean;
  /** 显示覆盖范围的灯 id 列表；'all' 显示全部 */
  coverageFor?: string[] | 'all' | null;
  /** 拖动时显示灯→模特参考虚线 */
  guideLampId?: string | null;
  onElementPointerDown?: (sel: Selection, e: RPointerEvent<SVGElement>) => void;
  onRotatePointerDown?: (sel: Selection, e: RPointerEvent<SVGElement>) => void;
  onBackgroundPointerDown?: (e: RPointerEvent<SVGElement>) => void;
  svgRef?: Ref<SVGSVGElement>;
  className?: string;
  style?: CSSProperties;
}

const RAD = Math.PI / 180;

function shapeFor(role: keyof typeof ROLE_INFO): { kind: 'circle' | 'rect' | 'path'; d?: string } {
  switch (ROLE_INFO[role].shape) {
    case 'circle':
      return { kind: 'circle' };
    case 'square':
      return { kind: 'rect' };
    case 'triangle':
      return { kind: 'path', d: 'M0,-0.19 L0.19,0.13 L-0.19,0.13 Z' };
    case 'diamond':
      return { kind: 'path', d: 'M0,-0.2 L0.2,0 L0,0.2 L-0.2,0 Z' };
  }
}

function BeamArrow({ rot, color }: { rot: number; color: string }) {
  const tipX = 0.52 * Math.cos(rot * RAD);
  const tipY = 0.52 * Math.sin(rot * RAD);
  const bx = 0.34 * Math.cos(rot * RAD);
  const by = 0.34 * Math.sin(rot * RAD);
  const wing1 = (rot + 90) * RAD;
  const wing2 = (rot - 90) * RAD;
  const w = 0.07;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={bx} y1={by} x2={tipX} y2={tipY} stroke={color} strokeWidth={0.03} />
      <path
        d={`M${tipX},${tipY} L${tipX - w * Math.cos(wing1) + 0.05 * Math.cos(rot * RAD)},${tipY - w * Math.sin(wing1) + 0.05 * Math.sin(rot * RAD)} L${tipX - w * Math.cos(wing2) + 0.05 * Math.cos(rot * RAD)},${tipY - w * Math.sin(wing2) + 0.05 * Math.sin(rot * RAD)} Z`}
        fill={color}
      />
    </g>
  );
}

function LampNode({
  lamp,
  interactive,
  selected,
  showLabel,
  showCoverage,
  guide,
  scene,
  onElementPointerDown,
  onRotatePointerDown,
}: {
  lamp: Lamp;
  interactive: boolean;
  selected: boolean;
  showLabel: boolean;
  showCoverage: boolean;
  guide: boolean;
  scene: Scene;
  onElementPointerDown?: SceneSvgProps['onElementPointerDown'];
  onRotatePointerDown?: SceneSvgProps['onRotatePointerDown'];
}) {
  const info = ROLE_INFO[lamp.role];
  const sel: Selection = { type: 'lamp', id: lamp.id };
  const shape = shapeFor(lamp.role);
  const label =
    lamp.kind === 'strobe'
      ? `${info.name} ${lamp.powerStep}`
      : `${info.name} ${lamp.lumens != null ? `${lamp.lumens}lm` : `${lamp.watts ?? 0}W`}`;

  // 覆盖范围示意（沿灯头朝向投影到模特距离处）
  let coverage = null;
  if (showCoverage) {
    const d = Math.hypot(scene.subject.x - lamp.x, scene.subject.y - lamp.y);
    const cov = lampCoverage(lamp, d);
    const cx = lamp.x + d * Math.cos(lamp.rot * RAD);
    const cy = lamp.y + d * Math.sin(lamp.rot * RAD);
    coverage = (
      <g transform={`translate(${cx} ${cy}) rotate(${lamp.rot})`} data-coverage={lamp.id} style={{ pointerEvents: 'none' }}>
        <ellipse rx={cov.spot.w / 2} ry={cov.spot.h / 2} fill={info.color} fillOpacity={0.07} stroke={info.color} strokeOpacity={0.5} strokeWidth={0.015} strokeDasharray="0.12 0.08" />
        <ellipse rx={cov.uniform.w / 2} ry={cov.uniform.h / 2} fill={info.color} fillOpacity={0.1} stroke="none" />
      </g>
    );
  }

  return (
    <g>
      {coverage}
      {guide && (
        <line
          x1={lamp.x}
          y1={lamp.y}
          x2={scene.subject.x}
          y2={scene.subject.y}
          stroke="#ffffff"
          strokeOpacity={0.45}
          strokeWidth={0.015}
          strokeDasharray="0.1 0.08"
          data-guide="1"
          style={{ pointerEvents: 'none' }}
        />
      )}
      <g
        transform={`translate(${lamp.x} ${lamp.y})`}
        data-el="lamp"
        data-id={lamp.id}
        data-role={lamp.role}
        style={{ cursor: interactive ? 'grab' : 'default' }}
        onPointerDown={interactive ? (e) => onElementPointerDown?.(sel, e) : undefined}
      >
        {/* 透明热区：让包围盒中心附近也能点中（文本标签会撑大包围盒） */}
        {interactive && <circle r={0.3} fill="transparent" pointerEvents="all" />}
        {/* 变光配件示意 */}
        {lamp.modifier.type !== 'bare' && (
          <rect
            x={0.22}
            y={-lamp.modifier.w / 2}
            width={Math.max(0.06, lamp.modifier.h * 0.12)}
            height={lamp.modifier.w}
            rx={0.05}
            transform={`rotate(${lamp.rot})`}
            fill="none"
            stroke={info.color}
            strokeOpacity={0.75}
            strokeWidth={0.025}
            style={{ pointerEvents: 'none' }}
          />
        )}
        <BeamArrow rot={lamp.rot} color={info.color} />
        {shape.kind === 'circle' && <circle r={0.17} fill={info.color} stroke="#12151b" strokeWidth={0.02} />}
        {shape.kind === 'rect' && <rect x={-0.15} y={-0.15} width={0.3} height={0.3} fill={info.color} stroke="#12151b" strokeWidth={0.02} />}
        {shape.kind === 'path' && <path d={shape.d} fill={info.color} stroke="#12151b" strokeWidth={0.02} />}
        {selected && <circle r={0.3} fill="none" stroke="#ffffff" strokeWidth={0.025} strokeDasharray="0.09 0.07" data-ring="1" />}
        {interactive && selected && (
          <g data-handle="rotate" style={{ cursor: 'crosshair' }} onPointerDown={(e) => onRotatePointerDown?.(sel, e)}>
            <line x1={0} y1={-0.28} x2={0} y2={-0.52} stroke="#ffffff" strokeWidth={0.02} />
            <circle cx={0} cy={-0.56} r={0.07} fill="#ffffff" stroke="#12151b" strokeWidth={0.015} />
          </g>
        )}
        {showLabel && (
          <text x={0} y={0.46} textAnchor="middle" fontSize={0.16} fill="#dfe4ec" style={{ userSelect: 'none' }}>
            {label}
          </text>
        )}
      </g>
    </g>
  );
}

export function SceneSvg(props: SceneSvgProps) {
  const { scene, selected, interactive = false, showLabels = true, coverageFor = null, guideLampId = null } = props;
  const { room } = scene;
  const gridLines: number[] = [];
  for (let v = 0.5; v < room.w - 0.01; v += 0.5) gridLines.push(v);
  const gridLinesH: number[] = [];
  for (let v = 0.5; v < room.h - 0.01; v += 0.5) gridLinesH.push(v);

  const down = props.onElementPointerDown;
  const rotateDown = props.onRotatePointerDown;
  const isSel = (kind: Selection['type'], id?: string) => {
    if (!selected || selected.type !== kind) return false;
    return kind === 'lamp' || kind === 'prop' ? (selected as { id: string }).id === id : true;
  };

  return (
    <svg
      ref={props.svgRef}
      className={props.className}
      style={props.style}
      viewBox={`0 0 ${room.w} ${room.h}`}
      preserveAspectRatio="xMidYMid meet"
      data-testid="scene-svg"
      onPointerDown={interactive ? (e) => { if (e.target === e.currentTarget || (e.target as SVGElement).dataset.bg) props.onBackgroundPointerDown?.(e); } : undefined}
    >
      <rect x={0} y={0} width={room.w} height={room.h} fill="#151820" data-bg="1" />
      {gridLines.map((v) => (
        <line key={`v${v}`} x1={v} y1={0} x2={v} y2={room.h} stroke="#252a35" strokeWidth={0.008} />
      ))}
      {gridLinesH.map((v) => (
        <line key={`h${v}`} x1={0} y1={v} x2={room.w} y2={v} stroke="#252a35" strokeWidth={0.008} />
      ))}
      <rect x={0.01} y={0.01} width={room.w - 0.02} height={room.h - 0.02} fill="none" stroke="#4a5468" strokeWidth={0.025} />

      {/* 道具 */}
      {scene.props.map((p) => {
        const selP: Selection = { type: 'prop', id: p.id };
        const color = p.kind === 'reflector' ? '#cfd8e3' : p.kind === 'background' ? '#8a93a5' : '#e05656';
        return (
          <g
            key={p.id}
            transform={`translate(${p.x} ${p.y})`}
            data-el="prop"
            data-id={p.id}
            data-kind={p.kind}
            style={{ cursor: interactive ? 'grab' : 'default' }}
            onPointerDown={interactive ? (e) => down?.(selP, e) : undefined}
          >
            {/* 透明热区：反光板/背景纸本体 fill=none，补一层可点击区域 */}
            {interactive && <rect x={-p.w / 2} y={-p.h / 2} width={p.w} height={p.h} fill="transparent" pointerEvents="all" />}
            <rect
              x={-p.w / 2}
              y={-p.h / 2}
              width={p.w}
              height={p.h}
              rx={0.04}
              fill={p.kind === 'flag' ? color : 'none'}
              stroke={color}
              strokeWidth={0.03}
              opacity={0.9}
            />
            {isSel('prop', p.id) && <rect x={-p.w / 2 - 0.06} y={-p.h / 2 - 0.06} width={p.w + 0.12} height={p.h + 0.12} fill="none" stroke="#fff" strokeWidth={0.02} strokeDasharray="0.09 0.07" />}
            {interactive && isSel('prop', p.id) && (
              <g data-handle="rotate" style={{ cursor: 'crosshair' }} onPointerDown={(e) => rotateDown?.(selP, e)}>
                <line x1={0} y1={-0.2} x2={0} y2={-0.42} stroke="#fff" strokeWidth={0.02} />
                <circle cx={0} cy={-0.46} r={0.06} fill="#fff" stroke="#12151b" strokeWidth={0.015} />
              </g>
            )}
            {showLabels && (
              <text x={0} y={p.h / 2 + 0.22} textAnchor="middle" fontSize={0.14} fill="#9aa3b2" style={{ userSelect: 'none' }}>
                {p.kind === 'reflector' ? '反光板' : p.kind === 'background' ? '背景纸' : '旗板'}
              </text>
            )}
          </g>
        );
      })}

      {/* 模特/产品 */}
      <g
        transform={`translate(${scene.subject.x} ${scene.subject.y})`}
        data-el="subject"
        style={{ cursor: interactive ? 'grab' : 'default' }}
        onPointerDown={interactive ? (e) => down?.({ type: 'subject' }, e) : undefined}
      >
        {interactive && <circle r={0.34} fill="transparent" pointerEvents="all" />}
        <g transform={`rotate(${scene.subject.facing})`}>
          {scene.subject.kind === 'human' ? (
            <>
              <ellipse cx={0} cy={0.05} rx={0.26} ry={0.13} fill="#7bd88f" opacity={0.85} />
              <circle cx={0} cy={-0.02} r={0.115} fill="#7bd88f" stroke="#12151b" strokeWidth={0.015} />
            </>
          ) : (
            <rect x={-0.24} y={-0.24} width={0.48} height={0.48} rx={0.06} fill="#7bd88f" stroke="#12151b" strokeWidth={0.02} />
          )}
          <line x1={0.18} y1={0} x2={0.42} y2={0} stroke="#7bd88f" strokeWidth={0.03} />
          <path d="M0.42,0 L0.32,-0.07 L0.32,0.07 Z" fill="#7bd88f" />
          {isSel('subject') && <circle r={0.34} fill="none" stroke="#fff" strokeWidth={0.025} strokeDasharray="0.09 0.07" />}
          {interactive && isSel('subject') && (
            <g data-handle="rotate" style={{ cursor: 'crosshair' }} onPointerDown={(e) => rotateDown?.({ type: 'subject' }, e)}>
              <line x1={0} y1={-0.3} x2={0} y2={-0.52} stroke="#fff" strokeWidth={0.02} />
              <circle cx={0} cy={-0.56} r={0.07} fill="#fff" stroke="#12151b" strokeWidth={0.015} />
            </g>
          )}
        </g>
        {showLabels && (
          <text x={0} y={0.55} textAnchor="middle" fontSize={0.16} fill="#a9e3b4" style={{ userSelect: 'none' }}>
            {scene.subject.kind === 'human' ? '模特' : '产品'}
          </text>
        )}
      </g>

      {/* 相机 */}
      <g
        transform={`translate(${scene.camera.x} ${scene.camera.y}) rotate(${scene.camera.rot})`}
        data-el="camera"
        style={{ cursor: interactive ? 'grab' : 'default' }}
        onPointerDown={interactive ? (e) => down?.({ type: 'camera' }, e) : undefined}
      >
        {interactive && <circle r={0.3} fill="transparent" pointerEvents="all" />}
        <rect x={-0.17} y={-0.11} width={0.34} height={0.22} rx={0.04} fill="#e8eaef" stroke="#12151b" strokeWidth={0.015} />
        <rect x={0.17} y={-0.06} width={0.14} height={0.12} rx={0.02} fill="#b9bfca" stroke="#12151b" strokeWidth={0.015} />
        {isSel('camera') && <rect x={-0.24} y={-0.18} width={0.62} height={0.36} fill="none" stroke="#fff" strokeWidth={0.02} strokeDasharray="0.09 0.07" />}
        {interactive && isSel('camera') && (
          <g data-handle="rotate" style={{ cursor: 'crosshair' }} onPointerDown={(e) => rotateDown?.({ type: 'camera' }, e)}>
            <line x1={0} y1={-0.16} x2={0} y2={-0.38} stroke="#fff" strokeWidth={0.02} />
            <circle cx={0} cy={-0.42} r={0.06} fill="#fff" stroke="#12151b" strokeWidth={0.015} />
          </g>
        )}
        {showLabels && (
          <text x={0} y={0.36} textAnchor="middle" fontSize={0.15} fill="#dfe4ec" style={{ userSelect: 'none' }} transform={`rotate(${-scene.camera.rot})`}>
            相机 {scene.camera.lensMm}mm
          </text>
        )}
      </g>

      {/* 灯（最后渲染，置于最上层） */}
      {scene.lamps.map((lamp) => (
        <LampNode
          key={lamp.id}
          lamp={lamp}
          scene={scene}
          interactive={interactive}
          selected={isSel('lamp', lamp.id)}
          showLabel={showLabels}
          showCoverage={coverageFor === 'all' || (!!coverageFor && coverageFor.includes(lamp.id))}
          guide={guideLampId === lamp.id}
          onElementPointerDown={down}
          onRotatePointerDown={rotateDown}
        />
      ))}
    </svg>
  );
}

/** 计算某灯拖动时的浮标信息（距模特 / 相对角度 / 光比） */
export function dragHintText(scene: Scene, lamp: Lamp, ratioText: string): string {
  const d = Math.hypot(scene.subject.x - lamp.x, scene.subject.y - lamp.y);
  const az = azimuthDeg(scene.subject, lamp);
  const rel = Math.round(((az - scene.subject.facing + 540) % 360) - 180);
  return `距模特 ${d.toFixed(2)}m · 相对角度 ${rel}° · 光比 ${ratioText}`;
}
