// ═══════════════════════ SUPABASE DATA LAYER ═══════════════════════
const db = (() => {
  function uid() { return currentUser?.id; }

  async function loadAll() {
    if (!uid()) return;
    const tables = ['topics', 'papers', 'theories', 'variables', 'methods', 'structures', 'term_expansions'];
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').eq('user_id', uid());
      if (error) { console.error('loadAll ' + table, error); continue; }
      window['_' + table] = data || [];
    }
    // Map to global arrays
    topics = (_topics || []).map(rowToTopic);
    papers = (_papers || []).map(rowToPaper);
    theories = (_theories || []).map(rowToTheory);
    variables = (_variables || []).map(rowToVariable);
    methods = (_methods || []).map(rowToMethod);
    structures = (_structures || []).map(rowToStructure);
    termExpansions = (_term_expansions || []).map(rowToTermExpansion);
  }

  // ── Row mappers (Supabase row → app model) ──
  function rowToTopic(r) {
    return { id: r.id, name: r.name, createdAt: new Date(r.created_at).getTime(), modifiedAt: new Date(r.modified_at).getTime() };
  }
  function rowToPaper(r) {
    return { id: r.id, topicId: r.topic_id, title: r.title, authors: r.authors, journal: r.journal, year: r.year, abstract: r.abstract, tags: r.tags || [], theory: r.theory };
  }
  function rowToTheory(r) {
    return { id: r.id, topicId: r.topic_id, name: r.name };
  }
  function rowToVariable(r) {
    return { id: r.id, topicId: r.topic_id, name: r.name, role: r.role };
  }
  function rowToMethod(r) {
    return { id: r.id, topicId: r.topic_id, name: r.name };
  }
  function rowToStructure(r) {
    return { id: r.id, topicId: r.topic_id, name: r.name, sortOrder: r.sort_order };
  }
  function rowToTermExpansion(r) {
    return { id: r.id, topicId: r.topic_id, term: r.term, category: r.category, parentTerm: r.parent_term };
  }

  // ── CRUD helpers ──
  function newId() { return crypto.randomUUID(); }

  async function insert(table, obj) {
    obj.id = obj.id || newId();
    obj.user_id = uid();
    const { error } = await supabase.from(table).insert(obj);
    if (error) { console.error('insert ' + table, error); throw error; }
    return obj.id;
  }

  async function updateRow(table, id, fields) {
    const { error } = await supabase.from(table).update(fields).eq('id', id).eq('user_id', uid());
    if (error) { console.error('update ' + table, error); throw error; }
  }

  async function remove(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', uid());
    if (error) { console.error('remove ' + table, error); throw error; }
  }

  // ── Topics ──
  async function createTopic(name) {
    const id = newId();
    const now = new Date().toISOString();
    await insert('topics', { id, name, created_at: now, modified_at: now });
    topics.push({ id, name, createdAt: Date.now(), modifiedAt: Date.now() });
    return id;
  }
  async function updateTopic(topicId, fields) {
    const t = topics.find(t => t.id === topicId);
    if (!t) return;
    if (fields.name !== undefined) t.name = fields.name;
    t.modifiedAt = Date.now();
    await updateRow('topics', topicId, { name: t.name, modified_at: new Date(t.modifiedAt).toISOString() });
  }

  // ── Papers ──
  async function createPaper(topicId, data) {
    const id = newId();
    await insert('papers', { id, topic_id: topicId, title: data.title, authors: data.authors || '', journal: data.journal || '', year: data.year || null, abstract: data.abstract || '', tags: data.tags || [], theory: data.theory || '' });
    papers.push({ id, topicId, ...data });
    return id;
  }
  async function updatePaper(paperId, fields) {
    const p = papers.find(p => p.id === paperId);
    if (!p) return;
    Object.assign(p, fields);
    await updateRow('papers', paperId, { title: p.title, authors: p.authors, journal: p.journal, year: p.year, abstract: p.abstract, tags: p.tags, theory: p.theory });
  }
  async function deletePaper(paperId) {
    papers = papers.filter(p => p.id !== paperId);
    await remove('papers', paperId);
  }

  // ── Theories ──
  async function createTheory(topicId, name) {
    const id = newId();
    await insert('theories', { id, topic_id: topicId, name });
    theories.push({ id, topicId, name });
    return id;
  }
  async function deleteTheory(theoryId) {
    theories = theories.filter(t => t.id !== theoryId);
    await remove('theories', theoryId);
  }

  // ── Variables ──
  async function createVariable(topicId, name, role) {
    const id = newId();
    await insert('variables', { id, topic_id: topicId, name, role });
    variables.push({ id, topicId, name, role });
    return id;
  }
  async function deleteVariable(variableId) {
    variables = variables.filter(v => v.id !== variableId);
    await remove('variables', variableId);
  }

  // ── Methods ──
  async function createMethod(topicId, name) {
    const id = newId();
    await insert('methods', { id, topic_id: topicId, name });
    methods.push({ id, topicId, name });
    return id;
  }
  async function deleteMethod(methodId) {
    methods = methods.filter(m => m.id !== methodId);
    await remove('methods', methodId);
  }

  // ── Structures ──
  async function createStructure(topicId, name, sortOrder) {
    const id = newId();
    await insert('structures', { id, topic_id: topicId, name, sort_order: sortOrder });
    structures.push({ id, topicId, name, sortOrder });
    return id;
  }
  async function deleteStructure(structureId) {
    structures = structures.filter(s => s.id !== structureId);
    await remove('structures', structureId);
  }

  // ── Term Expansions ──
  async function createTermExpansion(topicId, data) {
    const id = newId();
    await insert('term_expansions', { id, topic_id: topicId, term: data.term, category: data.category || 'term', parent_term: data.parentTerm || null });
    termExpansions.push({ id, topicId, ...data });
    return id;
  }
  async function deleteTermExpansion(termId) {
    termExpansions = termExpansions.filter(t => t.id !== termId);
    await remove('term_expansions', termId);
  }

  return {
    loadAll,
    // Topics
    createTopic, updateTopic,
    // Papers
    createPaper, updatePaper, deletePaper,
    // Theories
    createTheory, deleteTheory,
    // Variables
    createVariable, deleteVariable,
    // Methods
    createMethod, deleteMethod,
    // Structures
    createStructure, deleteStructure,
    // Term Expansions
    createTermExpansion, deleteTermExpansion
  };
})();
