const SUPABASE_URL = 'https://gzchpndcueapysozwqjq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tO4yZczJ0wWvQb3_r4IQRw_KjenVJ6S';
window._supabaseClient = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

let currentUser = null;   // { id, email, role }
let appInitialized = false;

// ── Auth state listener (must not block signInWithPassword) ──
if (window._supabaseClient) {
  window._supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      currentUser = { id: session.user.id, email: session.user.email, role: 'researcher' };
      showApp();
      // Defer heavy async work so it doesn't block the SDK's internal promise chain
      setTimeout(async () => {
        try {
          const profile = await db_getProfile(session.user.id);
          if (profile?.role) currentUser.role = profile.role;
          if (!appInitialized) {
            await initData();
            initUI();
            appInitialized = true;
          }
          // Refresh UI with loaded data
          if (typeof selectTopic === 'function') {
            const firstTopic = topics[0];
            if (firstTopic) selectTopic(firstTopic.id);
          }
          const emailEl = document.getElementById('userEmail');
          if (emailEl) emailEl.textContent = currentUser.email;
        } catch (e) {
          console.error('app init error:', e);
        }
      }, 0);
    } else {
      currentUser = null;
      showAuth();
    }
  });
}

// ── Profile lookup ──
async function db_getProfile(userId) {
  if (!window._supabaseClient) return null;
  const { data, error } = await window._supabaseClient.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  return error ? null : data;
}

// ── UI toggle ──
function showApp() {
  const authEl = document.getElementById('authContainer');
  const appEl = document.getElementById('appContent');
  if (authEl) authEl.style.display = 'none';
  if (appEl) { appEl.style.display = 'flex'; appEl.style.flexDirection = 'column'; appEl.style.height = '100vh'; }
  const el = document.getElementById('userEmail');
  if (el && currentUser) el.textContent = currentUser.email;
}

function showAuth() {
  const authEl = document.getElementById('authContainer');
  const appEl = document.getElementById('appContent');
  if (authEl) authEl.style.display = 'flex';
  if (appEl) appEl.style.display = 'none';
}

// ── Auth actions ──
async function handleSignUp() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const role = document.getElementById('authRole').value;
  if (!email || !password) { showAuthError('请填写邮箱和密码'); return; }
  if (password.length < 6) { showAuthError('密码至少 6 位'); return; }
  const passwordConfirm = document.getElementById('authPasswordConfirm').value;
  if (password !== passwordConfirm) { showAuthError('两次输入的密码不一致'); return; }
  if (!window._supabaseClient) { showAuthError('服务未就绪，请刷新页面后重试'); return; }
  setAuthLoading(true);
  try {
    const { data, error } = await window._supabaseClient.auth.signUp({
      email, password,
      options: { emailRedirectTo: 'https://bigbabolbee.github.io/AccountingResearchCopilot' }
    });
    if (error) { showAuthError(error.message); return; }
    // Supabase returns success even for existing emails (to prevent enumeration).
    // A truly new registration: data.user is not null AND has at least one identity.
    if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
      showAuthError('该邮箱已注册，请直接登录');
      return;
    }
    {
      await window._supabaseClient.from('profiles').insert({ id: crypto.randomUUID(), user_id: data.user.id, email, role });
    }
    showAuthError('');
    showAuthMessage('注册成功！请检查邮箱确认链接。');
  } catch (e) {
    showAuthError(e.message || '注册失败，请稍后重试');
    console.error('signUp error:', e);
  } finally {
    setAuthLoading(false);
  }
}

async function handleSignIn() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  if (!email || !password) { showAuthError('请填写邮箱和密码'); return; }
  setAuthLoading(true);
  console.log('signIn: fetch /token for', email);
  try {
    const resp = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, password })
    });
    console.log('signIn: status', resp.status);
    const json = await resp.json();
    if (!resp.ok) {
      showAuthError(json.msg || json.error_description || '登录失败');
      return;
    }
    // setSession triggers onAuthStateChange which handles initData + initUI + showApp
    console.log('signIn: calling setSession');
    await window._supabaseClient.auth.setSession({
      access_token: json.access_token,
      refresh_token: json.refresh_token
    });
    console.log('signIn: done');
  } catch (e) {
    console.error('signIn error:', e);
    showAuthError(e.message || '登录失败，请稍后重试');
  } finally {
    setAuthLoading(false);
  }
}

async function handleSignOut() {
  await window._supabaseClient.auth.signOut();
}

function setAuthLoading(loading) {
  const btn = document.getElementById('authSubmitBtn');
  if (btn) {
    btn.disabled = loading;
    btn.textContent = loading ? '处理中...' : (window._authMode === 'signup' ? '注册' : '登录');
  }
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (el) el.textContent = translateAuthError(msg);
}

function translateAuthError(msg) {
  const map = {
    'Invalid login credentials': '邮箱或密码错误',
    'User already registered': '该邮箱已注册，请直接登录',
    'Email not confirmed': '邮箱未验证，请先点击邮件中的确认链接',
    'Unable to validate email address: invalid format': '邮箱格式不正确',
    'Password should be at least 6 characters': '密码至少需要 6 位'
  };
  return map[msg] || msg;
}

function showAuthMessage(msg) {
  const el = document.getElementById('authMessage');
  if (el) el.textContent = msg;
}

