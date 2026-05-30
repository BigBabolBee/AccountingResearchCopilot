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

  const addItemBtn = document.getElementById('addCardItem');
  if (addItemBtn) {
    addItemBtn.addEventListener('click', function() {
      showCardItemModal(this.dataset.card);
    });
  }

  // PDF upload
  const uploadBtn = document.getElementById('uploadPdfBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', function() {
      document.getElementById('pdfFileInput').click();
    });
    document.getElementById('pdfFileInput').addEventListener('change', function() {
      handlePdfUpload(this.files[0]);
    });
  }

  rebindOutlineEvents();
  renderRightPanel(topic);
}

function renderRightPanel(topic) {
  const panel = document.getElementById('rightPanelContent');
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

  panel.querySelector('#btnAiExpand').addEventListener('click', function() { showAiExpandModal(); });
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
          <button class="btn btn-detail" data-action="detail" data-id="${p.id}">详情</button>
          <button class="btn btn-delete" data-action="delete" data-id="${p.id}">删除</button>
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-detail').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.dataset.id;
      const paper = papersList.find(p => p.id === id);
      if (paper) showPaperDetailModal(paper);
    });
  });

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      const id = this.dataset.id;
      if (!confirm('确定要删除这篇文献吗？')) return;
      try {
        await db.deletePaper(id);
        renderCenter(getSelectedTopic());
      } catch (err) {
        alert('删除失败：' + (err.message || '网络错误，请稍后重试'));
      }
    });
  });

  container.querySelectorAll('.paper-card').forEach(card => {
    card.addEventListener('click', function() {
      container.querySelectorAll('.paper-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
    });
  });
}

function showPaperDetailModal(paper) {
  var overlay = document.createElement('div');
  overlay.className = 'term-modal-overlay';

  function buildExtraction() {
    var h = '<div style="border-top:1px solid var(--border);padding-top:18px;margin-top:2px">';
    // 1. Research Topic
    h += '<div style="margin-bottom:14px">';
    h += '<div style="font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">&#127891; Research Topic</div>';
    h += '<div id="ext-researchTopic" class="ext-editable" style="font-size:13px;color:var(--text);line-height:1.6;min-height:20px;padding:6px 10px;border:1px solid transparent;border-radius:4px;transition:border-color 0.15s">' + escapeHtml(paper.researchTopic||'点击添加研究主题') + '</div>';
    h += '</div>';
    // 2+3. Two columns
    h += '<div style="display:flex;gap:20px;margin-bottom:14px">';
    h += '<div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">&#128218; Core Concepts</div><div id="ext-coreConcepts" class="ext-array"></div></div>';
    h += '<div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">&#127758; Theories</div><div id="ext-extractionTheories" class="ext-array"></div></div>';
    h += '</div>';
    // 4. Variables
    h += '<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">&#128200; Variables</div><div id="ext-extractionVariables" class="ext-array"></div></div>';
    // 5. Relationships
    h += '<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">&#128279; Research Relationships</div><div id="ext-relationships" class="ext-array"></div></div>';
    // 6. Evidence
    h += '<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">&#128220; Evidence Sentences</div><div id="ext-evidence" class="ext-array"></div></div>';
    h += '</div>';
    return h;
  }

  // Build basic info
  var tagsHtml = '';
  if (paper.tags && paper.tags.length) {
    tagsHtml = '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">';
    paper.tags.forEach(function(t) { tagsHtml += '<span style="font-size:11px;background:#edf2f9;color:#4a6fa5;padding:3px 8px;border-radius:3px">' + escapeHtml(t) + '</span>'; });
    tagsHtml += '</div>';
  }

  var theoryHtml = '';
  if (paper.theory) {
    theoryHtml = '<div style="font-size:12px;color:var(--text-tertiary);margin-bottom:10px">&#127979; 理论基础：' + escapeHtml(paper.theory) + '</div>';
  }

  // Truncation warning
  var absEnd = (paper.abstract||'').trim().slice(-1);
  var mayBeTruncated = paper.abstract && paper.abstract.length > 1500 && !'。.！!？?）)'.includes(absEnd);
  var truncWarn = mayBeTruncated ? '<div style="font-size:11px;color:#e67e22;background:#fef9e7;border:1px solid #f9e79f;border-radius:4px;padding:6px 12px;margin-bottom:12px">&#9888; 摘要可能不完整（原文过长导致AI输出被截断），建议手动修正</div>' : '';

  overlay.innerHTML =
    '<div class="term-modal" style="width:960px;padding:32px 36px;max-height:92vh">' +
    // Truncation warning
    truncWarn +
    // Title row (editable)
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">' +
    '<div id="basic-title" class="ext-editable" style="font-size:20px;font-weight:700;color:var(--text);line-height:1.4;flex:1;padding-right:20px;border:1px solid transparent;border-radius:4px;padding:4px 6px;transition:border-color 0.15s;min-height:28px">' + escapeHtml(paper.title) + '</div>' +
    '<span id="basic-year" class="ext-editable" style="font-size:24px;font-weight:700;color:var(--accent);flex-shrink:0;border:1px solid transparent;border-radius:4px;padding:4px 6px;min-width:60px;text-align:right;transition:border-color 0.15s">' + (paper.year || '') + '</span>' +
    '</div>' +
    // Authors + Journal (editable)
    '<div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:8px;font-size:13px;color:var(--text-tertiary)">' +
    '<span id="basic-authors" class="ext-editable" style="border:1px solid transparent;border-radius:4px;padding:2px 6px;transition:border-color 0.15s;min-width:40px">&#128100; ' + escapeHtml(paper.authors||'—') + '</span>' +
    '<span id="basic-journal" class="ext-editable" style="border:1px solid transparent;border-radius:4px;padding:2px 6px;transition:border-color 0.15s;min-width:40px">&#128211; ' + escapeHtml(paper.journal||'—') + '</span>' +
    '</div>' +
    tagsHtml +
    theoryHtml +
    // Abstract (editable)
    '<div id="basic-abstract" class="ext-editable" style="font-size:13px;color:var(--text-secondary);line-height:1.8;margin-bottom:20px;max-height:180px;overflow-y:auto;padding:14px 18px;background:#f8f9fb;border-radius:6px;border:1px solid #e8ecf0;transition:border-color 0.15s">' +
    escapeHtml(paper.abstract||'点击添加摘要') +
    '</div>' +
    // Structured extraction
    buildExtraction() +
    // Footer
    '<div class="term-modal-actions" style="margin-top:18px;border-top:1px solid var(--border);padding-top:16px">' +
    '<span style="font-size:11px;color:var(--text-tertiary);margin-right:auto;line-height:32px">鼠标悬停项目可编辑或删除</span>' +
    '<button class="btn btn-primary" id="detailExtract">&#9889; 提取</button>' +
    '<button class="btn btn-cancel" id="detailClose">关闭</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  overlay.querySelector('#detailClose').onclick = function() { overlay.remove(); };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

  var extractBtn = overlay.querySelector('#detailExtract');
  if (extractBtn) {
    // If extraction is already running for this paper, show correct state
    if (activeExtractions[paper.id]) {
      extractBtn.disabled = true;
      extractBtn.textContent = '提取中...';
    }
    extractBtn.addEventListener('click', function() {
      var config = loadAiConfig();
      if (!config.apiKey || !config.baseUrl || !config.model) { alert('请先在 AI 拓展中配置 API'); return; }
      if (!paper.abstract || paper.abstract.length < 20) { alert('该论文摘要过短或缺失，无法进行结构化提取'); return; }
      extractBtn.disabled = true;
      extractBtn.textContent = '提取中...';
      activeExtractions[paper.id] = true;

      // Run extraction in background — user can close modal
      (async function() {
        try {
          var s = await extractPaperStructured(paper, config);
          var isEmpty = !s.researchTopic && !(s.coreConcepts||[]).length && !(s.extractionTheories||[]).length
            && !(s.extractionVariables||[]).length && !(s.relationships||[]).length && !(s.evidence||[]).length;
          if (isEmpty) {
            alert('AI 未提取到任何结构化数据');
            delete activeExtractions[paper.id];
            if (document.body.contains(overlay)) {
              extractBtn.disabled = false;
              extractBtn.textContent = '提取';
            }
            return;
          }
          await db.updatePaper(paper.id, {
            researchTopic: s.researchTopic, coreConcepts: s.coreConcepts, extractionTheories: s.extractionTheories,
            extractionVariables: s.extractionVariables, relationships: s.relationships, evidence: s.evidence
          });
          Object.assign(paper, s);
          delete activeExtractions[paper.id];
          // If modal still open, refresh it
          if (document.body.contains(overlay) && overlay.querySelector('#detailClose')) {
            overlay.remove();
            showPaperDetailModal(paper);
          }
        } catch (e) {
          delete activeExtractions[paper.id];
          if (document.body.contains(overlay)) {
            extractBtn.disabled = false;
            extractBtn.textContent = '提取';
          }
          alert('提取失败：' + (e.message||'未知错误'));
        }
      })();
    });
  }

  // ====== Extraction Field Editors ======
  // Inline CSS for items — defined once, clean and consistent
  var ITEM = 'display:inline-flex;align-items:center;gap:3px;margin:0 4px 4px 0;font-size:12px;padding:3px 8px;border-radius:4px;transition:box-shadow 0.15s';
  var ITEM_HOVER = 'box-shadow:0 0 0 1px rgba(0,0,0,0.08)';
  var ACTIONS = 'display:none;gap:2px;align-items:center';
  var BTN = 'cursor:pointer;font-size:12px;line-height:1;padding:1px 3px;border-radius:2px;opacity:0.5;transition:opacity 0.15s';
  var ADD = 'cursor:pointer;font-size:12px;color:var(--accent);opacity:0.6;transition:opacity 0.15s;display:inline-block;padding:3px 0';

  function saveField(field, value) {
    var u = {}; u[field] = value; paper[field] = value;
    db.updatePaper(paper.id, u);
  }

  function makeItemActions(wrapper, arr, idx, field, editFn) {
    var actDiv = document.createElement('span');
    actDiv.style.cssText = ACTIONS;
    // Edit
    var ed = document.createElement('span');
    ed.textContent = '✎'; ed.title = '编辑';
    ed.style.cssText = BTN;
    ed.addEventListener('click', function(ev) {
      ev.stopPropagation();
      var old = arr[idx], result;
      if (editFn) { result = editFn(old); }
      else { var v = prompt('编辑：', old); if (v !== null && v.trim() !== '') result = v.trim(); }
      if (result !== undefined && result !== null) { arr[idx] = result; saveField(field, arr.slice()); refreshArray(wrapper, arr, field, editFn); }
    });
    // Delete
    var dl = document.createElement('span');
    dl.textContent = '×'; dl.title = '删除';
    dl.style.cssText = BTN + 'color:#c0392b;font-size:16px;font-weight:400';
    dl.addEventListener('click', function(ev) {
      ev.stopPropagation();
      if (!confirm('确定删除？')) return;
      arr.splice(idx, 1);
      saveField(field, arr.slice());
      refreshArray(wrapper, arr, field, editFn);
    });
    actDiv.appendChild(ed);
    actDiv.appendChild(dl);
    wrapper.appendChild(actDiv);
    // Hover toggle
    wrapper.addEventListener('mouseenter', function() { actDiv.style.display = 'inline-flex'; });
    wrapper.addEventListener('mouseleave', function() { actDiv.style.display = 'none'; });
  }

  function refreshArray(container, arr, field, editFn) {
    container.innerHTML = '';
    var isRel = (field === 'relationships');
    var isEv = (field === 'evidence');
    arr.forEach(function(item, i) {
      var w = document.createElement('span');
      w.style.cssText = ITEM + (isEv ? ';display:block;border-left:2px solid #dfe6ed;border-radius:0 4px 4px 0;background:#fafbfc;padding:5px 10px;margin-bottom:3px' : (isRel ? ';background:var(--bg);border-left:3px solid var(--accent);border-radius:0 4px 4px 0;padding:5px 10px;display:block;margin-bottom:3px' : ''));
      if (!isRel && !isEv) {
        w.style.cssText += ';background:#eef2f7;color:#2c5282';
        if (field === 'extractionTheories') w.style.cssText += ';background:#f9f4ea;color:#9a6b3b';
        if (field === 'extractionVariables') w.style.cssText += ';background:#e8f6f2;color:#2d7d6f';
      }
      // Content
      if (field === 'extractionVariables') {
        w.innerHTML = escapeHtml(item.variable_name) + ' <span style="font-size:10px;opacity:0.55;font-weight:400">' + escapeHtml(item.variable_role||'') + '</span>';
      } else if (field === 'relationships') {
        w.innerHTML = '<b>' + escapeHtml(item.subject) + '</b> <span style="color:var(--accent);font-size:10px">→ ' + escapeHtml(item.relation||'') + ' →</span> <b>' + escapeHtml(item.object) + '</b>';
      } else {
        w.textContent = item;
      }
      makeItemActions(w, arr, i, field, (field === 'extractionVariables' ? function(old) {
        var n = prompt('变量名称：', old.variable_name); if (n === null) return null;
        var r = prompt('角色（因变量/自变量/调节变量/中介变量/控制变量）：', old.variable_role); if (r === null) return null;
        return { variable_name: n.trim(), variable_role: r.trim() };
      } : (field === 'relationships' ? function(old) {
        var s = prompt('主体：', old.subject); if (s === null) return null;
        var r = prompt('关系（影响/调节/中介/相关/研究）：', old.relation); if (r === null) return null;
        var o = prompt('客体：', old.object); if (o === null) return null;
        return { subject: s.trim(), relation: r.trim(), object: o.trim() };
      } : null)));
      container.appendChild(w);
    });
    // Add link
    var add = document.createElement('span');
    add.textContent = '+ 添加';
    add.style.cssText = ADD;
    var addLabels = { coreConcepts: '添加概念', extractionTheories: '添加理论', extractionVariables: '添加变量', relationships: '添加关系', evidence: '添加证据句' };
    add.title = addLabels[field] || '添加';
    add.addEventListener('click', function() {
      var result;
      if (field === 'extractionVariables') {
        var n = prompt('变量名称：'); if (!n) return;
        var r = prompt('角色（因变量/自变量/调节变量/中介变量/控制变量）：', '自变量'); if (!r) return;
        result = { variable_name: n.trim(), variable_role: r.trim() };
      } else if (field === 'relationships') {
        var s = prompt('主体 Subject：'); if (!s) return;
        var r = prompt('关系（影响/调节/中介/相关/研究）：', '影响'); if (!r) return;
        var o = prompt('客体 Object：'); if (!o) return;
        result = { subject: s.trim(), relation: r.trim(), object: o.trim() };
      } else {
        var v = prompt(addLabels[field] || '输入内容：'); if (!v || !v.trim()) return;
        result = v.trim();
      }
      if (result) { arr.push(result); saveField(field, arr.slice()); refreshArray(container, arr, field, (field === 'extractionVariables' || field === 'relationships') ? function(){} : null); }
    });
    container.appendChild(add);
  }

  // Make basic fields editable
  [{ id: 'basic-title', field: 'title', tag: 'input' },
   { id: 'basic-authors', field: 'authors', tag: 'input' },
   { id: 'basic-journal', field: 'journal', tag: 'input' },
   { id: 'basic-year', field: 'year', tag: 'input' },
   { id: 'basic-abstract', field: 'abstract', tag: 'textarea' }
  ].forEach(function(f) {
    var el = overlay.querySelector('#' + f.id);
    if (!el) return;
    el.addEventListener('mouseenter', function() { this.style.borderColor = 'var(--border)'; this.style.cursor = 'text'; });
    el.addEventListener('mouseleave', function() { this.style.borderColor = 'transparent'; });
    el.addEventListener('click', function() {
      var cur = paper[f.field] || '';
      var cls = 'width:100%;border:none;outline:none;font-size:inherit;font-family:inherit;background:transparent;padding:0;color:inherit;line-height:inherit';
      if (f.tag === 'textarea') cls += ';resize:vertical;min-height:80px';
      if (f.tag === 'input') {
        el.innerHTML = '<input style="' + cls + '" value="' + escapeHtml(String(cur)).replace(/"/g, '&quot;') + '">';
      } else {
        el.innerHTML = '<textarea style="' + cls + '">' + escapeHtml(String(cur)) + '</textarea>';
      }
      var inp = el.querySelector(f.tag);
      inp.focus();
      if (f.tag === 'input') inp.select();
      function done() {
        var v = inp.value.trim();
        var update = {}; update[f.field] = f.field === 'year' ? (parseInt(v) || null) : v;
        paper[f.field] = update[f.field];
        db.updatePaper(paper.id, update);
        el.textContent = v || (f.id === 'basic-abstract' ? '点击添加摘要' : '');
        if (f.id === 'basic-authors') el.textContent = '👤 ' + (v || '—');
        if (f.id === 'basic-journal') el.textContent = '📑 ' + (v || '—');
        el.style.cursor = 'pointer';
      }
      inp.addEventListener('blur', done);
      inp.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey && f.tag === 'input') inp.blur(); });
    });
  });

  function buildEditors() {
    // Research Topic
    var tEl = overlay.querySelector('#ext-researchTopic');
    if (tEl) {
      tEl.addEventListener('mouseenter', function() { tEl.style.borderColor = 'var(--border)'; tEl.style.cursor = 'text'; });
      tEl.addEventListener('mouseleave', function() { tEl.style.borderColor = 'transparent'; });
      tEl.addEventListener('click', function() {
        var cur = paper.researchTopic || '';
        tEl.innerHTML = '<input type="text" value="' + escapeHtml(cur).replace(/"/g,'&quot;') + '" style="width:100%;border:none;outline:none;font-size:13px;font-family:var(--font);background:transparent;padding:0">';
        var inp = tEl.querySelector('input');
        inp.focus(); inp.select();
        function done() { var v = inp.value.trim(); saveField('researchTopic', v); tEl.textContent = v || '点击添加研究主题'; }
        inp.addEventListener('blur', done);
        inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') inp.blur(); });
      });
    }
    // Array fields
    var fields = [
      { id: 'ext-coreConcepts', field: 'coreConcepts' },
      { id: 'ext-extractionTheories', field: 'extractionTheories' },
      { id: 'ext-extractionVariables', field: 'extractionVariables' },
      { id: 'ext-relationships', field: 'relationships' },
      { id: 'ext-evidence', field: 'evidence' }
    ];
    fields.forEach(function(f) {
      var c = overlay.querySelector('#' + f.id);
      if (c) refreshArray(c, paper[f.field] || [], f.field, null);
    });
  }
  buildEditors();
}
function showCardItemModal(cardType) {
  const topic = getSelectedTopic();
  if (!topic) return;
  const tid = topic.id;

  const titles = { papers: '添加文献', theories: '添加理论', variables: '添加变量', methods: '添加方法', structure: '添加结构' };

  const overlay = document.createElement('div');
  overlay.className = 'term-modal-overlay';

  let bodyHtml = '';
  if (cardType === 'papers') {
    bodyHtml = `
      <label style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px">论文标题 *</label>
      <input type="text" id="cardItemTitle" placeholder="输入论文完整标题" style="margin-bottom:12px">
      <label style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px">作者</label>
      <input type="text" id="cardItemAuthors" placeholder="多位作者用逗号分隔，如：张三, 李四" style="margin-bottom:12px">
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <div style="flex:2">
          <label style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px">期刊</label>
          <input type="text" id="cardItemJournal" placeholder="期刊或会议名称" style="margin-bottom:0">
        </div>
        <div style="flex:1">
          <label style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px">年份</label>
          <input type="number" id="cardItemYear" placeholder="如 2024" style="margin-bottom:0">
        </div>
      </div>
      <label style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px">摘要</label>
      <textarea id="cardItemAbstract" placeholder="输入或粘贴论文摘要..." style="width:100%;height:120px;border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;font-size:13px;font-family:var(--font);outline:none;resize:vertical;box-sizing:border-box;margin-bottom:12px"></textarea>
      <label style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px">标签</label>
      <input type="text" id="cardItemTags" placeholder="多个标签用逗号分隔，如：ESG, 成本粘性" style="margin-bottom:12px">
      <label style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px">理论基础</label>
      <input type="text" id="cardItemTheory" placeholder="如：代理理论、利益相关者理论" style="margin-bottom:0">
    `;
  } else if (cardType === 'variables') {
    bodyHtml = `
      <input type="text" id="cardItemName" placeholder="变量名称" style="margin-bottom:10px">
      <select id="cardItemRole" style="width:100%;height:38px;border:1px solid var(--border);border-radius:var(--radius-sm);padding:0 12px;font-size:13px;font-family:var(--font);outline:none;background:var(--surface);box-sizing:border-box">
        <option value="自变量">自变量</option>
        <option value="因变量">因变量</option>
        <option value="控制变量">控制变量</option>
        <option value="调节变量">调节变量</option>
        <option value="中介变量">中介变量</option>
      </select>
    `;
  } else {
    bodyHtml = `<input type="text" id="cardItemName" placeholder="名称" autofocus>`;
  }

  overlay.innerHTML = `
    <div class="term-modal">
      <div class="term-modal-title">${titles[cardType] || '新建'}</div>
      ${bodyHtml}
      <div class="term-modal-actions">
        <button class="btn btn-cancel" id="cardItemCancel">取消</button>
        <button class="btn btn-primary" id="cardItemSave">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#cardItemCancel').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#cardItemSave').onclick = async () => {
    if (cardType === 'papers') {
      const title = overlay.querySelector('#cardItemTitle').value.trim();
      if (!title) { alert('请输入论文标题'); return; }
      const authors = overlay.querySelector('#cardItemAuthors').value.trim();
      if (isDuplicatePaper(tid, title, authors)) { alert('该论文已存在（标题与作者一致）'); return; }
      const tags = overlay.querySelector('#cardItemTags')?.value.trim().split(',').map(t => t.trim()).filter(Boolean) || [];
      const data = {
        title,
        authors,
        journal: overlay.querySelector('#cardItemJournal').value.trim(),
        year: parseInt(overlay.querySelector('#cardItemYear').value) || null,
        abstract: overlay.querySelector('#cardItemAbstract').value.trim(),
        tags,
        theory: overlay.querySelector('#cardItemTheory')?.value.trim() || ''
      };
      await db.createPaper(tid, data);
      close();
      renderCenter(getSelectedTopic());
    } else if (cardType === 'theories') {
      const name = overlay.querySelector('#cardItemName').value.trim();
      if (!name) { alert('请输入理论名称'); return; }
      await db.createTheory(tid, name);
      close();
      renderCenter(getSelectedTopic());
    } else if (cardType === 'variables') {
      const name = overlay.querySelector('#cardItemName').value.trim();
      if (!name) { alert('请输入变量名称'); return; }
      const role = overlay.querySelector('#cardItemRole').value;
      await db.createVariable(tid, name, role);
      close();
      renderCenter(getSelectedTopic());
    } else if (cardType === 'methods') {
      const name = overlay.querySelector('#cardItemName').value.trim();
      if (!name) { alert('请输入方法名称'); return; }
      await db.createMethod(tid, name);
      close();
      renderCenter(getSelectedTopic());
    } else if (cardType === 'structure') {
      const name = overlay.querySelector('#cardItemName').value.trim();
      if (!name) { alert('请输入结构名称'); return; }
      const sortOrder = getStructures(tid).length;
      await db.createStructure(tid, name, sortOrder);
      close();
      renderCenter(getSelectedTopic());
    }
  };

  const firstInput = overlay.querySelector('input[type="text"]');
  if (firstInput) firstInput.focus();
}

function isDuplicatePaper(topicId, title, authors) {
  const existing = getPapers(topicId);
  const t = title.trim().toLowerCase();
  const a = authors.trim().toLowerCase();
  return existing.some(p =>
    p.title.trim().toLowerCase() === t &&
    p.authors.trim().toLowerCase() === a
  );
}

// Track active background extractions per paper ID
var activeExtractions = {};

async function handlePdfUpload(file) {
  if (!file) return;
  var config = loadAiConfig();
  if (!config.apiKey || !config.baseUrl || !config.model) {
    alert('请先在 AI 拓展中配置 API（密钥、地址、模型）');
    return;
  }

  var btn = document.getElementById('uploadPdfBtn');
  if (btn) { btn.textContent = '解析中...'; btn.disabled = true; }

  try {
    // Step 1: pdf.js text extraction
    var arrayBuffer = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    var fullText = '';
    var maxPages = Math.min(pdf.numPages, 10);
    for (var i = 1; i <= maxPages; i++) {
      var page = await pdf.getPage(i);
      var content = await page.getTextContent();
      fullText += content.items.map(function(item) { return item.str; }).join(' ') + '\n';
    }
    if (fullText.trim().length < 100) throw new Error('PDF 文本内容过少，可能是扫描版 PDF，暂不支持');

    // Step 2: Two-phase AI extraction
    var paperData = await extractPaperMetadata(fullText, config);
    if (!paperData.title) throw new Error('AI 未能提取到论文标题');
    if (paperData._truncated) console.warn('PDF解析：摘要可能不完整');

    var topic = getSelectedTopic();
    if (!topic) throw new Error('未找到当前研究主题');
    if (isDuplicatePaper(topic.id, paperData.title, paperData.authors)) throw new Error('该论文已存在');

    await db.createPaper(topic.id, paperData);
    activeCard = 'papers';
    renderCenter(getSelectedTopic());

  } catch (e) {
    alert('解析失败：' + (e.message || '未知错误'));
  } finally {
    if (btn) { btn.textContent = '上传 PDF'; btn.disabled = false; }
    var fi = document.getElementById('pdfFileInput');
    if (fi) fi.value = '';
  }
}

function renderCardDetail(tid) {
  switch (activeCard) {
    case 'papers':
      return `
        <div class="detail-block">
          <div class="detail-block-header">
            <div class="detail-block-title">已有文献</div>
            <div style="display:flex;gap:6px">
              <input type="file" id="pdfFileInput" accept=".pdf" style="display:none">
              <button class="btn" id="uploadPdfBtn" style="height:24px;font-size:11px;padding:0 8px">上传 PDF</button>
              <button class="btn" id="addCardItem" data-card="papers" style="height:24px;font-size:11px;padding:0 8px">手动创建</button>
            </div>
          </div>
          <div class="paper-list" id="paperList"></div>
        </div>`;
    case 'theories':
      return `
        <div class="detail-block">
          <div class="detail-block-header">
            <div class="detail-block-title">理论列表</div>
            <button class="btn" id="addCardItem" data-card="theories" style="height:24px;font-size:11px;padding:0 8px">+ 新建</button>
          </div>
          <div class="detail-list">
            ${getTheories(tid).map(t => `<div class="detail-item"><span class="bullet"></span> ${t.name}</div>`).join('')}
          </div>
        </div>`;
    case 'variables':
      return `
        <div class="detail-block">
          <div class="detail-block-header">
            <div class="detail-block-title">变量列表</div>
            <button class="btn" id="addCardItem" data-card="variables" style="height:24px;font-size:11px;padding:0 8px">+ 新建</button>
          </div>
          <div class="detail-list">
            ${getVariables(tid).map(v => `<div class="detail-item"><span class="bullet"></span> ${v.name} <span class="var-role">(${v.role})</span></div>`).join('')}
          </div>
        </div>`;
    case 'methods':
      return `
        <div class="detail-block">
          <div class="detail-block-header">
            <div class="detail-block-title">常用方法</div>
            <button class="btn" id="addCardItem" data-card="methods" style="height:24px;font-size:11px;padding:0 8px">+ 新建</button>
          </div>
          <div class="detail-list">
            ${getMethods(tid).map(m => `<div class="detail-item"><span class="bullet"></span> ${m.name}</div>`).join('')}
          </div>
        </div>`;
    case 'structure':
      return `
        <div class="detail-block">
          <div class="detail-block-header">
            <div class="detail-block-title">综述结构</div>
            <button class="btn" id="addCardItem" data-card="structure" style="height:24px;font-size:11px;padding:0 8px">+ 新建</button>
          </div>
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
        <button class="btn" id="aiBtnTest">测试连接</button>
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
      overlay.querySelector('#aiBtnTest').onclick = async () => {
        const btn = overlay.querySelector('#aiBtnTest');
        const testKey = overlay.querySelector('#aiApiKey').value.trim();
        const testUrl = overlay.querySelector('#aiBaseUrl').value.trim();
        const testModel = overlay.querySelector('#aiModel').value.trim();
        if (!testKey || !testUrl || !testModel) { alert('请先填写完整配置'); return; }
        btn.disabled = true;
        btn.textContent = '测试中...';
        try {
          const resp = await fetch(`${testUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testKey}` },
            body: JSON.stringify({ model: testModel, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 })
          });
          if (!resp.ok) {
            const text = await resp.text();
            alert(`连接失败 (${resp.status})\n${text.slice(0, 200)}`);
          } else {
            alert('连接成功！');
          }
        } catch (e) {
          alert('网络错误：' + e.message);
        } finally {
          btn.disabled = false;
          btn.textContent = '测试连接';
        }
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
  // Collapse right panel by default
  var rp = document.getElementById('rightPanel');
  var rt = document.getElementById('rightPanelToggle');
  if (rp && !rp.classList.contains('collapsed')) {
    rp.classList.add('collapsed');
    if (rt) { rt.classList.add('collapsed'); rt.innerHTML = '&#9654;'; rt.title = '展开右侧栏'; }
  }
}
