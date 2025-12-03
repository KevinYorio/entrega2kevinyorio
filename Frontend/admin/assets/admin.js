/* /admin/assets/admin.js */
(() => {
  // ===== Config =====
  // Cambiá esto si tu login/landing está en otra ruta (compatible con Live Server)
  const LOGIN_PATH = '../index.html'; // antes: '/index.html' (rompe en Live Server)
  const LS_KEY = 'atix_token';

  // Detecta API base desde window o desde meta (permite configurarlo desde HTML)
  const metaApi = document.querySelector('meta[name="atix-api-base"]')?.content;
  const API = metaApi || window.ATIX_API_BASE || 'http://localhost:4000/api';

  // ===== Utils (URL, Token) =====
  function getQueryParam(name) {
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }
  function setToken(token) {
    if (!token) return;
    localStorage.setItem(LS_KEY, token);
  }
  function getToken() {
    return localStorage.getItem(LS_KEY);
  }
  function clearToken() {
    localStorage.removeItem(LS_KEY);
  }
  function goLogin() {
    location.href = LOGIN_PATH;
  }

  // ===== Auth helpers =====
  async function getProfile(token){
    const headers = { 'Authorization': `Bearer ${token}` };
    // probamos distintos endpoints de perfil por compatibilidad
    for (const path of ['/auth/me','/users/me','/me']){
      try{
        const r = await fetch(API + path, { headers, credentials: 'include' });
        if (r.ok) return await r.json();
      }catch(e){
        // silencioso, seguimos probando
      }
    }
    return null;
  }

  // ===== Guard (ADMIN o RECEPTION) =====
  async function guardStaff(){
    // Permitir inyección rápida de token por query: ?token=JWT
    const tokenFromQuery = getQueryParam('token');
    if (tokenFromQuery) setToken(tokenFromQuery);

    const token = getToken();
    if(!token){
      alert('Iniciá sesión para acceder.');
      goLogin();
      return;
    }

    const me = await getProfile(token);
    const role = me?.role; // Asegurate que /api/auth/me incluya "role"
    const allowed = (role === 'ADMIN' || role === 'RECEPTION');

    if(!allowed){
      // Si el token está vencido o inválido, lo limpiamos para no quedar en loop
      clearToken();
      alert('Sin permisos para el panel o sesión inválida.');
      goLogin();
      return;
    }

    // Pinta usuario en topbar
    const span = document.getElementById('topUser');
    if(span){
      const name = [me?.firstName, me?.lastName].filter(Boolean).join(' ')
                || me?.name || me?.email || 'Usuario';
      span.textContent = `${name} (${role})`;
    }

    // Si es recepción, oculta elementos solo-admin
    if (role === 'RECEPTION'){
      document.querySelectorAll('[data-admin-only]').forEach(el => { el.style.display = 'none'; });
    }

    return { me, role };
  }

  // ===== Fetch helpers (con token automático) =====
  function headersJSON(){
    const token = getToken();
    return {
      'Content-Type':'application/json',
      ...(token ? { 'Authorization':`Bearer ${token}` } : {})
    };
  }

  async function apiGet(path){
    const r = await fetch(API + path, { headers: headersJSON(), credentials: 'include' });
    if (r.status === 401) { clearToken(); goLogin(); return; }
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(j.error || j.message || `${r.status} ${r.statusText}`);
    return j;
  }
  async function apiPost(path, body){
    const r = await fetch(API + path, { method:'POST', headers: headersJSON(), body: JSON.stringify(body), credentials: 'include' });
    if (r.status === 401) { clearToken(); goLogin(); return; }
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(j.error || j.message || `${r.status} ${r.statusText}`);
    return j;
  }
  async function apiPut(path, body){
    const r = await fetch(API + path, { method:'PUT', headers: headersJSON(), body: JSON.stringify(body), credentials: 'include' });
    if (r.status === 401) { clearToken(); goLogin(); return; }
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(j.error || j.message || `${r.status} ${r.statusText}`);
    return j;
  }
  async function apiDel(path){
    const r = await fetch(API + path, { method:'DELETE', headers: headersJSON(), credentials: 'include' });
    if (r.status === 401) { clearToken(); goLogin(); return; }
    if(r.status===204) return true;
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(j.error || j.message || `${r.status} ${r.statusText}`);
    return j;
  }

  // ===== UI helpers =====
  function setActiveMenu(){
    const path = location.pathname.split('/').pop();
    document.querySelectorAll('.sidebar .menu a').forEach(a=>{
      const href = a.getAttribute('href') || '';
      if(href.endsWith(path)) a.classList.add('active');
    });
  }

  // Exponer helpers útiles en ventana para debug y pruebas
  window.Admin = {
    API,
    guardStaff,
    apiGet, apiPost, apiPut, apiDel,
    setActiveMenu,
    setToken,   // nuevo: Admin.setToken('JWT')
    logout: () => { clearToken(); goLogin(); }, // nuevo: Admin.logout()
  };

  // Auto-run en cada página admin
  document.addEventListener('DOMContentLoaded', async ()=>{
    try {
      await guardStaff();
      setActiveMenu();
    } catch (e) {
      console.error('[Admin Guard Error]', e);
      alert('No se pudo validar la sesión. Volviendo al login.');
      clearToken();
      goLogin();
    }
  });
})();


// ==== Export helpers (frontend)
function tableToCSV(tableSelector, filename='data.csv'){
  const rows = Array.from(document.querySelectorAll(`${tableSelector} tr`));
  if(!rows.length) return;
  const csv = rows.map(tr => Array.from(tr.children).map(td => {
    const t = (td.innerText||'').replace(/\n/g,' ').trim().replace(/"/g,'""');
    return `"${t}"`;
  }).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}
window.Admin = window.Admin || {};
window.Admin.exportTableCSV = tableToCSV;
