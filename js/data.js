// ═══════════════════════ ENTITY DATA MODEL ═══════════════════════
const STORAGE_KEY = 'accounting_research_copilot_v2';

// ── Entity arrays ──
let topics = [];
let papers = [];
let theories = [];
let variables = [];
let methods = [];
let structures = [];
let termExpansions = [];

const nextIds = { topics: 1, papers: 1, theories: 1, variables: 1, methods: 1, structures: 1, termExpansions: 1 };

function nextIdFor(entity) { return nextIds[entity]++; }

// ── Entity getters ──
function getPapers(topicId)       { return papers.filter(p => p.topicId === topicId); }
function getTheories(topicId)     { return theories.filter(t => t.topicId === topicId); }
function getVariables(topicId)    { return variables.filter(v => v.topicId === topicId); }
function getMethods(topicId)      { return methods.filter(m => m.topicId === topicId); }
function getStructures(topicId)   { return structures.filter(s => s.topicId === topicId).sort((a,b) => a.sortOrder - b.sortOrder); }
function getTermExpansions(topicId) { return termExpansions.filter(t => t.topicId === topicId); }

// ── Default seed data ──
function seedDefaultData() {
  const now = Date.now();
  const tid = nextIdFor('topics');
  topics.push({ id: tid, name: "ESG 如何影响成本粘性", createdAt: now, modifiedAt: now });

  const paperData = [
    { title: "ESG Performance and Cost Stickiness: Evidence from Chinese Listed Firms", authors: "Chen, X., Wang, Y., & Li, Z.", journal: "Journal of Corporate Finance", year: 2023, abstract: "This study examines the relationship between ESG performance and cost stickiness using a sample of Chinese A-share listed firms from 2010 to 2021. We find that better ESG performance significantly reduces cost stickiness, and this effect is more pronounced in firms with higher agency costs and weaker external monitoring.", tags: ["ESG", "cost stickiness", "China"], theory: "Agency Theory", topic: "esg" },
    { title: "The Role of ESG Disclosure in Mitigating Asymmetric Cost Behavior", authors: "Wang, L. & Zhang, H.", journal: "Accounting Review", year: 2022, abstract: "We investigate whether ESG disclosure quality affects asymmetric cost behavior. Using a difference-in-differences design around mandatory ESG disclosure regulation, we document that enhanced transparency reduces managerial empire-building incentives, thereby lowering cost stickiness.", tags: ["ESG disclosure", "cost behavior", "transparency"], theory: "Stakeholder Theory", topic: "esg" },
    { title: "Agency Costs, Managerial Expectations, and Cost Stickiness: Theory and Evidence", authors: "Anderson, M., Banker, R., & Janakiraman, S.", journal: "Journal of Accounting and Economics", year: 2003, abstract: "This seminal paper establishes the theory of cost stickiness, demonstrating that SG&A costs increase more when activity rises than they decrease when activity falls by an equivalent amount.", tags: ["cost stickiness", "agency", "foundational"], theory: "Agency Theory", topic: "formation" },
    { title: "Digital Transformation and Cost Structure: Evidence from Manufacturing Firms", authors: "Liu, J., Zhang, K., & Wu, T.", journal: "Management Science", year: 2024, abstract: "This paper explores how digital transformation reshapes firms' cost structures. We find that digital adoption increases cost flexibility and reduces stickiness, especially for labor costs.", tags: ["digital", "cost structure", "manufacturing"], theory: "Resource-Based View", topic: "digital" },
    { title: "Corporate Governance, Board Characteristics, and Cost Stickiness", authors: "Park, S. & Kim, J.", journal: "Asia-Pacific Journal of Financial Studies", year: 2021, abstract: "We examine how corporate governance mechanisms affect cost stickiness in Korean firms. Results show that larger boards and higher board independence are associated with reduced cost stickiness.", tags: ["governance", "board", "Korea"], theory: "Institutional Theory", topic: "governance" },
    { title: "Green Innovation, Resource Adjustment Costs, and Asymmetric Cost Behavior", authors: "Zhang, R., Huang, M., & Park, D.", journal: "Strategic Management Journal", year: 2024, abstract: "This study links green innovation activities to cost behavior. Green innovation creates specialized resources that increase cost stickiness in the short run but reduce it in the long run.", tags: ["green innovation", "cost stickiness", "sustainability"], theory: "Legitimacy Theory", topic: "esg" }
  ];
  paperData.forEach(p => papers.push({ id: nextIdFor('papers'), topicId: tid, ...p }));

  ["Agency Theory", "Stakeholder Theory", "Resource-Based View", "Signaling Theory", "Legitimacy Theory", "Institutional Theory"]
    .forEach(t => theories.push({ id: nextIdFor('theories'), topicId: tid, name: t }));

  [
    { name: "ESG Score", role: "自变量" }, { name: "Cost Stickiness", role: "因变量" },
    { name: "Firm Size", role: "控制变量" }, { name: "Leverage", role: "控制变量" },
    { name: "ROA", role: "控制变量" }, { name: "Board Size", role: "调节变量" }
  ].forEach(v => variables.push({ id: nextIdFor('variables'), topicId: tid, ...v }));

  ["ABJ Model", "Fixed Effects Panel", "2SLS / IV", "Propensity Score Matching", "Difference-in-Differences"]
    .forEach(m => methods.push({ id: nextIdFor('methods'), topicId: tid, name: m }));

  ["Abstract", "Introduction", "Theoretical Framework", "Literature Review", "Research Gaps", "Future Directions", "Conclusion"]
    .forEach((s, i) => structures.push({ id: nextIdFor('structures'), topicId: tid, name: s, sortOrder: i }));

  ["ESG 评级", "成本粘性", "代理成本", "信息不对称", "利益相关者", "调整成本"]
    .forEach(t => termExpansions.push({ id: nextIdFor('termExpansions'), topicId: tid, term: t }));
}

// ── Persistence ──
function saveAll() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    nextIds, topics, papers, theories, variables, methods, structures, termExpansions
  }));
}

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const d = JSON.parse(raw);
  Object.assign(nextIds, d.nextIds || {});
  topics = d.topics || [];
  papers = d.papers || [];
  theories = d.theories || [];
  variables = d.variables || [];
  methods = d.methods || [];
  structures = d.structures || [];
  termExpansions = d.termExpansions || [];
  return topics.length > 0;
}

// Init data
if (!loadAll()) {
  seedDefaultData();
  saveAll();
}

// ── AI Config ──
function loadAiConfig() {
  const raw = localStorage.getItem('ai_config');
  if (raw) return JSON.parse(raw);
  return { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' };
}
function saveAiConfig(config) {
  localStorage.setItem('ai_config', JSON.stringify(config));
}
// ── AI API ──
async function callAiExpand(term, config, signal) {
  const systemPrompt = `你是一名中国大陆高校的企业管理与会计学教授，正在指导博士生做文献综述。你必须只返回一个 JSON 对象，不要包含任何其他文字、解释或 markdown 代码块。

你需要从以下四个维度推荐该领域内高价值的学术概念：

1. terms（核心术语）：该领域特有的专业术语。必须是中文学术界通用的表述，括号内附带英文对应词。排除教科书级别的基础概念。
2. theories（相关理论）：解释该领域现象的主流理论框架。必须是在 SSCI/CSSCI 期刊中被实际引用的理论，附带中文译名和英文原名。
3. research_directions（研究前沿）：该领域近年来的热门研究方向与新兴议题，用中文表述。
4. variables（关键变量）：该领域实证研究中常用的被解释变量、解释变量、调节变量或中介变量，附带中英文。

核心原则：
- 禁止推荐以下内容：任何入门教科书（如罗宾斯《管理学》、罗斯《公司理财》）中已详细讲解的概念；百度百科/维基百科前三条就能查到的通用术语；字面上与用户输入的关键词高度重合的词汇
- 推荐的每个概念必须满足至少一条：① 该领域 Top 期刊近 3 年的高频关键词 ② 不同流派对同一现象的竞争性解释中所用的专有名词 ③ 实证研究中作为核心机制变量但非该领域研究者不易想到的构念
- 中文表述必须是中文学术界实际使用的术语，英文仅作为补充标注。不要做英译中
- 每个类别推荐 3-6 个概念，宁缺毋滥
- 如果不确定某个概念在学术文献中是否真实存在，就不要推荐

返回格式：{"terms": ["中文术语 (English Term)"], "theories": ["中文理论名 (English Name)"], "research_directions": ["中文方向描述"], "variables": ["中文变量名 (English Variable)"]}`;

  const userPrompt = `研究方向："${term}"

请从以上四个维度推荐相关的学术概念。记住核心原则：只推荐入门博士生不知道但非常有价值的概念，宁缺毋滥。`;

  const resp = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 3000
    }),
    signal
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API 错误 (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  // Try to extract JSON object from response
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI 返回格式异常，未找到 JSON 对象');
  const obj = JSON.parse(match[0]);
  return {
    terms: obj.terms || [],
    theories: obj.theories || [],
    research_directions: obj.research_directions || [],
    variables: obj.variables || []
  };
}

// ── AI Translation (normalize all terms to bilingual format) ──
async function translateAiResults(results, config, signal) {
  const systemPrompt = `你是一名企业管理与会计学领域的学术翻译专家。你必须只返回一个 JSON 对象，不要包含任何其他文字、解释或 markdown 代码块。

你会收到一个 JSON 对象，包含四个数组，每个数组元素是一个学术术语。每个术语可能是纯中文、纯英文、或"中文 (English)"双语格式。

任务：将每个术语统一为 "中文术语 (English Term)" 的双语格式：
- 若术语是纯中文 → 补充英文学术译名
- 若术语是纯英文 → 补充中文学术译名
- 若已是双语格式 → 保留原样，仅当翻译有明显错误时才修正
- 翻译必须使用学术界的通用规范表述，严禁直译、机翻或口语化

直接返回与输入结构完全相同的 JSON 对象，不要遗漏或新增任何术语。`;

  const userPrompt = JSON.stringify(results);

  const resp = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 3000
    }),
    signal
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`翻译 API 错误 (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('翻译返回格式异常');
  const obj = JSON.parse(match[0]);
  return {
    terms: obj.terms || results.terms,
    theories: obj.theories || results.theories,
    research_directions: obj.research_directions || results.research_directions,
    variables: obj.variables || results.variables
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
