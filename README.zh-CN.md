<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/banner-dark.png">
    <img src="docs/banner-light.png" alt="ClaudeTex — LaTeX for Claude Code" width="100%">
  </picture>
</p>

<h1 align="center">ClaudeTex</h1>

<p align="center">
  <strong>让 LaTeX 在 Claude Code 的终端里可读；需要精确排版时，用 KaTeX 在浏览器里渲染。</strong><br>
  一个真正的 Claude Code mod。不是 wrapper，不需要 VS Code，也不需要安装 TeX。
</p>

<p align="center">
  <a href="https://github.com/huiihao/ClaudeTex/releases"><img alt="Release" src="https://img.shields.io/github/v/release/huiihao/ClaudeTex?style=flat-square&color=D97757&label=release"></a>
  <a href="https://github.com/huiihao/ClaudeTex/actions/workflows/test.yml"><img alt="CI" src="https://github.com/huiihao/ClaudeTex/actions/workflows/test.yml/badge.svg?branch=main"></a>
  <img alt="Claude Code 2.1.287+" src="https://img.shields.io/badge/Claude%20Code-2.1.287%2B-191919?style=flat-square&labelColor=D97757">
  <img alt="38 tests passing" src="https://img.shields.io/badge/tests-38%20passing-D97757?style=flat-square">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/github/license/huiihao/ClaudeTex?style=flat-square&color=191919"></a>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#功能">功能</a> ·
  <a href="#配置">配置</a> ·
  <a href="#限制">限制</a>
</p>

---

## 为什么需要 ClaudeTex

Claude Code 的 CLI 是字符网格，本身不渲染 LaTeX。社区里大多数方案依赖终端图形协议（kitty/Ghostty），而 **Windows Terminal 不支持**。

ClaudeTex 是一个真正的 **Claude Code mod**，直接 hook 渲染流程：

1. **终端内**：行内公式转成 Unicode；独立公式排成二维文本块——分数横线、根号、sum 上下限、矩阵、`cases`、`aligned`、`boxed`。任何终端都能看。
2. **浏览器内**：`/tex` 把当前回复写到本地 HTML，用 **KaTeX** 做精确排版。终端里难以阅读的复杂公式，可以在浏览器里看到论文级效果。

> 设计原则：**永远不要丢掉回复**。公式 malformed、过长或嵌套过深时，ClaudeTex 原样保留 LaTeX，而不是让会话失败。

## 效果

```text
你   ❯  求 f(x) = x² sin x 的导数

●  f′(x) = 2x sin x + x² cos x

你   ❯  写出二次方程求根公式

        −b ± √(b² − 4ac)
        ────────────────
                   2a

你   ❯  /tex
   已在浏览器中打开 KaTeX 预览：…/claudetex-preview-….html
```

<p align="center">
  <a href="docs/claudetex-intro.mp4"><img src="docs/claudetex-intro.gif" alt="ClaudeTex 介绍动画" width="82%"></a>
</p>

<p align="center"><sub><strong>10 秒概览</strong> · 点击观看 1080p MP4</sub></p>

<p align="center">
  <img src="docs/preview.png" alt="ClaudeTex KaTeX 预览" width="82%">
</p>

<p align="center"><sub>用 <code>/tex</code> 打开的 KaTeX 精确预览。</sub></p>

## 功能

| | |
| --- | --- |
| **终端内自动排版** | Claude Code 绘制回复前，把 `$...$`、`\(...\)` 转成 Unicode。 |
| **真正的二维公式** | 分数、根号、`\sum`/`\prod` 上下限、矩阵、`cases`、`aligned`、`boxed`、`\binom`。 |
| **按需 KaTeX** | `/tex` 打开最近一条回复；`/tex all` 打开本次会话全部回复。 |
| **Markdown 感知** | 代码块和行内代码不改写；`$5`、`$10`、`$PATH`、`$and$` 不会被误判。 |
| **跨平台** | Windows Terminal、macOS、Linux；终端、桌面 App 和 VS Code 扩展均可。 |
| **零运行时依赖** | 在 Claude Code 进程内运行，不需要 Node.js、TeX 或外部进程。 |
| **健壮性** | 输入上限、失败回退、CDN 脚本与样式表 SRI、严格 CSP、DOMPurify 清洗。 |

## 快速开始

### 从 GitHub 安装

```bash
claude plugin marketplace add huiihao/ClaudeTex
claude plugin install tex@claudetex
```

然后新开一个对话，直接问数学问题即可。

> **命名说明**：项目 / GitHub 仓库是 **ClaudeTex**；marketplace id 为小写 `claudetex`，可安装插件 id 为 `tex`，命令为 `/tex`。内部 id 保持小写，品牌保持可读。

### 本地开发

```bash
git clone https://github.com/huiihao/ClaudeTex
cd ClaudeTex
claude --plugin-dir .
```

### 要求

- Claude Code **2.1.287+**（mods 从该版本默认启用；在 2.1.304 上验证）
- 终端、桌面 App 的 Code tab，或 VS Code 扩展
- `/tex` 浏览器预览需要联网（从 cdnjs 加载 KaTeX，带 SRI 校验）

## 使用

正常提问即可。ClaudeTex 会在每个上下文窗口的第一条提示里，让模型用 LaTeX 写公式。

```text
/tex          # 最近一条含公式的回复
/tex all      # 本次会话全部回复
/tex-preview  # /tex 的别名
```

预览文件写到系统临时目录，并用默认浏览器打开；命令结果会打印文件路径。安装或修改插件后，已打开的会话运行 `/reload-plugins` 或重开；新会话自动加载。

## 配置

在 `/plugin configure tex@claudetex` 中配置，或编辑 `~/.claude/settings.json`：

```json
{
  "pluginConfigs": {
    "tex": {
      "options": {
        "inline": true,
        "display": true,
        "teach_claude": true,
        "max_width": 0
      }
    }
  }
}
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `inline` | `true` | 是否把 `$...$`、`\(...\)` 转成 Unicode |
| `display` | `true` | 是否把 `$$...$$`、`\[...\]` 排成二维块 |
| `teach_claude` | `true` | 是否在每个上下文窗口的第一条提示里要求模型用 LaTeX |
| `max_width` | `0` | 独立公式最大宽度（终端列数）；0 跟随终端 |

## 支持的 LaTeX

<details>
<summary><strong>符号、上下标、分数、环境、字体与装饰</strong></summary>

| 类别 | 示例 |
| --- | --- |
| 希腊字母 / 符号 | `\alpha \beta \pi \infty \partial \nabla \forall \exists` |
| 运算符 / 关系 | `\pm \times \cdot \le \ge \ne \approx \equiv \in \subset \cup \cap \to \Rightarrow` |
| 上下标 | `x_i^2`、`\sum_{i=1}^n`、`\int_0^1` |
| 分数 / 根号 | `\frac{a+b}{c}`、`\dfrac`、`\sqrt{x}`、`\sqrt[3]{x}` |
| 大型运算符 | `\sum \prod \int \iint \oint \bigcup \bigcap` |
| 矩阵 / 环境 | `pmatrix`、`bmatrix`、`Bmatrix`、`vmatrix`、`Vmatrix`、`cases`、`aligned`、`align`、`gather`、`multline` |
| 字体 | `\mathbb`、`\mathcal`、`\mathfrak`、`\mathbf`、`\boldsymbol`、`\mathsf`、`\mathtt`、`\mathit`、`\mathrm` |
| 装饰 | `\hat`、`\bar`、`\vec`、`\dot`、`\ddot`、`\tilde`、`\overline`、`\underline` |
| 其他 | `\text{...}`、`\boxed{...}`、`\binom{n}{k}`、`\operatorname{...}`、`\left( ... \right)`、`\not\in` |

</details>

## 工作方式

ClaudeTex 是标准的 Claude Code **mod**：插件的 hooks 模块在 Claude Code 自己的进程内注册函数。

```text
ClaudeTex/
├── .claude-plugin/
│   ├── plugin.json          # 插件清单 + 用户配置
│   ├── marketplace.json     # marketplace 清单
│   └── icon.png
├── hooks/
│   ├── hooks.json
│   └── register.ts          # ui.render / prompt.submit / command.run
├── src/
│   ├── tex/
│   │   ├── symbols.ts       # TeX 命令表、字体表、上下标映射
│   │   ├── parser.ts        # 递归下降解析器 + 上限
│   │   ├── layout.ts        # Unicode 行内渲染 + 二维块布局
│   │   └── markdown.ts      # 跳过代码的 Markdown 扫描器
│   └── preview.ts           # KaTeX HTML（SRI + CSP）
├── tests/                   # 38 个测试
├── docs/
│   ├── banner-light.png
│   ├── banner-dark.png
│   ├── icon.png
│   └── preview.png
└── README.md
```

| Hook / API | 作用 |
| --- | --- |
| `ui.render`（`AssistantMessage`） | 绘制前改写回复：行内公式转 Unicode，独立公式转二维块 |
| `ui.render`（`CommandOutput`） | 同样处理命令输出（如 `/btw` 回答） |
| `prompt.submit` | 每个上下文窗口第一次提交时，附加“用 LaTeX 写公式”的提示 |
| `session.start` | 注册 `/tex` 和 `/tex-preview` |
| `session.compact` / `session.end` | 压缩或 `/clear` 后重置提示状态 |
| `command.run` | `/tex`：读取 `$.session.messages()`，`$.fs.write` 写 HTML，`$.process.run` 打开浏览器 |

解析、排版、HTML 生成全部在 hooks 模块内完成，没有外部进程或 npm 运行时依赖。

## 健壮性

- **解析上限**：公式超过 8,000 字符或嵌套超过 64 层时，原样保留 LaTeX；解析器保证每轮前进，malformed 输入不会死循环。
- **布局上限**：超过 200 行或 1,000 列的独立公式退回为自动换行文本；长单词按字符宽度硬切。
- **扫描上限**：超过 200,000 字符的回复直接放行；代码 span 只在反引号长度完全相同时闭合；支持 CRLF。
- **保守识别**：金额、shell 变量、prose 单词、空 `$$ $$` 不会被改写；显式 `\(...\)`、`\[...\]` 允许首尾空白。
- **失败回退**：所有 transform 都有 catch，失败时返回原文。
- **预览安全**：CDN 脚本与样式表 SRI；CSP 禁止 `connect-src`；DOMPurify 清洗；Markdown 源码放在惰性 `<template>`。
- **测试**：38 个测试覆盖 malformed 输入、深层嵌套、超长输入、CRLF、代码 span、金额误判、命令失败和命令注册。

## 限制

<details>
<summary><strong>ClaudeTex 刻意不做的事</strong></summary>

- **终端内不是像素级 KaTeX**。终端是字符网格，分数和矩阵是 Unicode 近似；精确排版请用 `/tex`。
- **不做终端图片**。Windows Terminal 不支持 kitty graphics，Claude Code 的 `Image` 元素也限于 kitty/Ghostty 类终端。
- **行内公式是启发式识别**。极少数金额、URL 或 shell 变量可能误判；用行内代码包起来即可排除。
- **缩进代码块（4 空格）**中的 `$...$` 可能仍会被改写；请用 fenced code（```）包裹代码。
- **不是完整 TeX 引擎**。复杂宏、TikZ、外部宏包不在支持范围；未知命令会以命令名显示。
- **`/btw` 面板**不经过 `ui.render`；ClaudeTex 会提示模型在 `/btw` 里使用 Unicode 数学。
- **预览页需要联网**加载 cdnjs 上的 KaTeX；离线时退化为显示 Markdown 源码。

</details>

## 开发

```bash
claude plugin validate .
claude plugin test
npx -y -p typescript@5.7 tsc -p tsconfig.check.json
npx -y -p typescript@5.7 tsc -p tsconfig.real.json   # 先用 --plugin-dir 加载一次
```

首次 `claude --plugin-dir .` 会把当前 Claude Code 版本的完整 mod 类型写到 `.claude-plugin/types/`（已被 Git 忽略）。

## 隐私

- ClaudeTex 本身不发起网络请求；解析、排版、HTML 生成都在本地。
- `/tex` 页面从 `cdnjs.cloudflare.com` 加载 KaTeX、marked、DOMPurify，并做 SRI 校验；回复内容只在本机浏览器处理。
- Markdown 在插入页面前经过 DOMPurify 清洗。
- 预览文件写到系统临时目录。

## 命名

**ClaudeTex = Claude + TeX。** `claudex` 虽然顺口，但 GitHub 上已有大量同名项目（多为 Claude + Codex 多模型代理），npm 上也被占用；`claudetex` 在 npm 上可用、清晰，而且保留了 TeX 的辨识度。

## 致谢

- [KaTeX](https://katex.org/)：浏览器端精确排版。
- [marked](https://marked.js.org/) 与 [DOMPurify](https://github.com/cure53/DOMPurify)：预览页的 Markdown 与安全清洗。
- Claude Code 的 [mods API](https://code.claude.com/docs/en/plugins/mods/overview)：让真正的进程内插件成为可能。

## License

MIT，见 [LICENSE](LICENSE)。

---

<p align="center">
  <sub>ClaudeTex 是独立社区项目，与 Anthropic 无隶属关系。Claude 是 Anthropic, PBC 的商标。</sub>
</p>
