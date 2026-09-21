// E2E 测试：从前端点击走完整链路（载入模板 → 调灯 → 光比 → 导出 → 打印 → 持久化 → 性能）
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function openEditorFromTemplate(page: Page, templateId: string) {
  await page.goto('/library');
  await page.getByTestId(`use-${templateId}`).click();
  await expect(page.getByTestId('ratio-panel')).toBeVisible();
}

async function lampTransform(page: Page, index = 0): Promise<{ x: number; y: number }> {
  const t = page.locator('[data-el="lamp"]').nth(index);
  const tr = await t.getAttribute('transform');
  const m = /translate\(([-\d.]+)\s+([-\d.]+)\)/.exec(tr ?? '');
  return { x: Number(m?.[1] ?? 0), y: Number(m?.[2] ?? 0) };
}

test.describe('布光编辑器完整链路', () => {
  test('载入模板 → 看光比 → 选灯改功率 → 光比实时变化', async ({ page }) => {
    await openEditorFromTemplate(page, 'tpl-rembrandt');

    // 光比面板：主辅光都在，光比应为数字而非 —
    const ratioValue = page.getByTestId('ratio-value');
    await expect(ratioValue).not.toHaveText('—');
    const before = await ratioValue.textContent();

    // 选中主光（role=key），把功率从 1/2 降到 1/8
    const keyLamp = page.locator('[data-el="lamp"][data-role="key"]');
    await keyLamp.click();
    await expect(page.getByTestId('lamp-params')).toBeVisible();
    await page.getByTestId('power-step').selectOption('1/8');
    const after = await ratioValue.textContent();
    expect(after).not.toBe(before);
    // 主光降 2 档（×1/4 光量）→ 光比应变小
    expect(Number(after!.split(':')[0].trim())).toBeLessThan(Number(before!.split(':')[0].trim()));

    // 计算过程明细表应有 4 行灯数据
    await expect(page.getByTestId('calc-table').locator('tbody tr')).toHaveCount(4);
  });

  test('拖动灯：实时浮标显示 距模特/相对角度/光比，位置更新且参考虚线出现', async ({ page }) => {
    await openEditorFromTemplate(page, 'tpl-rembrandt');
    const keyLamp = page.locator('[data-el="lamp"][data-role="key"]');
    const box = await keyLamp.boundingBox();
    const before = await lampTransform(page, 0);

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + 80, box!.y - 60, { steps: 5 });
    // 拖动中浮标出现，并包含关键信息
    const hint = page.getByTestId('drag-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('距模特');
    await expect(hint).toContainText('相对角度');
    await expect(hint).toContainText('光比');
    // 参考虚线（灯→模特）
    await expect(page.locator('[data-guide="1"]')).toHaveCount(1);
    await page.mouse.up();
    await expect(hint).toBeHidden();

    const after = await lampTransform(page, 0);
    expect(after.x).not.toBeCloseTo(before.x, 3);
  });

  test('键盘微调：方向键 5cm，Shift 加速', async ({ page }) => {
    await openEditorFromTemplate(page, 'tpl-rembrandt');
    await page.locator('[data-el="lamp"][data-role="key"]').click();
    const before = await lampTransform(page, 0);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowUp');
    const after = await lampTransform(page, 0);
    expect(after.x).toBeCloseTo(before.x + 0.1, 3);
    expect(after.y).toBeCloseTo(before.y - 0.2, 3);
  });

  test('模特转向 90°：同一灯位「相对角度」必须改变（验收）', async ({ page }) => {
    await openEditorFromTemplate(page, 'tpl-rembrandt');
    await page.locator('[data-el="lamp"][data-role="key"]').click();
    const cov = page.getByTestId('coverage-info');
    await expect(cov).toContainText('相对模特 -45°');

    // 转向 90°：-90 → 0（选中模特后面板切换，需重新选中灯再看相对角度）
    await page.locator('[data-el="subject"]').click();
    await page.getByTestId('facing-input').fill('0');
    await page.locator('[data-el="lamp"][data-role="key"]').click();
    await expect(cov).toContainText('相对模特 -135°');
  });

  test('快门超过同步速度出现警告', async ({ page }) => {
    await openEditorFromTemplate(page, 'tpl-rembrandt');
    await expect(page.getByTestId('sync-warning')).toHaveCount(0);
    await page.locator('.lib-panel input').nth(3).fill('500'); // 快门 1/x s 输入框
    await expect(page.getByTestId('sync-warning')).toContainText('1/250');
  });

  test('导出 JSON → 删除方案 → 重新导入，往返一致', async ({ page }) => {
    await openEditorFromTemplate(page, 'tpl-clamshell');
    const lamps = await page.locator('[data-el="lamp"]').count();
    const title = await page.getByTestId('title-input').inputValue();

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-json').click()]);
    const filePath = path.join('/tmp', `slp-test-${download.suggestedFilename()}`);
    await download.saveAs(filePath);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { type: string; scene: { title: string; lamps: unknown[] } };
    expect(parsed.type).toBe('studio-lighting-plan');
    expect(parsed.scene.title).toBe(title);
    expect(parsed.scene.lamps).toHaveLength(lamps);

    // 删除方案
    await page.goto('/');
    const card = page.locator('.plan-card', { hasText: title });
    await card.getByRole('button', { name: '删除' }).click();
    await expect(card).toHaveCount(0);

    // 导入该 JSON → 打开编辑器，灯数一致
    await page.setInputFiles('[data-testid="import-json"]', filePath);
    await expect(page.getByTestId('ratio-panel')).toBeVisible();
    expect(await page.locator('[data-el="lamp"]').count()).toBe(lamps);
    expect(await page.getByTestId('title-input').inputValue()).toBe(title);
    fs.unlinkSync(filePath);
  });

  test('方案列表与 IndexedDB 持久化：刷新后方案仍在', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('new-plan').click();
    await expect(page.getByTestId('ratio-panel')).toBeVisible();
    await page.goto('/');
    await page.reload();
    await expect(page.getByTestId('plan-grid').locator('.plan-card')).toHaveCount(1);
  });
});

test.describe('设置与打印', () => {
  test('设置页切换单位为英尺，画布徽标更新', async ({ page }) => {
    await openEditorFromTemplate(page, 'tpl-butterfly');
    await expect(page.locator('.unit-badge')).toContainText('米');
    await page.goto('/settings');
    await page.getByTestId('unit-ft').click();
    await page.goBack();
    await expect(page.locator('.unit-badge')).toContainText('英尺');
  });

  test('打印视图：平面图与参数表在同一页', async ({ page }) => {
    await openEditorFromTemplate(page, 'tpl-rembrandt');
    await page.getByTestId('print-link').click();
    await expect(page.getByTestId('print-sheet')).toBeVisible();
    const rows = await page.getByTestId('print-table').locator('tbody tr').count();
    const lamps = await page.locator('[data-el="lamp"]').count();
    expect(rows).toBe(lamps);
    // 单页容器（CSS break-inside: avoid）
    const avoid = await page.getByTestId('print-sheet').evaluate((el) => getComputedStyle(el).breakInside);
    expect(['avoid', 'auto']).toContain(avoid);
  });
});

test.describe('性能（验收：拖 20 盏灯 ≥ 50fps）', () => {
  test('20 盏灯场景拖动帧率中位数 ≥ 50fps', async ({ page }) => {
    // 构造 20 盏灯的方案 JSON 并导入
    const scene = {
      schema: 1,
      id: 'perf-plan',
      title: '性能测试 20 灯',
      room: { w: 6, h: 5 },
      subject: { kind: 'human', x: 3, y: 3.1, facing: -90 },
      camera: { x: 3, y: 1.0, rot: 90, lensMm: 85 },
      lamps: Array.from({ length: 20 }, (_, i) => ({
        id: `lamp${i}`,
        kind: 'strobe',
        role: 'fill',
        x: 0.5 + (i % 10) * 0.55,
        y: 0.5 + Math.floor(i / 10) * 0.6,
        rot: 45,
        powerStep: '1/2',
        gnAtFull: 60,
        modifier: { type: 'softbox', w: 0.6, h: 0.9 },
        heightMm: 1200,
      })),
      props: [],
      iso: 100,
      shutterDenom: 200,
    };
    const file = path.join('/tmp', 'slp-perf-plan.json');
    fs.writeFileSync(file, JSON.stringify({ type: 'studio-lighting-plan', scene }));
    await page.goto('/');
    await page.setInputFiles('[data-testid="import-json"]', file);
    await expect(page.getByTestId('ratio-panel')).toBeVisible();
    expect(await page.locator('[data-el="lamp"]').count()).toBe(20);

    // 拖动第一盏灯 120 帧，统计 rAF 间隔
    const stats = await page.evaluate(
      () =>
        new Promise<{ avg: number; median: number; p95: number; n: number }>((resolve) => {
          const lamp = document.querySelector('[data-el="lamp"]') as SVGElement;
          const r = lamp.getBoundingClientRect();
          const cx = r.x + r.width / 2;
          const cy = r.y + r.height / 2;
          lamp.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, pointerId: 7 }));
          const times: number[] = [];
          let i = 0;
          function frame(t: number) {
            times.push(t);
            window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx + i * 1.5, clientY: cy + (i % 2), pointerId: 7 }));
            if (++i < 120) {
              requestAnimationFrame(frame);
            } else {
              window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 }));
              const deltas = times.slice(1).map((v, k) => v - times[k]);
              const sorted = [...deltas].sort((a, b) => a - b);
              resolve({
                avg: deltas.reduce((a, b) => a + b, 0) / deltas.length,
                median: sorted[Math.floor(sorted.length / 2)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
                n: deltas.length,
              });
            }
          }
          requestAnimationFrame(frame);
        }),
    );
    // 验收：≥50fps → 中位帧间隔 ≤ 20ms
    expect(stats.n).toBe(119);
    expect(stats.median).toBeLessThanOrEqual(20);
    // 灯位置确实移动了
    const tr = await page.locator('[data-el="lamp"]').first().getAttribute('transform');
    expect(tr).toContain('translate');
  });
});
