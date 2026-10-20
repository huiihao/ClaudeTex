# claude-ui-tex · TeX in Terminal

> 一个真正的 **Claude Code mod（plugin）**：在 Claude Code CLI 的对话里，把 AI 输出的 LaTeX 公式排版成可读的 Unicode 公式；需要像素级排版时，用 `/tex-preview` 在浏览器里以 **KaTeX** 精确渲染同一条回复。

不修改 Claude Code 本体，不依赖 VS Code，不需要 TeX 安装，也不需要 Node.js。

![KaTeX 浏览器预览](docs/preview.png)

---

## 为什么需要它

Claude Code 的 CLI 是字符网格，本身不渲染 LaTeX。社区里的方案大多依赖终端图形协议：

- `kitty` / `Ghostty` 的 kitty graphics protocol —— **Windows Terminal 不支持**；
- Sixel —— Claude Code 的 `Image` 元素不走这条路；
- VS Code 扩展 —— 只在 VS Code 面板里生效，不是 CLI。

这个 mod 走两条互补的路线：

1. **终端内**：hook `ui.render`，在回复画出来之前把行内公式转成 Unicode、把独立公式排成二维文本块（分数、根号、上下限、矩阵、cases、aligned……），任何终端都能看。
2. **浏览器内**：`/tex-preview` 把最近的回复写成本地 HTML，用 KaTeX 做真正的排版。终端里不好读的复杂公式，按一下命令就能在浏览器里看。

---

## 效果

终端里（Unicode 排版）：

```text
∇_(θ)L = 1/N ∑ᵢ₌₁ᴺ ∇_(θ)ℓ(f(xᵢ), yᵢ)

        −b ± √(b² − 4ac)
        ────────────────
                   2a

      n       n(n + 1)(2n + 1)
      ∑  i² = ────────────────
         i=1             6

          ⎧ x²  x ≥ 0
          ⎩ −x  x < 0

            ⎛ a  b ⎞
            ⎝ c  d ⎠
```

浏览器里（`/tex-preview`，KaTeX）：

- 行内 `$...$`、独立 `$$...$$`、`\(...\)`、`\[...\]`
- 矩阵、`cases`、`aligned`、积分、求和、希腊字母、`\mathbb`、`\text`
- 表格、代码块、引用、标题等 Markdown 原样保留
- 可在页面里切换查看 Markdown 源码，或复制整条回复

---

## 安装

### 从 marketplace 安装（发布到 GitHub 后）

```bash
claude plugin marketplace add <your-name>/claude-ui-tex
claude plugin install tex@claude-ui-tex
```

### 本地目录加载（推荐开发时使用）

```bash
claude --plugin-dir D:\claude-ui-tex
```

或者把它写进 `~/.claude/settings.json`，让每个会话自动加载：

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "D:\\claude-ui-tex"
  }
}
```

### 要求

- Claude Code **2.1.287+**（mods 从该版本默认启用；本项目在 2.1.304 上验证）
- 终端、桌面 App 的 Code tab、或 VS Code 扩展均可；终端内不需要任何图形协议
- `/tex-preview` 需要浏览器；预览页从 cdnjs 加载 KaTeX / marked / DOMPurify，因此浏览器需要联网

---

## 使用

直接正常提问即可。mod 会给模型加一小段提示，让它用 LaTeX 写公式：

```text
求函数 f(x) = x^2 sin x 的导数，并解释每一步。
```

终端里的回复会被自动排版。需要精确效果时：

```text
/tex-preview        # 最近一条含公式的回复
/tex-preview all    # 本次会话的所有回复
```

`/tex-preview` 会把页面写到系统临时目录，并用默认浏览器打开；命令结果里会打印文件路径。如果浏览器没有自动打开，手动打开该路径即可。

---

## 配置

在 `/config` 里找到 **tex**，或在 `~/.claude/settings.json` 中配置：

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
| `inline` | `true` | 是否把行内 `$...$`、`\(...\)` 转成 Unicode |
| `display` | `true` | 是否把独立公式排成二维文本块 |
| `teach_claude` | `true` | 是否在每个上下文窗口的第一条提示里告诉模型用 LaTeX |
| `max_width` | `0` | 独立公式的最大宽度（终端列数）；0 表示跟随终端宽度 |

改完配置后运行 `/reload-plugins`（或重开会话）。

---

## 支持的 LaTeX

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
| 其他 | `\text{...}`、`\boxed{...}`、`\binom{n}{k}`、`\operatorname{...}`、`\left( ... \right)` |

Markdown 中的代码块和行内代码不会被改写；`$5`、`$10`、`$PATH` 这类金额和 shell 变量不会被误当成公式。

---

## 工作方式

这是一个标准的 Claude Code mod，入口是 `hooks/register.ts`：

```text
claude-ui-tex/
├── .claude-plugin/
│   ├── plugin.json          # 插件清单、用户配置项
│   └── marketplace.json     # marketplace 清单
├── hooks/
│   ├── hooks.json           # 指向 hooks 模块
│   └── register.ts          # 事件钩子：ui.render / command.run / prompt.submit
├── src/
│   ├── tex/
│   │   ├── symbols.ts       # TeX 命令表、字体表、上下标映射
│   │   ├── parser.ts        # 递归下降解析器
│   │   ├── layout.ts        # Unicode 行内渲染 + 二维块布局
│   │   └── markdown.ts      # Markdown 扫描器：跳过代码，替换公式
│   └── preview.ts           # 生成 KaTeX 浏览器预览 HTML
├── tests/                   # 22 个测试，claude plugin test 运行
├── dev-types/stubs.d.ts     # 本地类型检查用的最小声明
├── docs/preview.png
└── README.md
```

用到的 mods API：

| Hook / 调用 | 作用 |
| --- | --- |
| `ui.render`（`AssistantMessage`） | 在回复绘制前改写文本：行内公式转 Unicode，独立公式转二维代码块 |
| `ui.render`（`CommandOutput`） | 同样处理 `/btw` 等命令输出的公式 |
| `prompt.submit` | 每个上下文窗口第一次提交时，附加一段“用 LaTeX 写公式”的提示 |
| `session.start` | 注册 `/tex-preview` 命令 |
| `session.compact` / `session.end` | 压缩或 `/clear` 后重置提示状态 |
| `command.run` | `/tex-preview`：读取 `$.session.messages()`，生成 HTML，`$.fs.write` 写入临时目录，`$.process.run` 打开浏览器 |

解析与排版完全在 hooks 模块内完成，没有外部进程或 npm 运行时依赖。

---

## 限制

- **终端内不是像素级 KaTeX**。终端只能显示字符；分数、矩阵等用 Unicode 制表符做二维近似。真正的排版在 `/tex-preview` 的浏览器页面里。
- **不做终端图片**。Windows Terminal 不支持 kitty graphics，Claude Code 的 `Image` 元素也只在 kitty/Ghostty 类终端生效，因此本项目没有把公式渲染成 PNG 覆盖到终端上。
- **`$...$` 是启发式识别**。极少数金额、shell 变量或非公式的 `$` 可能被误判；可以用行内代码包起来避免。
- **不是完整 TeX 引擎**。未知命令会以命令名显示；极复杂的宏、TikZ、外部宏包不在支持范围内。
- **`/btw` 面板不经过 `ui.render`**。侧问的回答由 Claude Code 自己的面板绘制，mod 只能通过提示让模型在 `/btw` 里使用 Unicode。
- **复制的是 Unicode**。从终端选中复制得到的是排版后的字符，不是原始 LaTeX；需要 LaTeX 时用 `/tex-preview` 页面里的 **Source** / **Copy Markdown**。
- **预览页需要联网**加载 CDN 上的 KaTeX；离线时页面会退化为显示 Markdown 源码。

---

## 开发

```bash
# 校验插件清单和静态分析
claude plugin validate .

# 运行测试（无需登录、无需网络）
claude plugin test

# 本地类型检查（使用自带的最小声明）
npx -y -p typescript@5.7 tsc -p tsconfig.check.json

# 用真实 Claude Code 类型检查（先运行一次 claude --plugin-dir .）
npx -y -p typescript@5.7 tsc -p tsconfig.real.json
```

`claude --plugin-dir .` 会在 `.claude-plugin/types/` 下生成当前 Claude Code 版本的完整类型声明（该目录已在 `.gitignore` 中忽略）。

### 发布到 GitHub

仓库已经在本地初始化并提交。创建 GitHub 仓库后推送即可：

```bash
# 方式一：gh CLI 一步创建并推送
gh repo create claude-ui-tex --public --source=. --remote=origin --push

# 方式二：先在 GitHub 网页上建空仓库，再添加远程
git remote add origin https://github.com/<your-name>/claude-ui-tex.git
git push -u origin main
```

之后其他人就可以：

```bash
claude plugin marketplace add <your-name>/claude-ui-tex
claude plugin install tex@claude-ui-tex
```

---

## 隐私

- mod 本身不发起网络请求；解析、排版、写 HTML 都在本地完成。
- `/tex-preview` 生成的 HTML 页面会从 `cdnjs.cloudflare.com` 加载 KaTeX、marked 和 DOMPurify；公式内容只在本机浏览器里处理。
- HTML 中的 Markdown 内容经过 DOMPurify 清洗后再插入页面。
- 预览文件写到系统临时目录（Windows `%TEMP%`、macOS `TMPDIR`、Linux `TMPDIR`/`$HOME`）。

---

## License

MIT。见 [LICENSE](LICENSE)。
