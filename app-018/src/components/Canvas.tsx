// 画布交互层：拖动、旋转、键盘微调（方向键 5cm，Shift 加速）、rAF 节流、拖动实时浮标
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlanEditor, Selection } from '../store/editor';
import type { Lamp } from '../types';
import { SceneSvg, dragHintText } from './SceneSvg';
import { computeRatio } from '../core/ratio';
import { useSettings } from '../store/settings';

const RAD = Math.PI / 180;

export function Canvas({ editor }: { editor: PlanEditor }) {
  const { scene, selected, setSelected } = editor;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{
    sel: Selection;
    mode: 'move' | 'rotate';
    startClient: { x: number; y: number };
    startRot: number;
    startCenter: { x: number; y: number };
    pending: { x: number; y: number } | null;
    raf: number;
  } | null>(null);
  const [hint, setHint] = useState<{ text: string; x: number; y: number } | null>(null);
  const [coverageMode, setCoverageMode] = useState<'selected' | 'all' | 'off'>('selected');
  const [settings] = useSettings();

  const ratio = useMemo(() => (scene ? computeRatio(scene) : null), [scene]);

  /** 客户端坐标 → 画布米坐标 */
  function clientToM(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const scale = Math.min(rect.width / vb.width, rect.height / vb.height);
    const offX = (rect.width - vb.width * scale) / 2;
    const offY = (rect.height - vb.height * scale) / 2;
    return { x: (e.clientX - rect.left - offX) / scale, y: (e.clientY - rect.top - offY) / scale };
  }

  function onElementDown(sel: Selection, e: React.PointerEvent<SVGElement>) {
    e.stopPropagation();
    try {
      (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* 合成事件等场景下无真实指针，忽略 */
    }
    setSelected(sel);
    const lamp = sel.type === 'lamp' ? scene!.lamps.find((l) => l.id === sel.id) : undefined;
    if (lamp) {
      setHint({ text: dragHintText(scene!, lamp, ratio?.ratioText ?? '—'), x: e.clientX, y: e.clientY });
    }
    drag.current = {
      sel,
      mode: 'move',
      startClient: { x: e.clientX, y: e.clientY },
      startRot: 0,
      startCenter: { x: 0, y: 0 },
      pending: null,
      raf: 0,
    };
  }

  function onRotateDown(sel: Selection, e: React.PointerEvent<SVGElement>) {
    e.stopPropagation();
    try {
      (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* 合成事件等场景下无真实指针，忽略 */
    }
    setSelected(sel);
    const c =
      sel.type === 'lamp' ? scene!.lamps.find((l) => l.id === sel.id)
      : sel.type === 'prop' ? scene!.props.find((p) => p.id === sel.id)
      : sel.type === 'subject' ? scene!.subject
      : scene!.camera;
    const curRot =
      sel.type === 'lamp' ? (scene!.lamps.find((l) => l.id === sel.id)?.rot ?? 0)
      : sel.type === 'prop' ? (scene!.props.find((p) => p.id === sel.id)?.rot ?? 0)
      : sel.type === 'subject' ? scene!.subject.facing
      : scene!.camera.rot;
    drag.current = { sel, mode: 'rotate', startClient: { x: e.clientX, y: e.clientY }, startRot: curRot, startCenter: { x: c!.x, y: c!.y }, pending: null, raf: 0 };
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      if (d.mode === 'rotate') {
        const m = clientToM(e);
        const ang = Math.atan2(m.y - d.startCenter.y, m.x - d.startCenter.x) / RAD;
        editor.rotateElement(d.sel, Math.round(ang * 10) / 10);
        return;
      }
      // 拖动用 rAF 节流：一帧只提交一次位置更新
      d.pending = clientToM(e);
      if (d.raf) return;
      d.raf = requestAnimationFrame(() => {
        const dd = drag.current;
        if (!dd || !dd.pending) return;
        editor.moveElement(dd.sel, dd.pending.x, dd.pending.y);
        dd.pending = null;
        dd.raf = 0;
      });
      setHint((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h));
    }
    function onUp() {
      const d = drag.current;
      if (d && d.raf) cancelAnimationFrame(d.raf);
      drag.current = null;
      setHint(null);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // moveElement / rotateElement 为稳定的 useCallback 引用
  }, [editor.moveElement, editor.rotateElement]);

  // 键盘微调：方向键 5cm，Shift 加速 ×4；[ ] 旋转 5°；Delete 删除
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!selected) return;
      const step = e.shiftKey ? 0.2 : 0.05;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      if (moves[e.key]) {
        e.preventDefault();
        editor.nudgeElement(selected, moves[e.key][0], moves[e.key][1]);
      } else if (e.key === '[') {
        rotateBy(selected, -5);
      } else if (e.key === ']') {
        rotateBy(selected, 5);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selected.type === 'lamp' || selected.type === 'prop') {
          e.preventDefault();
          editor.removeElement(selected);
        }
      }
    }
    function rotateBy(sel: Selection, dRot: number) {
      const s = editor.scene;
      if (!s) return;
      const cur =
        sel.type === 'lamp' ? s.lamps.find((l) => l.id === sel.id)?.rot
        : sel.type === 'prop' ? s.props.find((p) => p.id === sel.id)?.rot
        : sel.type === 'subject' ? s.subject.facing
        : s.camera.rot;
      if (cur != null) editor.rotateElement(sel, Math.round(cur + dRot));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, selected]);

  // 拖动灯时实时更新浮标文字（仅在文本变化时更新，避免重复渲染）
  useEffect(() => {
    if (!drag.current || !scene || !selected || selected.type !== 'lamp' || !hint) return;
    const lamp: Lamp | undefined = scene.lamps.find((l) => l.id === selected.id);
    if (!lamp) return;
    const text = dragHintText(scene, lamp, ratio?.ratioText ?? '—');
    if (text !== hint.text) setHint((h) => (h ? { ...h, text } : h));
  });

  if (!scene) return null;
  const guideLampId = hint && selected?.type === 'lamp' ? selected.id : null;
  const coverageFor = coverageMode === 'all' ? 'all' : coverageMode === 'selected' ? (selected?.type === 'lamp' ? [selected.id] : []) : null;

  return (
    <div className="canvas-wrap">
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <button className={coverageMode === 'selected' ? 'active' : ''} onClick={() => setCoverageMode('selected')} title="显示选中灯的覆盖范围">覆盖范围</button>
          <button className={coverageMode === 'all' ? 'active' : ''} onClick={() => setCoverageMode('all')} title="显示所有灯的覆盖范围">全部覆盖</button>
          <button className={coverageMode === 'off' ? 'active' : ''} onClick={() => setCoverageMode('off')} title="隐藏覆盖范围">隐藏</button>
        </div>
        <div className="toolbar-hint">拖动摆灯 · 方向键微调 5cm（Shift ×4）· [ ] 旋转 5° · Delete 删除</div>
      </div>
      <div className="canvas-holder">
        <SceneSvg
          scene={scene}
          selected={selected}
          interactive
          svgRef={svgRef}
          coverageFor={coverageFor}
          guideLampId={guideLampId}
          onElementPointerDown={onElementDown}
          onRotatePointerDown={onRotateDown}
          onBackgroundPointerDown={() => setSelected(null)}
        />
        <div className="unit-badge">单位：{settings.unit === 'm' ? '米' : '英尺'} · 房间 {scene.room.w}×{scene.room.h}m</div>
      </div>
      {hint && (
        <div className="drag-hint" style={{ left: hint.x + 14, top: hint.y + 14 }} data-testid="drag-hint">
          {hint.text}
        </div>
      )}
    </div>
  );
}
