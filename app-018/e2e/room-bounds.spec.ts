// E2E：房间边界与元素位置（x/y 各自卡边界、改房间尺寸后元素归位、拖动/微调两轴均生效）
import { test, expect, type Page } from '@playwright/test';

async function transform(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const tr = await page.locator(selector).first().getAttribute('transform');
  const m = /translate\(([-\d.]+)\s+([-\d.]+)\)/.exec(tr ?? '');
  return { x: Number(m?.[1] ?? 0), y: Number(m?.[2] ?? 0) };
}

async function roomInputs(page: Page) {
  const inputs = page.locator('.lib-panel input[type="number"]');
  // 场景区：房间宽 = 第 0 个，房间高 = 第 1 个（添加灯/道具区没有数字输入框）
  return { w: inputs.nth(0), h: inputs.nth(1) };
}

test.describe('房间边界与拖动/微调', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('new-plan').click();
    await expect(page.getByTestId('ratio-panel')).toBeVisible();
    await page.getByTestId('add-lamp-key').click();
    await expect(page.locator('[data-el="lamp"]')).toHaveCount(1);
  });

  test('矮房间：纵向拖动可移动且灯不会被拖到房间下方', async ({ page }) => {
    // 房间改矮：6×3
    const room = await roomInputs(page);
    await room.h.fill('3');

    // 选中灯，拖到房间底部之外（向下拖 400px）
    const lamp = page.locator('[data-el="lamp"]').first();
    const box = (await lamp.boundingBox())!;
    await lamp.click();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x, box.y + 400, { steps: 8 });
    await page.mouse.up();

    const pos = await transform(page, '[data-el="lamp"]');
    expect(pos.y).toBeGreaterThan(1); // 纵向拖动确实生效
    expect(pos.y).toBeLessThanOrEqual(3 - 0.1 + 1e-6); // 卡在房间内
    expect(pos.x).toBeGreaterThanOrEqual(0.1 - 1e-6);
    expect(pos.x).toBeLessThanOrEqual(6 - 0.1 + 1e-6);
  });

  test('缩小房间：贴墙元素按新边界归位', async ({ page }) => {
    // 先把灯拖到靠近右下角
    const lamp = page.locator('[data-el="lamp"]').first();
    let box = (await lamp.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 300, { steps: 8 });
    await page.mouse.up();

    // 房间改小：3×2.5
    const room = await roomInputs(page);
    await room.w.fill('3');
    await room.h.fill('2.5');

    const pos = await transform(page, '[data-el="lamp"]');
    expect(pos.x).toBeLessThanOrEqual(3 - 0.1 + 1e-6);
    expect(pos.y).toBeLessThanOrEqual(2.5 - 0.1 + 1e-6);
    expect(pos.x).toBeGreaterThanOrEqual(0.1 - 1e-6);
    expect(pos.y).toBeGreaterThanOrEqual(0.1 - 1e-6);

    // 模特/相机同样归位
    const subject = await transform(page, '[data-el="subject"]');
    const camera = await transform(page, '[data-el="camera"]');
    expect(subject.x).toBeLessThanOrEqual(3 - 0.1 + 1e-6);
    expect(subject.y).toBeLessThanOrEqual(2.5 - 0.1 + 1e-6);
    expect(camera.x).toBeLessThanOrEqual(3 - 0.1 + 1e-6);
    expect(camera.y).toBeLessThanOrEqual(2.5 - 0.1 + 1e-6);
  });

  test('方向键微调两轴都生效，且一路推到墙边停住', async ({ page }) => {
    const before = await transform(page, '[data-el="lamp"]');
    await page.locator('[data-el="lamp"]').first().click();

    // 向下 20 次（共 1m）：y 必须改变
    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowDown');
    let pos = await transform(page, '[data-el="lamp"]');
    expect(pos.y).toBeCloseTo(Math.min(before.y + 1, 5 - 0.1), 3);
    expect(pos.x).toBeCloseTo(before.x, 3);

    // 继续向右一路推：必须停在墙内
    for (let i = 0; i < 200; i++) await page.keyboard.press('ArrowRight');
    pos = await transform(page, '[data-el="lamp"]');
    expect(pos.x).toBeCloseTo(6 - 0.1, 3);
    expect(pos.x).toBeLessThanOrEqual(6 - 0.1 + 1e-6);

    // 向上一路推：y 同样停在墙边
    for (let i = 0; i < 200; i++) await page.keyboard.press('ArrowUp');
    pos = await transform(page, '[data-el="lamp"]');
    expect(pos.y).toBeCloseTo(0.1, 3);
    expect(pos.y).toBeGreaterThanOrEqual(0.1 - 1e-6);
  });
});
