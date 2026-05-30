// ═══════════════════════ SUPABASE DATA LAYER ═══════════════════════
const db = (() => {
  const supabase = window._supabaseClient;
  function uid() { return currentUser?.id; }

  async function loadAll() {
    if (!uid()) return;
    const tables = ['topics', 'papers', 'theories', 'variables', 'methods', 'structures', 'term_expansions'];
    // Fire all queries in parallel
    const results = await Promise.all(
      tables.map(async (table) => {
        const { data, error } = await supabase.from(table).select('*');
        if (error) { console.error('loadAll ' + table, error); }
        window['_' + table] = data || [];
      })
    );
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
    return { id: r.id, name: r.name, userId: r.user_id, createdAt: new Date(r.created_at).getTime(), modifiedAt: new Date(r.modified_at).getTime() };
  }
  function rowToPaper(r) {
    return {
      id: r.id, topicId: r.topic_id, title: r.title, authors: r.authors,
      journal: r.journal, year: r.year, abstract: r.abstract,
      tags: r.tags || [], theory: r.theory || '',
      researchTopic: r.research_topic || '',
      coreConcepts: r.core_concepts || [],
      extractionTheories: r.extraction_theories || [],
      extractionVariables: r.extraction_variables || [],
      relationships: r.relationships || [],
      evidence: r.evidence || []
    };
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
    const obj = {
      id, topic_id: topicId,
      title: data.title, authors: data.authors || '', journal: data.journal || '',
      year: data.year || null, abstract: data.abstract || '',
      tags: data.tags || [], theory: data.theory || '',
      research_topic: data.researchTopic || '',
      core_concepts: data.coreConcepts || [],
      extraction_theories: data.extractionTheories || [],
      extraction_variables: data.extractionVariables || [],
      relationships: data.relationships || [],
      evidence: data.evidence || []
    };
    await insert('papers', obj);
    papers.push({
      id, topicId,
      title: data.title, authors: data.authors || '', journal: data.journal || '',
      year: data.year || null, abstract: data.abstract || '',
      tags: data.tags || [], theory: data.theory || '',
      researchTopic: data.researchTopic || '',
      coreConcepts: data.coreConcepts || [],
      extractionTheories: data.extractionTheories || [],
      extractionVariables: data.extractionVariables || [],
      relationships: data.relationships || [],
      evidence: data.evidence || []
    });
    return id;
  }
  async function updatePaper(paperId, fields) {
    const p = papers.find(p => p.id === paperId);
    if (!p) return;
    Object.assign(p, fields);
    await updateRow('papers', paperId, {
      title: p.title, authors: p.authors, journal: p.journal, year: p.year,
      abstract: p.abstract, tags: p.tags, theory: p.theory,
      research_topic: p.researchTopic,
      core_concepts: p.coreConcepts,
      extraction_theories: p.extractionTheories,
      extraction_variables: p.extractionVariables,
      relationships: p.relationships,
      evidence: p.evidence
    });
  }
  async function deletePaper(paperId) {
    await remove('papers', paperId);
    papers = papers.filter(p => p.id !== paperId);
  }

  // ── Theories ──
  async function createTheory(topicId, name) {
    const id = newId();
    await insert('theories', { id, topic_id: topicId, name });
    theories.push({ id, topicId, name });
    return id;
  }
  async function deleteTheory(theoryId) {
    await remove('theories', theoryId);
    theories = theories.filter(t => t.id !== theoryId);
  }

  // ── Variables ──
  async function createVariable(topicId, name, role) {
    const id = newId();
    await insert('variables', { id, topic_id: topicId, name, role });
    variables.push({ id, topicId, name, role });
    return id;
  }
  async function deleteVariable(variableId) {
    await remove('variables', variableId);
    variables = variables.filter(v => v.id !== variableId);
  }

  // ── Methods ──
  async function createMethod(topicId, name) {
    const id = newId();
    await insert('methods', { id, topic_id: topicId, name });
    methods.push({ id, topicId, name });
    return id;
  }
  async function deleteMethod(methodId) {
    await remove('methods', methodId);
    methods = methods.filter(m => m.id !== methodId);
  }

  // ── Structures ──
  async function createStructure(topicId, name, sortOrder) {
    const id = newId();
    await insert('structures', { id, topic_id: topicId, name, sort_order: sortOrder });
    structures.push({ id, topicId, name, sortOrder });
    return id;
  }
  async function deleteStructure(structureId) {
    await remove('structures', structureId);
    structures = structures.filter(s => s.id !== structureId);
  }

  // ── Term Expansions ──
  async function createTermExpansion(topicId, data) {
    const id = newId();
    await insert('term_expansions', { id, topic_id: topicId, term: data.term, category: data.category || 'term', parent_term: data.parentTerm || null });
    termExpansions.push({ id, topicId, ...data });
    return id;
  }
  async function deleteTermExpansion(termId) {
    await remove('term_expansions', termId);
    termExpansions = termExpansions.filter(t => t.id !== termId);
  }

  // ── Topic Members (Sharing) ──
  async function getTopicMembers(topicId) {
    const { data, error } = await supabase.from('topic_members').select('*').eq('topic_id', topicId);
    if (error || !data) { console.error(error); return []; }
    if (!data.length) return [];
    // Fetch emails from profiles
    const userIds = data.map(m => m.user_id);
    const { data: profiles } = await supabase.from('profiles').select('user_id, email, role').in('user_id', userIds);
    const emailMap = {};
    (profiles || []).forEach(p => { emailMap[p.user_id] = p.email; });
    return data.map(m => ({ ...m, email: emailMap[m.user_id] || m.user_id }));
  }

  async function addTopicMember(topicId, memberUserId, memberRole, invitedBy) {
    const id = newId();
    const { error } = await supabase.from('topic_members').insert({
      id, topic_id: topicId, user_id: memberUserId, role: memberRole, invited_by: invitedBy
    });
    if (error) { console.error(error); throw error; }
  }

  async function removeTopicMember(topicId, userId) {
    const { error } = await supabase.from('topic_members').delete().eq('topic_id', topicId).eq('user_id', userId);
    if (error) { console.error(error); throw error; }
  }

  async function lookupUserByEmail(email) {
    const { data, error } = await supabase.rpc('lookup_user_by_email', { target_email: email });
    if (error) { console.error(error); return null; }
    return data && data.length > 0 ? data[0] : null;
  }

  // ── Prompts ──
  async function loadPrompts() {
    if (!uid()) return {};
    const { data, error } = await supabase.from('prompts').select('name, content');
    if (error || !data) { return {}; }
    const prompts = {};
    data.forEach(function(p) { prompts[p.name] = p.content; });
    return prompts;
  }

  async function savePrompt(name, content) {
    const { error } = await supabase.from('prompts').upsert({
      user_id: uid(),
      name: name,
      content: content,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, name' });
    if (error) throw error;
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
    createTermExpansion, deleteTermExpansion,
    // Sharing
    getTopicMembers, addTopicMember, removeTopicMember, lookupUserByEmail,
    // Prompts
    loadPrompts, savePrompt,

    // ── Extraction Stats ──
    async saveStats(topicId, stats) {
      if (!topicId || !stats) return;
      var rows = [];
      function add(type, key, val) {
        if (key && val > 0) rows.push({ topic_id: topicId, stat_type: type, stat_key: key, stat_value: val, updated_at: new Date().toISOString() });
      }
      Object.keys(stats.concepts || {}).forEach(function(k) { add('concept', k, stats.concepts[k]); });
      Object.keys(stats.theories || {}).forEach(function(k) { add('theory', k, stats.theories[k]); });
      // Variables by role: stat_key = "自变量|ESG Score"
      Object.keys(stats.varByRole || {}).forEach(function(role) {
        var vd = stats.varByRole[role];
        Object.keys(vd).filter(function(k){ return k !== '__count'; }).forEach(function(v) { add('variable', role + '|' + v, vd[v]); });
      });
      Object.keys(stats.relationTypes || {}).forEach(function(k) { add('relation', k, stats.relationTypes[k]); });
      // Clear old stats for this topic, then insert new ones
      await supabase.from('extraction_stats').delete().eq('topic_id', topicId).neq('stat_type', '__noop__');
      if (rows.length > 0) {
        // Insert in batches of 20 to avoid large payloads
        for (var i = 0; i < rows.length; i += 20) {
          await supabase.from('extraction_stats').insert(rows.slice(i, i + 20));
        }
      }
    },

    async loadStats(topicId) {
      if (!topicId) return null;
      var result = { concepts: {}, theories: {}, variables: {}, varRoles: {}, relationTypes: {} };
      var allRows = [];
      // Fetch all stats for this topic (may need pagination if many)
      var from = 0, pageSize = 200;
      while (true) {
        var resp = await supabase.from('extraction_stats').select('stat_type, stat_key, stat_value').eq('topic_id', topicId).range(from, from + pageSize - 1);
        if (resp.error || !resp.data) break;
        allRows = allRows.concat(resp.data);
        if (resp.data.length < pageSize) break;
        from += pageSize;
      }
      allRows.forEach(function(r) {
        if (r.stat_type === 'concept') result.concepts[r.stat_key] = r.stat_value;
        else if (r.stat_type === 'theory') result.theories[r.stat_key] = r.stat_value;
        else if (r.stat_type === 'variable') result.variables[r.stat_key] = r.stat_value;
        else if (r.stat_type === 'variable_role') result.varRoles[r.stat_key] = r.stat_value;
        else if (r.stat_type === 'relation') result.relationTypes[r.stat_key] = r.stat_value;
      });
      return result;
    }
  };
})();
