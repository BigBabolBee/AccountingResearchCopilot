const SUPABASE_URL = 'https://gzchpndcueapysozwqjq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tO4yZczJ0wWvQb3_r4IQRw_KjenVJ6S';
const supabase = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

let currentUser = null;   // { id, email, role }
let appInitialized = false;

// ── Auth state listener ──
if (supabase) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const profile = await db_getProfile(session.user.id);
      currentUser = {
        id: session.user.id,
        email: session.user.email,
        role: profile?.role || 'researcher'
      };
      if (!appInitialized) {
        await initData();
        initUI();
        appInitialized = true;
      }
      showApp();
    } else {
      currentUser = null;
      showAuth();
    }
  });
}

// ── Profile lookup ──
async function db_getProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
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
  setAuthLoading(true);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { setAuthLoading(false); showAuthError(error.message); return; }
  // Insert profile
  if (data.user) {
    await supabase.from('profiles').insert({ id: crypto.randomUUID(), user_id: data.user.id, email, role });
  }
  setAuthLoading(false);
  showAuthError('');
  showAuthMessage('注册成功！请检查邮箱确认链接。');
}

async function handleSignIn() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  if (!email || !password) { showAuthError('请填写邮箱和密码'); return; }
  setAuthLoading(true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  setAuthLoading(false);
  if (error) { showAuthError(error.message); return; }
}

async function handleSignOut() {
  await supabase.auth.signOut();
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
  if (el) el.textContent = msg;
}

function showAuthMessage(msg) {
  const el = document.getElementById('authMessage');
  if (el) el.textContent = msg;
}

