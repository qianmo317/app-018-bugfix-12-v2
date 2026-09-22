// 左栏：元素库 + 场景设置
import { useState } from 'react';
import type { LampRole } from '../types';
import type { PlanEditor } from '../store/editor';
import { useSettings } from '../store/settings';
import { PRESETS } from '../core/presets';

const ROLES: { role: LampRole; name: string; color: string }[] = [
  { role: 'key', name: '主光', color: '#ff5a52' },
  { role: 'fill', name: '辅光', color: '#4d9fff' },
  { role: 'rim', name: '轮廓光', color: '#ffa63d' },
  { role: 'bg', name: '背景光', color: '#b06cff' },
];

export function ElementLibrary({ editor }: { editor: PlanEditor }) {
  const { scene, addLamp, addProp, patchScene } = editor;
  const [settings] = useSettings();
  const [lampKind, setLampKind] = useState<'strobe' | 'continuous'>('strobe');
  if (!scene) return null;

  return (
    <aside className="lib-panel">
      <section>
        <h3>添加灯</h3>
        <div className="seg">
          <button className={lampKind === 'strobe' ? 'active' : ''} onClick={() => setLampKind('strobe')}>闪光灯</button>
          <button className={lampKind === 'continuous' ? 'active' : ''} onClick={() => setLampKind('continuous')}>持续灯</button>
        </div>
        <div className="role-grid">
          {ROLES.map((r) => (
            <button key={r.role} className="role-btn" onClick={() => addLamp(r.role, lampKind, settings.defaultGN)} data-testid={`add-lamp-${r.role}`}>
              <span className="dot" style={{ background: r.color }} />
              {r.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>添加道具</h3>
        <div className="role-grid">
          <button className="role-btn" onClick={() => addProp('reflector')}>反光板</button>
          <button className="role-btn" onClick={() => addProp('flag')}>旗板</button>
          <button className="role-btn" onClick={() => addProp('background')}>背景纸</button>
        </div>
      </section>

      <section>
        <h3>场景</h3>
        <label className="row">
          <span>房间宽 (m)</span>
          <input
            type="number"
            min={2}
            max={30}
            step={0.5}
            value={scene.room.w}
            data-testid="room-w"
            onChange={(e) => patchScene({ room: { ...scene.room, w: Number(e.target.value) || scene.room.w } })}
          />
        </label>
        <label className="row">
          <span>房间高 (m)</span>
          <input
            type="number"
            min={2}
            max={30}
            step={0.5}
            value={scene.room.h}
            data-testid="room-h"
            onChange={(e) => patchScene({ room: { ...scene.room, h: Number(e.target.value) || scene.room.h } })}
          />
        </label>
        <label className="row">
          <span>ISO</span>
          <input
            type="number"
            min={50}
            max={6400}
            step={50}
            value={scene.iso}
            onChange={(e) => patchScene({ iso: Number(e.target.value) || scene.iso })}
          />
        </label>
        <label className="row">
          <span>快门 1/x s</span>
          <input
            type="number"
            min={10}
            max={8000}
            step={10}
            value={scene.shutterDenom}
            onChange={(e) => patchScene({ shutterDenom: Number(e.target.value) || scene.shutterDenom })}
          />
        </label>
        <label className="row">
          <span>主体</span>
          <select value={scene.subject.kind} onChange={(e) => patchScene({ subject: { ...scene.subject, kind: e.target.value as 'human' | 'product' } })}>
            <option value="human">模特</option>
            <option value="product">产品</option>
          </select>
        </label>
      </section>

      <section>
        <h3>快速载入模板</h3>
        <select
          value=""
          onChange={(e) => {
            const p = PRESETS.find((x) => x.id === e.target.value);
            if (p) editor.loadScene(p.build());
          }}
          data-testid="quick-template"
        >
          <option value="">选择经典布光…</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </section>
    </aside>
  );
}
