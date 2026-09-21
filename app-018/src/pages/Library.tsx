// 经典布光模板库
import { PRESETS, presetScene } from '../core/presets';
import { Link, navigate } from '../router';
import { putPlan } from '../store/db';
import { SceneSvg } from '../components/SceneSvg';
import type { Scene } from '../types';

export function LibraryPage() {
  async function useTemplate(presetId: string) {
    const p = PRESETS.find((x) => x.id === presetId)!;
    const scene: Scene = presetScene(p, p.name);
    await putPlan({ id: scene.id, title: scene.title, scene, createdAt: Date.now(), updatedAt: Date.now() });
    navigate(`/plan/${scene.id}`);
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>经典布光模板</h1>
        <p>一键载入并显示全部参数，可在此基础上微调</p>
        <div className="head-actions">
          <Link className="btn" to="/">← 方案列表</Link>
        </div>
      </header>
      <div className="tpl-grid" data-testid="tpl-grid">
        {PRESETS.map((p) => (
          <div className="tpl-card" key={p.id}>
            <div className="thumb">
              <SceneSvg scene={p.build()} showLabels={false} />
            </div>
            <div className="tpl-body">
              <h3>{p.name}</h3>
              <p className="tpl-desc">{p.desc}</p>
              <div className="tpl-tags">
                {p.tags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
              <button className="primary" onClick={() => useTemplate(p.id)} data-testid={`use-${p.id}`}>用此模板新建</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
