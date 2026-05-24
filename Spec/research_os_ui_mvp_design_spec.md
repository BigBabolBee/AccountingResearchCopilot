# AI Research OS — MVP UI 设计文档（可直接进入开发）

## 一、设计目标

当前阶段的目标不是：

- 做一个“AI聊天工具”
- 做一个“论文搜索网站”
- 做一个“大而全的科研平台”

而是：

# 做一个“研究工作台（Research Workspace）”

核心任务：

帮助研究者完成：

```text
idea
↓
research expansion
↓
paper understanding
↓
theme organization
↓
review outline
```

整个过程。

因此：

# UI 的核心不是聊天。

而是：

# “研究认知组织”。

---

# 二、整体产品结构

第一版建议只做：

# 单页面 Workspace

不要做复杂导航系统。

不要做：

- 多页面 CMS
- 超级后台
- 复杂权限系统
- 多团队管理

第一版：

# 一个页面干到底。

---

# 三、整体页面布局

建议使用：

# 三栏布局（非常重要）

```text
┌──────────────────────────────────────────────┐
│ Top Header                                  │
├──────────────┬────────────────┬─────────────┤
│ Left Sidebar │ Main Workspace │ Right Panel │
│              │                │             │
│ Research Map │ Paper Stream   │ Insights    │
│ Collections  │                │ Theories    │
│ Sessions     │                │ Variables   │
│              │                │ Outline     │
└──────────────┴────────────────┴─────────────┘
```

---

# 四、核心 UI 理念

整个 UI 必须围绕：

# “研究对象”

而不是：

# “对话消息”

所以：

不要像 ChatGPT。

应该像：

- Notion
- Obsidian
- Linear
- IDE
- Bloomberg Terminal

这种：

# “工作空间型 UI”

---

# 五、顶部 Header

高度：64px

功能：

```text
[Logo]
[Current Research Topic]
[Search Input]
[New Session]
[Export]
[User Avatar]
```

例如：

```text
Research OS | Cost Stickiness Research
```

搜索框：

```text
输入研究问题...
```

用户输入：

```text
ESG 对成本粘性的影响
```

点击后：

触发整个 pipeline。

---

# 六、左侧 Sidebar（Research Navigation）

宽度建议：280px

# 功能：研究上下文导航

这是非常关键的一栏。

因为：

你们不是一次性聊天。

而是在：

# 建立研究记忆。

---

## 左侧结构

```text
Research Collections

- Cost Stickiness
- ESG Research
- Audit Quality

Recent Sessions

- ESG & Sticky Cost
- AI & Accounting
- Supply Chain Risk

Saved Papers

- Paper A
- Paper B

Saved Themes

- Agency Theory
- Digital Transformation
```

---

# 七、中间 Main Workspace（最核心）

宽度：自适应

这是整个产品核心。

建议分成：

```text
1. Query Context
2. Research Expansion
3. Paper Results
4. Theme Clustering
```

---

# 八、模块 1：Query Context

位置：顶部

高度：120~180px

功能：

展示当前研究问题。

例如：

```text
Research Question:
How does ESG influence cost stickiness?
```

下面显示：

## 自动扩展术语

```text
Related Terms:
- sticky costs
- cost asymmetry
- managerial optimism
- SG&A stickiness
- ESG disclosure
```

UI 建议：

# Tag Chips

类似：

```text
[sticky costs] [agency theory] [digitalization]
```

点击 tag：

重新触发 retrieval。

---

# 九、模块 2：Research Expansion

这是 MVP 的核心价值之一。

UI 建议：

# Expandable Knowledge Cards

例如：

```text
┌────────────────────────┐
│ Related Theory         │
│ Agency Theory          │
│ Adjustment Cost Theory │
└────────────────────────┘

┌────────────────────────┐
│ Common Variables       │
│ SG&A / Sales Ratio     │
│ ESG Score              │
└────────────────────────┘
```

卡片点击后：

右侧显示：

- theory explanation
- related papers
- common methods

---

# 十、模块 3：Paper Stream（最重要）

这是整个系统核心区域。

# 不要做表格。

应该做：

# Research Feed

类似：

- Twitter Feed
- Linear Issue Feed
- GitHub PR Feed

但对象是：

# Paper Card

---

# 十一、Paper Card 设计

每篇论文：

```text
┌──────────────────────────────────┐
│ Title                            │
│ Authors · Journal · Year         │
│                                  │
│ Abstract Summary                 │
│                                  │
│ Themes                           │
│ [ESG] [Cost Stickiness]          │
│                                  │
│ Theory                           │
│ Agency Theory                    │
│                                  │
│ Methods                          │
│ Panel Regression                 │
│                                  │
│ Actions                          │
│ Save | Expand | Compare          │
└──────────────────────────────────┘
```

---

# 十二、Paper Card 必须包含的信息

第一版：

```typescript
interface PaperCard {
  id: string
  title: string
  abstract: string
  authors: string[]
  year: number
  journal: string
  citationCount: number

  themes: string[]
  theories: string[]
  methods: string[]

  relevanceScore: number
}
```

---

# 十三、Paper Stream 的核心交互

这是非常关键的。

用户必须能够：

## 1. Save Paper

保存论文。

## 2. Add to Theme

加入某研究主题。

## 3. Compare Papers

比较两篇论文。

## 4. Expand Similar

寻找相似研究。

## 5. Generate Insight

自动生成结构化理解。

---

# 十四、右侧 Panel（Insights）

宽度：320px

这是：

# “研究认知提炼区”

非常重要。

不是聊天框。

而是：

# 结构化认知输出。

---

# 十五、右侧结构

建议：

```text
Insights

Theories
Variables
Methods
Research Gaps
Review Outline
```

---

# 十六、Theories Panel

例如：

```text
Agency Theory
Adjustment Cost Theory
Resource Slack Theory
```

点击后：

展开：

- theory definition
- related papers
- common use cases

---

# 十七、Variables Panel

例如：

```text
Dependent Variables
- Cost Stickiness

Independent Variables
- ESG Score
- Managerial Optimism

Control Variables
- Firm Size
- Leverage
```

这部分会非常受教授喜欢。

因为：

变量体系是研究核心资产。

---

# 十八、Research Gap Panel

非常关键。

第一版不要太 AI。

不要直接说：

```text
这里存在研究空白
```

因为会幻觉。

第一版：

# 做“Evidence-based Gap”

例如：

```text
Current literature mainly focuses on:
- manufacturing firms
- US market

Limited evidence exists for:
- emerging markets
- AI-driven firms
```

必须：

# 引用来源。

---

# 十九、Review Outline Panel

第一版：

# 只生成“大纲”

不要生成全文。

例如：

```text
1. Introduction
2. Definition of Cost Stickiness
3. Formation Mechanism
4. ESG and Cost Behavior
5. Future Research Directions
```

并允许：

- drag & drop
- rename
- reorder

---

# 二十、交互流（极其重要）

现在定义：

# 用户完整路径。

---

## Step 1

用户输入：

```text
ESG 对成本粘性的影响
```

---

## Step 2

系统自动：

- query expansion
- theory expansion
- variable expansion

---

## Step 3

系统返回：

- paper stream
- clustered themes
- related theories

---

## Step 4

用户保存重要论文。

---

## Step 5

系统生成：

- structured insights
- outline
- gap analysis

---

## Step 6

用户编辑。

这是关键。

不是 AI 自动完成。

而是：

# Human-in-the-loop。

---

# 二十一、设计风格

建议：

# 极简深色/浅色专业风格

不要学：

- AI 炫酷风
- 蓝紫渐变
- 太多动画

应该：

# “学术 IDE 风格”

参考：

- Linear
- Notion
- Obsidian
- Vercel Dashboard

---

# 二十二、颜色建议

主色：

```text
#111827
#1F2937
#F9FAFB
#2563EB
```

不要太花。

因为教授会长期使用。

---

# 二十三、字体建议

英文：

```text
Inter
```

中文：

```text
Noto Sans SC
```

---

# 二十四、技术实现建议（非常具体）

# 前端

```text
Next.js
TailwindCSS
shadcn/ui
React Query
Zustand
```

---

# 二十五、推荐组件库

## Layout

```text
Resizable Panels
```

因为：

研究场景非常适合可拖拽布局。

---

## Cards

```text
shadcn Card
```

---

## Tags

```text
Badge
```

---

## Sidebar

```text
Collapsible Sidebar
```

---

# 二十六、状态管理

建议：

# Zustand

不要 Redux。

状态结构：

```typescript
interface ResearchStore {
  currentQuery: string

  expandedTerms: string[]

  papers: Paper[]

  selectedPaper?: Paper

  savedPapers: Paper[]

  generatedOutline: OutlineSection[]
}
```

---

# 二十七、API 结构（直接可开发）

# POST /api/research/query

输入：

```json
{
  "query": "ESG 对成本粘性的影响"
}
```

输出：

```json
{
  "expanded_terms": [],
  "papers": [],
  "themes": [],
  "theories": [],
  "variables": []
}
```

---

# 二十八、第一版千万不要做的事情

# 1. 不要聊天 Agent

因为：

会把产品带偏。

---

# 2. 不要知识图谱可视化

第一版没必要。

---

# 3. 不要复杂用户系统

---

# 4. 不要自动生成整篇综述

教授不会信。

---

# 二十九、第一版真正目标

不是：

# “AI 很聪明”

而是：

# “教授愿意每天打开它”

这是完全不同的产品思维。

---

# 三十、第一版开发顺序（务必遵守）

# Phase 1

完成：

```text
query → papers
```

---

# Phase 2

完成：

```text
paper → structured extraction
```

---

# Phase 3

完成：

```text
theme clustering
```

---

# Phase 4

完成：

```text
review outline
```

---

# Phase 5

再考虑：

```text
graph
agent
workflow memory
```

---

# 三十一、最终提醒（非常重要）

你们不是在做：

```text
AI 搜索
```

也不是：

```text
AI 写论文
```

而是在做：

# “研究认知工作台（Research Cognition Workspace）”

UI 必须始终围绕：

# “如何帮助研究者组织认知”

而不是：

# “如何让 AI 看起来厉害”。

