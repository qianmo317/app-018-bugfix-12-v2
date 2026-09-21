// 右栏上部：光比与曝光面板（大字号，现场手机可读），含计算过程明细
import { useMemo } from 'react';
import type { PlanEditor } from '../store/editor';
import { computeRatio } from '../core/ratio';
import { lampCoverage } from '../core/coverage';
import { reflectorLiftStops } from '../core/reflector';
import { relativeAngleToSubject, angleFromCameraAxis } from '../core/geometry';
import { ROLE_INFO, MODIFIER_INFO } from '../types';

export function RatioPanel({ editor }: { editor: PlanEditor }) {
  const { scene, selected } = editor;
  const ratio = useMemo(() => (scene ? computeRatio(scene) : null), [scene]);
  if (!scene || !ratio) return null;

  const selLamp = selected?.type === 'lamp' ? scene.lamps.find((l) => l.id === selected.id) : undefined;
  const selCov = selLamp ? lampCoverage(selLamp, Math.hypot(scene.subject.x - selLamp.x, scene.subject.y - selLamp.y)) : null;

  const reflectorLifts = scene.props
    .filter((p) => p.kind === 'reflector')
    .map((p) => ({ p, lift: reflectorLiftStops(scene, p, ratio) }))
    .filter((x): x is { p: typeof scene.props[number]; lift: number } => x.lift != null);

  return (
    <section className="ratio-panel" data-testid="ratio-panel">
      <div className="ratio-big">
        <div className="ratio-label">光比（主光 : 辅光）</div>
        <div className="ratio-value" data-testid="ratio-value">{ratio.ratioText}</div>
        <div className="ratio-ev" data-testid="ratio-ev">{ratio.ev != null ? `差 ${ratio.ev.toFixed(2)} EV` : '需要一盏主光与一盏辅光（闪光灯）'}</div>
      </div>

      <div className="ratio-cards">
        <div className="card">
          <div className="card-label">推荐光圈（按主光 GN）</div>
          <div className="card-value" data-testid="fstop-value">
            {ratio.fStopNearest != null ? `f/${ratio.fStopNearest}` : '—'}
            {ratio.fStop != null && <span className="card-sub">（精确 {ratio.fStop.toFixed(1)}）</span>}
          </div>
        </div>
        <div className="card">
          <div className="card-label">曝光参数</div>
          <div className="card-value">ISO {scene.iso} · 1/{scene.shutterDenom}s</div>
        </div>
      </div>

      {ratio.syncWarning && <div className="warn" data-testid="sync-warning">⚠ {ratio.syncWarning}</div>}
      {ratio.shutterNote && <div className="note">{ratio.shutterNote}</div>}
      {ratio.continuous.length > 0 && (
        <div className="note">持续灯不参与闪光光比计算（闪光曝光以闪光灯为准）。</div>
      )}

      <table className="calc-table" data-testid="calc-table">
        <thead>
          <tr>
            <th>灯</th><th>档位</th><th>距模特</th><th>1/d²</th><th>相对照度</th>
          </tr>
        </thead>
        <tbody>
          {ratio.strobes.map((c) => {
            const info = ROLE_INFO[c.lamp.role];
            return (
              <tr key={c.lamp.id} className={ratio.key?.lamp.id === c.lamp.id ? 'key-row' : ratio.fill?.lamp.id === c.lamp.id ? 'fill-row' : ''}>
                <td><span className="dot" style={{ background: info.color }} />{info.name}</td>
                <td>{c.lamp.powerStep}</td>
                <td>{c.distanceM.toFixed(2)} m</td>
                <td>{(1 / (c.distanceM * c.distanceM)).toFixed(3)}</td>
                <td>{c.relE.toFixed(4)}</td>
              </tr>
            );
          })}
          {ratio.strobes.length === 0 && (
            <tr><td colSpan={5} className="empty">暂无闪光灯（持续灯 {ratio.continuous.length} 盏）</td></tr>
          )}
        </tbody>
      </table>

      {reflectorLifts.length > 0 && (
        <div className="note" data-testid="reflector-lift">
          {reflectorLifts.map(({ p, lift }) => (
            <div key={p.id}>反光板估算：可为暗部补约 {lift.toFixed(2)} 档（示意估算，按白/银面）</div>
          ))}
        </div>
      )}

      {selLamp && selCov && (
        <div className="cov-info" data-testid="coverage-info">
          <b>{ROLE_INFO[selLamp.role].name}覆盖范围（示意估算）</b>
          <div>{MODIFIER_INFO[selLamp.modifier.type].name} {selLamp.modifier.w.toFixed(2)}×{selLamp.modifier.h.toFixed(2)}m · 发散角 {selCov.beamDeg}°</div>
          <div>光斑 ≈ {selCov.spot.w.toFixed(2)}×{selCov.spot.h.toFixed(2)} m，均匀区 ≈ {selCov.uniform.w.toFixed(2)}×{selCov.uniform.h.toFixed(2)} m</div>
          <div>相对模特 {fmtAngle(relativeAngleToSubject(scene, selLamp))}° · 相对相机轴 {fmtAngle(angleFromCameraAxis(scene, selLamp))}° · 灯高 {(selLamp.heightMm / 1000).toFixed(2)} m</div>
        </div>
      )}
    </section>
  );
}

function fmtAngle(a: number): string {
  return a > 0 ? `${a.toFixed(0)}` : `${a.toFixed(0)}`;
}
