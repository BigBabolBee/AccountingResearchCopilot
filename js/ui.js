let selectedTopicId = topics[0] ? topics[0].id : null;
let activeCard = 'papers';

// ═══════════════════════ SIDEBAR ═══════════════════════
function renderSidebar() {
  const topicList = document.getElementById('topicList');
  const recentList = document.getElementById('recentList');

  const byCreation = [...topics].sort((a, b) => a.createdAt - b.createdAt);
  topicList.innerHTML = byCreation.map(t => `
    <div class="sidebar-item${t.id === selectedTopicId ? ' active' : ''}" data-topic-id="${t.id}">
      ${t.name}
    </div>
  `).join('') || '<div class="sidebar-item" style="color:var(--text-tertiary)">暂无研究主题</div>';

  const byModified = [...topics].sort((a, b) => b.modifiedAt - a.modifiedAt).slice(0, 10);
  recentList.innerHTML = byModified.map(t => `
    <div class="sidebar-item${t.id === selectedTopicId ? ' active' : ''}" data-topic-id="${t.id}">
      <span class="dot" style="background:${t.id === selectedTopicId ? 'var(--accent)' : '#ccc'}"></span>
      ${t.name}
    </div>
  `).join('') || '<div class="sidebar-item" style="color:var(--text-tertiary)">暂无最近研究</div>';
}

function getSelectedTopic() {
  return topics.find(t => t.id === selectedTopicId);
}

function selectTopic(id) {
  selectedTopicId = id;
  const topic = getSelectedTopic();
  if (!topic) return;
  topic.modifiedAt = Date.now();
  saveAll();
  document.getElementById('searchInput').value = topic.name;
  renderSidebar();
  renderCenter(topic);
}

// ═══════════════════════ CENTER RENDER ═══════════════════════
const cardDefs = [
  { key: 'papers', icon: '📄', title: '已有文献', desc: '浏览与主题相关的学术论文' },
  { key: 'theories', icon: '📚', title: '理论列表', desc: '相关理论框架与视角' },
  { key: 'variables', icon: '📊', title: '变量列表', desc: '自变量、因变量、控制变量等' },
  { key: 'methods', icon: '🔬', title: '常用方法', desc: '实证方法与研究设计' },
  { key: 'structure', icon: '📝', title: '综述结构', desc: '文献综述的组织框架' }
];

function renderCenter(topic) {
  const center = document.getElementById('centerArea');
  const tid = topic.id;
  const topicPapers = getPapers(tid);
  const tags = topicPapers.slice(0, 4).map(p => p.tags[0]).filter((v, i, a) => a.indexOf(v) === i);
  const topicTerms = getTermExpansions(tid);

  let papersHtml = '';
  let detailHtml = '';

  if (!activeCard) {
    papersHtml = `<div class="paper-list" id="paperList"></div>`;
  } else {
    detailHtml = renderCardDetail(tid);
  }

  center.innerHTML = `
    <div class="question-block">
      <div class="question-title">${topic.name}</div>
      <div class="question-tags" id="questionTags">
        ${tags.map((t, i) => `<span class="tag${i===0?' highlight':''}">${t}</span>`).join('')}
      </div>
    </div>
    <div class="term-block" id="termBlock">
      <span class="term-block-label">术语拓展</span>
      <div class="term-tags" id="termTags">
        ${topicTerms.map(t => `
          <span class="term-tag">${t.term}<span class="term-del" data-id="${t.id}">&times;</span></span>
        `).join('')}
      </div>
      <button class="btn" id="btnAddTerm">+ 新建</button>
      <button class="btn" id="btnAiExpand" title="AI 智能拓展术语">&#10025; AI 拓展</button>
    </div>
    <div class="research-dashboard" id="researchDashboard">
      ${cardDefs.map(c => `
        <div class="research-card${activeCard === c.key ? ' active' : ''}" data-card="${c.key}">
          <div class="research-card-icon">${c.icon}</div>
          <div class="research-card-title">${c.title}</div>
          <div class="research-card-desc">${c.desc}</div>
        </div>
      `).join('')}
    </div>
    <div id="cardDetailArea">${detailHtml}</div>
    ${papersHtml}
  `;

  renderPapers(topicPapers);

  document.getElementById('researchDashboard').addEventListener('click', function(e) {
    const card = e.target.closest('.research-card');
    if (!card) return;
    const key = card.dataset.card;
    activeCard = (activeCard === key) ? null : key;
    renderCenter(getSelectedTopic());
  });

  document.getElementById('btnAddTerm').addEventListener('click', function() {
    showTermModal(function(term) {
      const t = getSelectedTopic();
      termExpansions.push({ id: nextIdFor('termExpansions'), topicId: t.id, term });
      t.modifiedAt = Date.now();
      saveAll();
      renderCenter(t);
    });
  });
  document.getElementById('btnAiExpand').addEventListener('click', showAiExpandModal);
  document.getElementById('termTags').addEventListener('click', function(e) {
    const del = e.target.closest('.term-del');
    if (del) {
      const id = parseInt(del.dataset.id);
      termExpansions = termExpansions.filter(x => x.id !== id);
      const t = getSelectedTopic();
      t.modifiedAt = Date.now();
      saveAll();
      renderCenter(t);
      return;
    }
    const tag = e.target.closest('.term-tag');
    if (tag) {
      showTermSearchModal(tag.textContent.replace('×', '').trim());
    }
  });

  rebindOutlineEvents();
}

function renderPapers(papersList) {
  const container = document.getElementById('paperList');
  if (!container) return;
  container.innerHTML = papersList.map(p => `
    <div class="paper-card" data-id="${p.id}">
      <div class="paper-card-header">
        <div class="paper-title">${p.title}</div>
        <div class="paper-year">${p.year}</div>
      </div>
      <div class="paper-meta">
        <span>${p.authors}</span>
        <span style="font-weight:500">${p.journal}</span>
      </div>
      <div class="paper-abstract">${p.abstract}</div>
      <div class="paper-card-footer">
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <div class="paper-tags">
            ${p.tags.map(t => `<span class="paper-tag">${t}</span>`).join('')}
          </div>
          <span class="paper-theory">${p.theory}</span>
        </div>
        <div class="paper-actions">
          <button class="btn" title="查看详情">详情</button>
          <button class="btn" title="保存">保存</button>
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.paper-card').forEach(card => {
    card.addEventListener('click', function() {
      container.querySelectorAll('.paper-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
    });
  });
}

function renderCardDetail(tid) {
  switch (activeCard) {
    case 'papers':
      return `
        <div class="detail-block">
          <div class="detail-block-title">已有文献</div>
          <div class="paper-list" id="paperList"></div>
        </div>`;
    case 'theories':
      return `
        <div class="detail-block">
          <div class="detail-block-title">理论列表</div>
          <div class="detail-list">
            ${getTheories(tid).map(t => `<div class="detail-item"><span class="bullet"></span> ${t.name}</div>`).join('')}
          </div>
        </div>`;
    case 'variables':
      return `
        <div class="detail-block">
          <div class="detail-block-title">变量列表</div>
          <div class="detail-list">
            ${getVariables(tid).map(v => `<div class="detail-item"><span class="bullet"></span> ${v.name} <span class="var-role">(${v.role})</span></div>`).join('')}
          </div>
        </div>`;
    case 'methods':
      return `
        <div class="detail-block">
          <div class="detail-block-title">常用方法</div>
          <div class="detail-list">
            ${getMethods(tid).map(m => `<div class="detail-item"><span class="bullet"></span> ${m.name}</div>`).join('')}
          </div>
        </div>`;
    case 'structure':
      return `
        <div class="detail-block">
          <div class="detail-block-title">综述结构</div>
          <div class="detail-list">
            ${getStructures(tid).map(s => `<div class="detail-item"><span class="bullet"></span> ${s.sortOrder + 1}. ${s.name}</div>`).join('')}
          </div>
        </div>`;
    default:
      return '';
  }
}

function showTermModal(onSave) {
  const overlay = document.createElement('div');
  overlay.className = 'term-modal-overlay';
  overlay.innerHTML = `
    <div class="term-modal">
      <div class="term-modal-title">添加术语</div>
      <div class="term-modal-desc">输入与当前研究主题相关的学术术语，帮助拓展研究视野</div>
      <input type="text" id="termModalInput" placeholder="例如：信息不对称、代理成本、调整成本..." autofocus>
      <div class="term-modal-actions">
        <button class="btn btn-cancel" id="termModalCancel">取消</button>
        <button class="btn btn-primary" id="termModalSave">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#termModalInput');
  const close = () => overlay.remove();

  overlay.querySelector('#termModalCancel').addEventListener('click', close);
  overlay.querySelector('#termModalSave').addEventListener('click', function() {
    const val = input.value.trim();
    if (!val) { input.focus(); return; }
    onSave(val);
    close();
  });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const val = input.value.trim();
      if (!val) return;
      onSave(val);
      close();
    } else if (e.key === 'Escape') {
      close();
    }
  });
  input.focus();
}

function showTermSearchModal(termText) {
  const parts = parseTermParts(termText);
  const searches = [];
  if (parts.cn) searches.push({ label: '中文', query: parts.cn });
  if (parts.en) searches.push({ label: '英文', query: parts.en });

  let step = 1; // 1: confirm, 2: loading, 3: results
  let allPapers = [];

  const overlay = document.createElement('div');
  overlay.className = 'ai-modal-overlay';

  function render() {
    let bodyHtml = '';
    let actionsHtml = '';

    if (step === 1) {
      bodyHtml = `
        <div class="ai-modal-step-desc">将针对以下术语检索论文</div>
        <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:8px">${escapeHtml(termText)}</div>
        ${searches.map(s => `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:2px">· ${s.label}检索：${escapeHtml(s.query)}</div>`).join('')}
        <div style="font-size:12px;color:var(--text-tertiary);margin-top:8px">检索平台：OpenAlex + Semantic Scholar</div>
      `;
      actionsHtml = `
        <button class="btn btn-cancel" id="tsBtnCancel">取消</button>
        <button class="btn btn-primary" id="tsBtnSearch">检索</button>
      `;
    } else if (step === 2) {
      bodyHtml = `
        <div class="ai-modal-loading">
          <div class="ai-modal-spinner"></div>
          <div>正在检索文献...</div>
        </div>
      `;
      actionsHtml = `<button class="btn btn-cancel" id="tsBtnAbort">取消</button>`;
    } else if (step === 3) {
      let resultHtml = '';
      const sources = ['OpenAlex', 'Semantic Scholar'];
      sources.forEach(src => {
        const papers = allPapers.filter(p => p.source === src);
        if (!papers.length) return;
        resultHtml += `<div class="ai-result-section-title">${src} (${papers.length})</div>`;
        papers.forEach((p, i) => {
          const globalIdx = allPapers.indexOf(p);
          resultHtml += `
            <label class="ai-result-item">
              <input type="checkbox" data-idx="${globalIdx}" checked>
              <span>
                <b>${escapeHtml(p.title)}</b>
                <div style="font-size:11px;color:var(--text-tertiary);margin-top:1px">
                  ${[p.authors, p.year, p.journal].filter(Boolean).join(' · ')}
                </div>
              </span>
            </label>`;
        });
      });
      if (!allPapers.length) {
        resultHtml = `<div style="color:var(--text-tertiary);text-align:center;padding:24px">未找到相关论文</div>`;
      }
      bodyHtml = `
        <label>检索结果（勾选想保存的论文）</label>
        <div class="ai-modal-results" id="tsResultsList">${resultHtml}</div>
      `;
      actionsHtml = `
        <button class="btn btn-cancel" id="tsBtnClose">关闭</button>
        <button class="btn" id="tsBtnBack">返回</button>
        <button class="btn btn-primary" id="tsBtnSave">保存选中</button>
      `;
    }

    overlay.innerHTML = `
      <div class="ai-modal">
        <div class="ai-modal-header">文献检索</div>
        <div class="ai-modal-body">${bodyHtml}</div>
        <div class="ai-modal-actions">${actionsHtml}</div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    if (step === 1) {
      overlay.querySelector('#tsBtnCancel').onclick = () => overlay.remove();
      overlay.querySelector('#tsBtnSearch').onclick = async () => {
        step = 2; render();
        const promises = [];
        searches.forEach(s => {
          promises.push(searchOpenAlex(s.query));
          promises.push(searchSemanticScholar(s.query));
        });
        const results = await Promise.allSettled(promises);
        allPapers = [];
        results.forEach(r => {
          if (r.status === 'fulfilled') allPapers.push(...r.value);
        });
        // Deduplicate by title
        const seen = new Set();
        allPapers = allPapers.filter(p => {
          const key = p.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        step = 3; render();
      };
    } else if (step === 2) {
      overlay.querySelector('#tsBtnAbort').onclick = () => overlay.remove();
    } else if (step === 3) {
      overlay.querySelector('#tsBtnClose').onclick = () => overlay.remove();
      overlay.querySelector('#tsBtnBack').onclick = () => { step = 1; render(); };
      overlay.querySelector('#tsBtnSave').onclick = () => {
        const checks = overlay.querySelectorAll('#tsResultsList input:checked');
        if (checks.length === 0) { overlay.remove(); return; }
        const t = getSelectedTopic();
        checks.forEach(cb => {
          const p = allPapers[parseInt(cb.dataset.idx)];
          papers.push({
            id: nextIdFor('papers'),
            topicId: t.id,
            title: p.title,
            authors: p.authors || '',
            journal: p.journal || '',
            year: p.year || '',
            abstract: '',
            tags: [termText],
            theory: ''
          });
        });
        t.modifiedAt = Date.now();
        saveAll();
        renderCenter(t);
        overlay.remove();
      };
    }
  }

  document.body.appendChild(overlay);
  render();
}

function parseTermParts(text) {
  const m = text.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (m) return { cn: m[1].trim(), en: m[2].trim() };
  if (/[一-鿿]/.test(text)) return { cn: text.trim(), en: null };
  return { cn: null, en: text.trim() };
}

// ── AI API ──

function showAiExpandModal() {
  const config = loadAiConfig();
  let step = 1; // 1: input term, 2: config, 3: loading/results
  let aiResults = { terms: [], theories: [], research_directions: [], variables: [] };
  let termInput = document.getElementById('searchInput').value.trim();
  let abortController = null;

  const overlay = document.createElement('div');
  overlay.className = 'ai-modal-overlay';

  function render() {
    let bodyHtml = '';
    let actionsHtml = '';

    if (step === 1) {
      bodyHtml = `
        <div class="ai-modal-step-desc">输入一个核心概念，AI 将围绕它拓展相关学术术语</div>
        <label>研究关键词</label>
        <input type="text" id="aiTermInput" value="${escapeHtml(termInput)}" placeholder="例如：成本粘性、ESG...">
        <div class="ai-modal-config-toggle" id="aiConfigToggle">&#9881; 配置 API（模型、地址、密钥）</div>
      `;
      actionsHtml = `
        <button class="btn btn-cancel" id="aiBtnCancel">取消</button>
        <button class="btn btn-primary" id="aiBtnNext">下一步</button>
      `;
    } else if (step === 2) {
      bodyHtml = `
        <label>API 密钥</label>
        <input type="password" id="aiApiKey" value="${escapeHtml(config.apiKey)}" placeholder="sk-...">
        <label>API 地址</label>
        <input type="text" id="aiBaseUrl" value="${escapeHtml(config.baseUrl)}" placeholder="https://api.openai.com/v1">
        <label>模型名称</label>
        <input type="text" id="aiModel" value="${escapeHtml(config.model)}" placeholder="gpt-4o">
        <div class="ai-modal-step-desc" style="margin-top:8px;">配置自动保存到浏览器，下次无需重新填写</div>
      `;
      actionsHtml = `
        <button class="btn btn-cancel" id="aiBtnCancel">取消</button>
        <button class="btn" id="aiBtnBack">上一步</button>
        <button class="btn btn-primary" id="aiBtnStart">开始拓展</button>
      `;
    } else if (step === 3) {
      bodyHtml = `
        <div class="ai-modal-loading">
          <div class="ai-modal-spinner"></div>
          <div>AI 正在分析"${escapeHtml(termInput)}"...</div>
        </div>
      `;
      actionsHtml = `<button class="btn btn-cancel" id="aiBtnAbort">取消</button>`;
    } else if (step === 4) {
      const sections = [
        { key: 'terms', label: '学术术语' },
        { key: 'theories', label: '理论名称' },
        { key: 'research_directions', label: '研究方向' },
        { key: 'variables', label: '变量相关' }
      ];
      let resultHtml = '';
      sections.forEach(sec => {
        const items = aiResults[sec.key] || [];
        if (!items.length) return;
        resultHtml += `<div class="ai-result-section-title">${sec.label}</div>`;
        items.forEach((t, i) => {
          resultHtml += `
            <label class="ai-result-item">
              <input type="checkbox" data-cat="${sec.key}" data-idx="${i}" checked>
              <span>${escapeHtml(t)}</span>
            </label>`;
        });
      });
      bodyHtml = `
        <label>AI 返回的术语（勾选你想要保存的）</label>
        <div style="display:flex;gap:6px;margin-bottom:6px">
          <button class="btn" id="aiSelectAll" style="height:26px;font-size:12px;padding:0 10px">全选</button>
          <button class="btn" id="aiInvert" style="height:26px;font-size:12px;padding:0 10px">反选</button>
        </div>
        <div class="ai-modal-results" id="aiResultsList">${resultHtml}</div>
      `;
      actionsHtml = `
        <button class="btn btn-cancel" id="aiBtnCancel">取消</button>
        <button class="btn" id="aiBtnBack">重试</button>
        <button class="btn btn-primary" id="aiBtnSave">保存选中</button>
      `;
    } else if (step === 5) {
      bodyHtml = `
        <div class="ai-modal-error" id="aiErrorMsg"></div>
      `;
      actionsHtml = `
        <button class="btn btn-cancel" id="aiBtnCancel">关闭</button>
        <button class="btn" id="aiBtnBack">重试</button>
      `;
    }

    overlay.innerHTML = `
      <div class="ai-modal">
        <div class="ai-modal-header">AI 术语拓展</div>
        <div class="ai-modal-body">${bodyHtml}</div>
        <div class="ai-modal-actions">${actionsHtml}</div>
      </div>
    `;

    bindAiEvents();
  }

  async function launchAiExpand() {
    abortController = new AbortController();
    step = 3;
    render();
    let errorMsg = '';
    try {
      aiResults = await callAiExpand(termInput, config, abortController.signal);
      overlay.querySelector('.ai-modal-body').innerHTML =
        `<div class="ai-modal-loading"><div class="ai-modal-spinner"></div><div>正在进行学术翻译...</div></div>`;
      try {
        aiResults = await translateAiResults(aiResults, config, abortController.signal);
      } catch (transErr) {
        console.warn('Translation failed, using original results:', transErr);
      }
      const hasAny = aiResults.terms.length + aiResults.theories.length + aiResults.research_directions.length + aiResults.variables.length > 0;
      step = hasAny ? 4 : 5;
      if (step === 5) errorMsg = 'AI 未返回任何术语，请尝试换个关键词或调整模型。';
    } catch (err) {
      if (err.name === 'AbortError') return;
      step = 5;
      aiResults = { terms: [], theories: [], research_directions: [], variables: [] };
      errorMsg = err.message;
    }
    render();
    if (errorMsg) overlay.querySelector('#aiErrorMsg').textContent = errorMsg;
  }

  function bindAiEvents() {
    if (step === 1) {
      overlay.querySelector('#aiBtnCancel').onclick = () => overlay.remove();
      overlay.querySelector('#aiBtnNext').onclick = () => {
        termInput = overlay.querySelector('#aiTermInput').value.trim();
        if (!termInput) { overlay.querySelector('#aiTermInput').focus(); return; }
        if (config.apiKey && config.baseUrl && config.model) {
          launchAiExpand();
        } else {
          const toggle = overlay.querySelector('#aiConfigToggle');
          toggle.classList.add('ai-config-highlight');
          const existing = overlay.querySelector('#aiConfigWarning');
          if (!existing) {
            const warn = document.createElement('div');
            warn.id = 'aiConfigWarning';
            warn.style.cssText = 'color:#e67e22;font-size:12px;margin-top:4px';
            warn.textContent = '请先配置 API →';
            toggle.parentNode.insertBefore(warn, toggle);
          }
        }
      };
      overlay.querySelector('#aiConfigToggle').onclick = () => {
        const val = overlay.querySelector('#aiTermInput').value.trim();
        if (val) termInput = val;
        step = 2; render();
      };
      overlay.querySelector('#aiTermInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') overlay.querySelector('#aiBtnNext').click();
      });
    } else if (step === 2) {
      overlay.querySelector('#aiBtnCancel').onclick = () => overlay.remove();
      overlay.querySelector('#aiBtnBack').onclick = () => { step = 1; render(); };
      overlay.querySelector('#aiBtnStart').onclick = () => {
        config.apiKey = overlay.querySelector('#aiApiKey').value.trim();
        config.baseUrl = overlay.querySelector('#aiBaseUrl').value.trim();
        config.model = overlay.querySelector('#aiModel').value.trim();
        if (!config.apiKey) { alert('请输入 API 密钥'); return; }
        if (!config.baseUrl) { alert('请输入 API 地址'); return; }
        if (!config.model) { alert('请输入模型名称'); return; }
        saveAiConfig(config);
        launchAiExpand();
      };
      [overlay.querySelector('#aiApiKey'), overlay.querySelector('#aiBaseUrl'), overlay.querySelector('#aiModel')].forEach(el => {
        el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') overlay.querySelector('#aiBtnStart').click();
        });
      });
    } else if (step === 3) {
      overlay.querySelector('#aiBtnAbort').onclick = () => {
        abortController.abort();
        step = 1;
        render();
      };
    } else if (step === 4) {
      overlay.querySelector('#aiBtnCancel').onclick = () => overlay.remove();
      overlay.querySelector('#aiBtnBack').onclick = () => { step = 2; render(); };
      overlay.querySelector('#aiSelectAll').onclick = () => {
        overlay.querySelectorAll('#aiResultsList input[type="checkbox"]').forEach(cb => { cb.checked = true; });
      };
      overlay.querySelector('#aiInvert').onclick = () => {
        overlay.querySelectorAll('#aiResultsList input[type="checkbox"]').forEach(cb => { cb.checked = !cb.checked; });
      };
      overlay.querySelector('#aiBtnSave').onclick = () => {
        const checks = overlay.querySelectorAll('#aiResultsList input:checked');
        if (checks.length === 0) { overlay.remove(); return; }
        const t = getSelectedTopic();
        checks.forEach(cb => {
          const term = aiResults[cb.dataset.cat][parseInt(cb.dataset.idx)];
          termExpansions.push({ id: nextIdFor('termExpansions'), topicId: t.id, term });
        });
        t.modifiedAt = Date.now();
        saveAll();
        renderCenter(t);
        overlay.remove();
      };
    } else if (step === 5) {
      overlay.querySelector('#aiBtnCancel').onclick = () => overlay.remove();
      overlay.querySelector('#aiBtnBack').onclick = () => { step = 2; render(); };
    }

  }

  document.body.appendChild(overlay);
  render();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function rebindOutlineEvents() {
  const outlineEl = document.querySelector('.outline-tree');
  if (outlineEl) {
    outlineEl.addEventListener('click', function(e) {
      const node = e.target.closest('.outline-node');
      if (!node) return;
      this.querySelectorAll('.outline-node').forEach(n => { n.style.color = ''; n.style.fontWeight = ''; });
      node.style.color = 'var(--text)';
      node.style.fontWeight = '600';
    });
  }
}

// ═══════════════════════ HEADER BUTTONS ═══════════════════════
function handleSearch() { alert('实现中'); }

function handleNewResearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) { alert('请输入研究主题'); return; }

  const existing = topics.find(t => t.name === q);
  if (existing) { selectTopic(existing.id); return; }

  const tid = nextIdFor('topics');
  const now = Date.now();
  topics.push({ id: tid, name: q, createdAt: now, modifiedAt: now });
  ["Abstract", "Introduction", "Theoretical Framework", "Literature Review", "Research Gaps", "Future Directions", "Conclusion"]
    .forEach((s, i) => structures.push({ id: nextIdFor('structures'), topicId: tid, name: s, sortOrder: i }));
  saveAll();
  activeCard = 'papers';
  selectTopic(tid);
}

// ═══════════════════════ SIDEBAR & SEARCH ═══════════════════════
document.querySelector('.sidebar').addEventListener('click', function(e) {
  const item = e.target.closest('.sidebar-item');
  if (!item) return;
  const id = parseInt(item.dataset.topicId);
  if (!id) return;
  activeCard = 'papers';
  selectTopic(id);
});

document.getElementById('searchInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') handleSearch();
});

// ═══════════════════════ INIT ═══════════════════════
if (topics.length > 0) selectedTopicId = topics[0].id;
renderSidebar();
renderCenter(getSelectedTopic());
