/* /admin/assets/admin.js */
(() => {
  // ===== Config =====
  // Ruta del login. Compatible con Live Server usando rutas relativas.
  const LOGIN_PATH = '../index.html'; 
  const LS_KEY = 'atix_token'; // clave del token JWT en localStorage

  // Detecta la base de la API desde meta tags o variables globales
  const metaApi = document.querySelector('meta[name="atix-api-base"]')?.content;
  const API = metaApi || window.ATIX_API_BASE || 'http://localhost:4000/api';

  // ===== Utils (URL, Token) =====

  // Obtiene parámetros del query ?token=...
  function getQueryParam(name) {
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }

  // Guarda el token en localStorage
  function setToken(token) {
    if (!token) return;
    localStorage.setItem(LS_KEY, token);
  }

  // Obtiene el token almacenado
  function getToken() {
    return localStorage.getItem(LS_KEY);
  }

  // Elimina el token del navegador
  function clearToken() {
    localStorage.removeItem(LS_KEY);
  }

  // Redirección al login
  function goLogin() {
    location.href = LOGIN_PATH;
  }

  // ===== Auth helpers =====

  // Obtiene perfil del usuario probando rutas compatibles con backend
  async function getProfile(token){
    const headers = { 'Authorization': `Bearer ${token}` };
    for (const path of ['/auth/me','/users/me','/me']){
      try{
        const r = await fetch(API + path, { headers, credentials: 'include' });
        if (r.ok) return await r.json();
      }catch(e){
        // silencioso, sigue intentando
      }
    }
    return null;
  }

  // ===== Guard (ADMIN o RECEPTION) =====

  async function guardStaff(){
    // Permite inyectar token en la URL para pruebas rápidas
    const tokenFromQuery = getQueryParam('token');
    if (tokenFromQuery) setToken(tokenFromQuery);

    const token = getToken();
    if(!token){
      alert('Iniciá sesión para acceder.');
      goLogin();
      return;
    }

    const me = await getProfile(token);
    const role = me?.role; 
    const allowed = (role === 'ADMIN' || role === 'RECEPTION');

    if(!allowed){
      clearToken(); // evita loops de sesión inválida
      alert('Sin permisos para el panel o sesión inválida.');
      goLogin();
      return;
    }

    // Pinta el nombre arriba a la derecha
    const span = document.getElementById('topUser');
    if(span){
      const name = [me?.firstName, me?.lastName].filter(Boolean).join(' ')
                || me?.name || me?.email || 'Usuario';
      span.textContent = `${name} (${role})`;
    }

    // Oculta elementos que requieren ADMIN si el usuario es RECEPCION
    if (role === 'RECEPTION'){
      document.querySelectorAll('[data-admin-only]').forEach(el => { el.style.display = 'none'; });
    }

    return { me, role };
  }

  // ===== Fetch helpers (con token automático) =====

  // Construye headers JSON + token
  function headersJSON(){
    const token = getToken();
    return {
      'Content-Type':'application/json',
      ...(token ? { 'Authorization':`Bearer ${token}` } : {})
    };
  }

  // GET
  async function apiGet(path){
    const r = await fetch(API + path, { headers: headersJSON(), credentials: 'include' });
    if (r.status === 401) { clearToken(); goLogin(); return; }
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(j.error || j.message || `${r.status} ${r.statusText}`);
    return j;
  }

  // POST
  async function apiPost(path, body){
    const r = await fetch(API + path, { method:'POST', headers: headersJSON(), body: JSON.stringify(body), credentials: 'include' });
    if (r.status === 401) { clearToken(); goLogin(); return; }
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(j.error || j.message || `${r.status} ${r.statusText}`);
    return j;
  }

  // PUT
  async function apiPut(path, body){
    const r = await fetch(API + path, { method:'PUT', headers: headersJSON(), body: JSON.stringify(body), credentials: 'include' });
    if (r.status === 401) { clearToken(); goLogin(); return; }
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(j.error || j.message || `${r.status} ${r.statusText}`);
    return j;
  }

  // DELETE
  async function apiDel(path){
    const r = await fetch(API + path, { method:'DELETE', headers: headersJSON(), credentials: 'include' });
    if (r.status === 401) { clearToken(); goLogin(); return; }
    if(r.status===204) return true; // delete OK sin body
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(j.error || j.message || `${r.status} ${r.statusText}`);
    return j;
  }

  // ===== UI helpers =====

  // Marca el menú activo (sidebar)
  function setActiveMenu(){
    const path = location.pathname.split('/').pop();
    document.querySelectorAll('.sidebar .menu a').forEach(a=>{
      const href = a.getAttribute('href') || '';
      if(href.endsWith(path)) a.classList.add('active');
    });
  }

  // Expone utilidades desde window.Admin para debug
  window.Admin = {
    API,
    guardStaff,
    apiGet, apiPost, apiPut, apiDel,
    setActiveMenu,
    setToken,
    logout: () => { clearToken(); goLogin(); },
  };

  // Se ejecuta automáticamente en cada página admin
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

// Exporta tablas HTML como CSV descargable
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

// Agrega exportTableCSV a window.Admin
window.Admin = window.Admin || {};
window.Admin.exportTableCSV = tableToCSV;
