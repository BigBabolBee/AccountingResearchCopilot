let selectedTopicId = topics[0] ? topics[0].id : null;
let activeCard = 'papers';
let rightPanelMode = 'list';   // 'list' | 'detail'
let rightPanelTerm = null;     // current term name in detail mode

// ═══════════════════════ SIDEBAR ═══════════════════════
function renderSidebar() {
  const topicList = document.getElementById('topicList');
  const recentList = document.getElementById('recentList');

  const byCreation = [...topics].sort((a, b) => a.createdAt - b.createdAt);
  const uid = currentUser?.id;
  topicList.innerHTML = byCreation.map(t => `
    <div class="sidebar-item${t.id === selectedTopicId ? ' active' : ''}" data-topic-id="${t.id}">
      ${t.name}${t.name === "ESG 如何影响成本粘性" ? ' <span style="font-size:10px;color:var(--text-tertiary);margin-left:4px">(示例)</span>' : ''}
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
  db.updateTopic(id, {});
  document.getElementById('searchInput').value = topic.name;
  rightPanelMode = 'list';
  rightPanelTerm = null;
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
      ${topic.name === "ESG 如何影响成本粘性" ? '<div class="demo-badge">示例数据 · 可自由修改或删除</div>' : ''}
      <div class="question-tags" id="questionTags" style="margin-top:12px">
        ${tags.map((t, i) => `<span class="tag${i===0?' highlight':''}">${t}</span>`).join('')}
      </div>
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

  rebindOutlineEvents();
  renderRightPanel(topic);
}

function renderRightPanel(topic) {
  const panel = document.getElementById('rightPanel');
  if (!panel) return;
  const tid = topic ? topic.id : null;
  const allTerms = tid ? getTermExpansions(tid) : [];

  if (rightPanelMode === 'list' || !rightPanelTerm) {
    renderTermList(panel, topic, allTerms);
  } else {
    renderTermDetail(panel, topic, allTerms);
  }
}

function renderTermList(panel, topic, allTerms) {
  // Group terms by parentTerm (fallback to term itself)
  const groups = {};
  allTerms.forEach(t => {
    const key = t.parentTerm || t.term;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const entries = Object.entries(groups).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  let listHtml = '';
  entries.forEach(([name, items]) => {
    listHtml += `
      <div class="term-list-item" data-term="${escapeHtml(name)}">
        <span class="term-list-item-name">${escapeHtml(name)}</span>
        <span class="term-list-item-count">${items.length}</span>
      </div>`;
  });
  if (!listHtml) listHtml = '<div class="right-panel-empty">暂无术语，使用 AI 拓展或手动新建</div>';

  panel.innerHTML = `
    <div class="right-panel-header">
      <div class="right-panel-subtitle">术语知识网络</div>
    </div>
    <div class="term-list" id="termList">${listHtml}</div>
    <div class="right-panel-actions">
      <button class="btn" id="btnAddRootTerm">+ 新建术语</button>
      <button class="btn" id="btnAiExpand" title="AI 智能拓展术语">AI 拓展</button>
    </div>
  `;

  // Bind term list item click → drill down
  panel.querySelectorAll('.term-list-item').forEach(item => {
    item.addEventListener('click', function() {
      rightPanelMode = 'detail';
      rightPanelTerm = this.dataset.term;
      renderRightPanel(getSelectedTopic());
    });
  });

  // Bind + root term
  panel.querySelector('#btnAddRootTerm').addEventListener('click', function() {
    showTermModal('term', async function(term) {
      const t = getSelectedTopic();
      await db.createTermExpansion(t.id, { term, category: 'term' });
      t.modifiedAt = Date.now();
      db.updateTopic(t.id, {});
      renderRightPanel(t);
    });
  });

  panel.querySelector('#btnAiExpand').addEventListener('click', showAiExpandModal);
}

function renderTermDetail(panel, topic, allTerms) {
  const curTerm = rightPanelTerm;
  const myTerms = allTerms.filter(t => (t.parentTerm || t.term) === curTerm);

  const synonyms = myTerms.filter(t => !t.category || t.category === 'term' || t.category === 'synonym');
  const clusters = myTerms.filter(t => t.category === 'cluster');
  const gaps = myTerms.filter(t => t.category === 'gap');

  function renderTags(terms, tagClass) {
    if (!terms.length) return '<div class="right-panel-empty">暂无</div>';
    return terms.map(t =>
      `<span class="term-tag ${tagClass}">${escapeHtml(t.term)}<span class="term-del" data-id="${t.id}">&times;</span></span>`
    ).join('');
  }

  panel.innerHTML = `
    <div class="right-panel-header">
      <button class="right-panel-back" id="btnBackToList">&larr; 术语知识网络</button>
      <div class="right-panel-current-term">${escapeHtml(curTerm)}</div>
    </div>
    <div class="right-panel-section section-syn">
      <div class="right-panel-section-title">
        术语词库<button class="btn-add-section" data-cat="term" title="添加术语">+</button>
      </div>
      <div class="term-tags" id="sectionSynonyms">${renderTags(synonyms, 'tag-syn')}</div>
    </div>
    <div class="right-panel-section section-cluster">
      <div class="right-panel-section-title">
        关系网络<button class="btn-add-section" data-cat="cluster" title="添加关系术语">+</button>
      </div>
      <div class="term-tags" id="sectionClusters">${renderTags(clusters, 'tag-cluster')}</div>
    </div>
    <div class="right-panel-section section-gap">
      <div class="right-panel-section-title">
        研究缺口<button class="btn-add-section" data-cat="gap" title="添加研究缺口">+</button>
      </div>
      <div class="term-tags" id="sectionGaps">${renderTags(gaps, 'tag-gap')}</div>
    </div>
    <div class="right-panel-actions">
      <button class="btn" id="btnAiExpand" title="AI 智能拓展术语">AI 拓展</button>
    </div>
  `;

  // Back button
  panel.querySelector('#btnBackToList').addEventListener('click', function() {
    rightPanelMode = 'list';
    rightPanelTerm = null;
    renderRightPanel(getSelectedTopic());
  });

  // Bind term delete + search click
  panel.querySelectorAll('.term-tags').forEach(section => {
    section.addEventListener('click', async function(e) {
      const del = e.target.closest('.term-del');
      if (del) {
        const id = del.dataset.id;
        await db.deleteTermExpansion(id);
        const t = getSelectedTopic();
        t.modifiedAt = Date.now();
        db.updateTopic(t.id, {});
        renderRightPanel(t);
        return;
      }
      const tag = e.target.closest('.term-tag');
      if (tag) {
        showTermSearchModal(tag.textContent.replace('×', '').trim());
      }
    });
  });

  // Bind per-section "+" buttons
  panel.querySelectorAll('.btn-add-section').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const cat = this.dataset.cat;
      showTermModal(cat, async function(term) {
        const t = getSelectedTopic();
        await db.createTermExpansion(t.id, { term, category: cat, parentTerm: curTerm });
        t.modifiedAt = Date.now();
        db.updateTopic(t.id, {});
        renderRightPanel(t);
      });
    });
  });

  panel.querySelector('#btnAiExpand').addEventListener('click', function() {
    showAiExpandModal(curTerm);
  });
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

function showTermModal(category, onSave) {
  const catLabels = { term: '术语词库', synonym: '术语词库', cluster: '关系网络', gap: '研究缺口' };
  const catLabel = catLabels[category] || '术语词库';
  const overlay = document.createElement('div');
  overlay.className = 'term-modal-overlay';
  overlay.innerHTML = `
    <div class="term-modal">
      <div class="term-modal-title">添加到 · ${catLabel}</div>
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

  const saveBtn = overlay.querySelector('#termModalSave');
  const cancelBtn = overlay.querySelector('#termModalCancel');

  async function doSave(term) {
    const config = loadAiConfig();
    if (config.apiKey && config.baseUrl && config.model) {
      input.disabled = true;
      saveBtn.disabled = true;
      saveBtn.textContent = '翻译中...';
      try {
        term = await translateTerm(term, config);
      } catch (e) {
        // Fallback: use original term if translation fails
      }
    }
    onSave(term);
    close();
  }

  cancelBtn.addEventListener('click', close);
  saveBtn.addEventListener('click', function() {
    const val = input.value.trim();
    if (!val) { input.focus(); return; }
    doSave(val);
  });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const val = input.value.trim();
      if (!val) return;
      doSave(val);
    } else if (e.key === 'Escape') {
      close();
    }
  });
  input.focus();
}

function showInviteModal() {
  const topic = getSelectedTopic();
  if (!topic || topic.userId !== currentUser?.id) return;

  const overlay = document.createElement('div');
  overlay.className = 'ai-modal-overlay';

  async function render(members) {
    const memberRows = (members || []).map(m => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;font-size:13px;border-bottom:1px solid var(--border)">
        <span>${escapeHtml(m.email || m.user_id)} <span style="color:var(--text-tertiary);font-size:11px">(${m.role})</span></span>
        <button class="btn" style="height:24px;font-size:11px;padding:0 8px" data-remove="${m.user_id}">移除</button>
      </div>`).join('') || '<div style="color:var(--text-tertiary);font-size:12px;padding:8px">暂无协作者</div>';

    overlay.innerHTML = `
      <div class="ai-modal">
        <div class="ai-modal-header">邀请协作</div>
        <div class="ai-modal-body">
          <label>当前协作者</label>
          <div id="inviteMemberList" style="max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">${memberRows}</div>
          <label style="margin-top:12px">通过邮箱邀请</label>
          <div style="display:flex;gap:6px">
            <input type="email" id="inviteEmail" placeholder="输入对方注册邮箱..." style="flex:1">
            <select id="inviteRole" style="width:100px;border:1px solid var(--border);border-radius:var(--radius-sm);padding:0 6px;font-size:13px">
              <option value="viewer">只读</option>
              <option value="editor">编辑</option>
            </select>
          </div>
          <div id="inviteError" style="font-size:12px;color:#c0392b;margin-top:4px"></div>
        </div>
        <div class="ai-modal-actions">
          <button class="btn btn-cancel" id="inviteClose">关闭</button>
          <button class="btn btn-primary" id="inviteSend">发送邀请</button>
        </div>
      </div>`;

    // Bind remove buttons
    overlay.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', async function() {
        await db.removeTopicMember(topic.id, this.dataset.remove);
        const updated = await db.getTopicMembers(topic.id);
        render(updated);
      });
    });

    // Bind close
    overlay.querySelector('#inviteClose').addEventListener('click', () => overlay.remove());

    // Bind send
    overlay.querySelector('#inviteSend').addEventListener('click', async () => {
      const email = overlay.querySelector('#inviteEmail').value.trim();
      const role = overlay.querySelector('#inviteRole').value;
      const errEl = overlay.querySelector('#inviteError');
      if (!email) { errEl.textContent = '请输入邮箱'; return; }
      const user = await db.lookupUserByEmail(email);
      if (!user) { errEl.textContent = '未找到该用户，请确认对方已注册'; return; }
      if (user.user_id === currentUser.id) { errEl.textContent = '不能邀请自己'; return; }
      try {
        await db.addTopicMember(topic.id, user.user_id, role, currentUser.id);
        errEl.textContent = '';
        overlay.querySelector('#inviteEmail').value = '';
        const updated = await db.getTopicMembers(topic.id);
        render(updated);
      } catch (e) {
        errEl.textContent = e.message || '邀请失败，可能对方已是协作者';
      }
    });
  }

  document.body.appendChild(overlay);
  db.getTopicMembers(topic.id).then(members => render(members));
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
      overlay.querySelector('#tsBtnSave').onclick = async () => {
        const checks = overlay.querySelectorAll('#tsResultsList input:checked');
        if (checks.length === 0) { overlay.remove(); return; }
        const t = getSelectedTopic();
        for (const cb of checks) {
          const p = allPapers[parseInt(cb.dataset.idx)];
          await db.createPaper(t.id, {
            title: p.title, authors: p.authors || '', journal: p.journal || '',
            year: p.year || '', abstract: '', tags: [termText], theory: ''
          });
        }
        t.modifiedAt = Date.now();
        db.updateTopic(t.id, {});
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

function showAiExpandModal(prefillTerm) {
  const config = loadAiConfig();
  let step = 1; // 1: input term, 2: config, 3: loading/results
  let aiResults = { core_term_cn: '', core_term_en: '', definition_cn: '', synonyms: [], relation_clusters: [], gaps: [] };
  let termInput = prefillTerm || document.getElementById('searchInput').value.trim();
  let abortController = null;

  const overlay = document.createElement('div');
  overlay.className = 'ai-modal-overlay';

  function render() {
    let bodyHtml = '';
    let actionsHtml = '';

    if (step === 1) {
      bodyHtml = `
        <div class="ai-modal-step-desc">输入一个学术术语，AI 将生成结构化的知识网络</div>
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
          <div>正在分析"${escapeHtml(termInput)}"...</div>
        </div>
      `;
      actionsHtml = `<button class="btn btn-cancel" id="aiBtnAbort">取消</button>`;
    } else if (step === 4) {
      let flatItems = [];
      let resultHtml = '';

      // Core header
      resultHtml += `<div style="font-weight:700;font-size:16px;margin-bottom:2px">${escapeHtml(aiResults.core_term_cn || termInput)}${aiResults.core_term_en ? ' <span style="font-weight:400;color:var(--text-tertiary);font-size:14px">(' + escapeHtml(aiResults.core_term_en) + ')</span>' : ''}</div>`;
      if (aiResults.definition_cn) {
        resultHtml += `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;line-height:1.5">${escapeHtml(aiResults.definition_cn)}</div>`;
      }

      // Layer 1: Synonyms
      const syns = aiResults.synonyms || [];
      if (syns.length) {
        resultHtml += `<div class="ai-result-section-title">第一层 · 基础词库式扩展</div>`;
        syns.forEach((s, i) => {
          const label = s.name_cn + (s.name_en ? ' (' + s.name_en + ')' : '');
          const hint = s.relation_type ? ` <span style="color:var(--text-tertiary);font-size:11px">${escapeHtml(s.relation_type)}</span>` : '';
          flatItems.push({ sec: 'syn', idx: i, text: label, category: 'synonym' });
          resultHtml += `<label class="ai-result-item"><input type="checkbox" data-fi="${flatItems.length - 1}" checked><span>${escapeHtml(label)}${hint}</span></label>`;
        });
      }

      // Layer 2: Relation Clusters
      (aiResults.relation_clusters || []).forEach(cluster => {
        if (!(cluster.terms || []).length) return;
        resultHtml += `<div class="ai-result-section-title">第二层 · ${escapeHtml(cluster.cluster_name_cn || cluster.cluster_type)}</div>`;
        cluster.terms.forEach((t, i) => {
          const label = t.name_cn + (t.name_en ? ' (' + t.name_en + ')' : '');
          const hint = t.relation_hint ? ` <span style="color:var(--text-tertiary);font-size:11px">— ${escapeHtml(t.relation_hint)}</span>` : '';
          flatItems.push({ sec: 'cluster', key: cluster.cluster_type, idx: i, text: label, category: 'cluster' });
          resultHtml += `<label class="ai-result-item"><input type="checkbox" data-fi="${flatItems.length - 1}" checked><span>${escapeHtml(label)}${hint}</span></label>`;
        });
      });

      // Layer 3: Gaps
      const gaps = aiResults.gaps || [];
      if (gaps.length) {
        resultHtml += `<div class="ai-result-section-title">第三层 · 启发性"缺口"式扩展</div>`;
        const typeLabels = { emerging: '新兴方向', controversy: '争议地带', reverse_thinking: '反向思维' };
        gaps.forEach((g, i) => {
          const typeLabel = typeLabels[g.type] || g.type;
          const label = `[${typeLabel}] ${g.prompt_cn}`;
          flatItems.push({ sec: 'gap', idx: i, text: label, category: 'gap' });
          resultHtml += `<label class="ai-result-item"><input type="checkbox" data-fi="${flatItems.length - 1}" checked><span>${escapeHtml(label)}</span></label>`;
        });
      }

      if (!flatItems.length) {
        resultHtml += `<div style="color:var(--text-tertiary);text-align:center;padding:24px">AI 未返回可保存的术语</div>`;
      }

      overlay._flatItems = flatItems;
      bodyHtml = `
        <label>AI 术语知识网络</label>
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
      const hasAny = (aiResults.synonyms || []).length > 0
        || (aiResults.relation_clusters || []).some(c => (c.terms || []).length > 0)
        || (aiResults.gaps || []).length > 0;
      step = hasAny ? 4 : 5;
      if (step === 5) errorMsg = 'AI 未返回任何术语，请尝试换个关键词或调整模型。';
    } catch (err) {
      if (err.name === 'AbortError') return;
      step = 5;
      aiResults = { core_term_cn: '', core_term_en: '', definition_cn: '', synonyms: [], relation_clusters: [], gaps: [] };
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
        if (!termInput) { step = 1; render(); return; }
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
      overlay.querySelector('#aiBtnSave').onclick = async () => {
        const checks = overlay.querySelectorAll('#aiResultsList input:checked');
        if (checks.length === 0) { overlay.remove(); return; }
        const t = getSelectedTopic();
        const items = overlay._flatItems || [];
        const parentTerm = aiResults.core_term_cn || termInput;
        for (const cb of checks) {
          const item = items[parseInt(cb.dataset.fi)];
          if (item) await db.createTermExpansion(t.id, { term: item.text, category: item.category || 'term', parentTerm });
        }
        t.modifiedAt = Date.now();
        db.updateTopic(t.id, {});
        rightPanelMode = 'detail';
        rightPanelTerm = parentTerm;
        renderRightPanel(t);
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

async function handleNewResearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) { alert('请输入研究主题'); return; }

  const existing = topics.find(t => t.name === q);
  if (existing) { selectTopic(existing.id); return; }

  const tid = await db.createTopic(q);
  for (const [i, s] of ["Abstract", "Introduction", "Theoretical Framework", "Literature Review", "Research Gaps", "Future Directions", "Conclusion"].entries()) {
    await db.createStructure(tid, s, i);
  }
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
function initUI() {
  if (topics.length > 0) selectedTopicId = topics[0].id;
  renderSidebar();
  renderCenter(getSelectedTopic());
}
