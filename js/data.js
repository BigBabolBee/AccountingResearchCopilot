// ═══════════════════════ ENTITY DATA MODEL ═══════════════════════

// ── Entity arrays (in-memory cache, loaded from Supabase on init) ──
let topics = [];
let papers = [];
let theories = [];
let variables = [];
let methods = [];
let structures = [];
let termExpansions = [];

// ── Entity getters ──
function getPapers(topicId)       { return papers.filter(p => p.topicId === topicId); }
function getTheories(topicId)     { return theories.filter(t => t.topicId === topicId); }
function getVariables(topicId)    { return variables.filter(v => v.topicId === topicId); }
function getMethods(topicId)      { return methods.filter(m => m.topicId === topicId); }
function getStructures(topicId)   { return structures.filter(s => s.topicId === topicId).sort((a,b) => a.sortOrder - b.sortOrder); }
function getTermExpansions(topicId) { return termExpansions.filter(t => t.topicId === topicId); }

// ── Default seed data (first-time user only) ──
async function seedDefaultData() {
  const tid = await db.createTopic("ESG 如何影响成本粘性");

  const paperData = [
    { title: "ESG Performance and Cost Stickiness: Evidence from Chinese Listed Firms", authors: "Chen, X., Wang, Y., & Li, Z.", journal: "Journal of Corporate Finance", year: 2023, abstract: "This study examines the relationship between ESG performance and cost stickiness using a sample of Chinese A-share listed firms from 2010 to 2021. We find that better ESG performance significantly reduces cost stickiness, and this effect is more pronounced in firms with higher agency costs and weaker external monitoring.", tags: ["ESG", "cost stickiness", "China"], theory: "Agency Theory" },
    { title: "The Role of ESG Disclosure in Mitigating Asymmetric Cost Behavior", authors: "Wang, L. & Zhang, H.", journal: "Accounting Review", year: 2022, abstract: "We investigate whether ESG disclosure quality affects asymmetric cost behavior. Using a difference-in-differences design around mandatory ESG disclosure regulation, we document that enhanced transparency reduces managerial empire-building incentives, thereby lowering cost stickiness.", tags: ["ESG disclosure", "cost behavior", "transparency"], theory: "Stakeholder Theory" },
    { title: "Agency Costs, Managerial Expectations, and Cost Stickiness: Theory and Evidence", authors: "Anderson, M., Banker, R., & Janakiraman, S.", journal: "Journal of Accounting and Economics", year: 2003, abstract: "This seminal paper establishes the theory of cost stickiness, demonstrating that SG&A costs increase more when activity rises than they decrease when activity falls by an equivalent amount.", tags: ["cost stickiness", "agency", "foundational"], theory: "Agency Theory" },
    { title: "Digital Transformation and Cost Structure: Evidence from Manufacturing Firms", authors: "Liu, J., Zhang, K., & Wu, T.", journal: "Management Science", year: 2024, abstract: "This paper explores how digital transformation reshapes firms' cost structures. We find that digital adoption increases cost flexibility and reduces stickiness, especially for labor costs.", tags: ["digital", "cost structure", "manufacturing"], theory: "Resource-Based View" },
    { title: "Corporate Governance, Board Characteristics, and Cost Stickiness", authors: "Park, S. & Kim, J.", journal: "Asia-Pacific Journal of Financial Studies", year: 2021, abstract: "We examine how corporate governance mechanisms affect cost stickiness in Korean firms. Results show that larger boards and higher board independence are associated with reduced cost stickiness.", tags: ["governance", "board", "Korea"], theory: "Institutional Theory" },
    { title: "Green Innovation, Resource Adjustment Costs, and Asymmetric Cost Behavior", authors: "Zhang, R., Huang, M., & Park, D.", journal: "Strategic Management Journal", year: 2024, abstract: "This study links green innovation activities to cost behavior. Green innovation creates specialized resources that increase cost stickiness in the short run but reduce it in the long run.", tags: ["green innovation", "cost stickiness", "sustainability"], theory: "Legitimacy Theory" }
  ];
  for (const p of paperData) { await db.createPaper(tid, p); }

  for (const name of ["Agency Theory", "Stakeholder Theory", "Resource-Based View", "Signaling Theory", "Legitimacy Theory", "Institutional Theory"]) {
    await db.createTheory(tid, name);
  }

  for (const { name, role } of [{ name: "ESG Score", role: "自变量" }, { name: "Cost Stickiness", role: "因变量" }, { name: "Firm Size", role: "控制变量" }, { name: "Leverage", role: "控制变量" }, { name: "ROA", role: "控制变量" }, { name: "Board Size", role: "调节变量" }]) {
    await db.createVariable(tid, name, role);
  }

  for (const name of ["ABJ Model", "Fixed Effects Panel", "2SLS / IV", "Propensity Score Matching", "Difference-in-Differences"]) {
    await db.createMethod(tid, name);
  }

  ["Abstract", "Introduction", "Theoretical Framework", "Literature Review", "Research Gaps", "Future Directions", "Conclusion"]
    .forEach((s, i) => db.createStructure(tid, s, i));
}

// Init data — called after auth is confirmed
async function initData() {
  await db.loadAll();
  if (topics.length === 0) {
    await seedDefaultData();
  }
}

// ── AI Config (per-browser, still localStorage) ──
const DEFAULT_PROMPTS = {
  '提取器': `你是一个学术信息提取引擎。

你的任务不是总结论文。

你的任务是从学术论文摘要中提取结构化的研究事实。

你必须严格遵循以下指令。

---

## [目标]

仅提取论文中明确且有学术意义的研究对象。

输出将用于构建结构化研究知识库。

你必须优先考虑：

* 精确性
* 稳定性
* 低幻觉
* 结构化输出

不要推断隐藏含义。

不要生成推测性解释。

---

## [输入]

你将收到：

* 论文标题
* 摘要
* 关键词（可选）

---

## [提取目标]

提取以下字段：

1. research_topic
   论文的主要研究主题。

2. core_concepts
   论文中明确研究的核心学术概念。

3. theories
   明确提及或清楚采用的理论框架。

4. variables
   论文中出现的研究变量。

每个变量必须包含：

* variable_name
* variable_role

允许的角色：

* dependent_variable（因变量）
* independent_variable（自变量）
* moderator（调节变量）
* mediator（中介变量）
* control_variable（控制变量）
* unknown（未知）

5. relationships
   明确研究的研究关系。

每个关系必须包含：

* subject（主体）
* relation（关系）
* object（客体）

允许的关系：

* affects（影响）
* moderates（调节）
* mediates（中介）
* correlates_with（相关）
* investigates（研究）

6. evidence
   摘要中支持提取内容的原始句子或短语。

---

## [重要规则]

1. 仅提取文本明确支持的概念。

2. 不要编造理论、机制、变量或关系。

3. 如果不确定：

* 返回空数组
* 不要猜测

4. 使用规范的学术名称。

5. 保持术语简洁。

6. 不要提取通用方法短语，例如：

* 实证分析
* 回归模型
* 面板数据
* 问卷调查

除非它们本身就是研究对象。

7. 不要提取宽泛无意义的概念，例如：

* 企业发展
* 管理创新
* 经济增长

除非它们是核心研究构念。

8. 变量必须规范化为简洁的学术术语。

不好：
"企业数字化转型的程度"

好：
"数字化转型"

9. evidence 必须引用摘要原文。

---

## [输出格式]

只返回有效的 JSON。

{
"research_topic": "",
"core_concepts": [],
"theories": [],
"variables": [
{
"variable_name": "",
"variable_role": ""
}
],
"relationships": [
{
"subject": "",
"relation": "",
"object": ""
}
],
"evidence": []
}

不要包含 markdown。
不要包含解释。
不要包含评论。`
};

function loadAiConfig() {
  const raw = localStorage.getItem('ai_config');
  const config = raw ? JSON.parse(raw) : { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' };
  // Always merge latest default prompts into config (user can't edit them anyway)
  if (!config.prompts) config.prompts = {};
  for (var k in DEFAULT_PROMPTS) { config.prompts[k] = DEFAULT_PROMPTS[k]; }
  return config;
}
function saveAiConfig(config) {
  localStorage.setItem('ai_config', JSON.stringify(config));
}

// ── AI API ──
async function translateTerm(term, config) {
  const systemPrompt = `你是一名学术翻译助手。用户输入一个学术术语，你需要将其规范化为"中文（English）"格式。
规则：
- 如果输入只有中文，补充规范的英文翻译
- 如果输入只有英文，补充规范的中文翻译
- 如果输入已经是"中文（英文）"或"中文（English）"格式，优化使其更规范
- 中文部分使用中国大陆学术界的规范译法
- 英文部分使用SSCI/CSSCI文献中通用的学术术语
- 中文不超过12个汉字，英文不超过5个单词
- 只返回格式化后的术语字符串，不要任何解释或额外文字`;

  const userPrompt = `术语：${term}`;

  const resp = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      enable_thinking: false,
      temperature: 0.2,
      max_tokens: 200
    })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error('API 错误 (' + resp.status + '): ' + text);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || term;
  return content.trim();
}

async function callAiExpand(term, config, signal) {
  const systemPrompt = `你是一名中国大陆高校的企业管理与会计学教授，
你的任务是：针对用户输入的某个学术术语，进行"术语扩展"，
为研究团队生成一份结构化的知识网络，帮助他们快速理解该术语的研究生态。

扩展必须严格遵循以下三层结构，缺一不可。

【第一层：基础词库式扩展】
提供术语的核心定义，及其在学术语境下的同义、近义、子集、反义、操作别名。
所有术语必须简洁、真实存在于CSSCI/SSCI文献中，杜绝口语化表达。

【第二层：结构化关系式扩展】
按照因果关系和操作关系，将相关术语分簇呈现：
- 前因变量簇（导致该术语现象的因素）
- 后果变量簇（该术语现象所引发的效应）
- 调节/抑制因素簇（影响上述关系强弱的外部或内部条件）
- 测量模型簇（实证研究中常用的模型或方法名称）
- 数据库/数据源映射（国内常用数据库，如CSMAR、CNRDS中对应的表或板块）
每个簇的术语需配一个极短的关系提示（不超过10个汉字），说明其与核心术语的逻辑联系。

【第三层：启发性"缺口"式扩展】
提供该术语领域内的：
- 新兴方向（近3年出现的、文献稀少但有潜力的交叉点）
- 争议地带（理论上存在对立解释或实证结论冲突的点）
- 反向思维提示（从相反角度或解决该现象的角度提出问题）
每项提示只给一个极简短语（不超过20字），旨在激发选题灵感，而非展开论述。

【禁止返回】
- 论文标题、完整研究问题、长句
- "基于……""……影响……""……机制研究"等句式
- 教科书级入门基础概念
- 与输入术语完全同义重复的术语

【术语长度限制】
- name_cn：不超过12个汉字
- name_en：不超过5个单词
- 关系提示与缺口描述：不超过15个汉字

【数量要求】
- 同义词（含近义、反义、子集等）：2-5个
- 每个关系簇：3-6个术语，宁缺毋滥
- 缺口项：2-4条

【返回格式】
你必须只返回一个严格的JSON对象，结构如下：
{
  "core_term_cn": "用户输入的术语",
  "core_term_en": "英文翻译",
  "definition_cn": "一句话标准学术定义，不超过25字",
  "synonyms": [
    {
      "name_cn": "中文术语",
      "name_en": "English Term",
      "relation_type": "近义 / 子概念 / 反义 / 操作别名"
    }
  ],
  "relation_clusters": [
    {
      "cluster_type": "antecedent",
      "cluster_name_cn": "前因变量",
      "terms": [
        {
          "name_cn": "中文术语",
          "name_en": "English Term",
          "relation_hint": "极短逻辑提示，如'提高调整成本'"
        }
      ]
    },
    {
      "cluster_type": "consequence",
      "cluster_name_cn": "后果变量",
      "terms": [ ... ]
    },
    {
      "cluster_type": "moderator",
      "cluster_name_cn": "调节因素",
      "terms": [ ... ]
    },
    {
      "cluster_type": "measurement_model",
      "cluster_name_cn": "测量模型",
      "terms": [
        {
          "name_cn": "模型或方法名称",
          "name_en": "English Term",
          "relation_hint": ""
        }
      ]
    },
    {
      "cluster_type": "data_source",
      "cluster_name_cn": "常用数据源",
      "terms": [
        {
          "name_cn": "CSMAR-利润表-营业成本",
          "name_en": "",
          "relation_hint": "核心变量来源"
        }
      ]
    }
  ],
  "gaps": [
    {
      "type": "emerging / controversy / reverse_thinking",
      "prompt_cn": "极简灵感短语，不超过20字"
    }
  ]
}

禁止返回任何JSON之外的文字、markdown或解释。`;

  const userPrompt = `术语："${term}"
请围绕该术语，严格按照三层扩展要求，生成上述结构化JSON。`;

  const resp = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      enable_thinking: false,
      temperature: 0.4,
      max_tokens: 4000
    }),
    signal
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API 错误 (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI 返回格式异常，未找到 JSON 对象');
  const obj = JSON.parse(match[0]);
  return {
    core_term_cn: obj.core_term_cn || term,
    core_term_en: obj.core_term_en || '',
    definition_cn: obj.definition_cn || '',
    synonyms: obj.synonyms || [],
    relation_clusters: obj.relation_clusters || [],
    gaps: obj.gaps || []
  };
}

// ── Literature Search APIs ──
async function searchOpenAlex(query) {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=15`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`OpenAlex 错误 (${resp.status})`);
  const data = await resp.json();
  return (data.results || []).map(w => ({
    title: w.title || 'Unknown Title',
    authors: (w.authorships || []).map(a => a.author?.display_name || '').filter(Boolean).join(', '),
    year: w.publication_year || null,
    journal: w.primary_location?.source?.display_name || '',
    doi: w.doi || '',
    source: 'OpenAlex'
  }));
}

async function searchSemanticScholar(query) {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=15&fields=title,authors,year,journal,externalIds,citationCount`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Semantic Scholar 错误 (${resp.status})`);
  const data = await resp.json();
  return (data.data || []).map(p => ({
    title: p.title || 'Unknown Title',
    authors: (p.authors || []).map(a => a.name).join(', '),
    year: p.year || null,
    journal: p.journal?.name || '',
    doi: p.externalIds?.DOI || '',
    source: 'Semantic Scholar'
  }));
}

// ── PDF Paper Metadata Extraction ──
async function extractPaperMetadata(pdfText, config) {
  const textSample = pdfText.slice(0, 4000);

  // Phase 1: basic metadata (title, authors, year, journal, abstract)
  const metaPrompt = `Extract metadata from this academic paper text. Return ONLY valid JSON:

{
  "title": "the paper title exactly as written",
  "authors": "author names separated by commas",
  "year": 2024,
  "journal": "journal or conference name",
  "abstract": "the abstract text"
}

Rules:
- title is ALWAYS required — search the first page for the paper title
- If you cannot find a field, use empty string "" (never null)
- year must be a number or 0 if not found
- Only return JSON, no other text`;

  const metaResp = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: metaPrompt },
        { role: 'user', content: '提取以下论文的元数据：\n\n' + textSample }
      ],
      enable_thinking: false,
      temperature: 0.1,
      max_tokens: 1000
    })
  });

  if (!metaResp.ok) {
    const text = await metaResp.text();
    throw new Error(`AI API 错误 (${metaResp.status})`);
  }

  const metaData = await metaResp.json();
  const metaContent = metaData.choices?.[0]?.message?.content || '{}';
  const metaMatch = metaContent.match(/\{[\s\S]*\}/);
  if (!metaMatch) throw new Error('AI 返回格式异常（基本元数据）');
  const basic = JSON.parse(metaMatch[0]);

  // Phase 2: structured extraction using the "提取器" prompt
  const extractorPrompt = config.prompts?.['提取器']
    || DEFAULT_PROMPTS['提取器'];

  const extractorResp = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'user', content: extractorPrompt + '\n\n---\n\npaper title: ' + basic.title + '\nabstract: ' + basic.abstract }
      ],
      enable_thinking: false,
      temperature: 0.1,
      max_tokens: 2000
    })
  });

  if (!extractorResp.ok) {
    // If extraction fails, return basic metadata with empty structured fields
    return {
      title: basic.title, authors: basic.authors, year: basic.year,
      journal: basic.journal, abstract: basic.abstract,
      researchTopic: '', coreConcepts: [], extractionTheories: [],
      extractionVariables: [], relationships: [], evidence: []
    };
  }

  const extData = await extractorResp.json();
  var extContent = extData.choices?.[0]?.message?.content || '';
  var extReasoning = extData.choices?.[0]?.message?.reasoning_content || '';
  if (!extContent.trim() && extReasoning.trim()) {
    var extRMatch = extReasoning.match(/\{[\s\S]*\}/);
    if (extRMatch) extContent = extRMatch[0];
  }
  const extMatch = extContent.match(/\{[\s\S]*\}/);
  if (!extMatch) {
    return {
      title: basic.title, authors: basic.authors, year: basic.year,
      journal: basic.journal, abstract: basic.abstract,
      researchTopic: '', coreConcepts: [], extractionTheories: [],
      extractionVariables: [], relationships: [], evidence: []
    };
  }
  const structured = JSON.parse(extMatch[0]);

  return {
    title: basic.title,
    authors: basic.authors,
    year: basic.year,
    journal: basic.journal,
    abstract: basic.abstract,
    researchTopic: structured.research_topic || '',
    coreConcepts: structured.core_concepts || [],
    extractionTheories: structured.theories || [],
    extractionVariables: structured.variables || [],
    relationships: structured.relationships || [],
    evidence: structured.evidence || []
  };
}

// ── Structured extraction for existing paper (title + abstract → 6 fields) ──
async function extractPaperStructured(paper, config) {
  if (!paper.title || !paper.abstract) {
    throw new Error('论文缺少标题或摘要，无法进行结构化提取');
  }

  var sysPrompt = (config.prompts && config.prompts['提取器']) || DEFAULT_PROMPTS['提取器'];

  console.log('extractPaperStructured model:', config.model);

  var resp = await fetch(config.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.apiKey },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: 'paper title: ' + paper.title + '\nabstract: ' + (paper.abstract || '').slice(0, 2500) }
      ],
      enable_thinking: false,
      temperature: 0.1,
      max_tokens: 4000
    })
  });

  if (!resp.ok) {
    var t = await resp.text();
    throw new Error('AI API 错误 (' + resp.status + ')');
  }

  var d = await resp.json();
  var content = d.choices?.[0]?.message?.content || '';
  console.log('extractPaperStructured content:', content.slice(0, 300));
  var match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI 返回格式异常');

  var structured = JSON.parse(match[0]);
  console.log('extractPaperStructured parsed:', JSON.stringify(structured).slice(0, 500));
  return {
    researchTopic: structured.research_topic || '',
    coreConcepts: structured.core_concepts || [],
    extractionTheories: structured.theories || [],
    extractionVariables: structured.variables || [],
    relationships: structured.relationships || [],
    evidence: structured.evidence || []
  };
}
