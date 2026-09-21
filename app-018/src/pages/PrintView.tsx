// 打印视图：平面图 + 参数表同一页（CSS 分页控制，不跨页不裁切），浏览器「另存为 PDF」即得 PDF
import { useEffect } from 'react';
import { useParams, Link } from '../router';
import { usePlanEditor } from '../store/editor';
import { SceneSvg } from '../components/SceneSvg';
import { tableRows } from '../export/png';
import { computeRatio } from '../core/ratio';
import { ROLE_INFO, MODIFIER_INFO } from '../types';

export function PrintPage() {
  const { id } = useParams('/plan/:id/print');
  const editor = usePlanEditor(id);
  const scene = editor.scene;

  useEffect(() => {
    document.title = `${scene?.title ?? '布光方案'} · 打印`;
  }, [scene?.title]);

  if (editor.status === 'loading') return <div className="page"><p>载入中…</p></div>;
  if (!scene) return <div className="page"><p>方案不存在。<Link to="/">返回</Link></p></div>;

  const ratio = computeRatio(scene);
  const rows = tableRows(scene);

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <Link to={`/plan/${id}`} className="btn">← 返回编辑器</Link>
        <button className="primary" onClick={() => window.print()} data-testid="do-print">打印 / 另存为 PDF</button>
        <span className="note">平面图与参数表在同一页，不会被分页裁切。</span>
      </div>

      <div className="sheet" data-testid="print-sheet">
        <h1 className="print-title">{scene.title}</h1>
        <p className="print-meta">
          影棚布光图 · 房间 {scene.room.w}×{scene.room.h}m · ISO {scene.iso} · 快门 1/{scene.shutterDenom}s ·
          光比 {ratio.ratioText}{ratio.ev != null ? `（${ratio.ev.toFixed(2)} EV）` : ''}
          {ratio.fStopNearest != null ? ` · 推荐光圈 f/${ratio.fStopNearest}` : ''} ·
          {new Date().toLocaleDateString('zh-CN')}
        </p>

        <div className="print-plan">
          <SceneSvg scene={scene} showLabels />
        </div>

        <table className="print-table" data-testid="print-table">
          <thead>
            <tr>
              <th>#</th><th>灯位</th><th>类型</th><th>功率</th><th>GN</th><th>距模特(m)</th>
              <th>相对角度</th><th>相机轴角</th><th>灯高(m)</th><th>配件</th><th>光斑(m)</th><th>色片</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.cells.map((c, j) => (
                  <td key={j} style={j === 1 ? { color: ROLE_INFO[r.role]?.color, fontWeight: 600 } : undefined}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="print-footnote">
          覆盖范围为示意估算（光斑 ≈ 配件尺寸 + 2×d×tan(发散角/2)）；反光板补光量为估算值。
          {scene.props.some((p) => p.kind === 'reflector') &&
            ` 本方案含 ${scene.props.filter((p) => p.kind === 'reflector').length} 块反光板；`}此表由布光图编排工具生成，助理照此搭建。
        </p>
        <p className="print-footnote">
          {MODIFIER_INFO.softbox.name}发散角 {MODIFIER_INFO.softbox.beamDeg}°（示例）；选中灯在编辑器中可查看每个灯的覆盖范围。
        </p>
      </div>
    </div>
  );
}
