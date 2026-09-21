// 方案列表页：缩略图 + 载入模板 + 新建/导入
import { useEffect, useState } from 'react';
import type { PlanRecord, Scene } from '../types';
import { Link, navigate } from '../router';
import { listPlans, putPlan, deletePlan } from '../store/db';
import { newScene, validateScene } from '../core/factory';
import { PRESETS, presetScene } from '../core/presets';
import { SceneSvg } from '../components/SceneSvg';
import { exportSceneJSON } from '../export/png';

export function PlanList() {
  const [plans, setPlans] = useState<PlanRecord[] | null>(null);

  async function refresh() {
    setPlans(await listPlans());
  }
  useEffect(() => {
    refresh();
  }, []);

  async function createNew() {
    const scene = newScene(`布光方案 ${new Date().toLocaleDateString('zh-CN')}`);
    await putPlan({ id: scene.id, title: scene.title, scene, createdAt: Date.now(), updatedAt: Date.now() });
    navigate(`/plan/${scene.id}`);
  }

  async function createFromPreset(presetId: string) {
    const p = PRESETS.find((x) => x.id === presetId)!;
    const scene = presetScene(p, p.name);
    await putPlan({ id: scene.id, title: scene.title, scene, createdAt: Date.now(), updatedAt: Date.now() });
    navigate(`/plan/${scene.id}`);
  }

  async function remove(id: string) {
    await deletePlan(id);
    refresh();
  }

  async function duplicate(rec: PlanRecord) {
    const scene: Scene = { ...structuredClone(rec.scene), id: `plan_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, title: `${rec.title} 副本` };
    await putPlan({ id: scene.id, title: scene.title, scene, createdAt: Date.now(), updatedAt: Date.now() });
    refresh();
  }

  async function importJSON(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { type?: string; scene?: unknown };
      const raw = parsed.type === 'studio-lighting-plan' ? parsed.scene : parsed;
      const scene = validateScene(raw);
      if (!scene) {
        alert('无法识别的方案文件（缺少 schema 或字段不完整）');
        return;
      }
      scene.id = `plan_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
      await putPlan({ id: scene.id, title: scene.title, scene, createdAt: Date.now(), updatedAt: Date.now() });
      navigate(`/plan/${scene.id}`);
    } catch {
      alert('JSON 解析失败，请检查文件');
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>影棚布光图编排</h1>
        <p>摆灯、算光比、出图给助理照着搭</p>
        <div className="head-actions">
          <button className="primary" onClick={createNew} data-testid="new-plan">新建方案</button>
          <Link className="btn" to="/library">经典布光模板</Link>
          <Link className="btn" to="/settings">设置</Link>
          <label className="btn file-btn">
            导入 JSON
            <input type="file" accept=".json,application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); }} data-testid="import-json" />
          </label>
        </div>
      </header>

      {plans && plans.length === 0 && (
        <div className="empty-state">
          <p>还没有方案。新建一个，或从经典布光模板开始。</p>
        </div>
      )}

      <div className="plan-grid" data-testid="plan-grid">
        {plans?.map((rec) => (
          <div className="plan-card" key={rec.id}>
            <Link to={`/plan/${rec.id}`} className="thumb-link" title="打开编辑器">
              <div className="thumb">
                <SceneSvg scene={rec.scene} showLabels={false} />
              </div>
            </Link>
            <div className="plan-card-body">
              <Link to={`/plan/${rec.id}`} className="plan-title">{rec.title}</Link>
              <div className="plan-meta">
                {rec.scene.lamps.length} 盏灯 · {rec.scene.room.w}×{rec.scene.room.h}m · {new Date(rec.updatedAt).toLocaleString('zh-CN')}
              </div>
              <div className="plan-actions">
                <button onClick={() => duplicate(rec)}>复制</button>
                <button onClick={() => exportSceneJSON(rec.scene)}>导出 JSON</button>
                <button onClick={() => navigate(`/plan/${rec.id}/print`)}>打印</button>
                <button className="danger" onClick={() => remove(rec.id)}>删除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="quick-templates">
        <h2>快速从模板新建</h2>
        <div className="tpl-row">
          {PRESETS.slice(0, 5).map((p) => (
            <button key={p.id} onClick={() => createFromPreset(p.id)}>{p.name}</button>
          ))}
        </div>
      </section>
    </div>
  );
}
