// 设置：影棚尺寸、单位（m/ft）、闪光灯 GN 表、同步速度
import { useSettings, DEFAULT_SETTINGS, type GnEntry } from '../store/settings';
import { Link } from '../router';

export function SettingsPage() {
  const [settings, save] = useSettings();

  function updateGn(idx: number, patch: Partial<GnEntry>) {
    const gnTable = settings.gnTable.map((g, i) => (i === idx ? { ...g, ...patch } : g));
    save({ gnTable });
  }

  return (
    <div className="page narrow">
      <header className="page-head">
        <h1>设置</h1>
        <div className="head-actions">
          <Link className="btn" to="/">← 方案列表</Link>
        </div>
      </header>

      <section className="settings-card">
        <h3>单位</h3>
        <div className="seg">
          <button className={settings.unit === 'm' ? 'active' : ''} onClick={() => save({ unit: 'm' })} data-testid="unit-m">米 (m)</button>
          <button className={settings.unit === 'ft' ? 'active' : ''} onClick={() => save({ unit: 'ft' })} data-testid="unit-ft">英尺 (ft)</button>
        </div>
        <p className="note">影响距离显示单位；内部计算始终使用米。</p>
      </section>

      <section className="settings-card">
        <h3>默认影棚尺寸（新建方案用）</h3>
        <div className="row-pair">
          <label className="row">
            <span>宽 (m)</span>
            <input type="number" min={2} max={30} step={0.5} value={settings.defaultRoom.w}
              onChange={(e) => save({ defaultRoom: { ...settings.defaultRoom, w: Number(e.target.value) || settings.defaultRoom.w } })} />
          </label>
          <label className="row">
            <span>长 (m)</span>
            <input type="number" min={2} max={30} step={0.5} value={settings.defaultRoom.h}
              onChange={(e) => save({ defaultRoom: { ...settings.defaultRoom, h: Number(e.target.value) || settings.defaultRoom.h } })} />
          </label>
        </div>
      </section>

      <section className="settings-card">
        <h3>闪光同步速度</h3>
        <label className="row">
          <span>1/x 秒</span>
          <input type="number" min={60} max={500} step={10} value={settings.syncDenom}
            onChange={(e) => save({ syncDenom: Number(e.target.value) || settings.syncDenom })} />
        </label>
        <p className="note">快门快于该速度时，光比面板会提示可能出现的快门帘黑边。</p>
      </section>

      <section className="settings-card">
        <h3>闪光灯 GN 表（ISO100, m）</h3>
        {settings.gnTable.map((g, i) => (
          <div className="row-pair" key={i}>
            <label className="row">
              <span>型号</span>
              <input type="text" value={g.name} onChange={(e) => updateGn(i, { name: e.target.value })} />
            </label>
            <label className="row">
              <span>GN</span>
              <input type="number" min={10} max={200} value={g.gn} onChange={(e) => updateGn(i, { gn: Number(e.target.value) || g.gn })} />
            </label>
          </div>
        ))}
        <div className="head-actions">
          <button onClick={() => save({ gnTable: [...settings.gnTable, { name: '新灯具', gn: 60 }] })}>添加灯具</button>
          <button className="danger" onClick={() => save({ gnTable: DEFAULT_SETTINGS.gnTable })}>恢复默认</button>
        </div>
      </section>
    </div>
  );
}
