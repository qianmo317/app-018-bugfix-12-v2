// 布光编辑器：左元素库 | 中画布 | 右参数与光比面板
import { useParams, Link } from '../router';
import { usePlanEditor } from '../store/editor';
import { ElementLibrary } from '../components/ElementLibrary';
import { Canvas } from '../components/Canvas';
import { RatioPanel } from '../components/RatioPanel';
import { ParamsPanel } from '../components/ParamsPanel';
import { exportPlanPNG, exportSceneJSON } from '../export/png';

export function EditorPage() {
  const { id } = useParams('/plan/:id');
  const editor = usePlanEditor(id);

  if (editor.status === 'loading') {
    return <div className="page"><p>载入中…</p></div>;
  }
  if (editor.status === 'missing' || !editor.scene) {
    return (
      <div className="page">
        <p>方案不存在或已被删除。</p>
        <Link className="btn" to="/">返回方案列表</Link>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <header className="editor-head">
        <Link to="/" className="btn ghost">← 方案列表</Link>
        <input
          className="title-input"
          value={editor.scene.title}
          onChange={(e) => editor.patchScene({ title: e.target.value })}
          data-testid="title-input"
          aria-label="方案标题"
        />
        <div className="head-actions">
          <button onClick={() => exportSceneJSON(editor.scene!)} data-testid="export-json">导出 JSON</button>
          <button className="primary" onClick={() => exportPlanPNG(editor.scene!)} data-testid="export-png">导出 PNG</button>
          <Link className="btn" to={`/plan/${id}/print`} data-testid="print-link">打印 / PDF</Link>
        </div>
      </header>
      <div className="editor-body">
        <ElementLibrary editor={editor} />
        <Canvas editor={editor} />
        <aside className="right-panel">
          <RatioPanel editor={editor} />
          <ParamsPanel editor={editor} />
        </aside>
      </div>
    </div>
  );
}
