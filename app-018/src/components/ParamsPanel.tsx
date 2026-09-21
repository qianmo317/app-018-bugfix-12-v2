// 右栏下部：选中元素参数面板（灯/模特/相机/道具）
import type { LampRole, ModifierType, PowerStep } from '../types';
import { POWER_STEPS } from '../core/photometry';
import { MODIFIER_INFO, ROLE_INFO, ROLE_ORDER } from '../types';
import type { PlanEditor } from '../store/editor';
import { useSettings } from '../store/settings';

export function ParamsPanel({ editor }: { editor: PlanEditor }) {
  const { scene, selected } = editor;
  const [settings] = useSettings();
  if (!scene) return null;

  if (!selected) {
    return (
      <section className="params-panel">
        <h3>参数</h3>
        <p className="empty-tip">点击画布中的灯 / 模特 / 相机 / 道具查看与编辑参数。方向键可微调位置。</p>
      </section>
    );
  }

  const num = (v: string, fallback: number) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : fallback);

  if (selected.type === 'lamp') {
    const lamp = scene.lamps.find((l) => l.id === selected.id);
    if (!lamp) return null;
    const isStrobe = lamp.kind === 'strobe';
    return (
      <section className="params-panel" data-testid="lamp-params">
        <h3>
          灯具参数
          <button className="danger" onClick={() => editor.removeElement(selected)}>删除</button>
        </h3>

        <label className="row">
          <span>类型</span>
          <select
            value={lamp.kind}
            onChange={(e) => {
              const kind = e.target.value as 'strobe' | 'continuous';
              editor.updateLamp(lamp.id, kind === 'strobe' ? { kind, gnAtFull: lamp.gnAtFull ?? settings.defaultGN, lumens: undefined, watts: undefined } : { kind, lumens: lamp.lumens ?? 10000 });
            }}
          >
            <option value="strobe">闪光灯</option>
            <option value="continuous">持续灯</option>
          </select>
        </label>

        <label className="row">
          <span>角色</span>
          <select value={lamp.role} onChange={(e) => editor.updateLamp(lamp.id, { role: e.target.value as LampRole })}>
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>{ROLE_INFO[r].name}</option>
            ))}
          </select>
        </label>

        {isStrobe ? (
          <>
            <label className="row">
              <span>功率档</span>
              <select value={lamp.powerStep} onChange={(e) => editor.updateLamp(lamp.id, { powerStep: e.target.value as PowerStep })} data-testid="power-step">
                {POWER_STEPS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="row">
              <span>全功率 GN (m, ISO100)</span>
              <input
                type="number"
                min={10}
                max={200}
                step={1}
                value={lamp.gnAtFull ?? settings.defaultGN}
                onChange={(e) => editor.updateLamp(lamp.id, { gnAtFull: num(e.target.value, settings.defaultGN) })}
                data-testid="gn-input"
              />
            </label>
            <div className="gn-pick">
              {settings.gnTable.map((g) => (
                <button key={g.name} onClick={() => editor.updateLamp(lamp.id, { gnAtFull: g.gn })} title={g.name}>
                  {g.name.split(' ').slice(-1)[0]} {g.gn}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <label className="row">
              <span>光通量 LM</span>
              <input
                type="number"
                min={0}
                step={100}
                value={lamp.lumens ?? ''}
                onChange={(e) => editor.updateLamp(lamp.id, { lumens: e.target.value === '' ? undefined : num(e.target.value, 0), watts: undefined })}
                data-testid="lumens-input"
              />
            </label>
            <label className="row">
              <span>功率 W</span>
              <input
                type="number"
                min={0}
                step={10}
                value={lamp.watts ?? ''}
                onChange={(e) => editor.updateLamp(lamp.id, { watts: e.target.value === '' ? undefined : num(e.target.value, 0), lumens: undefined })}
                data-testid="watts-input"
              />
            </label>
            <div className="note">LM 与 W 互斥：填一个会清空另一个。</div>
          </>
        )}

        <label className="row">
          <span>变光配件</span>
          <select
            value={lamp.modifier.type}
            onChange={(e) => {
              const type = e.target.value as ModifierType;
              const dims: Record<ModifierType, { w: number; h: number }> = {
                softbox: { w: 0.6, h: 0.9 },
                umbrella: { w: 1.0, h: 1.0 },
                beauty: { w: 0.55, h: 0.55 },
                bare: { w: 0.2, h: 0.2 },
                flag: { w: 0.4, h: 0.4 },
              };
              editor.updateLamp(lamp.id, { modifier: { type, ...dims[type] } });
            }}
          >
            {Object.entries(MODIFIER_INFO).map(([k, v]) => (
              <option key={k} value={k}>{v.name}</option>
            ))}
          </select>
        </label>
        <div className="row-pair">
          <label className="row">
            <span>配件宽 (m)</span>
            <input type="number" min={0.1} max={3} step={0.05} value={lamp.modifier.w}
              onChange={(e) => editor.updateLamp(lamp.id, { modifier: { ...lamp.modifier, w: num(e.target.value, lamp.modifier.w) } })} />
          </label>
          <label className="row">
            <span>配件高 (m)</span>
            <input type="number" min={0.1} max={3} step={0.05} value={lamp.modifier.h}
              onChange={(e) => editor.updateLamp(lamp.id, { modifier: { ...lamp.modifier, h: num(e.target.value, lamp.modifier.h) } })} />
          </label>
        </div>

        <label className="row">
          <span>灯头朝向 (°)</span>
          <input type="number" min={-180} max={180} step={5} value={Math.round(lamp.rot)}
            onChange={(e) => editor.rotateElement(selected, num(e.target.value, lamp.rot))} />
        </label>
        <label className="row">
          <span>灯心高度 (mm)</span>
          <input type="number" min={100} max={4000} step={50} value={lamp.heightMm}
            onChange={(e) => editor.updateLamp(lamp.id, { heightMm: num(e.target.value, lamp.heightMm) })} />
        </label>
        <label className="row">
          <span>色片</span>
          <input type="text" placeholder="如 CTO / 无" value={lamp.gel ?? ''}
            onChange={(e) => editor.updateLamp(lamp.id, { gel: e.target.value || undefined })} />
        </label>
        <div className="row-pair">
          <label className="row">
            <span>X (m)</span>
            <input type="number" min={0.1} max={scene.room.w} step={0.05} value={Math.round(lamp.x * 100) / 100}
              onChange={(e) => editor.moveElement(selected, num(e.target.value, lamp.x), lamp.y)} />
          </label>
          <label className="row">
            <span>Y (m)</span>
            <input type="number" min={0.1} max={scene.room.h} step={0.05} value={Math.round(lamp.y * 100) / 100}
              onChange={(e) => editor.moveElement(selected, lamp.x, num(e.target.value, lamp.y))} />
          </label>
        </div>
      </section>
    );
  }

  if (selected.type === 'subject') {
    const s = scene.subject;
    return (
      <section className="params-panel" data-testid="subject-params">
        <h3>主体</h3>
        <label className="row">
          <span>类型</span>
          <select value={s.kind} onChange={(e) => editor.patchScene({ subject: { ...s, kind: e.target.value as 'human' | 'product' } })}>
            <option value="human">模特</option>
            <option value="product">产品</option>
          </select>
        </label>
        <label className="row">
          <span>朝向 (°)</span>
          <input type="number" min={-180} max={180} step={5} value={Math.round(s.facing)}
            onChange={(e) => editor.patchScene({ subject: { ...s, facing: num(e.target.value, s.facing) } })} data-testid="facing-input" />
        </label>
        <div className="row-pair">
          <label className="row">
            <span>X (m)</span>
            <input type="number" step={0.05} value={Math.round(s.x * 100) / 100}
              onChange={(e) => editor.moveElement(selected, num(e.target.value, s.x), s.y)} />
          </label>
          <label className="row">
            <span>Y (m)</span>
            <input type="number" step={0.05} value={Math.round(s.y * 100) / 100}
              onChange={(e) => editor.moveElement(selected, s.x, num(e.target.value, s.y))} />
          </label>
        </div>
        <div className="note">朝向改变后，所有灯的「相对角度」随之更新（按模特朝向计算）。</div>
      </section>
    );
  }

  if (selected.type === 'camera') {
    const c = scene.camera;
    return (
      <section className="params-panel" data-testid="camera-params">
        <h3>相机</h3>
        <label className="row">
          <span>镜头焦距 (mm)</span>
          <input type="number" min={8} max={600} step={5} value={c.lensMm}
            onChange={(e) => editor.patchScene({ camera: { ...c, lensMm: num(e.target.value, c.lensMm) } })} />
        </label>
        <label className="row">
          <span>朝向 (°)</span>
          <input type="number" min={-180} max={180} step={5} value={Math.round(c.rot)}
            onChange={(e) => editor.rotateElement(selected, num(e.target.value, c.rot))} />
        </label>
        <div className="row-pair">
          <label className="row">
            <span>X (m)</span>
            <input type="number" step={0.05} value={Math.round(c.x * 100) / 100}
              onChange={(e) => editor.moveElement(selected, num(e.target.value, c.x), c.y)} />
          </label>
          <label className="row">
            <span>Y (m)</span>
            <input type="number" step={0.05} value={Math.round(c.y * 100) / 100}
              onChange={(e) => editor.moveElement(selected, c.x, num(e.target.value, c.y))} />
          </label>
        </div>
      </section>
    );
  }

  // prop
  const prop = scene.props.find((p) => p.id === selected.id);
  if (!prop) return null;
  return (
    <section className="params-panel" data-testid="prop-params">
      <h3>
        {prop.kind === 'reflector' ? '反光板' : prop.kind === 'background' ? '背景纸' : '旗板'}
        <button className="danger" onClick={() => editor.removeElement(selected)}>删除</button>
      </h3>
      <div className="row-pair">
        <label className="row">
          <span>宽 (m)</span>
          <input type="number" min={0.1} max={10} step={0.05} value={prop.w}
            onChange={(e) => editor.updateProp(prop.id, { w: num(e.target.value, prop.w) })} />
        </label>
        <label className="row">
          <span>厚 (m)</span>
          <input type="number" min={0.02} max={2} step={0.02} value={prop.h}
            onChange={(e) => editor.updateProp(prop.id, { h: num(e.target.value, prop.h) })} />
        </label>
      </div>
      <label className="row">
        <span>角度 (°)</span>
        <input type="number" min={-180} max={180} step={5} value={Math.round(prop.rot)}
          onChange={(e) => editor.rotateElement(selected, num(e.target.value, prop.rot))} />
      </label>
      <div className="row-pair">
        <label className="row">
          <span>X (m)</span>
          <input type="number" step={0.05} value={Math.round(prop.x * 100) / 100}
            onChange={(e) => editor.moveElement(selected, num(e.target.value, prop.x), prop.y)} />
        </label>
        <label className="row">
          <span>Y (m)</span>
          <input type="number" step={0.05} value={Math.round(prop.y * 100) / 100}
            onChange={(e) => editor.moveElement(selected, prop.x, num(e.target.value, prop.y))} />
        </label>
      </div>
      {prop.kind === 'reflector' && <div className="note">反光板法线垂直于板面；角度使其正对模特时补光效率最高（见光比面板估算）。</div>}
    </section>
  );
}
