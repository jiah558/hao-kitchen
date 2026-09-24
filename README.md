# 豪の小锅小灶

以「我的菜谱」为核心的静态网页：收藏可做的菜、打美味星级、撰写详细制作过程。周菜单与采购清单收在「更多」里。

支持两种运行模式：

| 打开方式 | 模式 | 数据 |
|---------|------|------|
| `file://` 直接打开本地文件 | 本地模式 | 仅本机 `localStorage`（可随意编辑） |
| `http://` / `https://`（含本地静态服务、GitHub Pages） | 共享模式 | 读取 `data/menu.json`；访客只读，管理员可改并发布 |

线上地址（部署后）：<https://jiah558.github.io/hao-kitchen/>

## 本地离线使用（Rein）

直接双击打开 `index.html`，或用文件管理器以 `file://` 打开。此时为**本地模式**，数据保存在浏览器 `localStorage`（键名 `home-menu-v2`），与线上共享库互不影响。

也可用本地静态服务预览「共享模式」行为：

```bash
cd /workspace/home-menu
python3 -m http.server 8765
```

访问 <http://localhost:8765> 时按共享模式工作（需管理密码才能编辑；会 fetch `data/menu.json`）。

## 共享模式（GitHub Pages）

1. **访客**：打开站点即可浏览同一份共享菜谱，不能编辑。
2. **管理员**：点右上角「管理」，输入密码后进入管理模式，可添加 / 编辑 / 删除菜品。
3. **发布到线上**：在管理面板粘贴 GitHub PAT（建议 fine-grained，仅对本仓库 `Contents: Read and write`），点「保存 Token」，再点「发布到线上」。Token 只存在本机 `localStorage`（键名 `home-menu-gh-token`），不会写入仓库。
4. 若未配置 Token，编辑仍会暂存到本机，并提示导出 JSON 或稍后发布。

### 默认管理密码

v1 默认密码：`hao2026`（可在 `config.js` 中更换：把新密码的 SHA-256 hex 写入 `adminPasswordSha256`）。

计算哈希示例：

```bash
printf '%s' 'hao2026' | openssl dgst -sha256
```

### 仓库配置

见 `config.js`：

- `owner`: `jiah558`
- `repo`: `hao-kitchen`
- `branch`: `main`
- `dataPath`: `data/menu.json`

## 功能概览

1. **我的菜谱** — 列表按美味指数排序；搜索与分类筛选；点卡片进详情。
2. **菜品详情** — 菜名、半星评分、分类、备注、食材、详细制作过程。
3. **更多** — 周菜单、采购清单。
4. **导出 / 导入** — JSON 备份（导入仅管理员 / 本地模式可用）。

## 技术说明

- 纯静态：`index.html` + `styles.css` + `config.js` + `app.js` + `data/menu.json`，无构建、无框架。
- 共享数据以仓库内 `data/menu.json` 为准；托管时每次打开会重新 fetch。
- 请勿把真实 GitHub Token 提交进仓库。

## 文件结构

```
home-menu/
├── index.html
├── styles.css
├── config.js
├── app.js
├── data/
│   └── menu.json
├── fonts/
├── favicon.png
├── logo-128.png
├── README.md
└── DEPLOY-NOTES.md
```
