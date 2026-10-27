# DeepSeek Chan Wallpaper · DeepSeek 娘动态壁纸

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 用的动态壁纸插件：窗口最底层循环播放 DeepSeek 娘「深夜」动态插画，界面面板改成半透明深蓝玻璃。

An animated wallpaper bundle for the DeepSeek Harness Web UI: a looping DeepSeek-chan midnight artwork behind the whole window, with translucent midnight-blue surfaces.

![preview](preview.jpg)

## 效果

- 全窗口铺满、`object-fit: cover` 的循环视频背景（1920×1080，20 MB）
- 面板、侧边栏、弹层改为半透明玻璃：视频透出来，文字仍然可读
- 跟随主题：深色用深蓝玻璃，浅色自动换白色玻璃，切换主题会实时重算
- 静态兜底：客户端模块没生效时，注入的样式用 `prefers-color-scheme` 撑住透明度，不会出现「面板不透明 → 什么都看不到」

## 安装

### 方式一：插件管理（推荐）

在 Harness 的 **设置 → 插件** 里安装，目标填本仓库地址（git spec）或本地目录：

```text
git+https://github.com/<你的账号>/dsh-deepseek-wallpaper.git
```

或先 clone 到本地，再把插件管理指向该目录（本地目录安装会以 pnpm link 方式引用，之后改代码即时生效）。

### 方式二：本地目录

```bash
git clone https://github.com/<你的账号>/dsh-deepseek-wallpaper.git
```

然后在 Harness 里把 `install_bundle` 的目标指向这个目录的绝对路径，例如：

```text
C:\Users\<you>\dsh-deepseek-wallpaper
```

安装完成后**刷新一次页面**（`Ctrl+R`）：背景层是服务端渲染 index 时注入的，而客户端模块要重新进启动图才会生效。

## 调参

想要更透 / 更实，改两个地方的值（两边保持一致，客户端那侧才是权威）：

| 位置 | 变量 | 含义 |
| --- | --- | --- |
| `index.js` 的 `<style>`、`client.js` 的 `TOKENS` | `--dsw-alias-bg-base` | 应用底色（也是视频上那层遮罩的颜色来源） |
| 同上 | `--dsw-alias-bg-layer-1` | 主面板底色，alpha 越小越透 |
| 同上 | `--dsw-alias-bg-layer-2` | 嵌套面板 |
| 同上 | `--dsw-alias-bg-overlay` | 弹窗/浮层，建议保持较高 alpha 以保证可读 |
| 同上 | `--dsw-specific-sidebar-fill` | 侧边栏底色 |
| `index.js` / `client.js` 的 `.dsh-wallpaper-veil` | `opacity` | 视频上的遮罩；默认 `0`（不加遮罩） |

面板 alpha 低于约 0.45 时，视频里亮部会穿透聊天区、长文可读性下降；这时更好的做法是给面板加 `backdrop-filter: blur()`，用模糊换清晰，而不是继续压 alpha。

## 实现原理

两个半边，各有分工：

**宿主侧 `index.js`**

1. `webServer.register({ kind: 'exact', path: '/deepseek-wallpaper/bg.mp4' })`：把仓库里的 `bg.mp4` 以内网 HTTP 提供，带 `Range` 支持（返回 `206`），Chromium 才能顺畅循环/拖动。
2. `webServer.tapIndex(html => ...)`：在服务端渲染 `index.html` 时，往 `<body>` 后插入背景层与样式。

为什么不用 Client 插槽？`shell.overlay` 是「所有栏之上的浮动层」，视频放进去会盖住界面。唯一能当壁纸的座位是 **body 下、`z-index: -1` 的固定元素**：它落在 `#root` 之下、canvas 之上。这一招成立的前提是我确认过的三条 CSS 事实——`body` 只有 `background: var(--dsw-alias-bg-base)`、`#root` 没有背景、`body { isolation: isolate }` 只在 `html[data-platform=darwin]` 下出现。

**客户端侧 `client.js`**

1. `ctx.theme.overrideTokens('deepseek-wallpaper', { ...light/dark })`：把表面色换成半透明，交给 Theme 服务按当前主题解析。
2. 监听 `theme/change` 重算并写入 `:root` 变量（`!important`），保证主题切换后不会停在旧配色。
3. 兜底：如果 index 注入没跑到，自己建同样的层（靠 `#dsh-wallpaper` 判重，不会出现两个视频）。

## 已知限制

- **平台**：只在 Windows 上验证过。macOS 的 `body { isolation: isolate }` 会让负 z-index 的层级语义略有不同，需要实机确认。
- **素材体积**：`bg.mp4` 有 20 MB，直接进 git 会让仓库变重。不想带二进制可以删掉它、改成安装时按 URL 下载，或用 Git LFS。
- **浅色兜底**：注入样式里的 `prefers-color-scheme` 跟随的是操作系统，而不是 Harness 里显式选择的主题。客户端模块生效后会用真实主题覆盖，但如果客户端没加载、而你又手动选了与系统相反的主题，面板颜色会不匹配。
- **文字对比度**：透视程度越高，视频亮部越容易干扰阅读，见上面的调参建议。

## 卸载

设置 → 插件里禁用或删除 `DeepSeek 娘动态壁纸`。禁用后背景层随之消失（客户端 effect 会清掉注入的 DOM），不需要手动改文件。

## 版权与致谢

- 代码：MIT，见 [LICENSE](LICENSE)。
- 背景素材：`bg.mp4` 来自 [daemon1s/opencode-deepseek-chan](https://github.com/daemon1s/opencode-deepseek-chan) 的预设「深夜」，原作 `[deepseek娘]深夜的大肥鱼` by 樱小路露娜，素材以 **CC BY-NC-SA 4.0** 提供，**仅限非商业使用**，再分发请保留署名。
- `preview.jpg` 是该预设 4K 插画的裁切压缩版，版权同上。
