# 影棚布光图编排 · Studio Lighting Planner (app-018)

纯前端单页应用：在 6m×5m（可调）影棚平面图上编排灯位与道具，实时计算光比、GN 曝光参数、相对角度与覆盖范围，支持模板、持久化与 PNG/PDF/JSON 导出。

## 功能特性

- **画布编辑**：拖入/拖动/旋转（角度手柄、`[` `]` 每次 5°）、方向键微调 5cm（Shift 加速至 20cm）、`Delete` 删除；拖动实时浮标显示「距模特距离 · 相对角度 · 光比」；rAF 节流保证拖动流畅
- **元素库**：相机/模特、闪光灯/持续灯、柔光箱/反光伞/雷达罩/裸灯/旗板、反光板/背景纸/旗板道具；灯具备主光/辅光/轮廓光/背景光四种角色（颜色+形状双编码，色盲友好）
- **光比计算**：平方反比 `E ∝ 功率占比 / d²`，主/辅光比 + EV 档差，面板展示完整计算过程；持续灯单独统计并给出快门影响提示
- **GN 换算**：`f = GN × √(ISO/100) × √功率占比 / d`；反解最近功率档（GN ∝ √光量，每降 2 档 GN 减半）
- **相对角度**：`灯方位角 − 模特朝向`，模特转向实时改变各灯相对角度
- **覆盖范围**：`光斑 = 配件尺寸 + 2d·tan(发散角/2)`，三档（均匀区/全光斑/外延）切换显示
- **反光板补光**：按反射效率 0.6 估算提升档位并计入光比明细
- **8 套经典模板**：伦勃朗、蝴蝶光、夹光、三灯白底、静物顶光、环形光、分割光、主播平光
- **持久化**：IndexedDB（`slp-db` / `plans`）350ms 防抖自动保存；方案 JSON 导入导出（往返一致）；设置存 localStorage（`slp-settings`）
- **导出**：PNG（固定 150 DPI，含参数表与图例）、PDF（打印视图 CSS 分页）
- **无 UI 库依赖**：手写 CSS；路由/导出/持久化均为自研实现，运行时仅依赖 `react` / `react-dom`

## 技术栈

React 18 + TypeScript（严格模式）+ Vite 5 · Vitest 2（单测）· Playwright（E2E）· Docker（node:20-alpine → nginx:1.27-alpine）

## 快速开始

```bash
npm install
npm run dev            # 开发服务器
npm run build          # 类型检查 + 产物构建
npm run preview        # 预览构建产物
```

### 测试

```bash
npm run test           # 单元测试（Vitest，58 个用例）
npm run test:watch     # 单测 watch 模式
npm run test:e2e       # E2E（Playwright，10 个用例，默认 vite preview）
```

E2E 说明：

- 本机装有 Google Chrome 时自动使用 `channel: 'chrome'`（系统 Chrome，规避 Playwright 内核下载）
- 指定已部署地址：`E2E_BASE_URL=http://localhost:8098 npx playwright test`

### Docker 部署

```bash
docker compose up -d --build
# http://localhost:8098   健康检查: wget http://127.0.0.1/healthz → ok
```

多阶段构建：`node:20-alpine` 构建 → `nginx:1.27-alpine` 运行。镜像约 22MB；nginx 配置含 SPA 回退、gzip、静态资源 immutable 缓存、IPv6 双栈监听（`listen [::]:80`）。

> 注：`.dockerignore` 中 nginx.conf 不在忽略列表内（规格 §12 原文与之冲突），否则构建时 COPY 失败，详见该文件内注释。

## 项目结构

```
app-018/
├── src/
│   ├── core/                  # 纯函数计算引擎（可测，无 DOM 依赖）
│   │   ├── photometry.ts      #   GN、光圈、功率档换算与反解
│   │   ├── ratio.ts           #   平方反比、光比、EV、主光推荐光圈
│   │   ├── geometry.ts        #   方位角、相对角度、相机轴夹角
│   │   ├── coverage.ts        #   光斑尺寸 / 均匀区
│   │   ├── reflector.ts       #   反光板提升档位
│   │   ├── factory.ts         #   工厂函数、夹回房间、数据校验
│   │   ├── presets.ts         #   8 套布光模板
│   │   └── __tests__/         #   单元测试（GN 20 组、光比、往返）
│   ├── store/
│   │   ├── editor.ts          # usePlanEditor —— 集中式编辑器状态与操作
│   │   ├── db.ts              # IndexedDB promise 封装
│   │   └── settings.ts        # 设置（useSyncExternalStore + localStorage）
│   ├── components/
│   │   ├── SceneSvg.tsx       # 共用 SVG 渲染器（编辑器/缩略图/打印）
│   │   ├── Canvas.tsx         # 拖拽/旋转/键盘/浮标/覆盖范围
│   │   ├── ElementLibrary.tsx # 元素库
│   │   ├── RatioPanel.tsx     # 光比面板（含计算过程明细）
│   │   └── ParamsPanel.tsx    # 灯具参数面板
│   ├── pages/                 # PlanList / Editor / PrintView / Library / Settings
│   ├── export/png.ts          # Canvas 2D 导出 PNG + JSON 序列化
│   ├── router.tsx             # 自研 history 路由
│   ├── types.ts               # 数据模型、角色/配件元数据
│   └── App.tsx / main.tsx
├── e2e/app.spec.ts            # Playwright E2E（10 用例）
├── Dockerfile / docker-compose.yml / nginx.conf
└── playwright.config.ts / vitest.config.ts
```

## 路由

| 路径                | 页面                            |
| ------------------- | ------------------------------- |
| `/`               | 方案列表（新建/复制/导入/删除） |
| `/plan/:id`       | 布光编辑器                      |
| `/plan/:id/print` | 打印视图（PDF）                 |
| `/library`        | 模板库                          |
| `/settings`       | 设置（单位等）                  |

## 核心算法约定

- 坐标以「米」为单位，画布 viewBox 与房间同尺度；y 轴向下
- 方位角 `azimuth = atan2(dy, dx)`，0° 指向 +x；`norm180` 归一到 (−180°, 180°]
- 相对角度 `relativeAngle = azimuth(subject → lamp) − subject.facing`，模特转向 90° 所有灯的相对角度随之改变
- 照度下限保护 0.1m（防除零）；反光板提升 `log2(1 + E_反射/E_辅)`
- 功率档换算：`gn(功率) = gnFull × √功率占比`；反解功率档取最近档并给出实际达到的 f 值

## 测试覆盖

- **单元测试 58 个**：GN 手工核算 20 组 100% 通过、光比 2.25:1（主 2m / 辅 3m 同功率）、EV = log2(2.25)、模特转向 90° 角度变化、覆盖范围、反光板、模板合法性、富场景 JSON 往返深相等、坏数据校验
- **E2E 10 个**：列表→新建→拖入→计算链路、模特转向 90°、GN/功率档联动、覆盖范围切换、模板套用、JSON 导入导出、打印视图、设置持久化、20 灯拖动性能（中位帧 ≤20ms，≥50fps）
- E2E 曾抓出并修复 2 个真实缺陷：覆盖示意层拦截点击（`pointerEvents:'none'`）、打印页路由参数段不匹配

## 已知口径说明

- 覆盖范围为示意估算（按标称发散角），非光学仿真
- `docker image ls` 显示体积为 Desktop 统计口径（约 78MB），`docker image inspect` 实际压缩层约 22MB，满足规格 <60MB
