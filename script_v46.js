/* ═══════════════════════════════════════════
   TOASTS — reemplaza alert()
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   SEGURIDAD — ESCAPE HTML (anti-XSS)
═══════════════════════════════════════════ */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// Alias corto para usar en templates: ${esc(c.nombre)}
const esc = escapeHtml;

// Escapa para insertar de forma segura dentro de un atributo onclick="...('texto')"
function escJs(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ═══════════════════════════════════════════
   MANEJO GLOBAL DE ERRORES
═══════════════════════════════════════════ */
window.addEventListener('error', function(e) {
  console.error('Error no capturado:', e.error || e.message);
  // No mostramos toast por cada error de runtime para no saturar,
  // pero queda registrado en consola para diagnostico.
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('Promesa rechazada sin manejar:', e.reason);
  const msg = e.reason?.message || '';
  if (msg.includes('PERMISSION_DENIED') || msg.includes('permission_denied')) {
    showToast('No tenes permiso para realizar esta accion. Verifica tu conexion.', 'error', 5000);
  } else if (msg.includes('network') || msg.includes('Network')) {
    showToast('Error de conexion. Verifica tu internet e intenta de nuevo.', 'error', 5000);
  }
});

/* Wrapper seguro para operaciones Firebase con feedback automático */
async function fbSafe(promiseFn, opts = {}) {
  try {
    const result = await promiseFn();
    if (opts.successMsg) toastOk(opts.successMsg);
    return result;
  } catch (e) {
    console.error('Firebase error:', e);
    const friendly = e.message?.includes('PERMISSION_DENIED')
      ? 'Sin permiso para esta accion.'
      : e.message?.includes('network') || !navigator.onLine
      ? 'Sin conexion a internet. Revisa tu red e intenta de nuevo.'
      : (opts.errorMsg || 'Ocurrio un error. Intenta de nuevo.');
    toastErr(friendly);
    return null;
  }
}

/* Aviso si se pierde la conexión a internet */
window.addEventListener('offline', () => {
  showToast('Sin conexion a internet. Los cambios no se guardaran hasta reconectar.', 'error', 6000);
  const b = document.getElementById('offline-banner');
  if (b) b.style.display = 'block';
});
window.addEventListener('online', () => {
  showToast('Conexion restablecida.', 'success', 2500);
  const b = document.getElementById('offline-banner');
  if (b) b.style.display = 'none';
});
// Check estado inicial
if (!navigator.onLine) {
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('offline-banner');
    if (b) b.style.display = 'block';
  });
}

/* ═══════════════════════════════════════════
   COUNT-UP ANIMATION
═══════════════════════════════════════════ */
function countUp(el, target, duration=900, prefix='', suffix='') {
  if (!el) return;
  const start   = parseFloat(el.dataset.prev || 0);
  const diff    = target - start;
  if (diff === 0) { el.textContent = prefix + target.toLocaleString('es-BO') + suffix; return; }
  const startTs = performance.now();
  function step(now) {
    const elapsed = now - startTs;
    const progress = Math.min(elapsed / duration, 1);
    // ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = start + diff * ease;
    el.textContent = prefix + (Number.isInteger(target) ? Math.round(current) : current.toFixed(2)).toLocaleString('es-BO') + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else { el.dataset.prev = target; }
  }
  requestAnimationFrame(step);
}

function countUpMoney(el, target, duration=900, prefix='$') {
  if (!el) return;
  const start = parseFloat(el.dataset.prev || 0);
  const diff  = target - start;
  const startTs = performance.now();
  function step(now) {
    const elapsed  = now - startTs;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    const current  = start + diff * ease;
    el.textContent = prefix + current.toLocaleString('es-BO', {minimumFractionDigits:2, maximumFractionDigits:2});
    if (progress < 1) requestAnimationFrame(step);
    else el.dataset.prev = target;
  }
  requestAnimationFrame(step);
}

function showToast(msg, type='info', duration=3500) {
  const cont = document.getElementById('toast-container');
  if (!cont) { console.log(msg); return; }
  const icons = { success:'✅', error:'⚠️', info:'ℹ️' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<div class="toast-icon">${icons[type]||icons.info}</div>
    <div class="toast-body">${msg}</div>
    <button class="toast-close" onclick="_removeToast(this.parentElement)">×</button>`;
  cont.appendChild(el);
  setTimeout(() => _removeToast(el), duration);
}
function _removeToast(el) {
  if (!el || el.classList.contains('removing')) return;
  el.classList.add('removing');
  setTimeout(() => el.remove(), 250);
}
// Alias cortos
function toastOk(msg)   { showToast(msg, 'success'); }
function toastErr(msg)  { showToast(msg, 'error'); }
function toastInfo(msg) { showToast(msg, 'info'); }

/* ═══════════════════════════════════════════
   CONFIRM MODAL — reemplaza confirm()
═══════════════════════════════════════════ */
let _confirmResolver = null;
function confirmDialog(message, opts={}) {
  return new Promise(resolve => {
    _confirmResolver = resolve;
    document.getElementById('confirm-title').textContent = opts.title || '¿Estás seguro?';
    document.getElementById('confirm-msg').textContent   = message || 'Esta acción no se puede deshacer.';
    const btnOk = document.getElementById('confirm-btn-ok');
    btnOk.textContent = opts.okText || 'Eliminar';
    btnOk.className = 'confirm-btn-ok' + (opts.positive ? ' ok-positive' : '');
    document.getElementById('confirm-icon').textContent = opts.icon || (opts.positive ? '✓' : '🗑');
    document.getElementById('confirm-icon').style.background = opts.positive ? '#f0f7ee' : '#fef2f2';
    document.getElementById('confirm-icon').style.color = opts.positive ? 'var(--verde)' : 'var(--danger)';
    document.getElementById('confirm-overlay').classList.add('open');
  });
}
function _confirmResolve(val) {
  document.getElementById('confirm-overlay').classList.remove('open');
  if (_confirmResolver) { _confirmResolver(val); _confirmResolver = null; }
}

/* ═══════════════════════════════════════════
   BOTÓN GUARDAR — estado loading/success
═══════════════════════════════════════════ */
function btnLoading(btn, on) {
  if (!btn) return;
  if (on) {
    btn.dataset.origText = btn.dataset.origText || btn.textContent;
    btn.classList.add('is-loading','btn-state');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>Guardando...';
  } else {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  }
}
function btnSuccess(btn, duration=1800) {
  if (!btn) return;
  btn.classList.remove('is-loading'); // crítico: sin esto, pointer-events:none queda pegado para siempre
  btn.disabled = false;
  btn.classList.add('is-success','btn-state');
  btn.innerHTML = '✓ Guardado';
  setTimeout(() => {
    btn.classList.remove('is-success');
    btn.textContent = btn.dataset.origText || '✓ Guardar';
  }, duration);
}

/* ═══════════════════════════════════════════
   ESTADO GLOBAL
═══════════════════════════════════════════ */
let asesores    = [];        /* [{nombre, pin, _key}] */
let todosRegs   = [];        /* admin: todos los registros */
let misRegs     = [];        /* asesor: solo los suyos */
let asesorActual = null;     /* {nombre, pin, _key} */
let modoAdmin   = false;

let pinAdminLocal = localStorage.getItem('uv_planilla_pin') || '0000';
let pinBuf = '';

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
let _asesoresRecibidos = false;
document.addEventListener('fb-ready', () => {
  window._fbListenAsesores(arr => {
    _asesoresRecibidos = true;
    asesores = arr;
    renderAsesorGrid();
    if (modoAdmin) renderAsesoresAdmin();
    if (asesorActual) renderMisRegistros();
    poblarSelectAsesorCallCenter();
  });
});

/* Fallback: si Firebase conectó pero no hay asesores, mostrar estado vacío rápido */
setTimeout(() => {
  if (window._fbReady && asesores.length === 0) {
    renderAsesorGrid(); // mostrará el empty state con instrucciones
  }
}, 3000);

/* Fallback si Firebase no respondió en absoluto (típicamente: reglas de seguridad bloqueando) */
setTimeout(() => {
  if (!window._fbReady || !_asesoresRecibidos) {
    const grid = document.getElementById('asesor-grid');
    if (grid) grid.innerHTML = `<div style="text-align:center;padding:16px;color:var(--rojo);font-size:var(--fs-base);line-height:1.6;">
      ⚠️ <strong>No se pudo leer la base de datos.</strong><br>
      Esto suele pasar porque las <strong>reglas de seguridad de Firebase expiraron</strong>
      (el modo de prueba dura 30 días).<br><br>
      Solución: Firebase Console → Realtime Database → Reglas → pegar:<br>
      <code style="background:#fff;padding:2px 6px;border-radius:4px;font-size:var(--fs-xs);">{"rules":{".read":true,".write":true}}</code>
      → Publicar → recargar esta página.
    </div>`;
  }
}, 6000);

/* ═══════════════════════════════════════════
   LOGIN — PASO 1: GRILLA ASESORES
═══════════════════════════════════════════ */
function renderAsesorGrid() {
  const grid = document.getElementById('asesor-grid');
  if (!asesores.length) {
    grid.innerHTML = `<div style="text-align:center;padding:20px;color:var(--ink-500);font-size:var(--fs-base);line-height:1.6;">
      <div style="font-size:var(--fs-3xl);margin-bottom:8px;">👋</div>
      <strong>Sin usuarios configurados</strong><br>
      Entrá como <strong>Administrador</strong> para crear usuarios.
    </div>`;
    return;
  }
  grid.innerHTML = asesores.map(a => {
    const rolInfo = (typeof ROL_LABELS !== 'undefined' && ROL_LABELS[a.rol]) || { label:'Asesor comercial', color:'var(--cartera)', bg:'var(--verde-bg)', icon:'' };
    return `
    <button class="asesor-btn" onclick="seleccionarAsesor('${a._key}', this)">
      <div class="av" style="background:linear-gradient(155deg,${rolInfo.color},${rolInfo.color}dd);">${iniciales(a.nombre)}</div>
      <div class="info">
        <div class="name">${esc(a.nombre)}</div>
        <div class="role" style="background:${rolInfo.bg||'var(--verde-bg)'};color:${rolInfo.color};">${rolInfo.icon||''} ${rolInfo.label}</div>
      </div>
    </button>`;
  }).join('');
}

function iniciales(nombre) {
  return nombre.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2);
}

/* ═══════════════════════════════════════════
   LOGIN — PASO 2: PIN
═══════════════════════════════════════════ */
function seleccionarAsesor(key, btnEl) {
  const a = asesores.find(x => x._key === key);
  if (!a) return;
  asesorActual = a;
  modoAdmin = false;
  transicionarAPin(a.nombre, false, btnEl);
}

function seleccionarAdmin(btnEl) {
  asesorActual = null;
  modoAdmin = true;
  transicionarAPin('Administrador', true, btnEl);
}

/* Transición moderna: feedback en el botón elegido + fade/slide entre pasos */
function transicionarAPin(nombre, esAdmin, btnEl) {
  if (btnEl) btnEl.classList.add('asesor-btn-picked');
  const stepU = document.getElementById('step-usuario');
  stepU.classList.add('step-fade-out');
  setTimeout(() => {
    stepU.style.display = 'none';
    stepU.classList.remove('step-fade-out');
    if (btnEl) btnEl.classList.remove('asesor-btn-picked');
    mostrarPinStep(nombre, esAdmin);
  }, 220);
}

function mostrarPinStep(nombre, esAdmin) {
  const pinStep = document.getElementById('pin-step');
  pinStep.style.display = 'block';
  pinStep.classList.remove('step-fade-in');
  void pinStep.offsetWidth; /* fuerza reflow para reiniciar la animación */
  pinStep.classList.add('step-fade-in');

  const av = document.getElementById('sel-av');
  av.textContent  = esAdmin ? '⚙' : iniciales(nombre);
  av.className    = 'av' + (esAdmin ? ' av-admin' : '');
  document.getElementById('sel-name').textContent = nombre;
  document.getElementById('pin-err').style.display = 'none';
  pinBuf = '';
  actualizarDots();
}

function cerrarTodosLosModales() {
  document.querySelectorAll('.open').forEach(el => el.classList.remove('open'));
  const notifDd = document.getElementById('notif-dropdown');
  if (notifDd) notifDd.style.display = 'none';
}

function volverPaso1() {
  const pinStep = document.getElementById('pin-step');
  const stepU   = document.getElementById('step-usuario');
  pinStep.classList.add('step-fade-out');
  setTimeout(() => {
    pinStep.style.display = 'none';
    pinStep.classList.remove('step-fade-out');
    stepU.style.display = 'block';
    stepU.classList.remove('step-fade-in');
    void stepU.offsetWidth;
    stepU.classList.add('step-fade-in');
  }, 220);
  pinBuf = '';
}

function pinPress(v) {
  if (v==='del') pinBuf = pinBuf.slice(0,-1);
  else if (v==='clr') pinBuf = '';
  else if (pinBuf.length < 4) pinBuf += v;
  document.getElementById('pin-err').style.display = 'none';
  actualizarDots();
  if (pinBuf.length === 4) setTimeout(verificarPin, 120);
}

function actualizarDots() {
  for (let i=0;i<4;i++)
    document.getElementById('pd'+i).classList.toggle('filled', i < pinBuf.length);
}

/* Soporte de teclado físico para el PIN (además del numpad en pantalla).
   Solo actúa cuando el paso de PIN está visible, para no interferir
   con otros inputs de la app. */
document.addEventListener('keydown', (e) => {
  const pinStep = document.getElementById('pin-step');
  if (!pinStep || pinStep.offsetParent === null) return; // no interceptar si no está realmente visible
  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault();
    pinPress(e.key);
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    pinPress('del');
  } else if (e.key === 'Escape') {
    e.preventDefault();
    volverPaso1();
  }
});

function verificarPin() {
  // Loading visual breve mientras "verifica"
  const card = document.querySelector('.login-card');
  const numpad = document.querySelector('.numpad');
  if (numpad) numpad.style.opacity = '.5';

  setTimeout(() => {
    let ok = false;
    if (modoAdmin) {
      ok = (pinBuf === pinAdminLocal);
    } else {
      ok = (asesorActual && pinBuf === asesorActual.pin);
    }

    if (ok) {
      document.getElementById('pin-step').style.display = 'none';
      if (modoAdmin) entrarAdmin();
      else entrarAsesor();
      return;
    }

    // Error: shake + mensaje
    document.getElementById('pin-err').style.display = 'block';
    if (numpad) numpad.style.opacity = '1';
    if (card) {
      card.classList.remove('shake');
      // reflow para reiniciar animación
      void card.offsetWidth;
      card.classList.add('shake');
    }
    pinBuf = ''; actualizarDots();
  }, 250);
}

/* ═══════════════════════════════════════════
   ENTRAR
═══════════════════════════════════════════ */
function entrarAsesor() {
  const a = asesorActual;
  const rol = a.rol || 'ventas';
  const modulos = a.modulos || ROL_MODULOS[rol] || ['ventas'];

  // Gerencia → admin panel completo
  if (rol === 'gerencia') {
    entrarAdmin();
    return;
  }

  // Cobranza → admin panel directo en panel-cartera
  if (rol === 'cobranza' || modulos.includes('cobranza')) {
    entrarAdmin();
    setTimeout(() => {
      _restrictAdminPanelForRole('cobranza');
      switchAdminTab('cartera');
    }, 200);
    return;
  }

  // Expensas → admin panel directo en panel-expensas
  if (rol === 'expensas' || (modulos.includes('expensas') && !modulos.includes('ventas'))) {
    entrarAdmin();
    setTimeout(() => {
      _restrictAdminPanelForRole('expensas');
      switchAdminTab('expensas');
    }, 200);
    return;
  }

  // Ventas y otros → panel usuario limitado
  entrarUsuario();
}

// Restricción de sidebar según rol del usuario
function _restrictAdminPanelForRole(rol) {
  const a = asesorActual;
  if (!a) return;
  const rolInfo = ROL_LABELS[rol] || ROL_LABELS.ventas;

  // Actualizar sidebar user info con el usuario real
  const sbAv  = document.getElementById('sidebar-av');
  const sbNom = document.getElementById('sidebar-nombre');
  const sbRol = document.getElementById('sidebar-rol');
  const tbAv  = document.getElementById('topbar-av');
  const tbNom = document.getElementById('topbar-nombre');
  if (sbAv)  sbAv.textContent  = iniciales(a.nombre);
  if (sbNom) sbNom.textContent = a.nombre;
  if (sbRol) sbRol.textContent = rolInfo.icon + ' ' + rolInfo.label;
  if (tbAv)  tbAv.textContent  = iniciales(a.nombre);
  if (tbNom) tbNom.textContent = a.nombre;

  // Para cobranza: ocultar nav items no relevantes
  if (rol === 'cobranza') {
    const hideIds = ['nav-home','nav-dashboard','nav-marketing-admin',
                     'nav-expensas','nav-tabla','nav-inventario',
                     'nav-asesores','nav-config'];
    hideIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    // Ocultar grupos del acordeón que quedan sin ningún item visible
    setTimeout(() => {
      document.querySelectorAll('.nav-acc-body').forEach(body => {
        const visibles = Array.from(body.children).some(item => item.style.display !== 'none');
        const head = body.previousElementSibling;
        if (!visibles) {
          body.style.display = 'none';
          if (head?.classList.contains('nav-acc-head')) head.style.display = 'none';
        }
      });
    }, 50);
  }
}

function entrarAdmin() {
  cerrarTodosLosModales();
  document.getElementById('login-screen').style.display = 'none';
  const ap = document.getElementById('admin-panel');
  ap.style.display = 'flex';
  ap.classList.add('visible');
  // Populate sidebar user info
  document.getElementById('sidebar-av').textContent    = '⚙';
  document.getElementById('sidebar-nombre').textContent = 'Administrador';
  document.getElementById('sidebar-rol').textContent    = 'Controller / Gerente';
  document.getElementById('topbar-av').textContent     = 'A';
  document.getElementById('topbar-nombre').textContent  = 'Admin';

  /* Registros de ventas */
  window._fbListenTodos(arr => {
    todosRegs = arr;
    poblarFiltroAsesor();
    renderDashboard();
    renderTablaAdmin();
    renderHome();
    renderAdminMarketing();
  });

  /* Asesores e inventario */
  renderAsesoresAdmin();
  iniciarInventario();



  /* ── CATEGORÍAS DE COBRO ── */
  window._fbListenCategorias(arr => {
    categoriasData = arr;
    renderCategoriasConfig();
  });

  /* ── COBROS MANUALES ── */
  window._fbListenCobros(arr => {
    cobrosData = arr;
    renderCobros();
    calcularMetaManual('cartera');
    calcularMetaManual('expensas');
    renderResumenCobranza();
    renderMetasPorUsuario();
    renderHome();
  });

  /* ── LEADS MARKETING (admin ve todos) ── */
  window._fbListenLeads(arr => {
    leadsData = arr;
    renderAdminMarketing();
    renderDashboard();
  });

  /* ── CAMPAÑAS Y VISITAS PROGRAMADAS (admin ve todas) ── */
  window._fbListenCampanias(arr => { campaniasData = arr; renderCampanias(); renderAdminMarketing(); });
  window._fbListenLeadsSemanales(arr => { leadsSemanalesData = arr; renderLeadsSemanales(); renderDashboard(); renderAdminMarketing(); });
  window._fbListenVisitasProgramadasTodas(arr => {
    visitasProgramadasData = arr;
    renderDashboard();
    renderAdminMarketing();
  });
  window._fbListenSolicitudesEliminacion(arr => { solicitudesEliminacionData = arr; renderSolicitudesEliminacionAdmin(); });
  window._fbListenOrigenes(arr => { origenesData = arr; renderOrigenes(); });
  window._fbListenOrangeMora(arr => { orangeMoraData = arr; renderOrangeMoraPanel(); });
  window._fbListenOrangeSyncInfo(info => renderOrangeSyncInfo(info));
  window._fbListenVentasConcretadas(arr => { ventasConcretadasData = arr; renderVentasConcretadasAdmin(); });
  window._fbListenPoliticaDescuento(arr => { politicaDescuentoData = arr; });

  /* ── CARTERA META ── */
  window._fbListenCartaMeta(arr => {
    cartaMetaData = arr;
    renderCartaMeta();
    renderCartaKPIs();
  });

  /* ── CARTERA COBROS ── */
  window._fbListenCartaCobros(arr => {
    cartaCobroData = arr;
    cartaAdminData = arr;  // legacy compat
    renderCartaCobros();
    renderCartaKPIs();
    renderHome();
  });

  /* ── CATEGORÍAS CARTERA ── */
  window._fbListenCatCartera(arr => {
    catCarteraData = arr;
    renderCatCarteraConfig();
  });

  /* ── CATEGORÍAS EXPENSAS ── */
  window._fbListenCatExpensas(arr => {
    catExpensasData = arr;
    renderCatExpensasConfig();
  });

  /* ── EXPENSAS ADMIN ── */
  window._fbListenExpAdmin(arr => {
    expAdminData = arr;
    renderExpensasAdmin();
    renderHome();
  });

  /* ── COBRANZA EXCEL ── */
  window._fbListenCobranzaExcel(arr => {
    cobranzaExcelData = arr;
  });

  /* ── EXPENSAS MANUALES ── */
  window._fbListenExpensas_manual(arr => {
    expensasManualData = arr;
    renderResumenExpensas();
  });

  /* API Orange (intento, puede fallar por CORS) */
  /* Intentar Orange al inicio */

  /* Auto-refresh cada 10 minutos */
  setInterval(() => {
    if (modoAdmin) {
          renderHome();
    }
  }, 10 * 60 * 1000);

  /* Fecha de hoy en formulario */
  const hoy = new Date().toISOString().split('T')[0];
  const nc_fecha = document.getElementById('nc-fecha');
  if (nc_fecha) nc_fecha.value = hoy;
}

function cerrarSesion() {
  location.reload();
}

function toggleSidebar() {
  const sb  = document.getElementById('sidebar');
  const ov  = document.getElementById('sidebar-overlay');
  const open = sb?.classList.toggle('open');
  ov?.classList.toggle('open', open);
}

async function confirmarSalir() {
  const ok = await confirmDialog(
    'Tu sesión se cerrará y tendrás que volver a ingresar tu PIN.',
    { title:'Cerrar sesión', okText:'Salir', icon:'⏻',
      positive:false }
  );
  if (ok) cerrarSesion();
}

/* ═══════════════════════════════════════════
   TABS
═══════════════════════════════════════════ */
function switchAsesorTab(id) {
  document.querySelectorAll('.a-tab').forEach((b,i) => {
    const ids = ['cargar','mis-registros'];
    b.classList.toggle('active', ids[i]===id);
  });
  document.querySelectorAll('.a-tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('atab-' + (id==='mis-registros'?'mis-registros':'cargar')).classList.add('active');
}

const TAB_TITLES = {
  'home':'Inicio', 'dashboard':'Ventas', 'marketing-admin':'Marketing',
  'cartera':'Cartera', 'expensas':'Expensas', 'cobranza':'Cartera',
  'tabla':'Registros', 'contratos':'Ventas Concretadas', 'inventario':'Inventario', 'eliminaciones':'Eliminaciones',
  'panelcontrol':'Panel de Control', 'asesores':'Usuarios', 'config':'Config'
};

const NAV_GRUPOS = {
  home:'resumen',
  dashboard:'comercial', contratos:'comercial', 'marketing-admin':'comercial', tabla:'comercial',
  cartera:'finanzas', expensas:'finanzas', cobranza:'finanzas',
  inventario:'operaciones',
  eliminaciones:'sistema', panelcontrol:'sistema', asesores:'sistema', config:'sistema',
};

function navAbrirGrupo(grupo) {
  document.querySelectorAll('.nav-acc-head').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-acc-body').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-acc-head[onclick="navAbrirGrupo('${grupo}')"]`)?.classList.add('active');
  document.querySelector(`.nav-acc-body[data-grupo="${grupo}"]`)?.classList.add('active');
}

function switchAdminTab(id) {
  navAbrirGrupo(NAV_GRUPOS[id] || 'resumen');
  // Update sidebar active
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById('nav-' + id);
  if (navBtn) navBtn.classList.add('active');
  // Update panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('active');
  // Update topbar title
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = TAB_TITLES[id] || id;
  // Close sidebar on mobile
  if (window.innerWidth <= 900) {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
  }
  // Render hooks
  if (id === 'home')            renderHome();
  if (id === 'marketing-admin') renderAdminMarketing();
  if (id === 'contratos')       renderVentasConcretadasAdmin();
  if (id === 'panelcontrol')    renderPanelControl();
  if (id === 'cartera') {
    const mes = mesActual(); const anio = anioActual();
    const lbl = document.getElementById('cart-periodo-label');
    if (lbl) lbl.textContent = mes + ' ' + anio;
    const lbl2 = document.getElementById('cart-mes-label2');
    if (lbl2) lbl2.textContent = mes + ' ' + anio;
    renderCartaMeta(); renderCartaCobros(); renderCartaKPIs();
    switchCartaTab('cobros');
  }
  if (id === 'expensas')        renderExpensasAdmin();
}

/* ═══════════════════════════════════════════
   RADIO PILLS — interactividad
═══════════════════════════════════════════ */
document.addEventListener('change', e => {
  if (e.target.type !== 'radio') return;
  const row = e.target.closest('.radio-row');
  if (!row) return;
  row.querySelectorAll('.radio-pill').forEach(p => {
    p.classList.remove('sel-si','sel-no','sel-gen');
    const inp = p.querySelector('input');
    if (inp && inp.checked) {
      p.classList.add(inp.value==='SI' ? 'sel-si' : 'sel-no');
    }
  });
});

function poblarSugerenciasClientes() {
  const dl = document.getElementById('f-nombre-sugerencias');
  if (!dl) return;
  const nombres = [...new Set(misRegs.map(r => r.nombre).filter(Boolean))].sort();
  dl.innerHTML = nombres.map(n => `<option value="${esc(n)}"></option>`).join('');
}

function autocompletarClienteExistente() {
  const inp = document.getElementById('f-nombre');
  if (!inp) return;
  inp.classList.remove('input-error');
  const nombre = inp.value.trim().toLowerCase();
  if (!nombre) return;
  // Si el nombre coincide EXACTO con un cliente que este vendedor ya cargó antes,
  // le autocompletamos ciudad/origen con su registro más reciente — así no
  // tiene que volver a tipear todo de cero cada vez que avanza de etapa con el mismo cliente.
  const previos = misRegs.filter(r => (r.nombre||'').trim().toLowerCase() === nombre);
  if (!previos.length) return;
  const masReciente = previos.sort((a,b)=>(b.ts||0)-(a.ts||0))[0];
  const ciudad = document.getElementById('f-ciudad');
  const origen = document.getElementById('f-origen');
  if (ciudad && !ciudad.value && masReciente.ciudadProcedencia) ciudad.value = masReciente.ciudadProcedencia;
  if (origen && !origen.value && masReciente.origen) origen.value = masReciente.origen;
}

/* ═══════════════════════════════════════════
   NOTIFICACIONES
═══════════════════════════════════════════ */
let misNotificaciones = [];

function renderNotificaciones() {
  const badge = document.getElementById('notif-badge');
  const lista = document.getElementById('notif-lista');
  const noLeidas = misNotificaciones.filter(n => !n.leida);
  if (badge) {
    badge.style.display = noLeidas.length ? 'block' : 'none';
    badge.textContent = noLeidas.length > 9 ? '9+' : noLeidas.length;
  }
  if (!lista) return;
  if (!misNotificaciones.length) { lista.innerHTML = '<div class="empty-state" style="padding:16px;">Sin notificaciones.</div>'; return; }
  lista.innerHTML = misNotificaciones.map(n => `
    <div onclick="window._fbMarcarNotifLeida('${asesorActual._key}','${n._key}')" style="padding:10px 12px;border-radius:var(--r-sm);cursor:pointer;background:${n.leida?'transparent':'var(--info-bg,#eef4fb)'};margin-bottom:2px;">
      <div style="font-size:var(--fs-sm);${n.leida?'':'font-weight:600;'}">${n.leida?'':'🔵 '}${esc(n.mensaje)}</div>
      <div style="font-size:var(--fs-xs);color:var(--gris);margin-top:2px;">${new Date(n.ts).toLocaleString('es-BO')}</div>
    </div>`).join('');
}

function toggleNotifDropdown() {
  const dd = document.getElementById('notif-dropdown');
  if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

async function marcarTodasNotifLeidas() {
  const keys = misNotificaciones.filter(n=>!n.leida).map(n=>n._key);
  if (!keys.length) return;
  await window._fbMarcarTodasLeidas(asesorActual._key, keys);
}

document.addEventListener('click', e => {
  const wrap = document.getElementById('notif-bell-wrap');
  const dd = document.getElementById('notif-dropdown');
  if (wrap && dd && !wrap.contains(e.target)) dd.style.display = 'none';
});

/* ═══════════════════════════════════════════
   SOLICITUDES DE ELIMINACIÓN (Call Center / Marketing → aprueba Administrador)
═══════════════════════════════════════════ */
let solicitudesEliminacionData = [];

async function solicitarEliminacion(coleccionPath, descripcion) {
  const ok = await confirmDialog(
    'No se borra al toque: queda pendiente de autorización del Administrador, y recién ahí se elimina.',
    { title:'Solicitar eliminación', okText:'Solicitar', icon:'🗑' }
  );
  if (!ok) return;
  await window._fbPushSolicitudEliminacion({
    coleccionPath, descripcion,
    solicitadoPorKey: asesorActual?._key || '',
    solicitadoPorNombre: asesorActual?.nombre || '',
  });
  toastOk('Solicitud enviada — queda pendiente de autorización.');
}

function renderSolicitudesEliminacionAdmin() {
  const pend = solicitudesEliminacionData.filter(s => s.estado === 'pendiente');
  const resueltas = solicitudesEliminacionData.filter(s => s.estado !== 'pendiente').slice(0, 30);

  const badge = document.getElementById('nav-elim-badge');
  if (badge) {
    badge.style.display = pend.length ? 'flex' : 'none';
    badge.textContent = pend.length;
  }

  const contP = document.getElementById('elim-pendientes-lista');
  if (contP) {
    contP.innerHTML = pend.length ? pend.map(s => `
      <div class="vendor-item" style="align-items:flex-start;">
        <div>
          <span class="v-name">${esc(s.descripcion)}</span>
          <div style="font-size:var(--fs-xs);color:var(--gris);margin-top:2px;">Pedido por ${esc(s.solicitadoPorNombre||'—')} · ${new Date(s.ts).toLocaleString('es-BO')}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button onclick="aprobarSolicitudEliminacion('${s._key}','${esc(s.coleccionPath)}')" style="padding:6px 12px;background:var(--danger);color:#fff;border:none;border-radius:var(--r-sm);font-size:var(--fs-sm);cursor:pointer;">🗑 Aprobar y eliminar</button>
          <button onclick="rechazarSolicitudEliminacion('${s._key}')" style="padding:6px 12px;background:var(--fill);border:1.5px solid var(--line);border-radius:var(--r-sm);font-size:var(--fs-sm);cursor:pointer;">Rechazar</button>
        </div>
      </div>`).join('') : '<div class="empty-state">Sin solicitudes pendientes.</div>';
  }

  const contR = document.getElementById('elim-resueltas-lista');
  if (contR) {
    contR.innerHTML = resueltas.length ? resueltas.map(s => `
      <div class="vendor-item">
        <span class="v-name" style="text-decoration:${s.estado==='aprobada'?'line-through':'none'};color:var(--gris);">${esc(s.descripcion)}</span>
        <span style="font-size:var(--fs-xs);font-weight:600;color:${s.estado==='aprobada'?'var(--danger)':'var(--ok)'};">${s.estado==='aprobada'?'Eliminado':'Rechazado'}</span>
      </div>`).join('') : '<div class="empty-state">Sin historial todavía.</div>';
  }
}

async function aprobarSolicitudEliminacion(key, coleccionPath) {
  const ok = await confirmDialog('Se va a eliminar definitivamente. Esta acción no se puede deshacer.', { title:'Aprobar y eliminar', okText:'Sí, eliminar' });
  if (!ok) return;
  await window._fbRemoveGenerico(coleccionPath);
  await window._fbResolverSolicitudEliminacion(key, true);
  toastOk('Eliminado.');
}

async function rechazarSolicitudEliminacion(key) {
  await window._fbResolverSolicitudEliminacion(key, false);
  toastOk('Solicitud rechazada — el dato sigue intacto.');
}


/* ═══════════════════════════════════════════
   ORÍGENES DE VENTA (gestionables desde Config)
═══════════════════════════════════════════ */
let origenesData = [];
let ventasConcretadasData = [];
let politicaDescuentoData = [];

function renderOrigenes() {
  const cont = document.getElementById('origenes-lista');
  if (cont) {
    cont.innerHTML = origenesData.length ? origenesData.map(o => `
      <div class="vendor-item">
        <span class="v-name">${esc(o.nombre)}</span>
        <button class="btn-remove-vendor" onclick="window._fbRemoveOrigen('${o._key}')">×</button>
      </div>`).join('') : '<div class="empty-state">Sin orígenes cargados todavía.</div>';
  }
  ['f-origen','cc-origen'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const actual = sel.value;
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      origenesData.map(o => `<option value="${esc(o.nombre)}">${esc(o.nombre)}</option>`).join('');
    sel.value = actual;
  });
}

async function agregarOrigen() {
  const inp = document.getElementById('nuevo-origen-nombre');
  const nombre = inp.value.trim();
  if (!nombre) { toastErr('Escribí el nombre del nuevo origen.'); return; }
  if (origenesData.some(o => o.nombre.toLowerCase() === nombre.toLowerCase())) { toastErr('Ya existe ese origen.'); return; }
  await window._fbPushOrigen(nombre);
  inp.value = '';
  toastOk('Origen "'+nombre+'" agregado.');
}

/* ═══════════════════════════════════════════
   CALL CENTER — Agendar visitas para un asesor
═══════════════════════════════════════════ */
function mostrarFichaVisita(v) {
  setText('ficha-nombre', v.nombre);
  setText('ficha-telefono', v.telefono || 'Sin teléfono');
  setText('ficha-asesor', v.asesorNombre || '—');
  const fechaFmt = v.fecha ? new Date(v.fecha+'T00:00:00').toLocaleDateString('es-BO',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  setText('ficha-fecha', fechaFmt + (v.hora?' · '+v.hora:''));
  const badges = document.getElementById('ficha-badges');
  if (badges) {
    let html = '';
    if (v.origen) html += `<span style="padding:5px 12px;border-radius:999px;background:var(--info-bg,#eef4fb);color:var(--info);font-size:var(--fs-sm);font-weight:600;">${esc(v.origen)}</span>`;
    if (v.campaniaCodigo) html += `<span style="padding:5px 12px;border-radius:999px;background:var(--verde-bg);color:var(--verde);font-size:var(--fs-sm);font-weight:600;font-family:monospace;">${esc(v.campaniaCodigo)}</span>`;
    badges.innerHTML = html;
  }
  const interesWrap = document.getElementById('ficha-interes-wrap');
  if (interesWrap) {
    if (v.interes) { setText('ficha-interes', v.interes); interesWrap.style.display = 'block'; }
    else interesWrap.style.display = 'none';
  }
  document.getElementById('modal-ficha-visita').classList.add('open');
}
function cerrarFichaVisita() {
  document.getElementById('modal-ficha-visita').classList.remove('open');
}

function poblarSelectAsesorCallCenter() {
  const sel = document.getElementById('cc-asesor');
  if (!sel) return;
  const vendedores = asesores.filter(a => (a.modulos || ROL_MODULOS[a.rol] || []).includes('ventas'));
  const actual = sel.value;
  sel.innerHTML = '<option value="">Seleccionar asesor...</option>' +
    vendedores.map(a => `<option value="${a._key}">${esc(a.nombre)}</option>`).join('');
  sel.value = actual;
}

/* ═══════════════════════════════════════════
   CONTRATO FIRMADO — Reserva → pendiente de autorización → Venta Concretada
═══════════════════════════════════════════ */
let _cfRegistroActual = null;

/* ═══════════════════════════════════════════
   PANEL DE CONTROL — política de descuento (condición central) y accesos a metas
═══════════════════════════════════════════ */
const PC_MODALIDADES = ['Contado','Contado Diferido','Crédito Directo','Crédito Bancario'];
const PC_CATEGORIAS  = ['A','B','C'];
function _politicaKey(modalidad, categoria) {
  return String(modalidad||'—').replace(/[^a-zA-Z0-9]+/g,'-') + '_' + String(categoria||'—').replace(/[^a-zA-Z0-9]+/g,'-');
}
function obtenerPoliticaDescuento(modalidad, categoria) {
  const key = _politicaKey(modalidad, categoria);
  return politicaDescuentoData.find(p => p._key === key) || null;
}
// Excedente = (% autorizado - % realmente otorgado) convertido a $ sobre el precio de lista.
// Positivo: el asesor dio MENOS descuento del que tenía permitido (bien).
// Negativo: se pasó de la política autorizada.
function calcularExcedentePolitica(modalidad, categoria, descuentoPctOtorgado, precioLista) {
  const politica = obtenerPoliticaDescuento(modalidad, categoria);
  if (!politica || !precioLista) return 0;
  const margenPct = (politica.pctMax || 0) - (descuentoPctOtorgado || 0);
  return Math.round((margenPct/100) * precioLista);
}

function renderPanelControl() {
  const tbody = document.getElementById('pc-politica-tbody');
  if (!tbody) return;
  tbody.innerHTML = PC_MODALIDADES.map(modalidad => {
    const celdas = PC_CATEGORIAS.map(cat => {
      const key = _politicaKey(modalidad, cat);
      const actual = politicaDescuentoData.find(p => p._key === key);
      return `<td><input type="number" min="0" max="100" step="0.5" data-pc-key="${key}" data-modalidad="${esc(modalidad)}" data-categoria="${cat}"
        value="${actual ? actual.pctMax : ''}" placeholder="0" style="width:80px;text-align:center;"/> %</td>`;
    }).join('');
    return `<tr><td style="font-weight:600;">${esc(modalidad)}</td>${celdas}</tr>`;
  }).join('');
}

async function guardarPoliticaDescuento() {
  const inputs = document.querySelectorAll('#pc-politica-tbody input[data-pc-key]');
  let n = 0;
  for (const inp of inputs) {
    const val = parseFloat(inp.value);
    if (isNaN(val)) continue;
    await window._fbSetPoliticaDescuento(inp.dataset.pcKey, {
      modalidad: inp.dataset.modalidad, categoria: inp.dataset.categoria, pctMax: val,
    });
    n++;
  }
  toastOk('Política de descuento guardada (' + n + ' combinaciones).');
}

/* ── Modal de meta de Cartera, prolijo (reemplaza los 2 prompt() duplicados que había) ── */
function abrirModalMetaCartera() {
  const anioSel = document.getElementById('meta-cart-anio');
  const mesSel  = document.getElementById('meta-cart-mes');
  const montoEl = document.getElementById('meta-cart-monto');
  if (!anioSel || !mesSel || !montoEl) return;
  const anioActualN = new Date().getFullYear();
  anioSel.innerHTML = [anioActualN+1, anioActualN, anioActualN-1].map(a=>`<option value="${a}">${a}</option>`).join('');
  anioSel.value = anioActualN;
  mesSel.value = mesActual();
  montoEl.value = '';
  cargarMetaCarteraExistente();
  document.getElementById('modal-meta-cartera').classList.add('open');
}
async function cargarMetaCarteraExistente() {
  const anio = document.getElementById('meta-cart-anio')?.value;
  const mes  = document.getElementById('meta-cart-mes')?.value;
  const montoEl = document.getElementById('meta-cart-monto');
  if (!anio || !mes || !montoEl) return;
  const actual = await window._fbGetMetaOnce(anio, mes, 'cartera');
  montoEl.value = actual || '';
  montoEl.placeholder = actual ? '' : 'Sin meta cargada para este período';
}
function cerrarModalMetaCartera() {
  document.getElementById('modal-meta-cartera')?.classList.remove('open');
}
async function guardarMetaCarteraModal() {
  const anio = document.getElementById('meta-cart-anio')?.value;
  const mes  = document.getElementById('meta-cart-mes')?.value;
  const val  = parseFloat(document.getElementById('meta-cart-monto')?.value);
  if (!anio || !mes || !val) { toastErr('Elegí un período y un monto válido.'); return; }
  const btn = document.querySelector('#modal-meta-cartera .confirm-btn-ok');
  btnLoading(btn, true);
  await window._fbSetMeta(anio, mes, 'cartera', val);
  btnSuccess(btn);
  toastOk('Meta de cartera de ' + mes + ' ' + anio + ' guardada ($' + val.toLocaleString('es-BO') + ').');
  setTimeout(() => { cerrarModalMetaCartera(); renderCartaAdminKPIs?.(); renderCartaKPIs?.(); }, 500);
}

function abrirModalContratoFirmado(registroKey) {
  const r = (typeof misRegs !== 'undefined' && misRegs.find(x => x._key === registroKey))
         || (typeof todosRegs !== 'undefined' && todosRegs.find(x => x._key === registroKey));
  if (!r) return;
  _cfRegistroActual = r;

  setText('cf-cliente-nombre', r.nombre || '—');
  setText('cf-terreno-nombre', r.terrenoInteres || '—');
  setText('cf-precio-venta-display', r.precioVenta ? '$'+Math.round(r.precioVenta).toLocaleString('es-BO') : '—');

  // Intenta prefill el módulo a partir del código de terreno (ej: "5-1-13" → sugiere "Mod. 5")
  const primerNum = (r.terrenoInteres||'').split('-')[0];
  document.getElementById('cf-modulo').value = primerNum ? ('Mod. '+primerNum) : '';
  document.getElementById('cf-estatus').value = 'VENTA UV';
  document.getElementById('cf-categoria').value = ['A','B','C'].includes(r.calificacion) ? r.calificacion : 'B';
  document.getElementById('cf-ciudad-origen').value = r.ciudadProcedencia || '';
  document.getElementById('cf-dscto-adicional').value = '';
  document.getElementById('cf-accion').value = '';
  document.getElementById('cf-observaciones').value = '';

  // Si es un cierre de agente externo, no hace falta autorización (el admin ya lo está cargando él mismo)
  const aviso = document.getElementById('cf-aviso-autorizacion');
  const btnGuardar = document.querySelector('#modal-contrato-firmado .confirm-btn-ok');
  if (r.esExterno) {
    if (aviso) aviso.style.display = 'none';
    if (btnGuardar) btnGuardar.textContent = '✓ Concretar venta directamente';
  } else {
    if (aviso) aviso.style.display = 'block';
    if (btnGuardar) btnGuardar.textContent = 'Enviar para autorización';
  }

  document.getElementById('modal-contrato-firmado').classList.add('open');
}
function cerrarModalContratoFirmado() {
  document.getElementById('modal-contrato-firmado').classList.remove('open');
  _cfRegistroActual = null;
}

async function guardarContratoFirmado() {
  const r = _cfRegistroActual;
  if (!r) return;

  const modulo = document.getElementById('cf-modulo').value.trim();
  const estatus = document.getElementById('cf-estatus').value;
  const categoria = document.getElementById('cf-categoria').value;
  const ciudadOrigen = document.getElementById('cf-ciudad-origen').value.trim();
  const dsctoAdicional = parseFloat(document.getElementById('cf-dscto-adicional').value) || 0;
  const accion = parseFloat(document.getElementById('cf-accion').value) || 0;
  const observaciones = document.getElementById('cf-observaciones').value.trim();

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const fechaRef = r.fecha ? new Date(r.fecha+'T00:00:00') : new Date();
  const trimestre = ['1er','1er','1er','2do','2do','2do','3er','3er','3er','4to','4to','4to'][fechaRef.getMonth()] + ' Trimestre';

  // Los cierres de agentes externos los carga directamente el administrador — no necesitan pasar
  // por la cola de autorización, porque ya los está revisando él mismo al cargarlos.
  const autoAprobado = !!r.esExterno;

  const btn = document.querySelector('#modal-contrato-firmado .confirm-btn-ok');
  btnLoading(btn, true);
  try {
    await window._fbPushVentaConcretada({
      registroKey: r._key,
      año: fechaRef.getFullYear(), anio: fechaRef.getFullYear(),
      mes: meses[fechaRef.getMonth()], trimestre,
      cliente: r.nombre, terreno: r.terrenoInteres, modulo,
      gestion: r.origen || '', asesorNombre: r.asesorNombre,
      estadoVenta: 'Contrato Firmado', estatus, contrato: 'Contrato Firmado',
      modalidad: r.formaPago || '',
      precioLista: r.precioLista||0, descuentoUsd: r.descuentoUsd||0, descuentoPct: r.descuentoPct||0,
      dsctoAdicional, excedente: calcularExcedentePolitica(r.formaPago, categoria, r.descuentoPct||0, r.precioLista||0) - dsctoAdicional,
      precioVenta: r.precioVenta||0,
      metraje: r.metraje||0, m2Usd: r.precioM2Final||0,
      fechaReserva: r.fecha||'', accion, categoria, ciudadOrigen,
      canal: r.origen||'', observaciones, esExterno: !!r.esExterno,
      esHistorico: false,
      estadoAutorizacion: autoAprobado ? 'aprobado' : 'pendiente',
      solicitadoPorKey: asesorActual?._key || 'admin', solicitadoPorNombre: asesorActual?.nombre || 'Administrador',
    });
    btnSuccess(btn);
    toastOk(autoAprobado
      ? 'Venta de ' + r.nombre + ' concretada directamente.'
      : 'Contrato de ' + r.nombre + ' enviado — queda pendiente de autorización de Administración.');
    setTimeout(cerrarModalContratoFirmado, 500);
  } catch(e) {
    btnLoading(btn, false);
    toastErr('Error al guardar: ' + e.message);
  }
}

async function devolverACallCenter(registroKey, nombreCliente) {
  const motivo = prompt('¿Por qué se devuelve a ' + nombreCliente + '? (motivo breve, opcional)') || '';
  const ok = await confirmDialog(
    nombreCliente + ' va a volver a aparecer en la cola de Call Center para que retomen el contacto.',
    { title:'↩️ Devolver a Call Center', okText:'Sí, devolver' }
  );
  if (!ok) return;

  const reg = misRegs.find(r => r._key === registroKey);
  await window._fbPushVisitaProgramada({
    nombre: nombreCliente,
    telefono: '',
    asesorKey: asesorActual._key,
    asesorNombre: asesorActual.nombre,
    fecha: new Date().toISOString().split('T')[0],
    hora: '',
    mes: mesActual(), anio: anioActual(),
    origen: reg?.origen || '',
    campaniaCodigo: '',
    interes: motivo ? ('Devuelto por el asesor. Motivo: ' + motivo) : 'Devuelto por el asesor para retomar contacto.',
    cargadoPorKey: asesorActual._key,
    cargadoPorNombre: asesorActual.nombre,
    estado: 'pendiente',
    esDevolucion: true,
    registroOrigenKey: registroKey,
  });
  toastOk(nombreCliente + ' fue devuelto a Call Center.');
}

async function guardarVisitaProgramada() {
  const nombre   = document.getElementById('cc-nombre').value.trim();
  const telefono = document.getElementById('cc-telefono').value.trim();
  const asesorKey = document.getElementById('cc-asesor').value;
  const asesorSel = asesores.find(a => a._key === asesorKey);
  const fecha = document.getElementById('cc-fecha').value || new Date().toISOString().split('T')[0];
  const hora  = document.getElementById('cc-hora').value;
  const origen = document.getElementById('cc-origen').value;
  const campaniaCodigo = document.getElementById('cc-campania').value;
  const interes = document.getElementById('cc-interes').value.trim();

  if (!nombre)    { toastErr('Falta el nombre del cliente.'); return; }
  if (!asesorKey) { toastErr('Elegí a qué asesor se le asigna la visita.'); return; }

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mes = meses[new Date(fecha+'T00:00:00').getMonth()];
  const anio = new Date(fecha+'T00:00:00').getFullYear();

  const btn = document.querySelector('[onclick="guardarVisitaProgramada()"]');
  btnLoading(btn, true);
  await window._fbPushVisitaProgramada({
    nombre, telefono, asesorKey, asesorNombre: asesorSel?.nombre || '',
    fecha, hora, mes, anio, origen, campaniaCodigo, interes,
    cargadoPorKey: asesorActual._key, cargadoPorNombre: asesorActual.nombre,
    estado: 'pendiente'
  });
  btnSuccess(btn);
  toastOk('Visita de ' + nombre + ' agendada para ' + (asesorSel?.nombre||'') + '.');
  mostrarFichaVisita({ nombre, telefono, asesorNombre: asesorSel?.nombre||'', fecha, hora, origen, campaniaCodigo, interes });
  ['cc-nombre','cc-telefono','cc-hora','cc-interes'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('cc-asesor').value = '';
  document.getElementById('cc-origen').value = '';
  document.getElementById('cc-campania').value = '';
  const sb = document.getElementById('cc-success-banner');
  if (sb) { sb.style.display='block'; setTimeout(()=>sb.style.display='none',3000); }
}

function renderVisitasProgramadasCallCenter() {
  const cont = document.getElementById('cc-lista');
  if (cont) {
    const mias = visitasProgramadasData.filter(v => v.cargadoPorKey === asesorActual?._key);
    if (!mias.length) { cont.innerHTML = '<div class="empty-state">Todavía no agendaste ninguna visita.</div>'; }
    else {
      cont.innerHTML = mias.map(v => `
        <div class="cobro-card">
          <div class="cobro-card-left">
            <div class="cobro-nombre">${esc(v.nombre)} ${v.estado==='confirmada'?'<span class="badge badge-contrato" style="font-size:var(--fs-xs);">✓ Confirmada</span>':'<span class="badge badge-seguim" style="font-size:var(--fs-xs);">⏳ Pendiente</span>'} ${v.esDevolucion?'<span class="badge" style="font-size:var(--fs-xs);background:#fef3c7;color:#92400e;">↩️ Devuelta</span>':''}</div>
            <div class="cobro-meta">Asesor: ${esc(v.asesorNombre)} · ${esc(v.fecha)} ${esc(v.hora||'')}</div>
          </div>
          <div class="cobro-monto">
            <button class="btn-del" onclick="solicitarEliminacion('visitas_programadas/${v._key}','Visita agendada de ${escJs(v.nombre)} (asesor: ${escJs(v.asesorNombre||'—')})')">🗑</button>
          </div>
        </div>`).join('');
    }
  }
  renderCallCenterKPIs();
}

function renderCallCenterKPIs() {
  const total = visitasProgramadasData.length;
  if (!document.getElementById('cc-kpi-total')) return;

  const hoy = new Date();
  const inicioSemana = new Date(hoy); inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  inicioSemana.setHours(0,0,0,0);
  const estaSemana = visitasProgramadasData.filter(v => v.ts >= inicioSemana.getTime()).length;
  const confirmadas = visitasProgramadasData.filter(v => v.estado === 'confirmada').length;
  const devueltas = visitasProgramadasData.filter(v => v.esDevolucion);
  const devueltasConfirmadas = devueltas.filter(v => v.estado === 'confirmada').length;

  setText('cc-kpi-total', total);
  setText('cc-kpi-semana', estaSemana);
  setText('cc-kpi-confirmadas', confirmadas);
  setText('cc-kpi-devueltas', devueltas.length);
  setText('cc-kpi-devueltas-sub', devueltas.length ? devueltasConfirmadas+' ya retomadas' : 'ninguna todavía');

  const chartEl = document.getElementById('cc-chart-origen');
  if (chartEl) {
    const porOrigen = {};
    visitasProgramadasData.filter(v=>v.origen).forEach(v => porOrigen[v.origen] = (porOrigen[v.origen]||0)+1);
    const entries = Object.entries(porOrigen).sort((a,b)=>b[1]-a[1]);
    const max = Math.max(...entries.map(([,n])=>n), 1);
    const colV = {'Pauta Virtual':'var(--info)','Referido Cliente':'var(--ok)','Referido Empresa':'var(--cartera)','Redes Sociales':'var(--accent)','Feria':'var(--warn)','Puerta Fría':'var(--danger)','Agente Externo':'#c07a2a'};
    chartEl.innerHTML = entries.length ? entries.map(([k,n])=>`
      <div class="bar-item">
        <div class="bar-label"><span>${esc(k)}</span><span>${n}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${n/max*100}%;background:${colV[k]||'#6b7280'};"></div></div>
      </div>`).join('') : '<div class="empty-state">Sin datos.</div>';
  }
}

function renderVisitasProgramadasAsesor() {
  const box   = document.getElementById('visitas-programadas-box');
  const cont  = document.getElementById('visitas-programadas-lista');
  const count = document.getElementById('visitas-programadas-count');
  if (!box || !cont) return;
  if (!misVisitasProgramadas.length) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  if (count) count.textContent = '(' + misVisitasProgramadas.length + ')';
  cont.innerHTML = misVisitasProgramadas.map(v => `
    <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:var(--r-sm);padding:10px 12px;margin-bottom:6px;">
      <div>
        <div style="font-weight:600;">${esc(v.nombre)}</div>
        <div style="font-size:var(--fs-sm);color:var(--gris);">${esc(v.telefono||'')} · ${esc(v.fecha)} ${esc(v.hora||'')} ${v.origen?'· '+esc(v.origen):''}</div>
        ${v.interes?`<div style="font-size:var(--fs-sm);color:var(--ink-700);font-style:italic;margin-top:2px;">"${esc(v.interes)}"</div>`:''}
      </div>
      <button onclick="confirmarVisitaProgramada('${v._key}')" style="padding:8px 14px;background:var(--info);color:#fff;border:none;border-radius:var(--r-sm);font-size:var(--fs-sm);font-weight:600;cursor:pointer;white-space:nowrap;">✓ Confirmar visita</button>
    </div>`).join('');
}

function confirmarVisitaProgramada(key) {
  const v = misVisitasProgramadas.find(x => x._key === key);
  if (!v) return;
  // Precarga el formulario de Visita con lo que ya cargó el call center
  document.getElementById('f-nombre').value = v.nombre;
  document.getElementById('f-ciudad').value = '';
  document.getElementById('f-origen').value = v.origen || '';
  document.getElementById('f-fecha').value  = new Date().toISOString().split('T')[0];
  const interesInput = document.querySelector('input[name=interes][value=SI]');
  if (v.interes) document.getElementById('f-comentarios').value = 'Interés inicial (Call Center): ' + v.interes;
  document.getElementById('f-nombre').dataset.visitaProgramadaKey = key;
  window._fbUpdateVisitaProgramada(key, { estado: 'confirmada' });
  toastOk('Visita cargada en el formulario — completá el detalle y guardá.');
  document.getElementById('f-nombre').scrollIntoView({behavior:'smooth', block:'center'});
}


function abrirSelectorLote() {
  document.getElementById('lote-picker-buscar').value = '';
  renderListaLotesPicker();
  document.getElementById('modal-selector-lote').classList.add('open');
}
function cerrarSelectorLote() {
  document.getElementById('modal-selector-lote').classList.remove('open');
}

function renderListaLotesPicker() {
  const cont = document.getElementById('lote-picker-lista');
  if (!cont) return;
  const term = (document.getElementById('lote-picker-buscar')?.value || '').trim().toLowerCase();
  let datos = todosLotes;
  if (term) datos = datos.filter(l => _terrenoDeLote(l).toLowerCase().includes(term));
  if (!datos.length) { cont.innerHTML = '<div class="empty-state">Sin lotes que coincidan.</div>'; return; }

  const estColor = { 'Disponible':'var(--ok)', 'Reservado':'var(--warn)', 'Vendido':'var(--danger)', 'No disponible':'#9ca3af' };

  cont.innerHTML = datos.map(l => {
    const terreno = _terrenoDeLote(l);
    const bloqueado = l.estado === 'Reservado' || l.estado === 'Vendido' || l.estado === 'No disponible';
    const enNegociacion = l.estadoNegociacion === 'negociacion';
    const esMiNegociacion = enNegociacion && l.negociadoPorKey === asesorActual?._key;
    let infoExtra = '';
    if (l.estado === 'Reservado') infoExtra = `<span style="color:var(--warn);font-weight:600;">🔒 Reservado</span>`;
    else if (l.estado === 'Vendido') infoExtra = `<span style="color:var(--danger);font-weight:600;">✕ Vendido</span>`;
    else if (l.estado === 'No disponible') infoExtra = `<span style="color:#9ca3af;">No disponible</span>`;
    else if (esMiNegociacion) infoExtra = `<span style="color:var(--info);font-weight:600;">📌 En negociación (vos)</span>`;
    else if (enNegociacion) infoExtra = `<span style="color:var(--warn);font-weight:600;">⚠️ En negociación por ${esc(l.negociadoPorNombre||'otro asesor')}</span>`;
    else infoExtra = `<span style="color:var(--ok);">Disponible</span>`;
    // Precio de lista: SOLO visible mientras el lote no está reservado/vendido (una vez reservado, se oculta a los asesores)
    const precioTxt = (!bloqueado && l.precio) ? `<span style="color:var(--cartera);font-weight:600;margin-left:8px;">$${Number(l.precio).toLocaleString('es-BO')}</span>` : '';

    return `<div class="lote-picker-row ${bloqueado?'bloqueado':''}" onclick="${bloqueado?'':`seleccionarLotePicker('${l._key}')`}">
      <span style="font-weight:600;font-family:monospace;">${esc(terreno)}</span>
      <span style="font-size:var(--fs-sm);">${infoExtra}${precioTxt}</span>
    </div>`;
  }).join('');
}

function seleccionarLotePicker(key) {
  const l = todosLotes.find(x => x._key === key);
  if (!l) return;
  document.getElementById('f-terreno-key').value = key;
  document.getElementById('f-lote-nombre').textContent = _terrenoDeLote(l);
  document.getElementById('f-lote-nombre').dataset.precio = l.precio || 0;
  document.getElementById('f-lote-nombre').dataset.metraje = l.metraje || 0;
  pintarEstadoLoteSeleccionado(l);
  document.getElementById('f-lote-seleccionado').style.display = 'block';
  cerrarSelectorLote();
  calcularDescuentoReserva();
}

function pintarEstadoLoteSeleccionado(l) {
  const info = document.getElementById('f-lote-estado-info');
  const acciones = document.getElementById('f-lote-acciones');
  const enNegociacion = l.estadoNegociacion === 'negociacion';
  const esMiNegociacion = enNegociacion && l.negociadoPorKey === asesorActual?._key;
  const precioTxt = l.precio ? `<span style="color:var(--cartera);font-weight:600;">Precio de lista: $${Number(l.precio).toLocaleString('es-BO')}</span>` : '';

  if (l.estado === 'Reservado' || l.estado === 'Vendido') {
    info.innerHTML = `<span style="color:var(--danger);font-weight:600;">Este lote ya no está disponible (${l.estado}). El precio queda oculto una vez reservado.</span>`;
    acciones.innerHTML = '';
    return;
  }
  if (esMiNegociacion) {
    info.innerHTML = `<span style="color:var(--info);">📌 Ya lo tenés marcado en negociación.</span> ${precioTxt}`;
    acciones.innerHTML = `<button type="button" class="btn-clear" onclick="liberarNegociacionLote()">Liberar negociación</button>`;
  } else if (enNegociacion) {
    info.innerHTML = `<span style="color:var(--warn);font-weight:600;">⚠️ En negociación por ${esc(l.negociadoPorNombre||'otro asesor')} — igual podés cargar tu visita, pero avisale al cliente que puede haber otro interesado.</span><br>${precioTxt}`;
    acciones.innerHTML = `<button type="button" class="btn-clear" onclick="marcarLoteEnNegociacion()">Marcar en negociación también</button>`;
  } else {
    info.innerHTML = `<span style="color:var(--ok);">Disponible.</span> ${precioTxt}`;
    acciones.innerHTML = `<button type="button" class="btn-clear" onclick="marcarLoteEnNegociacion()">📌 Marcar en negociación</button>`;
  }
}

async function marcarLoteEnNegociacion() {
  const key = document.getElementById('f-terreno-key').value;
  if (!key) return;
  await window._fbUpdateLote(key, {
    estadoNegociacion: 'negociacion',
    negociadoPorKey: asesorActual._key,
    negociadoPorNombre: asesorActual.nombre,
    negociadoTs: Date.now()
  });
  toastOk('Lote marcado en negociación.');
}

async function liberarNegociacionLote() {
  const key = document.getElementById('f-terreno-key').value;
  if (!key) return;
  await window._fbUpdateLote(key, { estadoNegociacion: '', negociadoPorKey: null, negociadoPorNombre: null, negociadoTs: null });
  toastOk('Negociación liberada.');
}

function quitarLoteSeleccionado() {
  document.getElementById('f-terreno-key').value = '';
  document.getElementById('f-lote-seleccionado').style.display = 'none';
}

function toggleCampoReserva() {
  const conclusion = document.getElementById('f-conclusion').value;
  document.getElementById('f-reserva-box').style.display = conclusion === 'Reserva' ? 'block' : 'none';
  if (conclusion === 'Reserva') calcularDescuentoReserva();
}

function calcularDescuentoReserva() {
  const nombreEl = document.getElementById('f-lote-nombre');
  const precioLista = parseFloat(nombreEl?.dataset.precio) || 0;
  const metraje     = parseFloat(nombreEl?.dataset.metraje) || 0;
  const precioVenta = parseFloat(document.getElementById('f-precio-venta')?.value) || 0;

  const dispLista = document.getElementById('f-precio-lista-display');
  if (dispLista) dispLista.value = precioLista ? '$'+precioLista.toLocaleString('es-BO') : 'Elegí un lote primero';

  const box = document.getElementById('f-descuento-info');
  if (!precioLista || !precioVenta) { if (box) box.style.display = 'none'; return; }

  const descUsd = precioLista - precioVenta;
  const descPct = precioLista ? (descUsd/precioLista*100) : 0;
  const precioM2Final = metraje ? (precioVenta/metraje) : 0;

  setText('f-descuento-usd', (descUsd>=0?'$':'-$')+Math.abs(descUsd).toLocaleString('es-BO',{maximumFractionDigits:0}));
  setText('f-descuento-pct', descPct.toFixed(1)+'%');
  setText('f-precio-m2-final', metraje ? '$'+precioM2Final.toLocaleString('es-BO',{maximumFractionDigits:2}) : '—');
  const elUsd = document.getElementById('f-descuento-usd');
  const elPct = document.getElementById('f-descuento-pct');
  if (elUsd) elUsd.style.color = descUsd>0 ? 'var(--danger)' : 'var(--ok)';
  if (elPct) elPct.style.color = descUsd>0 ? 'var(--danger)' : 'var(--ok)';
  if (box) box.style.display = 'block';
}

/* ═══════════════════════════════════════════
   GUARDAR VISITA
═══════════════════════════════════════════ */
async function guardarVisita() {
  const fNombreEl = document.getElementById('f-nombre');
  const nombre = fNombreEl.value.trim();
  if (!nombre) {
    fNombreEl.classList.add('input-error');
    fNombreEl.focus();
    fNombreEl.scrollIntoView({behavior:'smooth', block:'center'});
    toastErr('Falta el nombre del prospecto — el campo quedó marcado en rojo arriba.');
    return;
  }
  fNombreEl.classList.remove('input-error');

  const conclusion = document.getElementById('f-conclusion').value;
  const terrenoKey = document.getElementById('f-terreno-key').value;
  const precioVenta = parseFloat(document.getElementById('f-precio-venta').value) || 0;

  if (conclusion === 'Reserva') {
    if (!terrenoKey) { toastErr('Para concluir en Reserva, primero elegí un lote del inventario.'); return; }
    if (!precioVenta) { toastErr('Para concluir en Reserva, ingresá el precio de venta acordado.'); return; }
    if (!document.getElementById('f-pago').value) {
      const elPago = document.getElementById('f-pago');
      elPago.classList.add('input-error');
      elPago.scrollIntoView({behavior:'smooth', block:'center'});
      toastErr('Para concluir en Reserva, elegí la modalidad de compra (forma de pago).');
      return;
    }
  }

  const fecha = document.getElementById('f-fecha').value || new Date().toISOString().split('T')[0];
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mes = meses[new Date(fecha+'T00:00:00').getMonth()];
  const loteSel = terrenoKey ? todosLotes.find(l=>l._key===terrenoKey) : null;

  const precioLista    = loteSel?.precio   || 0;
  const metrajeLote    = loteSel?.metraje  || 0;
  const descuentoUsd   = (conclusion==='Reserva' && precioLista) ? (precioLista - precioVenta) : 0;
  const descuentoPct   = (conclusion==='Reserva' && precioLista) ? Math.round((descuentoUsd/precioLista)*1000)/10 : 0;
  const precioM2Final  = (conclusion==='Reserva' && metrajeLote) ? Math.round((precioVenta/metrajeLote)*100)/100 : 0;

  const editKey = document.getElementById('f-editing-key')?.value || '';
  const original = editKey ? misRegs.find(r => r._key === editKey) : null;

  const data = {
    ts:                original ? original.ts : Date.now(), // preserva la fecha de creación real, no se pisa al editar
    fechaCarga:        original ? original.fechaCarga : new Date().toLocaleString('es-BO'),
    ultimaEdicionTs:   Date.now(),
    asesorNombre:      asesorActual.nombre,
    nombre,
    detalleVisita:     (document.querySelector('input[name=detalleVisita]:checked')||{}).value || '',
    genero:            (document.querySelector('input[name=genero]:checked')||{}).value || '',
    fecha, mes,
    horario:           document.getElementById('f-horario').value,
    ciudadProcedencia: document.getElementById('f-ciudad').value.trim(),
    origen:            document.getElementById('f-origen').value,
    interes:           (document.querySelector('input[name=interes]:checked')||{}).value || '',
    aspectoPreferente: document.getElementById('f-aspecto').value,
    presupuesto:       parseFloat(document.getElementById('f-presupuesto').value) || 0,
    calificacion:      (document.querySelector('input[name=calificacion]:checked')||{}).value || '',
    terrenoKey:        terrenoKey || '',
    terrenoInteres:    loteSel ? _terrenoDeLote(loteSel) : '',
    pctCierre:         parseFloat(document.getElementById('f-pct-cierre').value) || 0,
    motivoNoCierre:    document.getElementById('f-motivo-no-cierre').value.trim(),
    formaPago:         document.getElementById('f-pago').value,
    usoPropiedad:      (document.querySelector('input[name=usoPropiedad]:checked')||{}).value || '',
    conclusion,
    estado:            conclusion, // compat: paneles admin agrupan por "estado"
    // conclusionTs: cuándo se resolvió (Descartado o Reserva) — para medir "cuánto tardó en descartarse".
    // Si ya estaba resuelto con la MISMA conclusión, se conserva la fecha original; si cambió de estado, se actualiza.
    conclusionTs: (conclusion==='Descartado' || conclusion==='Reserva')
      ? ((original && original.conclusion===conclusion && original.conclusionTs) ? original.conclusionTs : Date.now())
      : null,
    precioVenta:       conclusion === 'Reserva' ? precioVenta : 0,
    precio:            conclusion === 'Reserva' ? precioVenta : 0, // compat: KPI de precio admin
    precioLista:       conclusion === 'Reserva' ? precioLista : 0,
    metraje:           conclusion === 'Reserva' ? metrajeLote : 0,
    descuentoUsd, descuentoPct, precioM2Final,
    comentarios:       document.getElementById('f-comentarios').value.trim(),
  };

  const btnR = document.querySelector('[onclick="guardarVisita()"]');
  btnLoading(btnR, true);
  try {
    if (editKey) {
      await window._fbUpdateRegistro(asesorActual._key, editKey, data);
    } else {
      await window._fbPushRegistro(asesorActual._key, data);
    }

    // Si la visita concluye en Reserva, el lote queda apartado de verdad
    if (conclusion === 'Reserva' && terrenoKey) {
      // Si OTRO asesor lo tenía en negociación, le avisamos que se le adelantaron
      if (loteSel?.estadoNegociacion === 'negociacion' && loteSel.negociadoPorKey && loteSel.negociadoPorKey !== asesorActual._key) {
        await window._fbPushNotificacion(loteSel.negociadoPorKey, {
          tipo: 'lote_reservado',
          mensaje: `El lote ${_terrenoDeLote(loteSel)} que tenías en negociación fue reservado por ${asesorActual.nombre}.`,
          ts: Date.now(),
          leida: false
        });
      }
      await window._fbUpdateLote(terrenoKey, {
        estado: 'Reservado',
        reservadoPorKey: asesorActual._key,
        reservadoPorNombre: asesorActual.nombre,
        precioVenta, precioLista, descuentoUsd, descuentoPct, precioM2Final,
        estadoNegociacion: '', negociadoPorKey: null, negociadoPorNombre: null,
      });
    }

    btnSuccess(btnR);
    toastOk((editKey ? 'Registro de ' : 'Visita de ') + nombre + (editKey ? ' actualizado.' : ' guardada correctamente.'));
    limpiarFormVisita();
    const sb = document.getElementById('success-banner');
    if (sb) {
      sb.querySelector('p').textContent = conclusion === 'Reserva'
        ? '🔒 Visita guardada y lote reservado — el formulario está listo para el próximo cliente'
        : (editKey ? '✅ Registro de "' + nombre + '" actualizado' : '✅ Visita de "' + nombre + '" guardada — el formulario está listo para el próximo cliente');
      sb.style.display='block'; setTimeout(()=>sb.style.display='none',3500);
    }
  } catch(e) {
    btnLoading(btnR, false);
    toastErr('Error al guardar: ' + e.message);
  }
}

function limpiarFormVisita() {
  ['f-nombre','f-fecha','f-horario','f-ciudad','f-presupuesto',
   'f-pct-cierre','f-motivo-no-cierre','f-precio-venta','f-comentarios'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['f-origen','f-aspecto','f-pago','f-conclusion'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('#atab-cargar input[type=radio]').forEach(r => {
    r.checked = false;
    r.closest('.radio-pill')?.classList.remove('sel-si','sel-no','sel-gen');
  });
  document.querySelector('input[name=detalleVisita][value=Presencial]').checked = true;
  quitarLoteSeleccionado();
  document.getElementById('f-reserva-box').style.display = 'none';
  salirModoEdicion();
}

function salirModoEdicion() {
  const editKeyEl = document.getElementById('f-editing-key');
  if (editKeyEl) editKeyEl.value = '';
  const aviso = document.getElementById('f-editando-aviso');
  if (aviso) aviso.style.display = 'none';
  const btn = document.getElementById('btn-guardar-visita');
  if (btn && !btn.classList.contains('is-loading')) { btn.textContent = '✓ Guardar visita'; delete btn.dataset.origText; }
}

function cancelarEdicionRegistro() {
  limpiarFormVisita();
  toastOk('Edición cancelada.');
}

function editarRegistroExistente(key) {
  const r = misRegs.find(x => x._key === key);
  if (!r) return;

  switchAsesorTab('cargar');

  document.getElementById('f-editing-key').value = key;
  document.getElementById('f-nombre').value  = r.nombre || '';
  document.getElementById('f-fecha').value   = r.fecha || '';
  document.getElementById('f-horario').value = r.horario || '';
  document.getElementById('f-ciudad').value  = r.ciudadProcedencia || '';
  document.getElementById('f-origen').value  = r.origen || '';
  document.getElementById('f-aspecto').value = r.aspectoPreferente || '';
  document.getElementById('f-presupuesto').value = r.presupuesto || '';
  document.getElementById('f-pct-cierre').value  = r.pctCierre || '';
  document.getElementById('f-motivo-no-cierre').value = r.motivoNoCierre || '';
  document.getElementById('f-pago').value    = r.formaPago || '';
  document.getElementById('f-comentarios').value = r.comentarios || '';
  document.getElementById('f-conclusion').value  = r.conclusion || '';

  document.querySelectorAll('#atab-cargar input[type=radio]').forEach(rad => { rad.checked = false; });
  if (r.detalleVisita) { const el = document.querySelector(`input[name=detalleVisita][value="${r.detalleVisita}"]`); if (el) el.checked = true; }
  if (r.genero)        { const el = document.querySelector(`input[name=genero][value="${r.genero}"]`); if (el) el.checked = true; }
  if (r.interes)       { const el = document.querySelector(`input[name=interes][value="${r.interes}"]`); if (el) el.checked = true; }
  if (r.calificacion)  { const el = document.querySelector(`input[name=calificacion][value="${r.calificacion}"]`); if (el) el.checked = true; }
  if (r.usoPropiedad)  { const el = document.querySelector(`input[name=usoPropiedad][value="${r.usoPropiedad}"]`); if (el) el.checked = true; }

  if (r.terrenoKey) {
    const lote = todosLotes.find(l => l._key === r.terrenoKey);
    if (lote) { seleccionarLotePicker(r.terrenoKey); }
  } else {
    quitarLoteSeleccionado();
  }
  if (r.precioVenta) document.getElementById('f-precio-venta').value = r.precioVenta;

  toggleCampoReserva();
  calcularDescuentoReserva();

  const aviso = document.getElementById('f-editando-aviso');
  if (aviso) aviso.style.display = 'flex';
  const btn = document.getElementById('btn-guardar-visita');
  if (btn) { btn.textContent = '💾 Guardar cambios'; delete btn.dataset.origText; }

  document.getElementById('atab-cargar').scrollIntoView({behavior:'smooth', block:'start'});
}

/* ═══════════════════════════════════════════
   MIS REGISTROS (vista asesor)
═══════════════════════════════════════════ */
function estadoBadgeClass(estado) {
  const m = {
    'Contrato':'badge-contrato','EN TRAMITACIÓN BANCARIA':'badge-tramite',
    'En Tramitación Bancaria':'badge-tramite','Reserva':'badge-reserva',
    'Seguimiento':'badge-seguim','Descartado':'badge-descartado',
    'Agenda':'badge-seguim','Entrega':'badge-entrega',
    'Coordinación Firma':'badge-firma','Desistido':'badge-desistido','Re-agendado':'badge-seguim'
  };
  return 'badge ' + (m[estado]||'badge-def');
}

function renderMisRegistros() {
  const cont = document.getElementById('mis-reg-list');
  if (!misRegs.length) {
    cont.innerHTML = '<div class="empty-state">Todavía no cargaste ningún registro.<br>Usá la pestaña "Cargar registro" para empezar.</div>';
    return;
  }
  cont.innerHTML = misRegs.map(r => {
    const vc = (typeof ventasConcretadasData !== 'undefined') ? ventasConcretadasData.find(v => v.registroKey === r._key) : null;
    let accionContrato = '';
    if (r.conclusion === 'Reserva') {
      if (!vc) {
        accionContrato = `<button onclick="abrirModalContratoFirmado('${r._key}')" style="padding:6px 14px;background:var(--cartera);color:#fff;border:none;border-radius:var(--r-sm);font-size:var(--fs-sm);font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">📝 Marcar Contrato Firmado</button>`;
      } else if (vc.estadoAutorizacion === 'pendiente') {
        accionContrato = `<span class="badge" style="background:#fef3c7;color:#92400e;">⏳ Contrato firmado — pendiente de autorización</span>`;
      } else if (vc.estadoAutorizacion === 'aprobado') {
        accionContrato = `<span class="badge" style="background:var(--ok-bg);color:var(--ok-ink);">✅ Venta concretada — autorizada</span>`;
      } else if (vc.estadoAutorizacion === 'rechazado') {
        accionContrato = `<span class="badge" style="background:var(--danger-bg);color:var(--danger-ink);">✗ Rechazada — revisar con administración</span>`;
      }
    }
    return `
    <div class="reg-card">
      <div class="reg-card-top">
        <div>
          <div class="reg-cliente">${r.nombre || '—'}</div>
          <div class="reg-fecha">${r.fechaCarga || ''}</div>
        </div>
        <span class="${estadoBadgeClass(r.estado)}">${r.estado||'Sin estado'}</span>
      </div>
      <div class="reg-pills">
        ${r.origen      ? `<span class="badge badge-def">${r.origen}</span>` : ''}
        ${r.terrenoInteres ? `<span class="badge badge-bbdd">🗺 ${r.terrenoInteres}</span>` : (r.unidad ? `<span class="badge badge-bbdd">${r.unidad}</span>` : '')}
        ${r.calificacion? `<span class="badge badge-def">Calif. ${r.calificacion}</span>` : ''}
        ${r.formaPago   ? `<span class="badge badge-def">${r.formaPago}</span>` : ''}
        ${r.conclusion  ? `<span class="badge badge-def">${r.conclusion}</span>` : ''}
      </div>
      ${r.comentarios ? `<div class="reg-comentario">"${r.comentarios}"</div>` : ''}
      <div style="margin-top:10px;display:flex;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap;">
        ${accionContrato}
        ${(r.conclusion!=='Reserva' && r.conclusion!=='Descartado') ? `<button onclick="devolverACallCenter('${r._key}','${escJs(r.nombre)}')" style="padding:6px 14px;background:var(--fill);border:1.5px solid var(--line);border-radius:var(--r-sm);font-size:var(--fs-sm);font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">↩️ Devolver a Call Center</button>` : ''}
        <button onclick="abrirSeguimientoCliente('${escJs(r.nombre)}')" style="padding:6px 14px;background:var(--fill);border:1.5px solid var(--line);border-radius:var(--r-sm);font-size:var(--fs-sm);font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">💬 Seguimiento</button>
        <button onclick="editarRegistroExistente('${r._key}')" style="padding:6px 14px;background:var(--fill);border:1.5px solid var(--line);border-radius:var(--r-sm);font-size:var(--fs-sm);font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">✏️ Editar / actualizar seguimiento</button>
      </div>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════
   DASHBOARD ADMIN
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   TENDENCIA VENTAS — gráfico de línea (Chart.js)
   Registros y cierres agrupados por mes-año real
   (usa el timestamp de carga, no el dropdown "mes"
   que no distingue entre años).
═══════════════════════════════════════════ */
let _chartTendenciaVentas = null;

function _claveMesAnio(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function _etiquetaMesAnio(clave) {
  const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const [y, m] = clave.split('-');
  return nombres[parseInt(m, 10) - 1] + ' ' + y.slice(2);
}

function renderTendenciaVentasChart() {
  const canvas = document.getElementById('chart-tendencia-ventas');
  const emptyMsg = document.getElementById('chart-tendencia-ventas-empty');
  if (!canvas || typeof Chart === 'undefined') return;

  const buckets = {};
  todosRegs.forEach(r => {
    if (!r.ts) return;
    const clave = _claveMesAnio(r.ts);
    if (!buckets[clave]) buckets[clave] = { total: 0, cierres: 0 };
    buckets[clave].total++;
    if (r.huboCierre === 'SI' || r.conclusion === 'Reserva') buckets[clave].cierres++;
  });
  const claves = Object.keys(buckets).sort(); // "YYYY-MM" ordena cronológicamente como string

  if (claves.length < 2) {
    canvas.style.display = 'none';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  if (emptyMsg) emptyMsg.style.display = 'none';

  const labels       = claves.map(_etiquetaMesAnio);
  const dataTotal     = claves.map(k => buckets[k].total);
  const dataCierres   = claves.map(k => buckets[k].cierres);

  const ctx = canvas.getContext('2d');
  const alto = canvas.height || 280;

  const gradTotal = ctx.createLinearGradient(0, 0, 0, alto);
  gradTotal.addColorStop(0, 'rgba(127,184,232,.22)');
  gradTotal.addColorStop(1, 'rgba(127,184,232,0)');

  const gradCierres = ctx.createLinearGradient(0, 0, 0, alto);
  gradCierres.addColorStop(0, 'rgba(110,231,183,.25)');
  gradCierres.addColorStop(1, 'rgba(110,231,183,0)');

  if (_chartTendenciaVentas) { _chartTendenciaVentas.destroy(); }

  _chartTendenciaVentas = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Registros totales',
          data: dataTotal,
          borderColor: '#2451FF',
          backgroundColor: gradTotal,
          borderWidth: 2.5,
          tension: .35,
          fill: true,
          pointRadius: 0,
          pointHitRadius: 12,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#2451FF',
          pointHoverBorderColor: '#FFFDF7',
          pointHoverBorderWidth: 2,
        },
        {
          label: 'Cierres',
          data: dataCierres,
          borderColor: '#38a169',
          backgroundColor: gradCierres,
          borderWidth: 2.5,
          tension: .35,
          fill: true,
          pointRadius: 0,
          pointHitRadius: 12,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#38a169',
          pointHoverBorderColor: '#FFFDF7',
          pointHoverBorderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true, position: 'top', align: 'end',
          labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { family: "'DM Sans',sans-serif", size: 12 }, color: '#0A0A0A' }
        },
        tooltip: {
          backgroundColor: '#0A0A0A', titleColor: '#FFFDF7', bodyColor: '#FFFDF7',
          titleFont: { family: "'DM Sans',sans-serif", weight: '600' },
          bodyFont: { family: "'DM Sans',sans-serif" },
          padding: 10, cornerRadius: 8, displayColors: true,
        },
        datalabels: {
          align: 'top', anchor: 'end', offset: 4,
          font: { family: "'DM Sans',sans-serif", weight: '700', size: 11 },
          color: (ctx) => ctx.dataset.borderColor,
          formatter: (v) => v > 0 ? v : '',
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: "'DM Sans',sans-serif", size: 11 }, color: '#0A0A0A' } },
        y: { beginAtZero: true, grid: { color: 'rgba(10,10,10,.10)' }, ticks: { font: { family: "'DM Sans',sans-serif", size: 11 }, color: '#0A0A0A', precision: 0 } }
      }
    }
  });
}

let kpiManualActual = { leads: 0, visitasAgendadas: 0 };

function abrirModalKpiManual() {
  const mesSel = document.getElementById('kpi-manual-mes');
  mesSel.value = mesActual();
  cargarKpiManualExistente();
  document.getElementById('modal-kpi-manual').classList.add('open');
}
function cerrarModalKpiManual() {
  document.getElementById('modal-kpi-manual').classList.remove('open');
}
function cargarKpiManualExistente() {
  const anio = anioActual();
  const mes = document.getElementById('kpi-manual-mes').value;
  window._fbListenKpiManualVentas(anio, mes, data => {
    document.getElementById('kpi-manual-leads').value = data.leads || '';
    document.getElementById('kpi-manual-agendadas').value = data.visitasAgendadas || '';
  });
}
async function guardarKpiManual() {
  const anio = anioActual();
  const mes = document.getElementById('kpi-manual-mes').value;
  const leads = parseInt(document.getElementById('kpi-manual-leads').value) || 0;
  const visitasAgendadas = parseInt(document.getElementById('kpi-manual-agendadas').value) || 0;
  const btn = document.querySelector('#modal-kpi-manual .confirm-btn-ok');
  btnLoading(btn, true);
  await window._fbSetKpiManualVentas(anio, mes, { leads, visitasAgendadas });
  btnSuccess(btn);
  toastOk('KPIs de ' + mes + ' actualizados.');
  setTimeout(() => { cerrarModalKpiManual(); renderDashboard(); }, 500);
}

let _chartsTendenciaMarketing = {};

function renderTendenciaMarketing(canvasId) {
  canvasId = canvasId || 'mkt-chart-tendencia';
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const hoy = new Date();
  // Últimos 6 meses calendario (incluye el actual)
  const buckets = [];
  for (let i=5; i>=0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth()-i, 1);
    buckets.push({ mes: meses[d.getMonth()], anio: d.getFullYear(), label: meses[d.getMonth()].slice(0,3)+' '+String(d.getFullYear()).slice(2) });
  }
  const datosPorBucket = buckets.map(b => {
    const f = calcularFunnelDatos(b.mes, b.anio);
    return { label:b.label, leads:f[0].n, agendadas:f[1].n, concretadas:f[2].n, cierres:f[3].n };
  });

  if (_chartsTendenciaMarketing[canvasId]) _chartsTendenciaMarketing[canvasId].destroy();
  _chartsTendenciaMarketing[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: datosPorBucket.map(b=>b.label),
      datasets: [
        { label:'Leads', data:datosPorBucket.map(b=>b.leads), borderColor:'#7C3AED', backgroundColor:'transparent', tension:.35, pointRadius:3 },
        { label:'Visitas agendadas', data:datosPorBucket.map(b=>b.agendadas), borderColor:'#2451FF', backgroundColor:'transparent', tension:.35, pointRadius:3 },
        { label:'Visitas concretadas', data:datosPorBucket.map(b=>b.concretadas), borderColor:'#E0951A', backgroundColor:'transparent', tension:.35, pointRadius:3 },
        { label:'Cierres', data:datosPorBucket.map(b=>b.cierres), borderColor:'#1E8E3E', backgroundColor:'rgba(30,142,62,.14)', fill:true, tension:.35, pointRadius:3 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ intersect:false, mode:'index' },
      plugins:{
        legend:{ display:true, position:'bottom', labels:{usePointStyle:true, color:'#0A0A0A'} },
        datalabels: {
          align: 'top', anchor: 'end', offset: 3,
          font: { family: "'DM Sans',sans-serif", weight: '700', size: 10 },
          color: (ctx) => ctx.dataset.borderColor,
          formatter: (v) => v > 0 ? v : '',
        }
      },
      scales:{
        x:{ ticks:{color:'#0A0A0A'}, grid:{color:'rgba(10,10,10,.10)'} },
        y:{ beginAtZero:true, ticks:{ precision:0, color:'#0A0A0A' }, grid:{color:'rgba(10,10,10,.10)'} }
      }
    }
  });
}

// Registros del EQUIPO INTERNO — excluye ventas cerradas por agentes externos
// (se cargan para reportarlas, pero no deben contar en metas ni en el rendimiento del equipo).
function soloInternos(regs) { return regs.filter(r => !r.esExterno); }

function calcularFunnelDatos(mes, anioC) {
  const vMes = soloInternos(todosRegs.filter(r => r.mes === mes));
  const totalVisitas  = vMes.length;
  const conCierre     = vMes.filter(r => r.conclusion === 'Reserva' || r.huboCierre === 'SI').length;
  const leadsReal      = (typeof leadsSemanalesData !== 'undefined' ? leadsSemanalesData : []).filter(l => l.mes===mes && l.anio===anioC).reduce((s,l)=>s+(l.cantidad||0),0)
                        || (typeof leadsData !== 'undefined' ? leadsData : []).filter(l => l.mes===mes && l.anio===anioC).length;
  const agendadasReal  = (typeof visitasProgramadasData !== 'undefined' ? visitasProgramadasData : []).filter(v => v.mes===mes && v.anio===anioC).length;
  const convAgVsConc = agendadasReal ? Math.round(totalVisitas/agendadasReal*100) : undefined;
  const convConcVsCierre = totalVisitas ? Math.round(conCierre/totalVisitas*100) : undefined;
  return [
    { label:'Leads', n:leadsReal, color:'var(--accent)' },
    { label:'Visitas agendadas', n:agendadasReal, color:'var(--info)' },
    { label:'Visitas concretadas', n:totalVisitas, color:'var(--warn)', pct:convAgVsConc },
    { label:'Cierres (Reservas)', n:conCierre, color:'var(--cartera)', pct:convConcVsCierre },
  ];
}

function pintarFunnelEnDiv(elId, funnelData) {
  const el = document.getElementById(elId);
  if (!el) return;
  const maxF = Math.max(...funnelData.map(f=>f.n), 1);
  el.innerHTML = `<div class="funnel-viz">` + funnelData.map(f => {
    const pctWidth = Math.max((f.n/maxF*100), 10);
    return `
    <div class="funnel-stage">
      <div class="funnel-bar-wrap">
        <div class="funnel-bar" style="width:${pctWidth}%;background:${f.color};">
          <span class="funnel-value">${f.n}</span>
        </div>
      </div>
      <div class="funnel-meta">
        <span class="funnel-label">${f.label}</span>
        ${f.pct!==undefined ? `<span class="funnel-pct" style="color:${f.color};">${f.pct}% conversión</span>` : ''}
      </div>
    </div>`;
  }).join('') + `</div>`;
}

/* ═══════════════════════════════════════════
   AVANCE POR ASESOR + BÚSQUEDA DE CLIENTE — Panel Ventas
═══════════════════════════════════════════ */
function abrirDetalleAsesor(nombre) {
  const regs = todosRegs.filter(r => r.asesorNombre === nombre);
  if (!regs.length) return;

  const interesados = regs.filter(r => r.interes === 'SI').length;
  const cierres = regs.filter(r => r.conclusion === 'Reserva' || r.huboCierre === 'SI');
  const vendido = cierres.reduce((s,r)=>s+(r.precio||0),0);
  const pct = regs.length ? Math.round(cierres.length/regs.length*100) : 0;

  setText('da-titulo', '🧑‍💼 ' + nombre);
  setText('da-visitas', regs.length);
  setText('da-interesados', interesados);
  setText('da-cierres', cierres.length);
  setText('da-pct', pct+'%');
  setText('da-vendido', vendido ? '$'+Math.round(vendido).toLocaleString('es-BO',{maximumFractionDigits:0}) : '—');

  const cont = document.getElementById('da-clientes-lista');
  if (cont) {
    cont.innerHTML = [...regs].sort((a,b)=>(b.ts||0)-(a.ts||0)).map(r => `
      <div style="border:1.5px solid var(--line);border-radius:var(--r-md);padding:14px 16px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div style="font-weight:600;">${esc(r.nombre||'—')}</div>
          <span class="${estadoBadgeClass(r.conclusion||r.estado)}" style="font-size:var(--fs-xs);">${esc(r.conclusion||r.estado||'Sin estado')}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
          ${r.calificacion   ? `<span class="badge badge-def" style="font-size:var(--fs-xs);">Calif. ${esc(r.calificacion)}</span>` : ''}
          ${r.origen         ? `<span class="badge badge-def" style="font-size:var(--fs-xs);">📍 ${esc(r.origen)}</span>` : ''}
          ${r.terrenoInteres ? `<span class="badge badge-bbdd" style="font-size:var(--fs-xs);">🗺 ${esc(r.terrenoInteres)}</span>` : ''}
        </div>
        ${r.comentarios ? `<div style="margin-top:8px;font-size:var(--fs-sm);color:var(--ink-700);font-style:italic;">"${esc(r.comentarios)}"</div>` : ''}
        <div style="margin-top:8px;text-align:right;">
          <button onclick="abrirSeguimientoCliente('${escJs(r.nombre)}')" style="padding:5px 12px;background:var(--fill);border:1.5px solid var(--line);border-radius:var(--r-sm);font-size:var(--fs-xs);font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">💬 Seguimiento</button>
        </div>
      </div>`).join('');
  }

  document.getElementById('modal-detalle-asesor').classList.add('open');
}
function cerrarDetalleAsesor() {
  document.getElementById('modal-detalle-asesor').classList.remove('open');
}

function renderAnalisisOrigenModalidad() {
  const cierres = todosRegs.filter(r => r.conclusion === 'Reserva' && r.precioVenta > 0);

  function metrajeDe(r) {
    if (r.metraje) return r.metraje;
    if (!r.terrenoInteres) return null;
    const buscado = String(r.terrenoInteres).trim().toLowerCase();
    const lote = todosLotes.find(l => String(_terrenoDeLote(l)).trim().toLowerCase() === buscado);
    return lote?.metraje || null;
  }

  function agrupar(campo) {
    const g = {};
    cierres.forEach(r => {
      const k = r[campo] || 'Sin dato';
      (g[k] ||= { n:0, vendido:0, descPcts:[], m2Vals:[] });
      g[k].n++;
      g[k].vendido += (r.precioVenta||0);
      if (r.descuentoPct) g[k].descPcts.push(r.descuentoPct);
      const metraje = metrajeDe(r);
      if (metraje && r.precioVenta) g[k].m2Vals.push(r.precioVenta/metraje);
    });
    return Object.entries(g).sort((a,b)=>b[1].vendido-a[1].vendido);
  }

  function pintarTabla(id, filas) {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    if (!filas.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Sin datos.</div></td></tr>'; return; }
    const maxVendido = Math.max(...filas.map(([,d])=>d.vendido), 1);
    // el de menor descuento promedio (con al menos 1 dato) = mejor precio negociado
    const conDesc = filas.filter(([,d])=>d.descPcts.length);
    const minDescKey = conDesc.length ? conDesc.reduce((min,cur)=>{
      const pm = cur[1].descPcts.reduce((s,v)=>s+v,0)/cur[1].descPcts.length;
      const pmin = min[1].descPcts.reduce((s,v)=>s+v,0)/min[1].descPcts.length;
      return pm < pmin ? cur : min;
    })[0] : null;

    tbody.innerHTML = filas.map(([k,d], i) => {
      const promPct = d.descPcts.length ? (d.descPcts.reduce((s,v)=>s+v,0)/d.descPcts.length) : 0;
      const promM2  = d.m2Vals.length ? (d.m2Vals.reduce((s,v)=>s+v,0)/d.m2Vals.length) : null;
      const esTop = d.vendido === maxVendido && i === 0;
      const esMejorPrecio = k === minDescKey;
      return `<tr>
        <td style="font-weight:600;">${esc(k)}
          ${esTop?'<span style="color:var(--ok);font-size:var(--fs-xs);display:block;">🏆 top ingresos</span>':''}
          ${esMejorPrecio?'<span style="color:var(--info);font-size:var(--fs-xs);display:block;">🏅 mejor precio (menos desc.)</span>':''}
        </td>
        <td>${d.n}</td>
        <td style="font-weight:700;color:var(--cartera);">$${Math.round(d.vendido).toLocaleString('es-BO')}</td>
        <td style="color:${promPct>=10?'var(--danger)':'var(--ok)'};font-weight:600;">${d.descPcts.length ? promPct.toFixed(1)+'%' : '—'}</td>
        <td>${promM2 ? '$'+promM2.toLocaleString('es-BO',{maximumFractionDigits:2}) : '—'}</td>
      </tr>`;
    }).join('');
  }

  pintarTabla('v-origen-tbody', agrupar('origen'));
  pintarTabla('v-modalidad-tbody', agrupar('formaPago'));
  pintarTabla('v-asesor-cierres-tbody', agrupar('asesorNombre'));
}

/* ═══════════════════════════════════════════
   CIERRE DE AGENTE EXTERNO (sin usuario en el sistema)
   Se reporta para tener el dato completo, pero NO cuenta para la meta del equipo interno.
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   SEGUIMIENTO — hilo de comentarios por cliente
═══════════════════════════════════════════ */
function _clienteKey(nombre) {
  return String(nombre||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'sin-nombre';
}
let _segClienteActual = '';
let _segClienteNombreActual = '';

function abrirSeguimientoCliente(nombre) {
  _segClienteActual = _clienteKey(nombre);
  _segClienteNombreActual = nombre;
  setText('seg-cliente-nombre', nombre);
  document.getElementById('seg-nuevo-comentario').value = '';
  document.getElementById('modal-seguimiento-cliente').classList.add('open');
  window._fbListenComentariosSeguimiento(_segClienteActual, arr => renderComentariosSeguimiento(arr));
}
function cerrarSeguimientoCliente() {
  document.getElementById('modal-seguimiento-cliente').classList.remove('open');
}
function renderComentariosSeguimiento(arr) {
  const cont = document.getElementById('seg-comentarios-lista');
  if (!cont) return;
  if (!arr.length) { cont.innerHTML = '<div class="empty-state">Sin comentarios todavía — sé el primero en dejar uno.</div>'; return; }
  cont.innerHTML = [...arr].reverse().map(c => `
    <div class="seg-item">
      <div style="display:flex;justify-content:space-between;">
        <span class="seg-autor">${esc(c.autorNombre||'—')}</span>
        <span class="seg-fecha">${new Date(c.ts).toLocaleString('es-BO')}</span>
      </div>
      <div class="seg-texto">${esc(c.texto)}</div>
    </div>`).join('');
}
async function guardarComentarioSeguimiento() {
  const texto = document.getElementById('seg-nuevo-comentario').value.trim();
  if (!texto) { toastErr('Escribí el comentario antes de guardar.'); return; }
  const btn = document.querySelector('#modal-seguimiento-cliente .confirm-btn-ok');
  btnLoading(btn, true);
  await window._fbPushComentarioSeguimiento(_segClienteActual, {
    texto,
    autorNombre: asesorActual?.nombre || 'Admin',
    autorKey: asesorActual?._key || 'admin',
  });
  btnSuccess(btn);
  document.getElementById('seg-nuevo-comentario').value = '';
}

/* ═══════════════════════════════════════════
   VENTAS CONCRETADAS (admin) — autorización, tabla, import/export Excel
═══════════════════════════════════════════ */
let vcFiltros = { anio:[], canal:[], modalidad:[], categoria:[], estado:[] };

function toggleMsFiltro(campo) {
  document.querySelectorAll('.ms-filter').forEach(el => { if (el.id !== 'ms-'+campo) el.classList.remove('open'); });
  document.getElementById('ms-'+campo)?.classList.toggle('open');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.ms-filter')) document.querySelectorAll('.ms-filter.open').forEach(el=>el.classList.remove('open'));
});

function poblarMsFiltro(campo, valores) {
  const panel = document.getElementById('ms-'+campo+'-panel');
  if (!panel) return;
  const unicos = [...new Set(valores.filter(Boolean))].sort();
  panel.innerHTML = unicos.length ? unicos.map(v => `
    <label class="ms-filter-opt">
      <input type="checkbox" value="${esc(v)}" ${vcFiltros[campo].includes(v)?'checked':''} onchange="toggleValorFiltroVC('${campo}','${escJs(v)}',this.checked)"/>
      ${esc(v)}
    </label>`).join('') : '<div style="padding:8px;color:var(--gris);font-size:var(--fs-sm);">Sin opciones.</div>';
  setText('ms-'+campo+'-count', vcFiltros[campo].length ? '('+vcFiltros[campo].length+')' : '');
}
function toggleValorFiltroVC(campo, valor, checked) {
  if (checked) { if (!vcFiltros[campo].includes(valor)) vcFiltros[campo].push(valor); }
  else { vcFiltros[campo] = vcFiltros[campo].filter(v=>v!==valor); }
  renderVentasConcretadasAdmin();
}
function limpiarFiltrosVC() {
  vcFiltros = { anio:[], canal:[], modalidad:[], categoria:[], estado:[] };
  document.getElementById('vc-buscar').value = '';
  renderVentasConcretadasAdmin();
}

function renderVentasConcretadasAdmin() {
  const pendientes = ventasConcretadasData.filter(v => v.estadoAutorizacion === 'pendiente');
  const aprobadas  = ventasConcretadasData.filter(v => v.estadoAutorizacion === 'aprobado');

  const badge = document.getElementById('nav-contratos-badge');
  if (badge) { badge.style.display = pendientes.length ? 'flex' : 'none'; badge.textContent = pendientes.length; }

  // Pendientes
  const contP = document.getElementById('vc-pendientes-lista');
  if (contP) {
    contP.innerHTML = pendientes.length ? pendientes.map(v => `
      <div style="border:1.5px solid var(--line);border-radius:var(--r-md);padding:14px 16px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="font-weight:600;font-size:var(--fs-lg);font-family:'Cormorant Garamond',serif;">${esc(v.cliente)} — ${esc(v.terreno)}</div>
          <span style="font-weight:700;color:var(--cartera);">$${Math.round(v.precioVenta||0).toLocaleString('es-BO')}</span>
        </div>
        <div style="font-size:var(--fs-sm);color:var(--gris);margin-top:2px;">Asesor: ${esc(v.asesorNombre)} · Módulo ${esc(v.modulo||'—')} · ${esc(v.estatus)} · Categoría ${esc(v.categoria)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
          <span class="badge badge-def">Lista: $${Math.round(v.precioLista||0).toLocaleString('es-BO')}</span>
          <span class="badge badge-def">Desc: $${Math.round(v.descuentoUsd||0).toLocaleString('es-BO')} (${v.descuentoPct||0}%)</span>
          ${v.dsctoAdicional ? `<span class="badge" style="background:#fef3c7;color:#92400e;">+ Adicional: $${Math.round(v.dsctoAdicional).toLocaleString('es-BO')}</span>` : ''}
          ${v.accion ? `<span class="badge badge-def">Acción: $${Math.round(v.accion).toLocaleString('es-BO')}</span>` : ''}
        </div>
        ${v.observaciones ? `<div style="margin-top:8px;font-size:var(--fs-sm);font-style:italic;color:var(--ink-700);background:var(--bg-soft);border-radius:var(--r-sm);padding:8px 12px;">"${esc(v.observaciones)}"</div>` : ''}
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">
          <button onclick="rechazarVentaConcretada('${v._key}')" style="padding:6px 14px;background:var(--fill);border:1.5px solid var(--line);border-radius:var(--r-sm);font-size:var(--fs-sm);cursor:pointer;">✗ Rechazar</button>
          <button onclick="aprobarVentaConcretada('${v._key}')" style="padding:6px 14px;background:var(--cartera);color:#fff;border:none;border-radius:var(--r-sm);font-size:var(--fs-sm);font-weight:600;cursor:pointer;">✓ Aprobar y concretar venta</button>
        </div>
      </div>`).join('') : '<div class="empty-state">Sin contratos pendientes.</div>';
  }

  // Poblar filtros multi-selección (opciones siempre desde el universo completo de aprobadas)
  poblarMsFiltro('anio', aprobadas.map(v=>String(v.año||'')));
  poblarMsFiltro('canal', aprobadas.map(v=>v.canal||v.gestion));
  poblarMsFiltro('modalidad', aprobadas.map(v=>v.modalidad));
  poblarMsFiltro('categoria', aprobadas.map(v=>v.categoria));
  poblarMsFiltro('estado', aprobadas.map(v=>v.estadoVenta));

  // Filtro aplicado — de acá en adelante, KPIs, dashboard y tabla usan SIEMPRE "filtradas"
  const term = (document.getElementById('vc-buscar')?.value||'').trim().toLowerCase();
  let filtradas = aprobadas;
  if (vcFiltros.anio.length)       filtradas = filtradas.filter(v => vcFiltros.anio.includes(String(v.año||'')));
  if (vcFiltros.canal.length)      filtradas = filtradas.filter(v => vcFiltros.canal.includes(v.canal||v.gestion));
  if (vcFiltros.modalidad.length)  filtradas = filtradas.filter(v => vcFiltros.modalidad.includes(v.modalidad));
  if (vcFiltros.categoria.length)  filtradas = filtradas.filter(v => vcFiltros.categoria.includes(v.categoria));
  if (vcFiltros.estado.length)     filtradas = filtradas.filter(v => vcFiltros.estado.includes(v.estadoVenta));
  if (term) filtradas = filtradas.filter(v => (v.cliente||'').toLowerCase().includes(term) || (v.terreno||'').toLowerCase().includes(term));

  const hayFiltro = vcFiltros.anio.length || vcFiltros.canal.length || vcFiltros.modalidad.length || vcFiltros.categoria.length || vcFiltros.estado.length || term;
  const nota = document.getElementById('vc-kpi-filtro-nota');
  if (nota) nota.style.display = hayFiltro ? 'inline' : 'none';

  // KPIs compactos (arriba, junto a pendientes) — respetan el filtro activo
  setText('vc-kpi-total', filtradas.length);
  const totalVendido = filtradas.reduce((s,v)=>s+(v.precioVenta||0),0);
  setText('vc-kpi-vendido', totalVendido ? '$'+Math.round(totalVendido).toLocaleString('es-BO') : '—');
  const descPcts = filtradas.filter(v=>v.descuentoPct).map(v=>v.descuentoPct);
  setText('vc-kpi-desc', descPcts.length ? Math.round(descPcts.reduce((s,v)=>s+v,0)/descPcts.length)+'%' : '—');
  const m2Vals = filtradas.filter(v=>v.m2Usd).map(v=>v.m2Usd);
  setText('vc-kpi-m2', m2Vals.length ? '$'+Math.round(m2Vals.reduce((s,v)=>s+v,0)/m2Vals.length) : '—');

  const tbody = document.getElementById('vc-tabla-tbody');
  if (tbody) {
    const estadoColor = (ev) => (ev||'').toLowerCase().includes('caída') || (ev||'').toLowerCase().includes('caida') ? 'var(--danger)' : 'var(--ok)';
    tbody.innerHTML = filtradas.length ? filtradas.map(v => `<tr>
      <td>${v.año||'—'}</td><td>${esc(v.mes||'—')}</td>
      <td style="font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(v.cliente)}">${esc(v.cliente)}</td>
      <td style="font-family:monospace;">${esc(v.terreno)}</td>
      <td>${esc(v.modulo||'—')}</td>
      <td>${esc(v.canal||v.gestion||'—')}</td>
      <td>${esc(v.modalidad||'—')}</td>
      <td>${esc(v.asesorNombre||'—')}</td>
      <td>${esc(v.estatus||'—')}</td>
      <td style="font-weight:600;color:${estadoColor(v.estadoVenta)};">${esc(v.estadoVenta||'—')}</td>
      <td>${v.precioLista ? '$'+Math.round(v.precioLista).toLocaleString('es-BO') : '—'}</td>
      <td>${v.descuentoUsd ? '$'+Math.round(v.descuentoUsd).toLocaleString('es-BO')+' ('+v.descuentoPct+'%)' : '—'}</td>
      <td style="color:${(v.excedente||0)>=0?'var(--ok)':'var(--danger)'};font-weight:600;">${v.excedente ? '$'+Math.round(v.excedente).toLocaleString('es-BO') : '—'}</td>
      <td style="font-weight:700;color:var(--cartera);">$${Math.round(v.precioVenta||0).toLocaleString('es-BO')}</td>
      <td>${v.metraje||'—'}</td>
      <td>${v.m2Usd ? '$'+Math.round(v.m2Usd) : '—'}</td>
      <td>${esc(v.categoria||'—')}</td>
    </tr>`).join('') : '<tr><td colspan="17"><div class="empty-state">Sin resultados.</div></td></tr>';
  }

  renderVentasDashboard(filtradas);
}

/* ═══════════════════════════════════════════
   DASHBOARD DE VENTAS — tema oscuro, todas las capas de análisis
═══════════════════════════════════════════ */
let _chartsVCD = {};
function _destroyVCD(id) { if (_chartsVCD[id]) { _chartsVCD[id].destroy(); delete _chartsVCD[id]; } }
function _esVendida(v) { return !(v.estadoVenta||'').toLowerCase().includes('caíd') && !(v.estadoVenta||'').toLowerCase().includes('caid'); }

const VCD_DARK = { grid:'rgba(10,10,10,.10)', text:'#0A0A0A', textStrong:'#0A0A0A' };
const VCD_PALETTE = ['#FF3D8A','#2451FF','#7C3AED','#1E8E3E','#E8590C','#0A0A0A','#E0951A','#5C5C56'];

/* ── Sidebar acordeón ── */
function vcdAbrirSeccion(nombre) {
  document.querySelectorAll('.vcd-acc-head').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.vcd-acc-sub').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.vcd-section').forEach(s => s.classList.remove('active'));
  document.querySelector(`.vcd-acc-head[onclick="vcdAbrirSeccion('${nombre}')"]`)?.classList.add('active');
  document.querySelector(`.vcd-acc-sub[data-section="${nombre}"]`)?.classList.add('active');
  document.getElementById('vcd-sec-'+nombre)?.classList.add('active');
  // Los gráficos de Chart.js creados dentro de una sección oculta (display:none) quedan con
  // tamaño 0. Los volvemos a dibujar ya con la sección visible, para que midan bien.
  setTimeout(() => {
    const filtradas = (typeof ventasConcretadasData !== 'undefined') ? _ventasFiltradasActuales() : [];
    if (filtradas.length) renderVentasDashboard(filtradas);
  }, 50);
}

/* ── Selector de período (Día/Semana/Mes/Año), estilo Binance ── */
let vcdPeriodoActivo = 'mes';
function _ventasFiltradasActuales() {
  const aprobadas = ventasConcretadasData.filter(v => v.estadoAutorizacion === 'aprobado');
  const term = (document.getElementById('vc-buscar')?.value||'').trim().toLowerCase();
  let filtradas = aprobadas;
  if (vcFiltros.anio.length)       filtradas = filtradas.filter(v => vcFiltros.anio.includes(String(v.año||'')));
  if (vcFiltros.canal.length)      filtradas = filtradas.filter(v => vcFiltros.canal.includes(v.canal||v.gestion));
  if (vcFiltros.modalidad.length)  filtradas = filtradas.filter(v => vcFiltros.modalidad.includes(v.modalidad));
  if (vcFiltros.categoria.length)  filtradas = filtradas.filter(v => vcFiltros.categoria.includes(v.categoria));
  if (vcFiltros.estado.length)     filtradas = filtradas.filter(v => vcFiltros.estado.includes(v.estadoVenta));
  if (term) filtradas = filtradas.filter(v => (v.cliente||'').toLowerCase().includes(term) || (v.terreno||'').toLowerCase().includes(term));
  return filtradas;
}

function vcdCambiarPeriodo(periodo) {
  vcdPeriodoActivo = periodo;
  document.querySelectorAll('.vcd-period-btn').forEach(b => b.classList.toggle('active', b.dataset.periodo===periodo));
  renderVentasDashboard(_ventasFiltradasActuales());
}

function _fechaDeVenta(v) {
  if (v.fechaReserva) { const d = new Date(v.fechaReserva+'T00:00:00'); if (!isNaN(d)) return d; }
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mIdx = meses.indexOf(v.mes);
  if (v.año && mIdx>=0) return new Date(v.año, mIdx, 15);
  return null;
}
function _isoWeek(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay()||7));
  const anioInicio = new Date(Date.UTC(dt.getUTCFullYear(),0,1));
  const semana = Math.ceil((((dt-anioInicio)/86400000)+1)/7);
  return dt.getUTCFullYear()+'-W'+String(semana).padStart(2,'0');
}
function _agruparPorPeriodo(vendidas, periodo) {
  const buckets = {};
  vendidas.forEach(v => {
    const f = _fechaDeVenta(v);
    if (!f) return;
    let clave, label, orden;
    if (periodo === 'dia') {
      clave = f.toISOString().split('T')[0];
      label = f.getDate()+'/'+(f.getMonth()+1);
      orden = f.getTime();
    } else if (periodo === 'semana') {
      clave = _isoWeek(f);
      label = clave;
      orden = f.getTime();
    } else if (periodo === 'anio') {
      clave = String(f.getFullYear());
      label = clave;
      orden = f.getFullYear();
    } else { // mes
      clave = f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0');
      label = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][f.getMonth()]+' '+String(f.getFullYear()).slice(2);
      orden = f.getFullYear()*100+f.getMonth();
    }
    (buckets[clave] ||= { label, orden, n:0, ingresos:0 });
    buckets[clave].n++;
    buckets[clave].ingresos += (v.precioVenta||0);
  });
  let arr = Object.values(buckets).sort((a,b)=>a.orden-b.orden);
  const limites = { dia:30, semana:16, mes:24, anio:10 };
  arr = arr.slice(-limites[periodo]);
  return arr;
}

function renderVentasDashboard(aprobadas) {
  const vendidas = aprobadas.filter(_esVendida);
  const caidas = aprobadas.filter(v => !_esVendida(v));

  // ── KPIs ──
  setText('vcd-k-total', aprobadas.length);
  setText('vcd-k-total-sub', vendidas.length+' vendidas · '+caidas.length+' caídas');
  const ingresos = vendidas.reduce((s,v)=>s+(v.precioVenta||0),0);
  setText('vcd-k-ingresos', ingresos ? '$'+Math.round(ingresos).toLocaleString('es-BO') : '—');
  setText('vcd-k-ingresos-sub', vendidas.length+' ventas concretadas');
  const descPcts = vendidas.filter(v=>v.descuentoPct).map(v=>v.descuentoPct);
  setText('vcd-k-desc', descPcts.length ? (descPcts.reduce((s,v)=>s+v,0)/descPcts.length).toFixed(1)+'%' : '—');
  const excedTotal = vendidas.reduce((s,v)=>s+(v.excedente||0),0);
  setText('vcd-k-exced', (excedTotal? (excedTotal>=0?'$':'-$')+Math.abs(Math.round(excedTotal)).toLocaleString('es-BO') : '—'));
  setText('vcd-k-exced-sub', excedTotal>=0 ? 'por encima de política' : 'por debajo de política');
  const totalIntentos = vendidas.length + caidas.length;
  setText('vcd-k-conv', totalIntentos ? Math.round(vendidas.length/totalIntentos*100)+'%' : '—');
  const m2Vals = vendidas.filter(v=>v.m2Usd).map(v=>v.m2Usd);
  setText('vcd-k-m2', m2Vals.length ? '$'+Math.round(m2Vals.reduce((s,v)=>s+v,0)/m2Vals.length) : '—');
  const catA = vendidas.filter(v=>v.categoria==='A').length;
  setText('vcd-k-catA', catA);
  setText('vcd-k-catA-sub', vendidas.length ? Math.round(catA/vendidas.length*100)+'% del total' : '—');
  setText('vcd-k-caidas', caidas.length);
  setText('vcd-k-caidas-sub', totalIntentos ? Math.round(caidas.length/totalIntentos*100)+'% de los intentos' : '—');

  if (!aprobadas.length) return; // sin datos, no dibujamos gráficos vacíos

  const darkOpts = (extra) => Object.assign({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ labels:{ color:VCD_DARK.text, font:{size:10.5}, usePointStyle:true } } },
    scales:{
      x:{ grid:{color:VCD_DARK.grid}, ticks:{color:VCD_DARK.text, font:{size:10}} },
      y:{ grid:{color:VCD_DARK.grid}, ticks:{color:VCD_DARK.text, font:{size:10}} },
    }
  }, extra||{});

  // ── Tendencias mensuales ──
  const buckets = {};
  vendidas.forEach(v => {
    const k = (v.año||0)+'-'+(v.mes||'');
    (buckets[k] ||= { label:(v.mes||'').slice(0,3)+' '+String(v.año||'').slice(2), orden:(v.año||0)*100+(['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].indexOf(v.mes)+1), n:0, ingresos:0, exced:0, descs:[] });
    const b = buckets[k];
    b.n++; b.ingresos += (v.precioVenta||0); b.exced += (v.excedente||0);
    if (v.descuentoPct) b.descs.push(v.descuentoPct);
  });
  const bOrd = Object.values(buckets).sort((a,b)=>a.orden-b.orden);
  _destroyVCD('vcd-chart-tendencia');
  const c1 = document.getElementById('vcd-chart-tendencia');
  if (c1 && bOrd.length) {
    _chartsVCD['vcd-chart-tendencia'] = new Chart(c1, {
      type:'line',
      data:{ labels:bOrd.map(b=>b.label), datasets:[
        { label:'Ventas', data:bOrd.map(b=>b.n), borderColor:VCD_PALETTE[0], backgroundColor:'transparent', yAxisID:'y', tension:.3 },
        { label:'Ingresos ($)', data:bOrd.map(b=>Math.round(b.ingresos)), borderColor:VCD_PALETTE[1], backgroundColor:'transparent', yAxisID:'y1', tension:.3 },
        { label:'Excedente ($)', data:bOrd.map(b=>Math.round(b.exced)), borderColor:VCD_PALETTE[2], backgroundColor:'transparent', yAxisID:'y1', tension:.3 },
        { label:'% Descuento', data:bOrd.map(b=>b.descs.length?Math.round(b.descs.reduce((s,v)=>s+v,0)/b.descs.length*10)/10:null), borderColor:VCD_PALETTE[3], backgroundColor:'transparent', yAxisID:'y2', tension:.3, hidden:true },
      ]},
      options: darkOpts({
        interaction:{intersect:false,mode:'index'},
        scales:{
          x:{ grid:{color:VCD_DARK.grid}, ticks:{color:VCD_DARK.text, font:{size:10}} },
          y:{ position:'left', grid:{color:VCD_DARK.grid}, ticks:{color:VCD_DARK.text, font:{size:10}}, title:{display:true,text:'Ventas',color:VCD_DARK.text} },
          y1:{ position:'right', grid:{display:false}, ticks:{color:VCD_DARK.text, font:{size:10}, callback:v=>'$'+(v/1000)+'k'} },
          y2:{ display:false },
        }
      })
    });
  }

  // ── Análisis por período (Día/Semana/Mes/Año, seleccionable) ──
  const datosPeriodo = _agruparPorPeriodo(vendidas, vcdPeriodoActivo);
  _destroyVCD('vcd-chart-periodo');
  const cP = document.getElementById('vcd-chart-periodo');
  if (cP && datosPeriodo.length) {
    _chartsVCD['vcd-chart-periodo'] = new Chart(cP, { type:'bar',
      data:{ labels:datosPeriodo.map(b=>b.label), datasets:[
        { label:'Ventas', data:datosPeriodo.map(b=>b.n), backgroundColor:VCD_PALETTE[0], borderRadius:5, yAxisID:'y', maxBarThickness:34 },
        { label:'Ingresos ($)', data:datosPeriodo.map(b=>Math.round(b.ingresos)), type:'line', borderColor:VCD_PALETTE[1], backgroundColor:'transparent', yAxisID:'y1', tension:.3 },
      ]},
      options: darkOpts({ interaction:{intersect:false,mode:'index'}, scales:{
        x:{ grid:{display:false}, ticks:{color:VCD_DARK.text,font:{size:9.5}, maxRotation:0} },
        y:{ position:'left', grid:{color:VCD_DARK.grid}, ticks:{color:VCD_DARK.text,font:{size:10}} },
        y1:{ position:'right', grid:{display:false}, ticks:{color:VCD_DARK.text,font:{size:10},callback:v=>'$'+(v/1000)+'k'} },
      }})
    });
  } else if (cP) {
    const ctx = cP.getContext('2d'); ctx.clearRect(0,0,cP.width,cP.height);
  }

  // ── Trimestre ──
  const porTrim = {};
  vendidas.forEach(v => { const k=v.trimestre||'—'; (porTrim[k]||={n:0,ingresos:0}); porTrim[k].n++; porTrim[k].ingresos+=(v.precioVenta||0); });
  const trimOrd = Object.entries(porTrim).sort((a,b)=>a[0].localeCompare(b[0]));
  _destroyVCD('vcd-chart-trimestre');
  const c2 = document.getElementById('vcd-chart-trimestre');
  if (c2 && trimOrd.length) {
    _chartsVCD['vcd-chart-trimestre'] = new Chart(c2, {
      type:'bar',
      data:{ labels:trimOrd.map(([k])=>k), datasets:[
        { label:'Ventas', data:trimOrd.map(([,d])=>d.n), backgroundColor:VCD_PALETTE[0], borderRadius:5, yAxisID:'y' },
        { label:'Ingresos ($)', data:trimOrd.map(([,d])=>Math.round(d.ingresos)), backgroundColor:VCD_PALETTE[1], borderRadius:5, yAxisID:'y1' },
      ]},
      options: darkOpts({ scales:{
        x:{ grid:{display:false}, ticks:{color:VCD_DARK.text,font:{size:10}} },
        y:{ position:'left', grid:{color:VCD_DARK.grid}, ticks:{color:VCD_DARK.text,font:{size:10}} },
        y1:{ position:'right', grid:{display:false}, ticks:{color:VCD_DARK.text,font:{size:10},callback:v=>'$'+(v/1000)+'k'} },
      }})
    });
  }

  // ── Ranking asesores: ventas y excedente ──
  const porAsesor = {};
  vendidas.forEach(v => { const k=v.asesorNombre||'—'; (porAsesor[k]||={n:0,exced:0,caidas:0}); porAsesor[k].n++; porAsesor[k].exced+=(v.excedente||0); });
  caidas.forEach(v => { const k=v.asesorNombre||'—'; (porAsesor[k]||={n:0,exced:0,caidas:0}); porAsesor[k].caidas++; });
  const asesorPorVentas = Object.entries(porAsesor).sort((a,b)=>b[1].n-a[1].n).slice(0,10);
  const asesorPorExced  = Object.entries(porAsesor).sort((a,b)=>b[1].exced-a[1].exced).slice(0,10);

  _destroyVCD('vcd-chart-asesor-ventas');
  const c3 = document.getElementById('vcd-chart-asesor-ventas');
  if (c3 && asesorPorVentas.length) {
    _chartsVCD['vcd-chart-asesor-ventas'] = new Chart(c3, {
      type:'bar',
      data:{ labels:asesorPorVentas.map(([k])=>k), datasets:[{ data:asesorPorVentas.map(([,d])=>d.n), backgroundColor:VCD_PALETTE[0], borderRadius:5, maxBarThickness:22 }] },
      options: darkOpts({ indexAxis:'y', plugins:{ legend:{display:false}, datalabels:{anchor:'center',align:'center',color:'#fff',font:{weight:'700',size:11}} } })
    });
  }
  _destroyVCD('vcd-chart-asesor-exced');
  const c4 = document.getElementById('vcd-chart-asesor-exced');
  if (c4 && asesorPorExced.length) {
    _chartsVCD['vcd-chart-asesor-exced'] = new Chart(c4, {
      type:'bar',
      data:{ labels:asesorPorExced.map(([k])=>k), datasets:[{ data:asesorPorExced.map(([,d])=>Math.round(d.exced)), backgroundColor:asesorPorExced.map(([,d])=>d.exced>=0?'#1E8E3E':'#E63946'), borderRadius:5, maxBarThickness:22 }] },
      options: darkOpts({ indexAxis:'y', plugins:{ legend:{display:false}, datalabels:{anchor:'end',align:'end',color:VCD_DARK.textStrong,font:{weight:'700',size:10},formatter:v=>'$'+v.toLocaleString('es-BO')} } })
    });
  }

  const top10El = document.getElementById('vcd-top10-exced');
  if (top10El) {
    top10El.innerHTML = asesorPorExced.length ? asesorPorExced.map(([k,d]) => `
      <div class="vcd-row">
        <div><div class="vcd-row-name">${esc(k)}</div><div class="vcd-row-sub">${d.n} ventas</div></div>
        <div class="vcd-row-val">${d.exced>=0?'+':''}$${Math.round(d.exced).toLocaleString('es-BO')}</div>
      </div>`).join('') : '<div style="color:#697a65;font-size:12px;padding:8px;">Sin datos.</div>';
  }

  // ── Donuts: Estado, Canal, Categoría, Modalidad ──
  const donutOpts = { cutout:'62%', responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{position:'bottom', labels:{color:VCD_DARK.text, font:{size:9.5}, boxWidth:8, padding:8}},
      datalabels:{color:'#fff', font:{weight:'700',size:10}, formatter:v=>v>0?v:''} } };
  function pintarDonut(id, counts) {
    _destroyVCD(id);
    const el = document.getElementById(id); if (!el) return;
    const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    if (!entries.length) return;
    _chartsVCD[id] = new Chart(el, { type:'doughnut',
      data:{ labels:entries.map(([k])=>k), datasets:[{ data:entries.map(([,n])=>n), backgroundColor:VCD_PALETTE, borderWidth:2, borderColor:'#FFFDF7' }] },
      options: donutOpts });
  }
  const cEstado = {}; aprobadas.forEach(v => { const k=_esVendida(v)?'Vendido':'Caída'; cEstado[k]=(cEstado[k]||0)+1; });
  pintarDonut('vcd-donut-estado', cEstado);
  const cCanal = {}; vendidas.forEach(v => { const k=v.canal||v.gestion||'—'; cCanal[k]=(cCanal[k]||0)+1; });
  pintarDonut('vcd-donut-canal', cCanal);
  const cCateg = {}; vendidas.forEach(v => { const k=v.categoria||'—'; cCateg[k]=(cCateg[k]||0)+1; });
  pintarDonut('vcd-donut-categoria', cCateg);
  const cModal = {}; vendidas.forEach(v => { const k=v.modalidad||'—'; cModal[k]=(cModal[k]||0)+1; });
  pintarDonut('vcd-donut-modalidad', cModal);

  // ── Módulo y $m² por categoría ──
  const porModulo = {}; vendidas.forEach(v => { const k=v.modulo||'—'; porModulo[k]=(porModulo[k]||0)+1; });
  _destroyVCD('vcd-chart-modulo');
  const c5 = document.getElementById('vcd-chart-modulo');
  const moduloEntries = Object.entries(porModulo).sort((a,b)=>b[1]-a[1]);
  if (c5 && moduloEntries.length) {
    _chartsVCD['vcd-chart-modulo'] = new Chart(c5, { type:'bar',
      data:{ labels:moduloEntries.map(([k])=>k), datasets:[{ data:moduloEntries.map(([,n])=>n), backgroundColor:VCD_PALETTE[1], borderRadius:5, maxBarThickness:26 }] },
      options: darkOpts({ plugins:{legend:{display:false}, datalabels:{anchor:'end',align:'top',color:VCD_DARK.textStrong,font:{weight:'700',size:10}}} }) });
  }

  const m2PorCateg = {}; vendidas.filter(v=>v.m2Usd).forEach(v => { const k=v.categoria||'—'; (m2PorCateg[k]||=[]).push(v.m2Usd); });
  _destroyVCD('vcd-chart-m2-categoria');
  const c6 = document.getElementById('vcd-chart-m2-categoria');
  const m2Entries = Object.entries(m2PorCateg).sort((a,b)=>a[0].localeCompare(b[0]));
  if (c6 && m2Entries.length) {
    _chartsVCD['vcd-chart-m2-categoria'] = new Chart(c6, { type:'bar',
      data:{ labels:m2Entries.map(([k])=>'Categoría '+k), datasets:[{ data:m2Entries.map(([,arr])=>Math.round(arr.reduce((s,v)=>s+v,0)/arr.length)), backgroundColor:VCD_PALETTE[2], borderRadius:5, maxBarThickness:36 }] },
      options: darkOpts({ plugins:{legend:{display:false}, datalabels:{anchor:'end',align:'top',color:VCD_DARK.textStrong,font:{weight:'700',size:10},formatter:v=>'$'+v}} }) });
  }

  // ── Tasa de conversión por asesor ──
  const convAsesor = Object.entries(porAsesor).map(([k,d]) => [k, d.n+d.caidas ? Math.round(d.n/(d.n+d.caidas)*100) : 0, d.n+d.caidas]).filter(([,,t])=>t>=1).sort((a,b)=>b[1]-a[1]).slice(0,10);
  _destroyVCD('vcd-chart-conversion-asesor');
  const c7 = document.getElementById('vcd-chart-conversion-asesor');
  if (c7 && convAsesor.length) {
    _chartsVCD['vcd-chart-conversion-asesor'] = new Chart(c7, { type:'bar',
      data:{ labels:convAsesor.map(([k])=>k), datasets:[{ data:convAsesor.map(([,p])=>p), backgroundColor:convAsesor.map(([,p])=>p>=70?'#1E8E3E':p>=40?'#E0951A':'#E63946'), borderRadius:5, maxBarThickness:22 }] },
      options: darkOpts({ indexAxis:'y', plugins:{legend:{display:false}, datalabels:{anchor:'end',align:'end',color:VCD_DARK.textStrong,font:{weight:'700',size:10},formatter:v=>v+'%'}}, scales:{ x:{ grid:{color:VCD_DARK.grid}, ticks:{color:VCD_DARK.text,font:{size:10},callback:v=>v+'%'}, max:100 }, y:{ grid:{display:false}, ticks:{color:VCD_DARK.text,font:{size:10}} } } })
    });
  }

  // ── Scatter: precio de venta vs $/m² ──
  _destroyVCD('vcd-chart-scatter');
  const c8 = document.getElementById('vcd-chart-scatter');
  const puntos = vendidas.filter(v=>v.precioVenta && v.m2Usd).map(v=>({x:v.precioVenta, y:v.m2Usd}));
  if (c8 && puntos.length) {
    _chartsVCD['vcd-chart-scatter'] = new Chart(c8, { type:'scatter',
      data:{ datasets:[{ label:'Ventas', data:puntos, backgroundColor:'rgba(255,61,138,.7)', pointRadius:4, pointHoverRadius:6 }] },
      options: darkOpts({ plugins:{legend:{display:false}}, scales:{
        x:{ grid:{color:VCD_DARK.grid}, ticks:{color:VCD_DARK.text,font:{size:10},callback:v=>'$'+(v/1000)+'k'}, title:{display:true,text:'Precio de venta',color:VCD_DARK.text} },
        y:{ grid:{color:VCD_DARK.grid}, ticks:{color:VCD_DARK.text,font:{size:10},callback:v=>'$'+v}, title:{display:true,text:'$/m²',color:VCD_DARK.text} },
      }})
    });
  }
}

async function aprobarVentaConcretada(key) {
  const ok = await confirmDialog('La venta pasa a "Ventas Concretadas" en firme.', { title:'✓ Aprobar venta', okText:'Aprobar' });
  if (!ok) return;
  await window._fbUpdateVentaConcretada(key, { estadoAutorizacion:'aprobado', aprobadoTs: Date.now() });
  toastOk('Venta aprobada y concretada.');
}
async function rechazarVentaConcretada(key) {
  const motivo = prompt('¿Por qué se rechaza? (se le va a avisar al asesor)') || '';
  await window._fbUpdateVentaConcretada(key, { estadoAutorizacion:'rechazado', motivoRechazo: motivo, rechazadoTs: Date.now() });
  toastOk('Contrato rechazado.');
}

// Importar histórico desde el Excel tipo "Base de Ventas" (Power BI)
async function procesarExcelVentasConcretadas(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

    if (rows.length < 2) { toastErr('El Excel no tiene filas de datos.'); return; }

    const ok = await confirmDialog(
      `Se van a cargar ${rows.length-1} ventas históricas como ya autorizadas (no pasan por revisión, son datos del pasado).`,
      { title:'📂 Cargar histórico', okText:'Cargar' }
    );
    if (!ok) return;

    let n = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[4]) continue; // sin cliente, salteamos
      const fechaRaw = r[23];
      const fecha = (fechaRaw instanceof Date) ? fechaRaw.toISOString().split('T')[0] : '';
      await window._fbPushVentaConcretada({
        registroKey: '',
        año: Number(r[0])||null, anio: Number(r[0])||null,
        mes: r[2]||'', trimestre: r[28]||'',
        cliente: String(r[4]||''), terreno: String(r[5]||''), modulo: String(r[6]||''),
        gestion: String(r[7]||''), asesorNombre: String(r[10]||''),
        estadoVenta: String(r[11]||''), estatus: String(r[12]||''), contrato: String(r[27]||''),
        modalidad: String(r[9]||''),
        precioLista: Number(r[13])||0,
        pctDsctoPolitica: Number(r[14])||0, dsctoPolitica: Number(r[15])||0,
        dsctoAdicional: Number(r[16])||0,
        descuentoUsd: Number(r[17])||0, descuentoPct: Math.round((Number(r[18])||0)*1000)/10,
        excedente: Number(r[19])||0,
        precioVenta: Number(r[20])||0,
        metraje: Number(r[21])||0, m2Usd: Number(r[22])||0,
        fechaReserva: fecha, accion: Number(r[24])||0,
        categoria: String(r[29]||''), ciudadOrigen: String(r[30]||''),
        canal: String(r[26]||''),
        esHistorico: true,
        estadoAutorizacion: 'aprobado',
        solicitadoPorKey: 'import', solicitadoPorNombre: 'Importado desde Excel',
      });
      n++;
    }
    toastOk(n + ' ventas históricas cargadas.');
    input.value = '';
  } catch(e) {
    toastErr('Error al leer el Excel: ' + e.message);
  }
}

function exportarVentasConcretadas() {
  const aprobadas = ventasConcretadasData.filter(v => v.estadoAutorizacion === 'aprobado');
  if (!aprobadas.length) { toastErr('No hay ventas concretadas para exportar.'); return; }
  const filas = aprobadas.map(v => ({
    'Año': v.año, 'Mes': v.mes, 'Trimestre': v.trimestre, 'Cliente': v.cliente, 'Terreno': v.terreno,
    'Módulo': v.modulo, 'Gestión/Canal': v.canal||v.gestion, 'Modalidad': v.modalidad, 'Asesor': v.asesorNombre,
    'Estado de Venta': v.estadoVenta, 'Estatus': v.estatus, 'Contrato': v.contrato,
    'Precio de Lista': v.precioLista, '% Descuento': v.descuentoPct, '$ Descuento': v.descuentoUsd,
    'Dscto Adicional': v.dsctoAdicional, 'Precio de Venta': v.precioVenta,
    'Metraje': v.metraje, 'm2$us': v.m2Usd, 'Acción': v.accion,
    'Categoría': v.categoria, 'Ciudad de Origen': v.ciudadOrigen, 'Fecha de Reserva': v.fechaReserva,
  }));
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas Concretadas');
  XLSX.writeFile(wb, 'ventas_concretadas_urubo_village.xlsx');
}

function abrirModalCierreExterno() {
  const selTerreno = document.getElementById('ce-terreno');
  selTerreno.innerHTML = '<option value="">Seleccionar del inventario...</option>' +
    todosLotes.filter(l => l.estado !== 'Vendido').map(l =>
      `<option value="${l._key}">${esc(_terrenoDeLote(l))}${l.estado==='Reservado'?' (ya reservado)':''}</option>`).join('');

  const selOrigen = document.getElementById('ce-origen');
  selOrigen.innerHTML = '<option value="">Seleccionar...</option>' +
    origenesData.map(o => `<option value="${esc(o.nombre)}" ${o.nombre==='Agente Externo'?'selected':''}>${esc(o.nombre)}</option>`).join('');

  ['ce-nombre','ce-agente','ce-precio-venta'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('ce-fecha').value = new Date().toISOString().split('T')[0];
  document.getElementById('ce-precio-lista-display').value = '';
  document.getElementById('ce-modalidad').value = '';
  document.querySelectorAll('input[name=ceCalificacion]').forEach(r => r.checked = false);
  document.getElementById('ce-descuento-info').style.display = 'none';

  document.getElementById('modal-cierre-externo').classList.add('open');
}
function cerrarModalCierreExterno() {
  document.getElementById('modal-cierre-externo').classList.remove('open');
}

function calcularDescuentoCierreExterno() {
  const loteKey = document.getElementById('ce-terreno').value;
  const lote = todosLotes.find(l => l._key === loteKey);
  const precioLista = lote?.precio || 0;
  const metraje = lote?.metraje || 0;
  const precioVenta = parseFloat(document.getElementById('ce-precio-venta').value) || 0;

  document.getElementById('ce-precio-lista-display').value = precioLista ? '$'+precioLista.toLocaleString('es-BO') : (loteKey ? 'Este lote no tiene precio cargado' : '');

  const box = document.getElementById('ce-descuento-info');
  if (!precioLista || !precioVenta) { box.style.display = 'none'; return; }

  const descUsd = precioLista - precioVenta;
  const descPct = precioLista ? (descUsd/precioLista*100) : 0;
  const precioM2 = metraje ? (precioVenta/metraje) : 0;

  setText('ce-descuento-usd', (descUsd>=0?'$':'-$')+Math.abs(descUsd).toLocaleString('es-BO',{maximumFractionDigits:0}));
  setText('ce-descuento-pct', descPct.toFixed(1)+'%');
  setText('ce-precio-m2', metraje ? '$'+precioM2.toLocaleString('es-BO',{maximumFractionDigits:2}) : '—');
  box.style.display = 'block';
}

async function guardarCierreExterno() {
  const nombre  = document.getElementById('ce-nombre').value.trim();
  const agente  = document.getElementById('ce-agente').value.trim();
  const loteKey = document.getElementById('ce-terreno').value;
  const fecha   = document.getElementById('ce-fecha').value || new Date().toISOString().split('T')[0];
  const precioVenta = parseFloat(document.getElementById('ce-precio-venta').value) || 0;
  const modalidad = document.getElementById('ce-modalidad').value;
  const origen  = document.getElementById('ce-origen').value;
  const calificacion = (document.querySelector('input[name=ceCalificacion]:checked')||{}).value || '';

  if (!nombre)  { toastErr('Falta el nombre del cliente.'); return; }
  if (!agente)  { toastErr('Falta el nombre del agente externo.'); return; }
  if (!loteKey) { toastErr('Elegí el terreno del inventario.'); return; }
  if (!precioVenta) { toastErr('Falta el precio de venta.'); return; }

  const lote = todosLotes.find(l => l._key === loteKey);
  const precioLista = lote?.precio || 0;
  const metraje = lote?.metraje || 0;
  const descuentoUsd = precioLista ? (precioLista - precioVenta) : 0;
  const descuentoPct = precioLista ? Math.round((descuentoUsd/precioLista)*1000)/10 : 0;
  const precioM2Final = metraje ? Math.round((precioVenta/metraje)*100)/100 : 0;

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mes = meses[new Date(fecha+'T00:00:00').getMonth()];
  const anio = new Date(fecha+'T00:00:00').getFullYear();

  const btn = document.querySelector('#modal-cierre-externo .confirm-btn-ok');
  btnLoading(btn, true);
  try {
    await window._fbPushRegistro('agente_externo', {
      ts: Date.now(),
      fechaCarga: new Date().toLocaleString('es-BO'),
      esExterno: true,
      agenteExterno: agente,
      asesorNombre: '🤝 ' + agente + ' (externo)',
      nombre, fecha, mes, anio,
      terrenoKey: loteKey,
      terrenoInteres: lote ? _terrenoDeLote(lote) : '',
      precioLista, metraje, precioVenta, precio: precioVenta,
      descuentoUsd, descuentoPct, precioM2Final,
      formaPago: modalidad, origen, calificacion,
      conclusion: 'Reserva', estado: 'Reserva',
      comentarios: 'Cierre registrado manualmente — venta directa de agente externo.',
    });

    if (loteKey) {
      await window._fbUpdateLote(loteKey, {
        estado: 'Reservado',
        reservadoPorKey: 'agente_externo',
        reservadoPorNombre: agente + ' (agente externo)',
        precioVenta, precioLista, descuentoUsd, descuentoPct, precioM2Final,
        estadoNegociacion: '', negociadoPorKey: null, negociadoPorNombre: null,
      });
    }

    btnSuccess(btn);
    toastOk('Cierre externo de ' + nombre + ' registrado — no suma a la meta del equipo.');
    setTimeout(cerrarModalCierreExterno, 500);
  } catch(e) {
    btnLoading(btn, false);
    toastErr('Error al guardar: ' + e.message);
  }
}

/* ═══════════════════════════════════════════
   META VS EJECUCIÓN — histórico mes a mes (solo equipo interno / UV)
═══════════════════════════════════════════ */
let _chartMetaVsEjecucion = null;
async function renderMetaVsEjecucion() {
  const canvas = document.getElementById('v-chart-meta-ejecucion');
  if (!canvas) return;

  const nombresMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const hoy = new Date();
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth()-i, 1);
    buckets.push({ mes: nombresMes[d.getMonth()], anio: d.getFullYear(), label: nombresMes[d.getMonth()].slice(0,3)+' '+String(d.getFullYear()).slice(2) });
  }

  const datos = [];
  for (const b of buckets) {
    const metaC = await window._fbGetMetaOnce(b.anio, b.mes, 'mkt_cierres');
    const cierresReales = soloInternos(todosRegs).filter(r => r.mes===b.mes && (r.conclusion==='Reserva' || r.huboCierre==='SI')).length;
    datos.push({ label: b.label, meta: metaC||0, real: cierresReales });
  }

  // KPIs
  const esteMes = datos[datos.length-1];
  const pctEsteMes = esteMes.meta ? Math.round(esteMes.real/esteMes.meta*100) : null;
  setText('v-mve-cumpl-mes', pctEsteMes!==null ? pctEsteMes+'%' : 'sin meta');

  const conMeta = datos.filter(d => d.meta > 0);
  const promCumpl = conMeta.length ? Math.round(conMeta.reduce((s,d)=>s+(d.real/d.meta*100),0)/conMeta.length) : null;
  setText('v-mve-cumpl-prom', promCumpl!==null ? promCumpl+'%' : '—');

  const mesesOk = conMeta.filter(d => d.real >= d.meta).length;
  setText('v-mve-meses-ok', conMeta.length ? mesesOk+'/'+conMeta.length : '—');

  // Gráfico de barras: Meta vs Real, mes a mes
  if (_chartMetaVsEjecucion) _chartMetaVsEjecucion.destroy();
  _chartMetaVsEjecucion = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: datos.map(d=>d.label),
      datasets: [
        { label:'Meta', data:datos.map(d=>d.meta||null), backgroundColor:'rgba(10,10,10,.12)', borderColor:'#0A0A0A', borderWidth:2, borderRadius:5, maxBarThickness:28 },
        { label:'Cierres reales', data:datos.map(d=>d.real), backgroundColor:datos.map(d => d.meta && d.real>=d.meta ? '#1E8E3E' : (d.meta ? '#E63946' : '#2451FF')), borderRadius:5, maxBarThickness:28 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ position:'top', labels:{usePointStyle:true} },
        datalabels:{ anchor:'end', align:'top', font:{weight:'700',size:10.5}, color:'#0A0A0A', formatter:v=>v>0?v:'' }
      },
      scales:{
        x:{ grid:{display:false} },
        y:{ beginAtZero:true, ticks:{precision:0} }
      }
    }
  });
}

function renderResumenCierres(mes, metaC) {
  try {
    const cierres = (todosRegs||[]).filter(r => r.conclusion === 'Reserva' && r.precioVenta > 0 && r.mes === mes);
    const uv  = cierres.filter(r => !r.esExterno);
    const ext = cierres.filter(r => r.esExterno);

    setText('v-resumen-meta', metaC || '—');
    const notaMeta = document.getElementById('v-resumen-meta-sub');
    if (notaMeta) {
      notaMeta.innerHTML = metaC
        ? ''
        : `<a href="#" onclick="switchAdminTab('panelcontrol');return false;" style="color:var(--info);font-weight:600;">Sin cargar — cargarla acá →</a>`;
    }
    setText('v-resumen-globales', cierres.length);
    setText('v-resumen-uv', uv.length);
    setText('v-resumen-externo', ext.length);

    const avgPct = (arr) => {
      const vals = arr.filter(r=>r.descuentoPct).map(r=>r.descuentoPct);
      return vals.length ? (vals.reduce((s,v)=>s+v,0)/vals.length) : null;
    };
    const pctUv = avgPct(uv), pctExt = avgPct(ext);
    setText('v-resumen-desc-uv', pctUv!==null ? pctUv.toFixed(1)+'%' : '—');
    setText('v-resumen-desc-ext', pctExt!==null ? pctExt.toFixed(1)+'%' : '—');
  } catch(e) {
    console.error('renderResumenCierres error:', e);
  }
}

function _fmtK(v) {
  if (!v) return '—';
  const n = Math.round(v);
  return n >= 1000 ? '$'+(n/1000).toLocaleString('es-BO',{maximumFractionDigits:1})+'K' : '$'+n;
}
const _MODALIDAD_CORTA = { 'Contado':'Contado', 'Contado Diferido':'Cont.Dif.', 'Crédito Directo':'Créd.Dir.', 'Crédito Bancario':'Créd.Banc.' };

function renderDetalleCierres() {
  const tbody = document.getElementById('v-cierres-tbody');
  const tfoot = document.getElementById('v-cierres-tfoot');
  if (!tbody) return;
  const cierres = todosRegs.filter(r => r.conclusion === 'Reserva' && r.precioVenta > 0)
    .sort((a,b)=>(b.ts||0)-(a.ts||0));

  if (!cierres.length) {
    tbody.innerHTML = '<tr><td colspan="13"><div class="empty-state">Sin cierres todavía.</div></td></tr>';
    if (tfoot) tfoot.innerHTML = '';
    return;
  }

  const filasCalc = cierres.map(r => {
    // Si el registro viejo no tiene metraje guardado, lo buscamos en el Inventario actual
    // por el código de terreno — así con solo completar el metraje del lote en Inventario,
    // esta tabla ya muestra el cálculo, sin tocar el registro histórico.
    let metraje = r.metraje;
    if (!metraje && r.terrenoInteres) {
      const buscado = String(r.terrenoInteres).trim().toLowerCase();
      const loteActual = todosLotes.find(l => String(_terrenoDeLote(l)).trim().toLowerCase() === buscado);
      if (loteActual?.metraje) metraje = loteActual.metraje;
    }
    const m2Lista = (metraje && r.precioLista) ? Math.round((r.precioLista/metraje)*100)/100 : null;
    const m2Cierre = (metraje && r.precioVenta) ? Math.round((r.precioVenta/metraje)*100)/100 : (r.precioM2Final || null);
    return { r, metraje, m2Lista, m2Cierre };
  });

  tbody.innerHTML = filasCalc.map(({r, metraje, m2Lista, m2Cierre}) => {
    const vc = ventasConcretadasData.find(v => v.registroKey === r._key);
    let colContrato = '<span style="color:var(--gris);font-size:var(--fs-xs);">—</span>';
    if (vc) {
      colContrato = vc.estadoAutorizacion === 'aprobado'
        ? '<span class="badge" style="background:var(--ok-bg);color:var(--ok-ink);">✓ Concretada</span>'
        : vc.estadoAutorizacion === 'pendiente'
          ? '<span class="badge" style="background:#fef3c7;color:#92400e;">⏳ Pendiente</span>'
          : '<span class="badge" style="background:var(--danger-bg);color:var(--danger-ink);">✗ Rechazada</span>';
    } else if (r.esExterno) {
      colContrato = `<button onclick="abrirModalContratoFirmado('${r._key}')" style="padding:4px 10px;background:var(--cartera);color:#fff;border:none;border-radius:var(--r-sm);font-size:var(--fs-xs);font-weight:700;cursor:pointer;">📝 Marcar contrato</button>`;
    }
    return `<tr${r.esExterno?' style="background:#fdf6e8;"':''}>
      <td class="wrap-ok" style="font-weight:600;max-width:110px;overflow:hidden;text-overflow:ellipsis;" title="${esc(r.nombre||'')}">${esc(r.nombre||'—')}${r.esExterno?' <span class="badge" style="color:#92400e;">🤝</span>':''}</td>
      <td style="font-family:monospace;font-weight:600;">${esc(r.terrenoInteres||'—')}</td>
      <td>${_fmtK(r.precioLista)}</td>
      <td>${metraje ? Math.round(metraje)+'m²' : '<span style="color:var(--gris);">falta</span>'}</td>
      <td>${m2Lista ? '$'+Math.round(m2Lista) : '—'}</td>
      <td style="color:${r.descuentoUsd>0?'var(--danger)':'var(--ok)'};font-weight:600;">
        ${r.descuentoUsd ? _fmtK(r.descuentoUsd)+' ('+r.descuentoPct+'%)' : '—'}
      </td>
      <td style="font-weight:700;color:var(--cartera);">${_fmtK(r.precioVenta)}</td>
      <td>${m2Cierre ? '$'+Math.round(m2Cierre) : '—'}</td>
      <td><span class="badge">${esc(_MODALIDAD_CORTA[r.formaPago]||r.formaPago||'—')}</span></td>
      <td><span class="badge">${esc(r.origen||'—')}</span></td>
      <td style="text-align:center;font-weight:700;">${esc(r.calificacion||'—')}</td>
      <td style="font-size:var(--fs-sm);">${esc(r.asesorNombre||'—')}</td>
      <td>${colContrato}</td>
    </tr>`;
  }).join('');

  // Fila de Total y Promedio
  if (tfoot) {
    const n = cierres.length;
    const sumLista    = cierres.reduce((s,r)=>s+(r.precioLista||0),0);
    const sumDesc     = cierres.reduce((s,r)=>s+(r.descuentoUsd||0),0);
    const sumVenta    = cierres.reduce((s,r)=>s+(r.precioVenta||0),0);
    const descPcts    = cierres.filter(r=>r.descuentoPct).map(r=>r.descuentoPct);
    const promPct     = descPcts.length ? (descPcts.reduce((s,v)=>s+v,0)/descPcts.length) : 0;

    const metrajes    = filasCalc.filter(f=>f.metraje).map(f=>f.metraje);
    const sumMetraje  = metrajes.reduce((s,v)=>s+v,0);
    const promMetraje = metrajes.length ? sumMetraje/metrajes.length : 0;

    const m2ListaVals  = filasCalc.filter(f=>f.m2Lista).map(f=>f.m2Lista);
    const promM2Lista  = m2ListaVals.length ? m2ListaVals.reduce((s,v)=>s+v,0)/m2ListaVals.length : 0;

    const m2CierreVals = filasCalc.filter(f=>f.m2Cierre).map(f=>f.m2Cierre);
    const promM2Cierre = m2CierreVals.length ? m2CierreVals.reduce((s,v)=>s+v,0)/m2CierreVals.length : 0;

    tfoot.innerHTML = `
      <tr style="background:var(--bg-soft);font-weight:700;">
        <td colspan="2">TOTAL (${n})</td>
        <td>${_fmtK(sumLista)}</td>
        <td>${metrajes.length ? Math.round(sumMetraje)+'m²' : '—'}</td>
        <td>—</td>
        <td style="color:var(--danger);">${_fmtK(sumDesc)} (${promPct.toFixed(1)}%)</td>
        <td style="color:var(--cartera);">${_fmtK(sumVenta)}</td>
        <td colspan="5"></td>
      </tr>
      <tr style="background:var(--bg-soft);font-weight:600;color:var(--ink-700);">
        <td colspan="2">PROMEDIO</td>
        <td>${_fmtK(sumLista/n)}</td>
        <td>${metrajes.length ? Math.round(promMetraje)+'m²' : '—'}</td>
        <td>${m2ListaVals.length ? '$'+Math.round(promM2Lista) : '—'}</td>
        <td style="color:var(--danger);">${_fmtK(sumDesc/n)}</td>
        <td style="color:var(--cartera);">${_fmtK(sumVenta/n)}</td>
        <td>${m2CierreVals.length ? '$'+Math.round(promM2Cierre) : '—'}</td>
        <td colspan="4"></td>
      </tr>`;
  }
}

function renderAvancePorAsesor() {
  const tbody = document.getElementById('v-avance-asesor-tbody');
  if (!tbody) return;
  const porAsesor = {};
  soloInternos(todosRegs).forEach(r => {
    const k = r.asesorNombre || 'Sin asignar';
    (porAsesor[k] ||= { visitas:0, interesados:0, cierres:0, vendido:0 });
    porAsesor[k].visitas++;
    if (r.interes === 'SI') porAsesor[k].interesados++;
    if (r.conclusion === 'Reserva' || r.huboCierre === 'SI') { porAsesor[k].cierres++; porAsesor[k].vendido += (r.precio||0); }
  });
  const filas = Object.entries(porAsesor).sort((a,b)=>b[1].visitas-a[1].visitas);
  tbody.innerHTML = filas.length ? filas.map(([nombre,d]) => {
    const pct = d.visitas ? Math.round(d.cierres/d.visitas*100) : 0;
    return `<tr style="cursor:pointer;" onclick="abrirDetalleAsesor('${escJs(nombre)}')" title="Ver detalle">
      <td style="font-weight:600;color:var(--info);text-decoration:underline;">${esc(nombre)} 🔍</td>
      <td>${d.visitas}</td>
      <td>${d.interesados}</td>
      <td style="font-weight:600;color:var(--cartera);">${d.cierres}</td>
      <td><span style="font-weight:700;color:${pct>=20?'var(--ok)':pct>=8?'var(--warn)':'var(--danger)'};">${pct}%</span></td>
      <td>${d.vendido ? '$'+Math.round(d.vendido).toLocaleString('es-BO',{maximumFractionDigits:0}) : '—'}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="6"><div class="empty-state">Sin datos.</div></td></tr>';
}

let _chartHistPrecioDesc = null;
let _chartHistM2Cant = null;

function renderHistoricoMensualVentas() {
  const c1 = document.getElementById('v-chart-hist-precio-desc');
  const c2 = document.getElementById('v-chart-hist-m2-cant');
  if (!c1 || !c2) return;

  const cierres = soloInternos(todosRegs).filter(r => r.conclusion === 'Reserva' && r.precioVenta > 0 && r.ts);
  if (!cierres.length) {
    if (_chartHistPrecioDesc) { _chartHistPrecioDesc.destroy(); _chartHistPrecioDesc = null; }
    if (_chartHistM2Cant)     { _chartHistM2Cant.destroy();     _chartHistM2Cant = null; }
    return;
  }

  const nombresMes = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const buckets = {};
  cierres.forEach(r => {
    const d = new Date(r.ts);
    const clave = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    (buckets[clave] ||= { label: nombresMes[d.getMonth()]+' '+d.getFullYear(), orden: d.getFullYear()*12+d.getMonth(), descPcts:[], precios:[], m2s:[], n:0 });
    const b = buckets[clave];
    b.n++;
    if (r.descuentoPct !== undefined && r.descuentoPct !== null) b.descPcts.push(r.descuentoPct);
    b.precios.push(r.precioVenta);
    let metraje = r.metraje;
    if (!metraje && r.terrenoInteres) {
      const buscado = String(r.terrenoInteres).trim().toLowerCase();
      const lote = todosLotes.find(l => String(_terrenoDeLote(l)).trim().toLowerCase() === buscado);
      if (lote?.metraje) metraje = lote.metraje;
    }
    if (metraje) b.m2s.push(r.precioVenta/metraje);
  });

  const ordenados = Object.values(buckets).sort((a,b)=>a.orden-b.orden);
  const avg = (arr) => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : null;

  const labels       = ordenados.map(b=>b.label);
  const descPromedios = ordenados.map(b=> avg(b.descPcts));
  const precioPromedios = ordenados.map(b=> avg(b.precios));
  const m2Promedios   = ordenados.map(b=> avg(b.m2s));
  const cantidades    = ordenados.map(b=> b.n);

  if (_chartHistPrecioDesc) _chartHistPrecioDesc.destroy();
  _chartHistPrecioDesc = new Chart(c1, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'% Descuento', data:descPromedios, borderColor:'#2451FF', backgroundColor:'transparent', yAxisID:'y', tension:.3, pointRadius:3 },
        { label:'Precio de Venta', data:precioPromedios, borderColor:'#1E8E3E', backgroundColor:'transparent', yAxisID:'y1', tension:.3, pointRadius:3 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ intersect:false, mode:'index' },
      plugins:{
        legend:{ position:'top', labels:{usePointStyle:true, color:'#0A0A0A'} },
        datalabels: {
          align:'top', anchor:'end', offset:4, font:{ size:9, weight:'700' },
          color:(ctx)=>ctx.dataset.borderColor,
          formatter:(v,ctx)=> v==null?'':(ctx.dataset.yAxisID==='y' ? v.toFixed(1)+'%' : '$'+Math.round(v).toLocaleString('es-BO'))
        }
      },
      scales:{
        y:  { position:'left', beginAtZero:true, grid:{color:'rgba(10,10,10,.10)'}, ticks:{ maxTicksLimit:6, color:'#0A0A0A', callback:v=>Math.round(v*10)/10+'%' }, title:{display:true,text:'% Descuento',color:'#0A0A0A'} },
        y1: { position:'right', beginAtZero:true, grid:{drawOnChartArea:false}, ticks:{ maxTicksLimit:6, color:'#0A0A0A', callback:v=>'$'+Math.round(v).toLocaleString('es-BO') }, title:{display:true,text:'Precio de Venta',color:'#0A0A0A'} },
        x:  { ticks:{color:'#0A0A0A'}, grid:{color:'rgba(10,10,10,.10)'} },
      }
    }
  });

  if (_chartHistM2Cant) _chartHistM2Cant.destroy();
  _chartHistM2Cant = new Chart(c2, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'$/m²', data:m2Promedios, borderColor:'#2451FF', backgroundColor:'transparent', yAxisID:'y', tension:.3, pointRadius:3 },
        { label:'Cantidad de ventas', data:cantidades, borderColor:'#1E8E3E', backgroundColor:'transparent', yAxisID:'y1', tension:.3, pointRadius:3 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ intersect:false, mode:'index' },
      plugins:{
        legend:{ position:'top', labels:{usePointStyle:true, color:'#0A0A0A'} },
        datalabels: {
          align:'top', anchor:'end', offset:4, font:{ size:9, weight:'700' },
          color:(ctx)=>ctx.dataset.borderColor,
          formatter:(v,ctx)=> v==null?'':(ctx.dataset.yAxisID==='y' ? '$'+Math.round(v) : v)
        }
      },
      scales:{
        y:  { position:'left', beginAtZero:true, grid:{color:'rgba(10,10,10,.10)'}, ticks:{ maxTicksLimit:6, color:'#0A0A0A', callback:v=>'$'+Math.round(v) }, title:{display:true,text:'$/m²',color:'#0A0A0A'} },
        y1: { position:'right', beginAtZero:true, grid:{drawOnChartArea:false}, ticks:{ maxTicksLimit:6, color:'#0A0A0A', precision:0, stepSize:1 }, title:{display:true,text:'Cantidad',color:'#0A0A0A'} },
        x:  { ticks:{color:'#0A0A0A'}, grid:{color:'rgba(10,10,10,.10)'} },
      }
    }
  });
}

function renderClientesEnNegociacion() {
  const tbody = document.getElementById('v-negociacion-tbody');
  if (!tbody) return;
  const pendientes = visitasProgramadasData.filter(v => v.estado === 'pendiente')
    .sort((a,b)=>(a.ts||0)-(b.ts||0)); // más viejos primero, son los más urgentes
  if (!pendientes.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Sin clientes pendientes.</div></td></tr>'; return; }
  const hoy = Date.now();
  tbody.innerHTML = pendientes.map(v => {
    const dias = v.ts ? Math.floor((hoy - v.ts)/86400000) : null;
    return `<tr>
      <td style="font-weight:600;">${esc(v.nombre)} ${v.esDevolucion?'<span class="badge" style="font-size:var(--fs-xs);background:#fef3c7;color:#92400e;">↩️ Devuelta</span>':''}</td>
      <td>${esc(v.asesorNombre||'—')}</td>
      <td><span class="badge badge-def" style="font-size:var(--fs-xs);">${esc(v.origen||'—')}</span></td>
      <td style="font-weight:700;color:${dias>=7?'var(--danger)':dias>=3?'var(--warn)':'var(--ok)'};">${dias!==null?dias+' día'+(dias!==1?'s':''):'—'}</td>
      <td><button onclick="abrirSeguimientoCliente('${escJs(v.nombre)}')" style="padding:4px 10px;background:var(--fill);border:1.5px solid var(--line);border-radius:var(--r-sm);font-size:var(--fs-xs);cursor:pointer;">💬</button></td>
    </tr>`;
  }).join('');
}

function renderSeguimientoActivo() {
  const tbody = document.getElementById('v-seguimiento-activo-tbody');
  if (!tbody) return;
  const activos = soloInternos(todosRegs).filter(r => r.conclusion==='Seguimiento' || r.conclusion==='Re-agendado')
    .sort((a,b)=>(a.ts||0)-(b.ts||0)); // los que más tiempo llevan primero
  if (!activos.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Sin datos.</div></td></tr>'; return; }
  const hoy = Date.now();
  tbody.innerHTML = activos.map(r => {
    const dias = r.ts ? Math.floor((hoy - r.ts)/86400000) : null;
    return `<tr>
      <td style="font-weight:600;">${esc(r.nombre||'—')}</td>
      <td>${esc(r.asesorNombre||'—')}</td>
      <td><span class="${estadoBadgeClass(r.conclusion)}" style="font-size:var(--fs-xs);">${esc(r.conclusion)}</span></td>
      <td style="font-weight:700;color:${dias>=21?'var(--danger)':dias>=7?'var(--warn)':'var(--ok)'};">${dias!==null?dias+' día'+(dias!==1?'s':''):'—'}</td>
      <td><button onclick="abrirSeguimientoCliente('${escJs(r.nombre)}')" style="padding:4px 10px;background:var(--fill);border:1.5px solid var(--line);border-radius:var(--r-sm);font-size:var(--fs-xs);cursor:pointer;">💬</button></td>
    </tr>`;
  }).join('');
}

function renderDescartados() {
  const tbody = document.getElementById('v-descartados-tbody');
  if (!tbody) return;
  const todos = soloInternos(todosRegs);
  const descartados = todos.filter(r => r.conclusion === 'Descartado');

  setText('v-desc-total', descartados.length);
  setText('v-desc-pct', todos.length ? Math.round(descartados.length/todos.length*100)+'%' : '—');

  const conDias = descartados.filter(r => r.conclusionTs && r.ts).map(r => (r.conclusionTs - r.ts)/86400000);
  const diasProm = conDias.length ? (conDias.reduce((s,v)=>s+v,0)/conDias.length) : null;
  setText('v-desc-dias-prom', diasProm!==null ? Math.round(diasProm)+' días' : '—');

  if (!descartados.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Sin descartados todavía.</div></td></tr>'; return; }

  tbody.innerHTML = [...descartados].sort((a,b)=>(b.ts||0)-(a.ts||0)).map(r => {
    const dias = (r.conclusionTs && r.ts) ? Math.round((r.conclusionTs - r.ts)/86400000) : null;
    return `<tr>
      <td style="font-weight:600;">${esc(r.nombre||'—')}</td>
      <td>${esc(r.asesorNombre||'—')}</td>
      <td><span class="badge badge-def" style="font-size:var(--fs-xs);">${esc(r.origen||'—')}</span></td>
      <td style="font-size:var(--fs-sm);color:var(--gris);">${esc(r.motivoNoCierre||'—')}</td>
      <td style="font-weight:600;">${dias!==null ? dias+' día'+(dias!==1?'s':'') : '<span style="color:var(--gris);">sin dato (registro anterior)</span>'}</td>
    </tr>`;
  }).join('');
}

function renderBusquedaClienteVentas() {
  const cont = document.getElementById('v-cliente-resultado');
  if (!cont) return;
  const term = (document.getElementById('v-buscar-cliente')?.value || '').trim().toLowerCase();

  if (!term) {
    cont.innerHTML = `<p style="font-size:var(--fs-sm);color:var(--gris);">Escribí un nombre arriba para ver el avance de un cliente puntual.</p>`;
    return;
  }
  const matches = todosRegs.filter(r => (r.nombre||'').toLowerCase().includes(term));
  if (!matches.length) {
    cont.innerHTML = `<div class="empty-state">No se encontró ningún cliente con "${esc(term)}".</div>`;
    return;
  }
  cont.innerHTML = matches.map(r => `
    <div class="admin-section" style="margin-bottom:10px;padding:16px 18px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-weight:600;font-size:var(--fs-lg);font-family:'Cormorant Garamond',serif;">${esc(r.nombre)}</div>
          <div style="font-size:var(--fs-sm);color:var(--gris);">Asesor: ${esc(r.asesorNombre||'—')} · ${esc(r.fechaCarga||'')}</div>
        </div>
        <span class="${estadoBadgeClass(r.conclusion||r.estado)}">${esc(r.conclusion||r.estado||'Sin estado')}</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        ${r.origen         ? `<span class="badge badge-def">📍 ${esc(r.origen)}</span>` : ''}
        ${r.calificacion   ? `<span class="badge badge-def">Calif. ${esc(r.calificacion)}</span>` : ''}
        ${r.terrenoInteres ? `<span class="badge badge-bbdd">🗺 ${esc(r.terrenoInteres)}</span>` : ''}
        ${r.formaPago      ? `<span class="badge badge-def">${esc(r.formaPago)}</span>` : ''}
        ${r.pctCierre      ? `<span class="badge badge-def">${r.pctCierre}% cierre est.</span>` : ''}
      </div>
      ${r.comentarios    ? `<div style="margin-top:10px;font-size:var(--fs-sm);color:var(--ink-700);font-style:italic;background:var(--bg-soft);border-radius:var(--r-sm);padding:8px 12px;">"${esc(r.comentarios)}"</div>` : ''}
      ${r.motivoNoCierre ? `<div style="margin-top:6px;font-size:var(--fs-sm);color:var(--gris);">Motivo de no cierre: ${esc(r.motivoNoCierre)}</div>` : ''}
      ${r.precioVenta    ? `<div style="margin-top:6px;font-size:var(--fs-sm);font-weight:600;color:var(--cartera);">Precio de venta: $${Number(r.precioVenta).toLocaleString('es-BO')}</div>` : ''}
      <div style="margin-top:10px;text-align:right;">
        <button onclick="abrirSeguimientoCliente('${escJs(r.nombre)}')" style="padding:6px 14px;background:var(--fill);border:1.5px solid var(--line);border-radius:var(--r-sm);font-size:var(--fs-sm);font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">💬 Ver seguimiento</button>
      </div>
    </div>`).join('');
}

let _chartsAuxiliares = {};
function _destroyAux(id) { if (_chartsAuxiliares[id]) { _chartsAuxiliares[id].destroy(); delete _chartsAuxiliares[id]; } }

// Barra horizontal moderna — reemplaza las listas de "bar-item" hechas con divs
function _barraHorizontal(canvasId, counts, colorMap, colorFallback, onClickLabel) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  _destroyAux(canvasId);
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  if (!entries.length) return;
  const labels = entries.map(([k])=>k);
  const data   = entries.map(([,n])=>n);
  const colores = labels.map((k,i) => (colorMap && colorMap[k]) || (colorFallback ? colorFallback[i%colorFallback.length] : '#6b7280'));

  _chartsAuxiliares[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets:[{ data, backgroundColor:colores, borderRadius:6, maxBarThickness:26 }] },
    options: {
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ right:12 } },
      plugins:{
        legend:{ display:false },
        datalabels:{ anchor:'center', align:'center', font:{weight:'700', size:11.5}, color:'#fff' }
      },
      scales:{
        x:{ display:false, beginAtZero:true, suggestedMax: Math.max(...data)*1.15 },
        y:{ grid:{display:false}, ticks:{ font:{ family:"'DM Sans',sans-serif", size:11.5, weight:'700' }, color:'#0A0A0A' } }
      },
      onClick: onClickLabel ? (evt, els) => { if (els.length) onClickLabel(labels[els[0].index]); } : undefined,
      onHover: onClickLabel ? (evt, els) => { evt.native.target.style.cursor = els.length ? 'pointer' : 'default'; } : undefined,
    }
  });
}

// Torta — para datos de composición (partes de un todo), como estados
function _tortaEstados(canvasId, counts, colorMap) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  _destroyAux(canvasId);
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  if (!entries.length) return;
  const labels = entries.map(([k])=>k);
  const data   = entries.map(([,n])=>n);
  const colores = labels.map(k => (colorMap && colorMap[k]) || '#6b7280');

  _chartsAuxiliares[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets:[{ data, backgroundColor:colores, borderWidth:2, borderColor:'#FFFDF7' }] },
    options: {
      cutout:'60%', responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ position:'right', labels:{ usePointStyle:true, boxWidth:8, font:{size:11}, color:'#0A0A0A' } },
        datalabels:{ color:'#fff', font:{weight:'700', size:11}, formatter:(v)=> v>0?v:'' }
      }
    }
  });
}

function renderDashboard() {
  const mes = new Date().toLocaleString('es-BO',{month:'long'}).charAt(0).toUpperCase()
    + new Date().toLocaleString('es-BO',{month:'long'}).slice(1);
  const vMes = soloInternos(todosRegs.filter(r => r.mes === mes));
  const todosRegsInternos = soloInternos(todosRegs);

  renderTendenciaVentasChart();

  // KPIs generales — solo equipo interno (los cierres de agentes externos no cuentan acá, se ven en Detalle de cierres)
  countUp(document.getElementById('v-kpi-total'), todosRegsInternos.length);
  const vendedoresCount = asesores.filter(a => (a.modulos || ROL_MODULOS[a.rol] || []).includes('ventas')).length;
  setText('v-kpi-total-sub', vendedoresCount + ' vendedor' + (vendedoresCount!==1?'es':''));
  countUp(document.getElementById('v-kpi-mes'), vMes.length);
  setText('v-kpi-mes-sub', 'registros en ' + mes);
  countUp(document.getElementById('v-kpi-visitas'), vMes.length);

  const contratosReservas = todosRegsInternos.filter(r =>
    ['Contrato','Reserva','Coordinación Firma','Entrega','En Tramitación Bancaria'].includes(r.estado));
  document.getElementById('kpi-contratos').textContent = contratosReservas.length;
  document.getElementById('kpi-contratos-sub').textContent =
    todosRegsInternos.length ? `${Math.round(contratosReservas.length/todosRegsInternos.length*100)}% del total` : '—';

  const conPrecio = todosRegsInternos.filter(r => r.precio > 0);
  const totalPrecio = conPrecio.reduce((s,r)=>s+(r.precio||0),0);
  document.getElementById('kpi-precio').textContent =
    totalPrecio ? '$' + Math.round(totalPrecio).toLocaleString('es-BO',{maximumFractionDigits:0}) : '—';
  document.getElementById('kpi-precio-sub').textContent = `${conPrecio.length} registros con precio`;

  // Meta del mes — MISMA fuente que Marketing (metas/{anio}/{mes}/mkt_visitas y mkt_cierres)
  const anioMeta = new Date().getFullYear();
  setText('v-meta-mes-label', mes + ' ' + anioMeta);
  window._fbListenMetas(anioMeta, mes, metas => {
    const metaV = metas?.mkt_visitas?.monto || 0;
    const metaC = metas?.mkt_cierres?.monto || 0;
    const cierresReales = vMes.filter(r => r.conclusion==='Reserva' || r.huboCierre==='SI').length;
    const pctV = metaV ? Math.round(vMes.length/metaV*100) : 0;
    const pctC = metaC ? Math.round(cierresReales/metaC*100) : 0;

    setText('v-meta-visitas-actual', vMes.length);
    setText('v-meta-visitas-txt', metaV ? 'meta: '+metaV : 'meta: sin definir');
    setText('v-meta-visitas-pct', pctV+'%');
    const bV = document.getElementById('v-meta-visitas-bar');
    if (bV) bV.style.width = Math.min(pctV,100)+'%';

    setText('v-meta-cierres-actual', cierresReales);
    setText('v-meta-cierres-txt', metaC ? 'meta: '+metaC : 'meta: sin definir');
    setText('v-meta-cierres-pct', pctC+'%');
    const bC = document.getElementById('v-meta-cierres-bar');
    if (bC) bC.style.width = Math.min(pctC,100)+'%';

    renderResumenCierres(mes, metaC);
  });

  renderAvancePorAsesor();
  renderDetalleCierres();
  renderAnalisisOrigenModalidad();
  renderBusquedaClienteVentas();
  renderClientesEnNegociacion();
  renderSeguimientoActivo();
  renderDescartados();
  renderHistoricoMensualVentas();
  renderResumenCierres(mes, 0); // pinta los conteos ya mismo; la meta se actualiza abajo cuando llegue de Firebase
  renderMetaVsEjecucion();

  // Funnel de conversión (mes actual) — 100% conectado en tiempo real:
  // Leads = lo que carga Marketing · Visitas agendadas = lo que agenda Call Center ·
  // Visitas concretadas y Cierres = lo que confirman/cierran los asesores.
  const anioC = new Date().getFullYear();
  const funnelData = calcularFunnelDatos(mes, anioC);
  pintarFunnelEnDiv('chart-funnel', funnelData);
  pintarFunnelEnDiv('mkt-kpi-embudo', funnelData);
  renderTendenciaMarketing();

  // Visitas por ORIGEN (canal) — para saber por dónde llegan los clientes
  const origenCounts = {};
  vMes.filter(r=>r.origen).forEach(r => origenCounts[r.origen]=(origenCounts[r.origen]||0)+1);
  const colV = {'Pauta Virtual':'#3b82c4','Referido Cliente':'#38a169','Referido Empresa':'#2d5a27','Redes Sociales':'#7b5ea7','Feria':'#c07a2a','Puerta Fría':'#c0392b','Agente Externo':'#c4622a'};
  _barraHorizontal('chart-visitas', origenCounts, colV);

  /* Chart asesores */
  const asesorCounts = {};
  vMes.forEach(r => asesorCounts[r.asesorNombre]=(asesorCounts[r.asesorNombre]||0)+1);
  const coloresBar = ['#2d5a27','#4a8c3f','#3b82c4','#c07a2a','#7b5ea7','#c0392b'];
  _barraHorizontal('chart-asesores', asesorCounts, null, coloresBar, (label)=>abrirDetalleAsesor(label));

  /* Chart estados — torta, es composición de un todo */
  const estadoCounts = {};
  todosRegs.forEach(r => estadoCounts[r.estado||'Sin estado']=(estadoCounts[r.estado||'Sin estado']||0)+1);
  const colEstado = {'Seguimiento':'#3b82c4','Reserva':'#2d5a27','Descartado':'#c0392b','Re-agendado':'#c07a2a','Sin estado':'#9ca3af'};
  _tortaEstados('chart-estados', estadoCounts, colEstado);

  /* Calificación de leads (A/B/C/D) */
  const perfilEl = document.getElementById('chart-perfil');
  if (perfilEl) {
    const calCounts = {A:0,B:0,C:0,D:0};
    vMes.filter(r=>r.calificacion).forEach(r => { if (calCounts[r.calificacion]!==undefined) calCounts[r.calificacion]++; });
    const totalCal = vMes.filter(r=>r.calificacion).length || 1;
    const colCal = {A:'var(--ok)',B:'var(--info)',C:'var(--warn)',D:'var(--danger)'};
    perfilEl.innerHTML = Object.entries(calCounts).map(([k,n]) => {
      const pct = Math.round(n/totalCal*100);
      return `<div style="text-align:center;">
        <div style="font-size:var(--fs-3xl);font-weight:700;color:${colCal[k]};font-family:'Cormorant Garamond',serif;">${pct}%</div>
        <div style="font-size:var(--fs-xs);color:var(--gris);margin-top:2px;">Calificación ${k}</div>
        <div style="font-size:var(--fs-sm);color:var(--ink-700);margin-top:2px;">${n}/${vMes.filter(r=>r.calificacion).length}</div>
      </div>`;
    }).join('');
  }

  /* Chart forma pago */
  const pagoCounts = {};
  todosRegs.filter(r=>r.formaPago).forEach(r => pagoCounts[r.formaPago]=(pagoCounts[r.formaPago]||0)+1);
  _barraHorizontal('chart-pago', pagoCounts, null, coloresBar);
}

/* ═══════════════════════════════════════════
   TABLA ADMIN
═══════════════════════════════════════════ */
function poblarFiltroAsesor() {
  const sel = document.getElementById('fil-asesor');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos</option>';
  const nombres = [...new Set(todosRegs.map(r=>r.asesorNombre))].sort();
  nombres.forEach(n => {
    const o = document.createElement('option');
    o.value = o.textContent = n;
    if (n===cur) o.selected=true;
    sel.appendChild(o);
  });
}

function filtradosAdmin() {
  const fa = document.getElementById('fil-asesor').value;
  const fe = document.getElementById('fil-estado').value;
  const fm = document.getElementById('fil-mes').value;
  const fc = document.getElementById('fil-conclusion').value;
  return todosRegs.filter(r => {
    if (fa && r.asesorNombre !== fa) return false;
    if (fe && r.estado !== fe) return false;
    if (fm && r.mes !== fm) return false;
    if (fc && r.conclusion !== fc) return false;
    return true;
  });
}

function puedeVerPrecios() {
  // Solo Gerencia (rol gerencia) y el Administrador/Controller (sesión admin) ven precios de venta.
  if (typeof modoAdmin !== 'undefined' && modoAdmin) return true;
  if (typeof asesorActual !== 'undefined' && asesorActual && asesorActual.rol === 'gerencia') return true;
  return false;
}

function renderTablaAdmin() {
  const datos = filtradosAdmin();
  const tb = document.getElementById('tabla-admin-body');
  if (!datos.length) {
    tb.innerHTML = '<tr><td colspan="21" class="empty-state">Sin registros con los filtros aplicados.</td></tr>';
    return;
  }
  const verPrecios = puedeVerPrecios();
  tb.innerHTML = datos.map(r => `
    <tr>
      <td style="font-size:var(--fs-sm);color:var(--ink-400);white-space:nowrap;">${r.fechaCarga||''}</td>
      <td><strong>${r.asesorNombre||'—'}</strong></td>
      <td>${r.nombre||'—'}</td>
      <td style="font-size:var(--fs-sm);">${r.genero||''}</td>
      <td style="font-size:var(--fs-sm);">${r.detalleVisita||''}</td>
      <td style="font-size:var(--fs-sm);">${r.fecha||''}</td>
      <td style="font-size:var(--fs-sm);">${r.horario||''}</td>
      <td style="font-size:var(--fs-sm);">${r.ciudadProcedencia||''}</td>
      <td style="font-size:var(--fs-sm);">${r.origen||''}</td>
      <td style="text-align:center;">${r.interes ? yesNo(r.interes) : ''}</td>
      <td style="font-size:var(--fs-sm);">${r.aspectoPreferente||''}</td>
      <td style="font-size:var(--fs-sm);">${r.presupuesto?'$'+Number(r.presupuesto).toLocaleString('es-BO'):''}</td>
      <td style="text-align:center;font-weight:600;">${r.calificacion||''}</td>
      <td style="font-size:var(--fs-sm);font-weight:600;font-family:monospace;">${r.terrenoInteres||''}</td>
      <td style="font-size:var(--fs-sm);">${r.pctCierre?r.pctCierre+'%':''}</td>
      <td style="font-size:var(--fs-sm);color:var(--ink-500);">${r.motivoNoCierre||''}</td>
      <td style="font-size:var(--fs-sm);">${r.formaPago||''}</td>
      <td style="font-size:var(--fs-sm);">${r.usoPropiedad||''}</td>
      <td><span class="${estadoBadgeClass(r.conclusion)}" style="font-size:var(--fs-xs);">${r.conclusion||'—'}</span></td>
      <td style="font-size:var(--fs-sm);font-weight:600;color:var(--cartera);">${
        !r.precioVenta ? '' : verPrecios ? '$'+Number(r.precioVenta).toLocaleString('es-BO') : '🔒 Oculto'
      }</td>
      <td style="font-size:var(--fs-sm);max-width:200px;color:var(--ink-500);">${r.comentarios||''}</td>
      <td><button class="btn-del" onclick="eliminarRegistro('${r._asesorId}','${r._key}')">🗑</button></td>
    </tr>`).join('');
}

function yesNo(v) {
  return v==='SI'
    ? '<span style="color:#16a34a;font-weight:600;">✓</span>'
    : '<span style="color:var(--danger);font-weight:600;">✗</span>';
}

function concretadaBadge(v) {
  if (v==='SI')       return '<span style="color:#16a34a;font-weight:600;font-size:var(--fs-sm);">✓ Sí</span>';
  if (v==='NO')       return '<span style="color:var(--danger);font-weight:600;font-size:var(--fs-sm);">✗ No</span>';
  if (v==='Pendiente')return '<span style="color:var(--warn);font-weight:600;font-size:var(--fs-sm);">⏳ Pend.</span>';
  return '';
}

function limpiarFiltros() {
  ['fil-asesor','fil-estado','fil-mes','fil-conclusion'].forEach(id => {
    document.getElementById(id).value = '';
  });
  renderTablaAdmin();
}

async function eliminarRegistro(asesorId, key) {
  const _ok1 = await confirmDialog('Esta accion no se puede deshacer.', { title:'Eliminar registro', okText:'Eliminar' });
  if (!_ok1) return;
  try { await window._fbRemoveRegistro(asesorId, key); toastOk('Registro eliminado.'); }
  catch(e) { toastErr('Error al eliminar: ' + e.message); }
}

async function vaciarTodosLosRegistrosVentas() {
  if (!todosRegs.length) { toastErr('No hay registros de ventas para borrar.'); return; }
  const ok1 = await confirmDialog(
    `Se eliminarán los ${todosRegs.length} registros de Ventas (visitas) de TODOS los asesores. El Inventario de lotes y Expensas NO se tocan. Esta acción no se puede deshacer.`,
    { title:'⚠️ Vaciar todos los registros de Ventas', okText:'Sí, vaciar' }
  );
  if (!ok1) return;
  const ok2 = await confirmDialog('Confirmá una vez más: se borrará TODO el historial de visitas/ventas cargado hasta ahora.', { title:'Última confirmación', okText:'Borrar definitivamente' });
  if (!ok2) return;

  let borrados = 0;
  for (const r of todosRegs) {
    try { await window._fbRemoveRegistro(r._asesorId, r._key); borrados++; } catch(e) {}
  }
  toastOk(borrados + ' registros de ventas eliminados.');
}

/* ═══════════════════════════════════════════
   EXPORTAR EXCEL
═══════════════════════════════════════════ */
function exportarExcel() {
  const datos = filtradosAdmin();
  if (!datos.length) { toastErr('Sin datos para exportar.'); return; }
  const rows = datos.map(r => ({
    'Fecha carga':          r.fechaCarga||'',
    'Asesor':               r.asesorNombre||'',
    'Prospecto':            r.nombre||'',
    'Género':               r.genero||'',
    'Detalle visita':       r.detalleVisita||'',
    'Fecha':                r.fecha||'',
    'Horario':              r.horario||'',
    'Ciudad procedencia':   r.ciudadProcedencia||'',
    'Origen':               r.origen||'',
    '¿Interesado?':         r.interes||'',
    'Aspecto preferente':   r.aspectoPreferente||'',
    'Presupuesto (US$)':    r.presupuesto||'',
    'Calificación':         r.calificacion||'',
    'Lote de interés':      r.terrenoInteres||'',
    '% de cierre':          r.pctCierre||'',
    'Motivo no cierre':     r.motivoNoCierre||'',
    'Forma de pago':        r.formaPago||'',
    'Uso propiedad':        r.usoPropiedad||'',
    'Conclusión':           r.conclusion||'',
    'Precio de venta (US$)': puedeVerPrecios() ? (r.precioVenta||'') : (r.precioVenta ? 'Oculto' : ''),
    'Comentarios':          r.comentarios||''
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Planilla UV');
  XLSX.writeFile(wb, `urubo_planilla_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/* ═══════════════════════════════════════════
   GESTIÓN ASESORES (ADMIN)
═══════════════════════════════════════════ */
function renderAsesoresAdmin() {
  const cont = document.getElementById('asesores-list');
  document.getElementById('asesores-count').textContent =
    `${asesores.length} asesor${asesores.length!==1?'es':''}`;
  if (!asesores.length) {
    cont.innerHTML = '<div class="empty-state">No hay asesores.</div>';
    return;
  }
  const mes = new Date().toLocaleString('es-BO',{month:'long'}).charAt(0).toUpperCase()
    + new Date().toLocaleString('es-BO',{month:'long'}).slice(1);
  const cuentas = {};
  todosRegs.filter(r=>r.mes===mes).forEach(r =>
    cuentas[r.asesorNombre]=(cuentas[r.asesorNombre]||0)+1);

  cont.innerHTML = asesores.map(a => {
    const rolInfo = ROL_LABELS[a.rol||'ventas'] || ROL_LABELS.ventas;
    const mods = a.modulos || ROL_MODULOS[a.rol||'ventas'] || ['ventas'];
    return `<div class="vendor-item" style="flex-wrap:wrap;gap:var(--sp-2);">
      <div style="flex:1;min-width:200px;">
        <span class="v-name">${esc(a.nombre)}</span>
        <span class="rol-badge" style="margin-left:8px;background:${rolInfo.bg};color:${rolInfo.color};">${rolInfo.icon} ${rolInfo.label}</span>
        <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">
          ${mods.map(m=>`<span style="font-size:var(--fs-2xs);padding:2px 7px;background:var(--fill);border-radius:999px;color:var(--ink-700);">${m}</span>`).join('')}
        </div>
      </div>
      <div class="vendor-actions">
        <span class="v-count">${cuentas[a.nombre]||0} reg. mes</span>
        <button class="btn-remove-vendor" style="background:none;color:var(--ink-700);font-size:var(--fs-base);" onclick="abrirEditarAsesor('${a._key}')" title="Editar">✏️</button>
        <button class="btn-remove-vendor" onclick="eliminarAsesor('${a._key}','${escJs(a.nombre)}')" title="Eliminar">×</button>
      </div>
    </div>`;
  }).join('');
}

async function agregarAsesor() {
  const nombre = document.getElementById('new-asesor-name').value.trim();
  const pin    = document.getElementById('new-asesor-pin').value.trim();
  if (!nombre) { toastErr('El nombre es obligatorio.'); return; }
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { toastErr('El PIN debe ser de 4 digitos numericos.'); return; }
  if (!modulosSeleccionados.length) { toastErr('Elegí al menos un módulo.'); return; }
  if (asesores.some(a=>a.nombre.toLowerCase()===nombre.toLowerCase())) {
    toastErr('Ya existe un usuario con ese nombre.'); return;
  }
  const mods = [...modulosSeleccionados];
  const rol  = inferRolFromModulos(mods);
  const btnA = document.querySelector('[onclick="agregarAsesor()"]');
  btnLoading(btnA, true);
  await window._fbAddAsesor(nombre, pin, rol, mods);
  btnSuccess(btnA);
  toastOk('Usuario ' + nombre + ' agregado.');
  document.getElementById('new-asesor-name').value = '';
  document.getElementById('new-asesor-pin').value  = '';
}

async function eliminarAsesor(key, nombre) {
    const _ok2 = await confirmDialog('Sus registros se conservaran en Firebase.', { title:'Eliminar usuario ' + nombre, okText:'Eliminar' }); if (!_ok2) return;
  await window._fbRemoveAsesor(key);
}

/* ═══════════════════════════════════════════
   EDITAR USUARIO (nombre / PIN / módulos)
═══════════════════════════════════════════ */
let modulosSeleccionadosEdit = [];

function inferRolFromModulos(mods) {
  const sorted = [...mods].sort().join(',');
  for (const r of Object.keys(ROL_MODULOS)) {
    if (r === 'mixto') continue;
    if ([...ROL_MODULOS[r]].sort().join(',') === sorted) return r;
  }
  return 'mixto';
}

function abrirEditarAsesor(key) {
  const a = asesores.find(x => x._key === key);
  if (!a) return;
  const mods = a.modulos || ROL_MODULOS[a.rol || 'ventas'] || ['ventas'];
  modulosSeleccionadosEdit = [...mods];

  document.getElementById('edit-asesor-key').value = key;
  document.getElementById('edit-asesor-name').value = a.nombre;
  document.getElementById('edit-asesor-pin').value  = '';

  document.querySelectorAll('#edit-modulos-checkboxes .modulo-check').forEach(label => {
    const inp = label.querySelector('input');
    const on  = mods.includes(inp.value);
    inp.checked = on;
    label.classList.toggle('sel', on);
  });

  document.getElementById('edit-user-overlay').classList.add('open');
}

function cerrarEditarAsesor() {
  document.getElementById('edit-user-overlay').classList.remove('open');
}

function toggleModuloEdit(el, mod) {
  el.classList.toggle('sel');
  const inp = el.querySelector('input');
  if (inp) inp.checked = el.classList.contains('sel');
  modulosSeleccionadosEdit = Array.from(document.querySelectorAll('#edit-modulos-checkboxes .modulo-check.sel'))
    .map(e => e.querySelector('input')?.value).filter(Boolean);
}

async function guardarEdicionAsesor() {
  const key    = document.getElementById('edit-asesor-key').value;
  const nombre = document.getElementById('edit-asesor-name').value.trim();
  const pin    = document.getElementById('edit-asesor-pin').value.trim();

  if (!nombre) { toastErr('El nombre es obligatorio.'); return; }
  if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
    toastErr('El PIN debe ser de 4 dígitos numéricos (o dejalo vacío para no cambiarlo).');
    return;
  }
  if (!modulosSeleccionadosEdit.length) { toastErr('Elegí al menos un módulo.'); return; }
  if (asesores.some(a => a._key !== key && a.nombre.toLowerCase() === nombre.toLowerCase())) {
    toastErr('Ya existe otro usuario con ese nombre.'); return;
  }

  const data = {
    nombre,
    modulos: modulosSeleccionadosEdit,
    rol: inferRolFromModulos(modulosSeleccionadosEdit)
  };
  if (pin) data.pin = pin;

  const btn = document.querySelector('#edit-user-overlay .confirm-btn-ok');
  btnLoading(btn, true);
  await window._fbUpdateAsesor(key, data);
  btnSuccess(btn);
  toastOk('Usuario ' + nombre + ' actualizado.');
  setTimeout(cerrarEditarAsesor, 500);
}

/* ═══════════════════════════════════════════
   PIN ADMIN
═══════════════════════════════════════════ */
function cambiarPinAdmin() {
  const np = document.getElementById('new-admin-pin').value.trim();
  const msg = document.getElementById('pin-change-msg');
  if (np.length !== 4 || !/^\d{4}$/.test(np)) {
    msg.style.display='block'; msg.style.color='var(--rojo)';
    msg.textContent='El PIN debe ser exactamente 4 dígitos.'; return;
  }
  pinAdminLocal = np;
  localStorage.setItem('uv_planilla_pin', np);
  document.getElementById('new-admin-pin').value='';
  toastOk('PIN de administrador actualizado correctamente.');
  if (msg) { msg.style.display='none'; }
}

/* ═══════════════════════════════════════════
   INVENTARIO DE LOTES
═══════════════════════════════════════════ */
let todosLotes = [];
let loteEditKey = null;

/* Escuchar lotes cuando entra admin */
function iniciarInventario() {
  window._fbListenLotes(arr => {
    todosLotes = arr;
    renderInventario();
    renderInvStats();
    renderLotesEnNegociacionResumen();
    renderDetalleCierres();
    renderAnalisisOrigenModalidad();
  });
}

function renderLotesEnNegociacionResumen() {
  const tbody = document.getElementById('inv-negociacion-tbody');
  const countEl = document.getElementById('inv-negociacion-count');
  const enNeg = todosLotes.filter(l => l.estadoNegociacion === 'negociacion');
  if (countEl) countEl.textContent = enNeg.length ? `(${enNeg.length})` : '';
  if (!tbody) return;
  if (!enNeg.length) { tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state">Sin lotes en negociación.</div></td></tr>'; return; }
  tbody.innerHTML = enNeg.sort((a,b)=>(b.negociadoTs||0)-(a.negociadoTs||0)).map(l => `<tr>
    <td style="font-weight:600;font-family:monospace;">${_terrenoDeLote(l)}</td>
    <td>${esc(l.negociadoPorNombre||'—')}</td>
    <td style="font-size:var(--fs-sm);color:var(--gris);">${l.negociadoTs ? new Date(l.negociadoTs).toLocaleString('es-BO') : '—'}</td>
    <td><button class="btn-clear" style="padding:4px 10px;font-size:var(--fs-sm);" onclick="window._fbUpdateLote('${l._key}',{estadoNegociacion:'',negociadoPorKey:null,negociadoPorNombre:null,negociadoTs:null})">Liberar</button></td>
  </tr>`).join('');
}

function renderInvStats() {
  document.getElementById('inv-total').textContent       = todosLotes.length;
  document.getElementById('inv-disponibles').textContent = todosLotes.filter(l=>l.estado==='Disponible').length;
  document.getElementById('inv-reservados').textContent  = todosLotes.filter(l=>l.estado==='Reservado').length;
  document.getElementById('inv-vendidos').textContent    = todosLotes.filter(l=>l.estado==='Vendido').length;
}

const PATRON_TERRENO = /^\d+-\d{1,2}-\d{1,3}$/;

function _terrenoDeLote(l) {
  return l.terreno || (l.uv && l.manzano && l.lote ? `${l.uv}-${l.manzano}-${l.lote}` : (l.codigo || '—'));
}

function renderInventario() {
  const filtroEst = document.getElementById('fil-inv-estado')?.value || '';
  const datos = filtroEst ? todosLotes.filter(l=>l.estado===filtroEst) : todosLotes;
  const tb = document.getElementById('inv-tabla-body');
  if (!tb) return;
  if (!datos.length) {
    tb.innerHTML = '<tr><td colspan="7" class="empty-state">Sin lotes registrados todavía.</td></tr>';
    return;
  }

  const estadoColor = {
    'Disponible':    'background:var(--ok-bg);color:var(--ok-ink);',
    'Reservado':     'background:var(--warn-bg);color:var(--warn-ink);',
    'Vendido':       'background:var(--danger-bg);color:var(--danger-ink);',
    'No disponible': 'background:var(--fill);color:var(--ink-500);'
  };

  tb.innerHTML = datos.map(l => {
    const terreno = _terrenoDeLote(l);
    const precioM2 = l.precioM2 || (l.metraje && l.precio ? (l.precio / l.metraje) : 0);
    const estStyle  = estadoColor[l.estado] || 'background:var(--fill);color:var(--ink-500);';
    return `<tr>
      <td style="font-weight:600;font-family:monospace;font-size:var(--fs-base);">${terreno}</td>
      <td style="text-align:center;">${l.metraje ? l.metraje.toLocaleString('es-BO') + ' m²' : '—'}</td>
      <td style="text-align:center;color:var(--ink-500);">${precioM2 ? '$'+precioM2.toLocaleString('es-BO',{maximumFractionDigits:2}) : '—'}</td>
      <td style="font-weight:600;color:var(--cartera);">${l.precio ? '$'+Number(l.precio).toLocaleString('es-BO') : '—'}</td>
      <td><span style="padding:3px 10px;border-radius:999px;font-size:var(--fs-xs);font-weight:600;${estStyle}">${l.estado||'—'}</span></td>
      <td style="font-size:var(--fs-sm);color:var(--ink-500);">${l.obs||''}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn-clear" style="padding:4px 10px;font-size:var(--fs-sm);" onclick="editarLote('${l._key}')">✏️</button>
          <button class="btn-del" onclick="eliminarLote('${l._key}','${escJs(terreno)}')">🗑</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function calcularPrecioLista() {
  const metraje  = parseFloat(document.getElementById('l-metraje')?.value) || 0;
  const precioM2 = parseFloat(document.getElementById('l-precio-m2')?.value) || 0;
  const elPrecio = document.getElementById('l-precio');
  if (metraje && precioM2 && elPrecio) {
    elPrecio.value = parseFloat((metraje * precioM2).toFixed(2));
  }
}

function mostrarFormLote() {
  loteEditKey = null;
  document.getElementById('form-lote-title').textContent = 'Agregar lote';
  document.getElementById('btn-guardar-lote').textContent = 'Guardar lote';
  ['l-terreno','l-metraje','l-precio-m2','l-precio','l-obs'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('l-estado').value = '';
  document.getElementById('form-lote').style.display = 'block';
  document.getElementById('form-lote').scrollIntoView({ behavior:'smooth' });
}

function cancelarFormLote() {
  loteEditKey = null;
  document.getElementById('form-lote').style.display = 'none';
}

function editarLote(key) {
  const lote = todosLotes.find(l => l._key === key);
  if (!lote) return;
  loteEditKey = key;
  document.getElementById('form-lote-title').textContent  = 'Editar lote';
  document.getElementById('btn-guardar-lote').textContent = 'Actualizar lote';
  const terrenoActual = _terrenoDeLote(lote);
  document.getElementById('l-terreno').value  = terrenoActual === '—' ? '' : terrenoActual;
  document.getElementById('l-metraje').value  = lote.metraje || '';
  document.getElementById('l-precio-m2').value = lote.precioM2 || (lote.metraje && lote.precio ? parseFloat((lote.precio/lote.metraje).toFixed(2)) : '');
  document.getElementById('l-precio').value   = lote.precio  || '';
  document.getElementById('l-estado').value   = lote.estado  || '';
  document.getElementById('l-obs').value      = lote.obs     || '';
  document.getElementById('form-lote').style.display = 'block';
  document.getElementById('form-lote').scrollIntoView({ behavior:'smooth' });
}

async function guardarLote() {
  const terreno = document.getElementById('l-terreno').value.trim();
  if (!terreno || !PATRON_TERRENO.test(terreno)) {
    toastErr('El terreno debe tener el formato número-número-número, ej: 1-11-123.'); return;
  }
  const metraje  = parseFloat(document.getElementById('l-metraje').value) || 0;
  const precioM2 = parseFloat(document.getElementById('l-precio-m2').value) || 0;
  const precio   = parseFloat(document.getElementById('l-precio').value) || 0;

  const data = {
    terreno,
    metraje,
    precioM2,
    precio,
    estado:       document.getElementById('l-estado').value || 'Disponible',
    obs:          document.getElementById('l-obs').value.trim(),
    updatedAt:    new Date().toLocaleString('es-BO'),
  };

  const btnL = document.getElementById('btn-guardar-lote');
  btnLoading(btnL, true);
  try {
    if (loteEditKey) {
      await window._fbUpdateLote(loteEditKey, data);
    } else {
      await window._fbAddLote(data);
    }
    btnSuccess(btnL);
    toastOk('Lote guardado correctamente.');
    cancelarFormLote();
  } catch(e) { btnLoading(btnL, false); toastErr('Error al guardar: ' + e.message); }
}

async function eliminarLote(key, terreno) {
  const _ok3 = await confirmDialog('Se eliminara el terreno ' + terreno + '.', { title:'Eliminar lote', okText:'Eliminar' }); if (!_ok3) return;
  try { await window._fbRemoveLote(key); }
  catch(e) { toastErr('Error: ' + e.message); }
}

function exportarInventario() {
  if (!todosLotes.length) { toastErr('Sin lotes en el inventario.'); return; }
  const rows = todosLotes.map(l => ({
    'Terreno':              _terrenoDeLote(l),
    'Metraje (m²)':         l.metraje||'',
    'Precio por m² ($)':    l.precioM2 || (l.metraje && l.precio ? parseFloat((l.precio/l.metraje).toFixed(2)) : ''),
    'Precio de lista ($)':  l.precio||'',
    'Estado':               l.estado||'',
    'Observaciones':        l.obs||'',
    'Última actualización': l.updatedAt||'',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario UV');
  XLSX.writeFile(wb, `inventario_urubo_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/* ═══════════════════════════════════════════
   IMPORTAR EXCEL — INVENTARIO DE TERRENOS
═══════════════════════════════════════════ */
let inventarioExcelPend = [];

function abrirExcelInventario() {
  const f = document.getElementById('form-excel-inventario');
  if (!f) return;
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function procesarExcelInventario(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, {type:'binary'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    inventarioExcelPend = rows.map(r => {
      const terreno  = String(r['Terreno']||r['Código']||r['Codigo']||'').trim();
      const metraje  = parseFloat(r['Metraje']||r['Metraje (m²)']||r['Metraje (m2)']||0) || 0;
      let   precioM2 = parseFloat(r['Precio por m2']||r['Precio por m²']||r['Precio por m² ($)']||0) || 0;
      let   precio   = parseFloat(r['Precio de lista']||r['Precio de lista ($)']||r['Precio']||r['Precio ($)']||0) || 0;
      if (!precio && metraje && precioM2)   precio   = parseFloat((metraje * precioM2).toFixed(2));
      if (!precioM2 && metraje && precio)   precioM2 = parseFloat((precio / metraje).toFixed(2));
      return {
        terreno, metraje, precioM2, precio,
        estado: String(r['Estado']||'').trim() || 'Disponible',
        obs:    String(r['Observaciones']||r['Obs']||'').trim(),
        valido: PATRON_TERRENO.test(terreno),
        updatedAt: new Date().toLocaleString('es-BO'),
      };
    }).filter(r => r.terreno);

    setText('inv-prev-count', inventarioExcelPend.filter(r=>r.valido).length);
    const tbody = document.getElementById('inv-prev-body');
    if (tbody) tbody.innerHTML = inventarioExcelPend.map(r => `<tr${r.valido?'':' style="background:var(--danger-bg);"'}>
      <td>${esc(r.terreno)}${r.valido?'':' <span style="font-size:var(--fs-xs);color:var(--danger);font-weight:600;">formato inválido</span>'}</td>
      <td>${r.metraje ? r.metraje+' m²' : '—'}</td>
      <td>${r.precioM2 ? '$'+r.precioM2.toLocaleString('es-BO',{maximumFractionDigits:2}) : '—'}</td>
      <td style="font-weight:600;color:var(--cartera);">${r.precio ? '$'+r.precio.toLocaleString('es-BO') : '—'}</td>
      <td>${esc(r.estado)}</td>
      <td>${esc(r.obs)}</td>
    </tr>`).join('');

    const nInvalidos = inventarioExcelPend.filter(r=>!r.valido).length;
    const errEl = document.getElementById('inv-prev-errores');
    if (errEl) errEl.textContent = nInvalidos ? `${nInvalidos} fila(s) con formato de terreno inválido no se van a importar (debe ser número-número-número, ej: 1-11-123).` : '';

    const prev = document.getElementById('inv-excel-preview');
    if (prev) prev.style.display = 'block';
  };
  reader.readAsBinaryString(file);
}

async function confirmarExcelInventario() {
  let ok = 0, saltados = 0;
  for (const r of inventarioExcelPend) {
    if (!r.valido) { saltados++; continue; }
    try {
      const { valido, ...data } = r;
      await window._fbAddLote(data);
      ok++;
    } catch(e) { saltados++; }
  }
  toastOk(ok + ' terrenos importados al inventario.' + (saltados ? ' ' + saltados + ' fila(s) omitida(s).' : ''));
  cancelarExcelInventario();
}

function cancelarExcelInventario() {
  inventarioExcelPend = [];
  const prev = document.getElementById('inv-excel-preview');
  if (prev) prev.style.display = 'none';
  const inp = document.getElementById('inv-excel-file');
  if (inp) inp.value = '';
}

/* ═══════════════════════════════════════════
   META HELPERS
═══════════════════════════════════════════ */
const MESES_NUM = { 'Enero':1,'Febrero':2,'Marzo':3,'Abril':4,'Mayo':5,'Junio':6,
  'Julio':7,'Agosto':8,'Septiembre':9,'Octubre':10,'Noviembre':11,'Diciembre':12 };

function mesActual() {
  return ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][new Date().getMonth()];
}
function anioActual() { return new Date().getFullYear(); }

/* ═══════════════════════════════════════════
   SWITCH TAB — helper sin evento
═══════════════════════════════════════════ */
function switchAdminTab_btn(id) {
  switchAdminTab(id);
}

/* ═══════════════════════════════════════════
   HOME — CENTRO DE COMANDO
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   GRÁFICOS PROFESIONALES — Panel de Inicio (vista ejecutiva)
═══════════════════════════════════════════ */
let _chartsHome = {};
function _destroyHomeChart(id) { if (_chartsHome[id]) { _chartsHome[id].destroy(); delete _chartsHome[id]; } }

function renderHomeChartVentasPie(vMes) {
  const canvas = document.getElementById('h-chart-ventas-pie');
  if (!canvas) return;
  const conteo = {};
  vMes.forEach(r => { const k = r.conclusion || 'Sin conclusión'; conteo[k] = (conteo[k]||0)+1; });
  const colMap = { 'Seguimiento':'#3b82c4', 'Reserva':'#2d5a27', 'Descartado':'#c0392b', 'Re-agendado':'#c07a2a', 'Sin conclusión':'#9ca3af' };
  const labels = Object.keys(conteo);
  _destroyHomeChart('h-chart-ventas-pie');
  if (!labels.length) return;
  _chartsHome['h-chart-ventas-pie'] = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets:[{ data:labels.map(l=>conteo[l]), backgroundColor:labels.map(l=>colMap[l]||'#6b7280'), borderWidth:0 }] },
    options: {
      cutout:'62%',
      plugins:{
        legend:{ position:'bottom', labels:{ usePointStyle:true, boxWidth:8, font:{size:11}, color:'#0A0A0A' } },
        datalabels: { font:{ family:"'DM Sans',sans-serif", weight:'700', size:12 }, color:'#fff', formatter:(v)=> v>0?v:'' }
      },
      maintainAspectRatio:false
    }
  });
}

function renderHomeChartVentasTendencia() {
  const canvas = document.getElementById('h-chart-ventas-linea');
  if (!canvas) return;
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const hoy = new Date();
  const buckets = [];
  for (let i=5; i>=0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth()-i, 1);
    buckets.push({ mes: meses[d.getMonth()], label: meses[d.getMonth()].slice(0,3) });
  }
  const datos = buckets.map(b => soloInternos(todosRegs).filter(r=>r.mes===b.mes).length);
  _destroyHomeChart('h-chart-ventas-linea');
  _chartsHome['h-chart-ventas-linea'] = new Chart(canvas, {
    type: 'line',
    data: { labels: buckets.map(b=>b.label), datasets:[{ data:datos, borderColor:'#1f6b3a', backgroundColor:'rgba(31,107,58,.1)', fill:true, tension:.35, pointRadius:3 }] },
    options: {
      plugins:{
        legend:{ display:false },
        datalabels: { align:'top', anchor:'end', offset:4, font:{ family:"'DM Sans',sans-serif", weight:'700', size:11 }, color:'#1f6b3a', formatter:(v)=> v>0?v:'' }
      },
      maintainAspectRatio:false, scales:{ x:{ ticks:{color:'#0A0A0A'}, grid:{color:'rgba(10,10,10,.10)'} }, y:{ beginAtZero:true, ticks:{precision:0, color:'#0A0A0A'}, grid:{color:'rgba(10,10,10,.10)'} } }
    }
  });
}

// Chart.js dibuja en <canvas>, no puede resolver var(--x) de CSS — necesita colores reales
const _ESTADOS_COLOR_HEX = {
  'Vigente':'#38a169', 'Al día':'#38a169', 'Pagado':'#38a169', 'Adelantado':'#3b82c4',
  'Mora':'#c0392b', 'Mora 1-30':'#c07a2a', 'Mora 31-60':'#b5651d',
  'Mora 61-90':'#c0392b', 'Mora 91-180':'#8b1a1a', 'Mora +180':'#5c0f0f', 'Mora +91':'#8b1a1a',
  'Parcial':'#c07a2a', 'Sin gestión':'#9ca3af',
};

function renderHomeChartCarteraMora(cartaAdmin) {
  const conteo = {};
  cartaAdmin.forEach(c => { const k = c.estado || 'Sin gestión'; conteo[k] = (conteo[k]||0)+1; });
  _barraHorizontal('h-chart-cartera-mora', conteo, _ESTADOS_COLOR_HEX, null);
}

function renderHomeChartExpensasEstado(expMes) {
  const conteo = {};
  expMes.forEach(e => { const k = e.estado || 'Sin gestión'; conteo[k] = (conteo[k]||0)+1; });
  _barraHorizontal('h-chart-exp-estado', conteo, _ESTADOS_COLOR_HEX, null);
}

function renderHomeChartInventarioPie(disp, vend, resv, total) {
  const canvas = document.getElementById('h-chart-inv-pie');
  if (!canvas) return;
  const noDisp = Math.max(total - disp - vend - resv, 0);
  _destroyHomeChart('h-chart-inv-pie');
  if (!total) return;
  _chartsHome['h-chart-inv-pie'] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Disponible','Reservado','Vendido','No disponible'],
      datasets: [{ data:[disp,resv,vend,noDisp], backgroundColor:['#16a34a','#c07a2a','#c0392b','#9ca3af'], borderWidth:0 }]
    },
    options: {
      cutout:'62%',
      plugins:{
        legend:{ position:'bottom', labels:{ usePointStyle:true, boxWidth:8, font:{size:11}, color:'#0A0A0A' } },
        datalabels: { font:{ family:"'DM Sans',sans-serif", weight:'700', size:12 }, color:'#fff', formatter:(v)=> v>0?v:'' }
      },
      maintainAspectRatio:false
    }
  });
}

function renderHome() {
  // Saludo dinámico
  const hora = new Date().getHours();
  const sal = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
  const hoy = new Date().toLocaleDateString('es-BO', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  const elSal = document.getElementById('home-saludo');
  const elFec = document.getElementById('home-fecha');
  if (elSal) elSal.textContent = sal + ', Jonathan';
  if (elFec) elFec.textContent = hoy.charAt(0).toUpperCase() + hoy.slice(1);

  const mesC  = mesActual();
  const anioC = anioActual();

  // ══ VENTAS ══
  const vMes       = soloInternos(todosRegs.filter(r => r.mes===mesC));
  const vVisitas   = vMes; // cada registro YA es una visita concretada en el nuevo modelo
  const vCierres   = vMes.filter(r => r.conclusion==='Reserva' || r.huboCierre==='SI');
  countUp(document.getElementById('kpi-total'), soloInternos(todosRegs).length);
  const vendedoresCountHome = asesores.filter(a => (a.modulos || ROL_MODULOS[a.rol] || []).includes('ventas')).length;
  setText('kpi-total-sub', vendedoresCountHome + ' vendedor' + (vendedoresCountHome!==1?'es':''));
  countUp(document.getElementById('kpi-mes'), vMes.length);
  setText('kpi-mes-sub', 'registros en ' + mesC);
  countUp(document.getElementById('h-visitas-mes'), vVisitas.length);
  countUp(document.getElementById('h-cierres-mes'), vCierres.length);

  // Gráfico de torta — pipeline de ventas por conclusión
  renderHomeChartVentasPie(vMes);
  renderHomeChartVentasTendencia();

  // ══ MARKETING ══
  const leadsM   = leadsData.filter(l => l.mes===mesC && l.anio===anioC);
  const fuentesL = ['Facebook Ads','Instagram','CRM','WhatsApp','Web','Facebook'];
  const visitasL = todosRegs.filter(r => r.mes===mesC && fuentesL.some(f=>((r.origen||r.procedencia)||'').toLowerCase().includes(f.toLowerCase())));
  const cierresL = vCierres;
  const conv     = leadsM.length ? Math.round(cierresL.length/leadsM.length*100) : 0;
  const leadNuevo= leadsM.filter(l=>l.estado==='Nuevo').length;
  countUp(document.getElementById('h-leads-mes'), leadsM.length);
  countUp(document.getElementById('h-visitas-leads'), visitasL.length);
  setText('h-conv-leads', conv+'%');
  countUp(document.getElementById('h-leads-nuevos'), leadNuevo);
  pintarFunnelEnDiv('h-chart-mkt-embudo', calcularFunnelDatos(mesC, anioC));

  // ══ CARTERA ══
  const carteraMes  = (cartaCobroData||[]).filter(c => c.mes===mesC && c.anio===anioC);
  const cartaMeta   = (cartaMetaData||[]).filter(c => c.mes===mesC && c.anio===anioC);
  const cartaSi     = carteraMes.filter(c => c.sumaMeta==='SI');
  const totalCobSi  = cartaSi.reduce((s,c)=>s+(c.monto||0),0);
  const totalMeta   = cartaMeta.reduce((s,c)=>s+(c.monto||0),0);
  const pctCarta    = totalMeta ? Math.round(totalCobSi/totalMeta*100) : 0;
  // For mora display use cartera_admin data (Excel-uploaded) as legacy
  const cartaAdmin  = (cartaAdminData||carteraMes).filter(c=>c.mes===mesC&&c.anio===anioC);
  const mora        = cartaAdmin.filter(c=>(c.estado||c.sumaMeta||'').toLowerCase().includes('mora'));
  const vigente     = cartaAdmin.filter(c=>!(c.estado||'').toLowerCase().includes('mora'));
  const totalMora   = mora.reduce((s,c)=>s+(c.monto||0),0);
  countUpMoney(document.getElementById('h-carta-cobrado'), totalCobSi);
  setText('h-carta-pct', pctCarta+'% de la meta');
  countUp(document.getElementById('h-mora'), mora.length);
  setText('h-mora-monto', '$'+totalMora.toLocaleString('es-BO',{maximumFractionDigits:0})+' pendiente');
  countUp(document.getElementById('h-vigente'), vigente.length);
  const hMetaPct = document.getElementById('h-meta-pct');
  const hMetaSub = document.getElementById('h-meta-sub');
  if (hMetaPct) { hMetaPct.textContent = pctCarta+'%'; hMetaPct.style.color = pctCarta>=100?'var(--ok)':pctCarta>=75?'var(--warn)':'var(--danger)'; }
  if (hMetaSub) hMetaSub.textContent = pctCarta+'% alcanzado este mes';
  renderHomeChartCarteraMora(cartaAdmin);

  // ══ EXPENSAS ══
  const expMes     = (expAdminData||[]).filter(e=>e.mes===mesC&&e.anio===anioC);
  const totalExp   = expMes.reduce((s,e)=>s+(e.monto||0),0);
  const histExp    = (expAdminData||[]).reduce((s,e)=>s+(e.monto||0),0);
  countUpMoney(document.getElementById('h-exp-total'), totalExp);
  setText('h-exp-n', expMes.length+' cobros');
  countUpMoney(document.getElementById('h-exp-historico'), histExp);
  setText('h-exp-props', expMes.length);
  renderHomeChartExpensasEstado(expMes);

  // ══ INVENTARIO ══
  const disp  = todosLotes.filter(l=>l.estado==='Disponible').length;
  const vend  = todosLotes.filter(l=>l.estado==='Vendido').length;
  const resv  = todosLotes.filter(l=>l.estado==='Reservado').length;
  const ocup  = todosLotes.length ? Math.round((vend+resv)/todosLotes.length*100) : 0;
  countUp(document.getElementById('h-disponibles'), disp);
  countUp(document.getElementById('h-inv-vendidos'), vend);
  countUp(document.getElementById('h-inv-reservados'), resv);
  setText('h-inv-ocupacion', ocup+'%');
  renderHomeChartInventarioPie(disp, vend, resv, todosLotes.length);

  // Badge mora en sidebar
  const badgeM = document.getElementById('badge-mora');
  if (badgeM) { badgeM.textContent = mora.length; badgeM.style.display = mora.length>0?'inline-flex':'none'; }

  // Acciones rápidas subtextos (legacy IDs kept)
  setText('ac-mora-n',  mora.length+' en mora');
  setText('ac-inv-n',   disp+' disponibles');
  setText('ac-reg-n',   vMes.length+' este mes');
  setText('ac-ventas-n',vMes.length+' registros');

  // Badge mora en tab (legacy - now handled above)

  // Acciones rápidas subtextos
  const acMora = document.getElementById('ac-mora-n');
  const acInv  = document.getElementById('ac-inv-n');
  const acReg  = document.getElementById('ac-reg-n');
  const acVen  = document.getElementById('ac-ventas-n');
  const mes    = mesActual();
  if (acMora) acMora.textContent = mora.length + ' en mora';
  if (acInv)  acInv.textContent  = todosLotes.filter(l=>l.estado==='Disponible').length + ' disponibles';
  if (acReg)  acReg.textContent  = todosRegs.filter(r=>r.mes===mes).length + ' este mes';
  if (acVen)  acVen.textContent  = todosRegs.filter(r=>r.mes===mes).length + ' registros';

  // Semáforo mora — por tramo de estado (Mora +60 / Mora 31-60 / Mora 1-30 / Mora genérico)
  const m60 = mora.filter(c=>(c.estado||'').includes('+60')).length;
  const m30 = mora.filter(c=>(c.estado||'').includes('31-60')).length;
  const m1  = mora.filter(c=>(c.estado||'').includes('1-30') || ((c.estado||'').toLowerCase()==='mora')).length;
  const sm60 = document.getElementById('h-mora-alta');
  const sm30 = document.getElementById('h-mora-media');
  const sm1  = document.getElementById('h-mora-baja');
  if (sm60) sm60.textContent = m60;
  if (sm30) sm30.textContent = m30;
  if (sm1)  sm1.textContent  = m1;

  // Top mora del mes (mayor monto primero)
  const sinGest = [...mora].sort((a,b)=>(b.monto||0)-(a.monto||0)).slice(0,8);

  const topMoraEl = document.getElementById('home-top-mora');
  if (topMoraEl) {
    topMoraEl.innerHTML = sinGest.length ? sinGest.map(c => `
      <div class="alerta-item alerta-mora" onclick="switchAdminTab_btn('cartera')">
        <div class="alerta-dot" style="background:var(--danger);"></div>
        <div>
          <div class="alerta-texto">${esc(c.cliente)}</div>
          <div class="alerta-meta">${c.concepto||''} · ${c.estado||'Mora'} · $${(c.monto||0).toLocaleString('es-BO',{maximumFractionDigits:0})}</div>
        </div>
      </div>`).join('')
    : '<div style="font-size:var(--fs-base);color:var(--ok);padding:8px;">✅ Sin clientes en mora este mes</div>';
  }

  // Alertas urgentes
  const alertasEl = document.getElementById('home-alertas');
  if (alertasEl) {
    const alertas = [];
    // Clientes en mora del mes
    if (mora.length > 0) {
      alertas.push({ tipo:'mora', texto:`${mora.length} clientes en mora este mes`, sub:`Mayor deuda: ${sinGest[0]?.cliente||'—'} — $${(sinGest[0]?.monto||0).toLocaleString('es-BO',{maximumFractionDigits:0})}`, tab:'cartera' });
    }
    // Lotes sin precio
    const sinPrecio = todosLotes.filter(l=>!l.precio && l.estado==='Disponible').length;
    if (sinPrecio > 0) {
      alertas.push({ tipo:'sin', texto:`${sinPrecio} lotes disponibles sin precio cargado`, sub:'Actualizar en el módulo Inventario', tab:'inventario' });
    }
    // Meta no cargada
    const metaEl = document.getElementById('h-cob-meta');
    if (metaEl && metaEl.textContent.includes('—')) {
      alertas.push({ tipo:'gestion', texto:'Meta de cartera del mes no configurada', sub:'Ir a Cartera → Editar meta', tab:'cartera' });
    }
    // Vendidos vs disponibles
    const vendidosPct = todosLotes.length ? Math.round(todosLotes.filter(l=>l.estado==='Vendido').length/todosLotes.length*100) : 0;
    if (vendidosPct >= 70) {
      alertas.push({ tipo:'meta-pct', texto:`${vendidosPct}% del inventario ya vendido`, sub:'Excelente ritmo de ventas 🎉', tab:'inventario' });
    }

    if (!alertas.length) {
      alertasEl.innerHTML = '<div style="font-size:var(--fs-base);color:var(--ok);padding:8px 0;">✅ Sin alertas pendientes. Todo en orden.</div>';
    } else {
      const iconos = { mora:'🔴', gestion:'🟡', 'meta-pct':'🟢', sin:'⚪' };
      alertasEl.innerHTML = alertas.map(a => `
        <div class="alerta-item alerta-${a.tipo}" onclick="switchAdminTab_btn('${a.tab}')" style="cursor:pointer;">
          <div class="alerta-dot" style="background:${a.tipo==='mora'?'var(--danger)':a.tipo==='gestion'?'var(--warn)':a.tipo==='meta-pct'?'var(--ok)':'#9ca3af'};"></div>
          <div>
            <div class="alerta-texto">${iconos[a.tipo]||''} ${a.texto}</div>
            <div class="alerta-meta">${a.sub}</div>
          </div>
        </div>`).join('');
    }
  }

  // Clientes en mora — tabla completa
  const sgEl = document.getElementById('home-sin-gestion');
  if (sgEl) {
    const sinG = [...mora].sort((a,b)=>(b.monto||0)-(a.monto||0));
    if (!sinG.length) {
      sgEl.innerHTML = '<div style="font-size:var(--fs-base);color:var(--ok);padding:8px 0;">✅ Sin clientes en mora este mes</div>';
    } else {
      sgEl.innerHTML = `<table class="mora-table-mini">
        <thead><tr><th>Cliente</th><th>Concepto</th><th>Estado</th><th>Monto ($)</th><th>Semana</th><th>Acción</th></tr></thead>
        <tbody>${sinG.slice(0,15).map(c=>`<tr onclick="switchAdminTab_btn('cartera')">
          <td><strong>${esc(c.cliente)}</strong></td>
          <td>${c.concepto||'—'}</td>
          <td style="color:var(--danger);font-weight:600;">${c.estado||'Mora'}</td>
          <td style="font-weight:600;">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          <td>${c.semana||'—'}</td>
          <td><span style="font-size:var(--fs-xs);color:var(--info);cursor:pointer;">Ver →</span></td>
        </tr>`).join('')}</tbody>
      </table>` + (sinG.length>15 ? `<div style="font-size:var(--fs-sm);color:var(--gris);padding:8px;">... y ${sinG.length-15} más</div>` : '');
    }
  }

  // Resumen ventas home
  const vRes = document.getElementById('h-ventas-resumen');
  if (vRes) {
    const vMes = todosRegs.filter(r=>r.mes===mesActual());
    const contratos = vMes.filter(r=>['Contrato','Reserva'].includes(r.estado)).length;
    vRes.innerHTML = `
      <div class="home-stat-row"><span class="home-stat-label">Registros este mes</span><span class="home-stat-val">${vMes.length}</span></div>
      <div class="home-stat-row"><span class="home-stat-label">Contratos / Reservas</span><span class="home-stat-val" style="color:var(--ok);">${contratos}</span></div>
      <div class="home-stat-row"><span class="home-stat-label">Interesados</span><span class="home-stat-val">${vMes.filter(r=>r.interes==='SI').length}</span></div>
      <div class="home-stat-row"><span class="home-stat-label">Con cierre (Reserva)</span><span class="home-stat-val" style="color:var(--cartera);">${vMes.filter(r=>r.conclusion==='Reserva'||r.huboCierre==='SI').length}</span></div>
    `;
  }

  // Metas en home — updated inline above
}

function updateHomeMetas(tipo, cobrado, meta, pct) {
  if (tipo === 'cartera') {
    const el  = document.getElementById('h-meta-pct');
    const sub = document.getElementById('h-meta-sub');
    const cob = document.getElementById('h-carta-cobrado');
    const pctSub = document.getElementById('h-carta-pct');
    if (el)  { el.textContent = pct+'%'; el.style.color = pct>=100?'var(--ok)':pct>=75?'var(--warn)':'var(--danger)'; }
    if (sub) sub.textContent = pct+'% alcanzado este mes';
    if (cob) countUpMoney(cob, cobrado);
    if (pctSub) pctSub.textContent = pct+'% de la meta';
  } else {
    const cobEl  = document.getElementById('h-exp-total');
    const pctEl  = document.getElementById('h-exp-meta-pct');
    const metaEl = document.getElementById('h-exp-meta-val');
    if (cobEl) countUpMoney(cobEl, cobrado);
    if (pctEl) pctEl.textContent = pct+'%';
    if (metaEl) metaEl.textContent = meta ? '$'+Number(meta).toLocaleString('es-BO') : 'sin meta';
    if (pctTxt) pctTxt.textContent = pct+'%';
  }
}



/* ═══════════════════════════════════════════
   INIT MÓDULOS — ya integrado en entrarAdmin()
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   SISTEMA DE ROLES Y PERMISOS
═══════════════════════════════════════════ */

// Definición de módulos por rol
const ROL_MODULOS = {
  ventas:     ['ventas'],
  marketing:  ['marketing'],
  callcenter: ['callcenter'],
  cobranza:   ['cobranza'],
  expensas:   ['expensas'],
  gerencia:   ['ventas','marketing','callcenter','cobranza','expensas','inventario','dashboard'],
  mixto:      []
};

const ROL_LABELS = {
  ventas:     { label:'Vendedor',    color:'#065f46', bg:'#d1fae5', icon:'🟢' },
  marketing:  { label:'Marketing',   color:'#1e40af', bg:'#dbeafe', icon:'🔵' },
  callcenter: { label:'Call Center', color:'#0e7490', bg:'#cffafe', icon:'📞' },
  cobranza:   { label:'Cartera',     color:'#5b21b6', bg:'#ede9fe', icon:'🟣' },
  expensas:   { label:'Expensas',    color:'#991b1b', bg:'#fee2e2', icon:'🔴' },
  gerencia:   { label:'Gerencia',    color:'#92400e', bg:'#fef3c7', icon:'🟡' },
  mixto:      { label:'Personalizado', color:'#374151', bg:'#f3f4f6', icon:'⚙️' }
};

// Módulos seleccionados en el form
let modulosSeleccionados = ['ventas'];

function actualizarModulosSegunRol() {
  const rol = document.getElementById('new-asesor-rol').value;
  if (rol === 'mixto') return; // no tocar la selección manual del usuario
  const preset = ROL_MODULOS[rol] || ['ventas'];
  document.querySelectorAll('#modulos-checkboxes .modulo-check').forEach(label => {
    const inp = label.querySelector('input');
    const on  = preset.includes(inp.value);
    inp.checked = on;
    label.classList.toggle('sel', on);
  });
  modulosSeleccionados = [...preset];
}

function toggleModulo(el, mod) {
  el.classList.toggle('sel');
  const inp = el.querySelector('input');
  if (inp) inp.checked = el.classList.contains('sel');
  modulosSeleccionados = Array.from(document.querySelectorAll('#modulos-checkboxes .modulo-check.sel'))
    .map(e => e.querySelector('input')?.value).filter(Boolean);
}

/* ══ ENTRAR COMO USUARIO LIMITADO ══ */
/* Cambia entre las pestañas del panel de usuario (Mi Fichero / Cargar / Marketing / Expensas) */
function switchUserTab(id, scroll = true) {
  ['ventas','callcenter','expensas','marketing','fichero'].forEach(t => {
    const el = document.getElementById('utab-' + t);
    if (el) el.style.display = (t === id) ? 'block' : 'none';
  });
  const wrap = document.getElementById('user-tabs-wrap');
  if (wrap) {
    wrap.querySelectorAll('.user-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('onclick') === `switchUserTab('${id}')`);
    });
  }
  if (scroll) {
    const panel = document.getElementById('utab-' + id);
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function entrarUsuario() {
  const a = asesorActual;
  if (!a) return;
  cerrarTodosLosModales();

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('user-panel').style.display   = 'block';
  // Also update asesor-panel info in case it's used
  const apAv  = document.getElementById('ap-av');
  const apNom = document.getElementById('ap-nombre');
  const apBdg = document.getElementById('ap-rol-badge');
  const rolI  = ROL_LABELS[a.rol||'ventas'] || ROL_LABELS.ventas;
  if (apAv)  apAv.textContent  = iniciales(a.nombre);
  if (apNom) apNom.textContent = a.nombre;
  if (apBdg) { apBdg.textContent = rolI.icon + ' ' + rolI.label; apBdg.style.color = rolI.color; apBdg.style.background = rolI.bg; }

  const rolInfo = ROL_LABELS[a.rol] || ROL_LABELS.ventas;
  document.getElementById('up-av').textContent     = iniciales(a.nombre);
  document.getElementById('up-nombre').textContent  = a.nombre;
  document.getElementById('up-rol').textContent    = 'Bienvenido/a';
  const upBadge = document.getElementById('up-rol-badge');
  if (upBadge) { upBadge.textContent = rolInfo.icon + ' ' + rolInfo.label; upBadge.style.color = rolInfo.color; upBadge.style.background = rolInfo.bg; }

  const modulos = a.modulos || ROL_MODULOS[a.rol] || ['ventas'];

  // Construir tabs dinámicos
  const tabsWrap = document.getElementById('user-tabs-wrap');
  const tabConfig = [
    { id:'fichero',    label:'🎯 Mi Fichero',   check:'ventas' },
    { id:'ventas',     label:'📋 Cargar',        check:'ventas' },
    { id:'callcenter', label:'📞 Agendar visita', check:'callcenter' },
    { id:'marketing',  label:'📊 Marketing',     check:'marketing' },
    { id:'expensas',   label:'🏘 Expensas',      check:'expensas' },
  ];
  // Cobranza → va al panel admin directamente (mismo panel-cartera)
  const tabConfigFinal = tabConfig.filter(t => {
    if (t.id==='fichero'    && !modulos.includes('ventas'))     return false;
    if (t.id==='ventas'     && !modulos.includes('ventas'))     return false;
    if (t.id==='callcenter' && !modulos.includes('callcenter')) return false;
    if (t.id==='marketing'  && !modulos.includes('marketing'))  return false;
    if (t.id==='expensas'   && !modulos.includes('expensas'))   return false;
    return true;
  });
  tabsWrap.innerHTML = tabConfigFinal.map((t,i) =>
    `<button class="user-tab ${i===0?'active':''}" onclick="switchUserTab('${t.id}')">${t.label}</button>`
  ).join('');

  // Mostrar primer tab disponible
  if (tabConfigFinal.length) switchUserTab(tabConfigFinal[0].id, false);

  // Notificaciones, campañas y visitas programadas: para CUALQUIER rol (ventas, marketing, callcenter, mixto)
  window._fbListenNotificaciones(a._key, arr => { misNotificaciones = arr; renderNotificaciones(); });
  window._fbListenCampanias(arr => { campaniasData = arr; renderCampanias(); });
  window._fbListenLeadsSemanales(arr => { leadsSemanalesData = arr; renderLeadsSemanales(); renderDashboard(); });
  window._fbListenOrigenes(arr => { origenesData = arr; renderOrigenes(); });
  window._fbListenVentasConcretadas(arr => { ventasConcretadasData = arr; renderMisRegistros(); });
  window._fbListenPoliticaDescuento(arr => { politicaDescuentoData = arr; });
  window._fbListenVisitasProgramadasTodas(arr => {
    visitasProgramadasData = arr;
    misVisitasProgramadas = arr.filter(v => v.asesorKey === a._key && v.estado === 'pendiente');
    renderVisitasProgramadasAsesor();
    renderVisitasProgramadasCallCenter();
    poblarSelectAsesorCallCenter();
  });

  // Escuchar registros de ventas propios
  if (modulos.includes('ventas')) {
    window._fbListenRegistros(a._key, arr => {
      misRegs = arr;
      renderMisRegistros();
      renderFicheroVendedor();
      poblarSugerenciasClientes();
    });
    window._fbListenLotes(arr => { todosLotes = arr; renderListaLotesPicker(); renderLotesEnNegociacionResumen(); });
    const fFechaEl = document.getElementById('f-fecha');
    if (fFechaEl) fFechaEl.value = new Date().toISOString().split('T')[0];

    // Mover (no clonar) las pestañas + formulario del asesor-panel hacia el panel de usuario.
    // Antes esto se clonaba (cloneNode) y quedaban IDs duplicados en el documento
    // (dos #f-nombre, dos #f-terreno-key, etc.) — el navegador mostraba una copia
    // pero el JS siempre leía/escribía la otra, por eso "ya puse el nombre pero
    // dice que falta" y "no deja buscar en el inventario". Moviendo el nodo real
    // en vez de clonarlo, queda un único formulario con IDs únicos.
    const ventasInner = document.getElementById('utab-ventas-inner');
    if (ventasInner && !ventasInner.dataset.moved) {
      const asesorPanel = document.getElementById('asesor-panel');
      const tabs   = asesorPanel?.querySelector('.asesor-tabs');
      const cargar = asesorPanel?.querySelector('#atab-cargar');
      const misReg = asesorPanel?.querySelector('#atab-mis-registros');
      if (tabs && cargar && misReg) {
        ventasInner.appendChild(tabs);
        ventasInner.appendChild(cargar);
        ventasInner.appendChild(misReg);
        ventasInner.dataset.moved = '1';
      }
    }
  }

  // Escuchar leads propios de Marketing (la lista y KPIs necesitan estos datos)
  if (modulos.includes('marketing')) {
    window._fbListenLeads(arr => {
      leadsData = arr;
      renderMarketing();
      renderLeads();
    });
    // Necesario para calcular "visitas desde leads" y "cierres" (conversión)
    window._fbListenTodos(arr => {
      todosRegs = arr;
      renderMarketing();
    });
    const mesEl = document.getElementById('mkt-lead-mes');
    if (mesEl) {
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      mesEl.value = meses[new Date().getMonth()];
    }
  }

  /* Categorías de Expensas — disponibles para el asesor en su formulario rápido */
  window._fbListenCatExpensas(arr => {
    catExpensasData = arr;
    renderCatExpensasConfig();
  });
}

async function guardarExpensaUsuario() {
  const a = asesorActual;
  const cliente = document.getElementById('uexp-cliente')?.value.trim();
  const monto   = parseFloat(document.getElementById('uexp-monto')?.value) || 0;
  if (!cliente || !monto) { toastErr('Cliente y monto son obligatorios.'); return; }

  const mes = new Date().toLocaleString('es-BO',{month:'long'});
  const mesCap = mes.charAt(0).toUpperCase() + mes.slice(1);

  const catEl = document.getElementById('uexp-categoria');
  const catNombre = catEl?.options[catEl.selectedIndex]?.text && catEl.value ? catEl.options[catEl.selectedIndex].text : 'Expensa común';
  const catKey    = catEl?.value || '';

  const btnUe = document.querySelector('[onclick="guardarExpensaUsuario()"]');
  btnLoading(btnUe, true);
  try {
    await window._fbPushCobro({
      cliente, monto,
      terreno:         document.getElementById('uexp-terreno')?.value.trim() || '',
      categoriaNombre: catNombre,
      categoriaKey:    catKey,
      mes:             mesCap,
      anio:            new Date().getFullYear(),
      fecha:           document.getElementById('uexp-fecha')?.value || '',
      obs:             document.getElementById('uexp-obs')?.value.trim() || '',
      asesor:          a.nombre,
      asesorKey:       a._key,
      sumaMeta:        'SI',
      tipoMeta:        'expensas',
      cargadoPor:      a.nombre,
      fechaCarga:      new Date().toLocaleString('es-BO'),
    });
    btnSuccess(btnUe);
    toastOk('Cobro de expensa registrado.');
    ['uexp-cliente','uexp-terreno','uexp-monto','uexp-obs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    if (catEl) catEl.selectedIndex = 0;
    document.getElementById('uexp-nuevo-form').style.display = 'none';
  } catch(e) {
    btnLoading(btnUe, false);
    toastErr('No se pudo guardar: ' + (e.message||'revisa tu conexion.'));
  }
}

/* ══ RENDER COBROS USUARIO ══ */
function renderCobranzaUsuario() {
  if (!asesorActual) return;
  const mes  = mesActual();
  const anio = anioActual();
  const misCobros = cobrosData.filter(c => c.asesorKey === asesorActual._key || c.asesor === asesorActual.nombre);
  const delMes    = misCobros.filter(c => c.mes === mes && c.anio === anio && c.tipoMeta !== 'expensas');
  const total     = delMes.reduce((s,c)=>s+(c.monto||0),0);
  const historico = misCobros.filter(c=>c.tipoMeta!=='expensas').reduce((s,c)=>s+(c.monto||0),0);

  setText('ucob-mes-total', '$' + total.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setText('ucob-mes-n', delMes.length + ' cobros este mes');
  setText('ucob-historico', '$' + historico.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setText('ucob-historico-n', misCobros.filter(c=>c.tipoMeta!=='expensas').length + ' cobros totales');

  // Meta del usuario
  window._fbListenMetas(anio, mes, metas => {
    const metaUser = metas?.['u_' + asesorActual._key + '_cartera']?.monto ||
                     metas?.cartera?.monto || 0;
    const pct = metaUser ? Math.round(total/metaUser*100) : 0;
    setText('ucob-meta-val', metaUser ? '$'+Number(metaUser).toLocaleString('es-BO') : '—');
    setText('ucob-meta-pct', metaUser ? pct+'% alcanzado' : 'sin meta asignada');
    setText('ucob-meta-pct-txt', pct+'%');
    const bar = document.getElementById('ucob-meta-bar');
    if (bar) { bar.style.width=Math.min(pct,100)+'%'; bar.style.background=pct>=100?'linear-gradient(90deg,var(--ok),var(--ok-light))':pct>=75?'linear-gradient(90deg,var(--warn),var(--warn-light))':'linear-gradient(90deg,var(--cartera),var(--cartera-light))'; }
  });

  // Lista cobros
  const lista = document.getElementById('ucob-lista');
  if (lista) {
    lista.innerHTML = delMes.length ? delMes.map(c=>`
      <div class="cobro-card">
        <div class="cobro-card-left">
          <div class="cobro-nombre">${esc(c.cliente)}</div>
          <div class="cobro-meta">${c.terreno||'—'} · ${c.categoriaNombre||'—'}</div>
          ${c.obs?`<div style="font-size:var(--fs-sm);color:var(--gris);font-style:italic;">${esc(c.obs)}</div>`:''}
        </div>
        <div class="cobro-monto">
          <div class="cobro-monto-val">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div class="cobro-monto-label">${c.fecha||c.fechaCarga||''}</div>
        </div>
      </div>`).join('')
    : '<div class="empty-state">Sin cobros registrados este mes.</div>';
  }
}

function renderExpensasUsuario() {
  if (!asesorActual) return;
  const mes  = mesActual();
  const anio = anioActual();
  const misExp = cobrosData.filter(c => (c.asesorKey===asesorActual._key||c.asesor===asesorActual.nombre) && c.tipoMeta==='expensas');
  const delMes = misExp.filter(c=>c.mes===mes&&c.anio===anio);
  const total  = delMes.reduce((s,c)=>s+(c.monto||0),0);
  const hist   = misExp.reduce((s,c)=>s+(c.monto||0),0);

  setText('uexp-mes-total', 'Bs '+total.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setText('uexp-mes-n', delMes.length+' cobros');
  setText('uexp-historico', 'Bs '+hist.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}));

  window._fbListenMetas(anio, mes, metas => {
    const metaUser = metas?.['u_'+asesorActual._key+'_expensas']?.monto || metas?.expensas?.monto || 0;
    const pct = metaUser ? Math.round(total/metaUser*100) : 0;
    setText('uexp-meta-val', metaUser ? 'Bs '+Number(metaUser).toLocaleString('es-BO') : '—');
    setText('uexp-meta-pct', metaUser ? pct+'% alcanzado' : 'sin meta');
    setText('uexp-meta-pct-txt', pct+'%');
    const bar = document.getElementById('uexp-meta-bar');
    if (bar) bar.style.width = Math.min(pct,100)+'%';
  });

  const lista = document.getElementById('uexp-lista');
  if (lista) {
    lista.innerHTML = delMes.length ? delMes.map(c=>`
      <div class="cobro-card">
        <div class="cobro-card-left">
          <div class="cobro-nombre">${esc(c.cliente)}</div>
          <div class="cobro-meta">${c.terreno||'—'} · ${c.fecha||''}</div>
        </div>
        <div class="cobro-monto">
          <div class="cobro-monto-val">Bs ${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
      </div>`).join('')
    : '<div class="empty-state">Sin expensas este mes.</div>';
  }
}

function setText(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }

/* ══ METAS POR USUARIO (vista admin) ══ */
function renderMetasPorUsuario() {
  const mes  = mesActual();
  const anio = anioActual();
  const cont = document.getElementById('metas-por-usuario');
  if (!cont) return;

  const lbl2 = document.getElementById('meta-mes-label-2');
  if (lbl2) lbl2.textContent = mes + ' ' + anio;

  const cobUsers = {};
  cobrosData.filter(c=>c.mes===mes&&c.anio===anio&&c.sumaMeta==='SI').forEach(c=>{
    const k = c.asesorKey || c.asesor || 'Sin asignar';
    if (!cobUsers[k]) cobUsers[k] = { nombre: c.asesor||k, cartera:0, expensas:0 };
    if (c.tipoMeta==='cartera')  cobUsers[k].cartera  += (c.monto||0);
    if (c.tipoMeta==='expensas') cobUsers[k].expensas += (c.monto||0);
  });

  const totalCob = Object.values(cobUsers).reduce((s,u)=>s+u.cartera+u.expensas,0);
  const usuariosConCobros = Object.keys(cobUsers).length;

  window._fbListenMetas(anio, mes, metas => {
    const metaGlobal = (metas?.cartera?.monto||0) + (metas?.expensas?.monto||0);
    const pctGlobal  = metaGlobal ? Math.round(totalCob/metaGlobal*100) : 0;

    setText('ger-total-cobrado', '$'+totalCob.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}));
    setText('ger-meta-global', metaGlobal ? '$'+metaGlobal.toLocaleString('es-BO') : '—');
    setText('ger-meta-pct-txt', pctGlobal+'% alcanzado');
    setText('ger-usuarios-activos', usuariosConCobros + '/' + asesores.length);
    setText('ger-barra-pct', pctGlobal+'%');
    const bar = document.getElementById('ger-barra');
    if (bar) { bar.style.width=Math.min(pctGlobal,100)+'%'; bar.style.background=pctGlobal>=100?'linear-gradient(90deg,var(--ok),var(--ok-light))':pctGlobal>=75?'linear-gradient(90deg,var(--warn),var(--warn-light))':'linear-gradient(90deg,var(--cartera),var(--cartera-light))'; }

    // Cards por asesor
    if (!asesores.length) { cont.innerHTML='<div class="empty-state">Sin usuarios registrados.</div>'; return; }
    cont.innerHTML = asesores.map(a => {
      const key = a._key;
      const u = cobUsers[key] || cobUsers[a.nombre] || { cartera:0, expensas:0 };
      const metaCob = metas?.['u_'+key+'_cartera']?.monto || metas?.cartera?.monto || 0;
      const metaExp = metas?.['u_'+key+'_expensas']?.monto || metas?.expensas?.monto || 0;
      const pctC = metaCob ? Math.round(u.cartera/metaCob*100) : 0;
      const pctE = metaExp ? Math.round(u.expensas/metaExp*100) : 0;
      const rolInfo = ROL_LABELS[a.rol] || ROL_LABELS.ventas;
      const hasActivity = u.cartera > 0 || u.expensas > 0;

      return `<div class="meta-asesor-card ${hasActivity?'meta-activa':''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--sp-2);">
          <div>
            <div class="meta-asesor-nombre">${esc(a.nombre)}</div>
            <div class="meta-asesor-rol">
              <span class="rol-badge" style="background:${rolInfo.bg};color:${rolInfo.color};">${rolInfo.icon} ${rolInfo.label}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:var(--fs-xl);font-weight:700;color:var(--cartera);font-family:'Cormorant Garamond',serif;">
              $${(u.cartera+u.expensas).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}
            </div>
            <div style="font-size:var(--fs-xs);color:var(--gris);">total cobrado ${mes}</div>
          </div>
        </div>
        ${metaCob>0 ? `<div class="meta-barra-wrap">
          <div class="meta-barra-row">
            <span>💰 Cartera: $${u.cartera.toLocaleString('es-BO',{maximumFractionDigits:0})}</span>
            <span style="color:${pctC>=100?'var(--ok)':pctC>=75?'var(--warn)':'var(--danger)'};font-weight:600;">${pctC}% de $${Number(metaCob).toLocaleString('es-BO',{maximumFractionDigits:0})}</span>
          </div>
          <div class="meta-barra-track">
            <div class="meta-barra-fill" style="width:${Math.min(pctC,100)}%;background:${pctC>=100?'var(--ok)':pctC>=75?'var(--warn)':'var(--danger)'};"></div>
          </div>
        </div>` : ''}
        ${metaExp>0 ? `<div class="meta-barra-wrap">
          <div class="meta-barra-row">
            <span>🏘 Expensas: $${u.expensas.toLocaleString('es-BO',{maximumFractionDigits:0})}</span>
            <span style="color:${pctE>=100?'var(--ok)':pctE>=75?'var(--warn)':'var(--danger)'};font-weight:600;">${pctE}% de $${Number(metaExp).toLocaleString('es-BO',{maximumFractionDigits:0})}</span>
          </div>
          <div class="meta-barra-track">
            <div class="meta-barra-fill" style="width:${Math.min(pctE,100)}%;background:${pctE>=100?'var(--ok)':pctE>=75?'var(--warn)':'var(--accent)'};"></div>
          </div>
        </div>` : ''}
        ${!metaCob&&!metaExp ? '<div style="font-size:var(--fs-sm);color:var(--gris);margin-top:4px;">Sin meta asignada este mes</div>' : ''}
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid #f3f4f6;display:flex;gap:var(--sp-2);flex-wrap:wrap;">
          <button onclick="asignarMetaUsuario('${key}','${escJs(a.nombre)}')" style="font-size:var(--fs-sm);padding:5px 12px;background:var(--verde-bg);color:var(--verde);border:1px solid #6ee7b7;border-radius:var(--r-sm);cursor:pointer;">🎯 Asignar meta</button>
        </div>
      </div>`;
    }).join('');
  });
}

function asignarMetaUsuario(key, nombre) {
  const a   = asesores.find(x=>x._key===key);
  const rol = a?.rol || 'ventas';
  const mes  = mesActual();
  const anio = anioActual();

  if (rol === 'ventas') {
    const metaV = prompt('Meta de VISITAS para ' + nombre + ' (numero de visitas):');
    const metaC = prompt('Meta de CIERRES para ' + nombre + ' (numero de cierres):');
    if (metaV !== null && metaV.trim()) window._fbSetMetaUsuario(key, anio, mes, 'visitas', parseFloat(metaV));
    if (metaC !== null && metaC.trim()) window._fbSetMetaUsuario(key, anio, mes, 'cierres', parseFloat(metaC));
  } else if (rol === 'marketing') {
    const metaL = prompt('Meta de LEADS para ' + nombre + ':');
    const metaV = prompt('Meta de VISITAS para ' + nombre + ':');
    const metaC = prompt('Meta de CIERRES para ' + nombre + ':');
    if (metaL !== null && metaL.trim()) window._fbSetMetaUsuario(key, anio, mes, 'leads',   parseFloat(metaL));
    if (metaV !== null && metaV.trim()) window._fbSetMetaUsuario(key, anio, mes, 'visitas', parseFloat(metaV));
    if (metaC !== null && metaC.trim()) window._fbSetMetaUsuario(key, anio, mes, 'cierres', parseFloat(metaC));
  } else if (rol === 'cobranza') {
    const metaM = prompt('Meta de CARTERA para ' + nombre + ' (en $):');
    if (metaM !== null && metaM.trim()) window._fbSetMetaUsuario(key, anio, mes, 'cartera', parseFloat(metaM));
  } else if (rol === 'expensas') {
    const metaE = prompt('Meta de EXPENSAS para ' + nombre + ' (en $):');
    if (metaE !== null && metaE.trim()) window._fbSetMetaUsuario(key, anio, mes, 'expensas', parseFloat(metaE));
  } else {
    const metaCob = prompt('Meta de CARTERA para ' + nombre + ' (en $):');
    const montoExp = prompt('Meta de EXPENSAS para ' + nombre + ' (en $):');
    if (metaCob !== null && metaCob.trim()) window._fbSetMetaUsuario(key, anio, mes, 'cartera', parseFloat(metaCob));
    if (montoExp !== null && montoExp.trim()) window._fbSetMetaUsuario(key, anio, mes, 'expensas', parseFloat(montoExp));
  }
  setTimeout(renderMetasPorUsuario, 500);
}

/* ═══════════════════════════════════════════
   COBRANZA MANUAL — VARIABLES
═══════════════════════════════════════════ */
let cobrosData        = [];
let expensasManualData= [];
let categoriasData    = [];
let excelPendiente    = [];
let leadsData         = [];   // leads marketing
let campaniasData          = [];   // códigos de campaña (marketing)
let visitasProgramadasData = [];   // visitas agendadas por call center (todas, vista admin/callcenter)
let misVisitasProgramadas  = [];   // las que le tocan al asesor logueado (pendientes de confirmar)
let asesoresVentaData      = [];   // asesores con módulo 'ventas', para el select del call center

/* ═══════════════════════════════════════════
   CÓDIGOS DE CAMPAÑA (Marketing)
═══════════════════════════════════════════ */
function renderCampanias() {
  const cont = document.getElementById('mkt-campanias-lista');
  if (cont) {
    cont.innerHTML = campaniasData.length ? campaniasData.map(c => `
      <div class="vendor-item">
        <span class="v-name">📣 ${esc(c.nombre)} <span style="color:var(--gris);font-weight:400;font-family:monospace;">[${esc(c.codigo)}]</span></span>
        <button class="btn-remove-vendor" onclick="solicitarEliminacion('campanias/${c._key}','Campaña ${escJs(c.nombre)} [${escJs(c.codigo)}]')">×</button>
      </div>`).join('') : '<div class="empty-state">Sin campañas creadas.</div>';
  }
  // Poblar selects que dependen de las campañas
  ['mkt-lead-campania','cc-campania','mkt-sem-campania'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const actual = sel.value;
    sel.innerHTML = '<option value="">'+(id==='mkt-sem-campania'?'Elegir...':'Sin campaña')+'</option>' +
      campaniasData.map(c => `<option value="${esc(c.codigo)}">${esc(c.nombre)} [${esc(c.codigo)}]</option>`).join('');
    sel.value = actual;
  });
}

async function agregarCampania() {
  const nombre = document.getElementById('mkt-campania-nombre').value.trim();
  const codigo = document.getElementById('mkt-campania-codigo').value.trim().toUpperCase();
  if (!nombre || !codigo) { toastErr('Completá nombre y código de la campaña.'); return; }
  if (campaniasData.some(c => c.codigo === codigo)) { toastErr('Ya existe una campaña con ese código.'); return; }
  await window._fbPushCampania({ nombre, codigo });
  document.getElementById('mkt-campania-nombre').value = '';
  document.getElementById('mkt-campania-codigo').value = '';
  toastOk('Campaña "'+nombre+'" creada.');
}

/* ═══════════════════════════════════════════
   LEADS SEMANALES POR CAMPAÑA (carga agregada)
═══════════════════════════════════════════ */
let leadsSemanalesData = [];

async function guardarLeadsSemanales() {
  const codigo = document.getElementById('mkt-sem-campania').value;
  const desde  = document.getElementById('mkt-sem-desde').value;
  const hasta  = document.getElementById('mkt-sem-hasta').value;
  const cantidad = parseInt(document.getElementById('mkt-sem-cantidad').value) || 0;
  if (!codigo)  { toastErr('Elegí el código de campaña.'); return; }
  if (!desde || !hasta) { toastErr('Completá el rango de fechas.'); return; }
  if (!cantidad) { toastErr('Poné cuántos leads llegaron.'); return; }

  const camp = campaniasData.find(c => c.codigo === codigo);
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const fDesde = new Date(desde+'T00:00:00');
  const mes = meses[fDesde.getMonth()];
  const anio = fDesde.getFullYear();

  const btn = document.querySelector('[onclick="guardarLeadsSemanales()"]');
  btnLoading(btn, true);
  await window._fbPushLeadsSemanal({
    campaniaCodigo: codigo, campaniaNombre: camp?.nombre||'',
    desde, hasta, cantidad, mes, anio,
    cargadoPor: asesorActual?.nombre || 'Marketing',
  });
  btnSuccess(btn);
  toastOk(cantidad + ' leads cargados para ' + codigo + '.');
  document.getElementById('mkt-sem-cantidad').value = '';
}

function renderLeadsSemanales() {
  const tbody = document.getElementById('mkt-sem-tbody');
  if (!tbody) return;
  if (!leadsSemanalesData.length) { tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state">Sin cargas semanales.</div></td></tr>'; return; }
  tbody.innerHTML = leadsSemanalesData.map(l => `<tr>
    <td style="font-weight:600;font-family:monospace;">${esc(l.campaniaCodigo)}</td>
    <td style="font-size:var(--fs-sm);">${esc(l.desde)} → ${esc(l.hasta)}</td>
    <td style="font-weight:600;color:var(--info);">${l.cantidad}</td>
    <td><button class="btn-del" onclick="solicitarEliminacion('leads_semanales/${l._key}','${l.cantidad} leads de ${escJs(l.campaniaCodigo)} (${escJs(l.desde)} a ${escJs(l.hasta)})')">🗑</button></td>
  </tr>`).join('');
}
let leadsExcelPend    = [];   // leads pendientes import
let cobranzaExcelData = [];   // cobranza subida por excel
let cobranzaExcelPend = [];   // cobranza pendiente import

/* ═══════════════════════════════════════════
   MARKETING — LEADS
═══════════════════════════════════════════ */
function switchMktTab(id) {
  document.getElementById('mkt-form-cargar').style.display = id==='cargar' ? 'block' : 'none';
  document.getElementById('mkt-form-excel').style.display  = id==='excel'  ? 'block' : 'none';
}

async function guardarLead() {
  const nombre = document.getElementById('mkt-lead-nombre')?.value.trim();
  if (!nombre) { toastErr('El nombre del lead es obligatorio.'); return; }
  const mes = document.getElementById('mkt-lead-mes')?.value ||
    new Date().toLocaleString('es-BO',{month:'long'}).charAt(0).toUpperCase() +
    new Date().toLocaleString('es-BO',{month:'long'}).slice(1);
  const btnLd = document.querySelector('[onclick="guardarLead()"]');
  btnLoading(btnLd, true);
  try {
    await window._fbPushLead({
      nombre,
      telefono:  document.getElementById('mkt-lead-tel')?.value.trim() || '',
      fuente:    document.getElementById('mkt-lead-fuente')?.value || '',
      campaniaCodigo: document.getElementById('mkt-lead-campania')?.value || '',
      semana:    document.getElementById('mkt-lead-semana')?.value || 'S1',
      mes,
      anio:      new Date().getFullYear(),
      estado:    document.getElementById('mkt-lead-estado')?.value || 'Nuevo',
      obs:       document.getElementById('mkt-lead-obs')?.value.trim() || '',
      cargadoPor: asesorActual?.nombre || 'Admin',
      fechaCarga: new Date().toLocaleString('es-BO'),
    });
    btnSuccess(btnLd);
    ['mkt-lead-nombre','mkt-lead-tel','mkt-lead-obs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const sb = document.getElementById('mkt-lead-success');
    if (sb) { sb.style.display='block'; setTimeout(()=>sb.style.display='none',2500); }
  } catch(e) {
    btnLoading(btnLd, false);
    toastErr('No se pudo guardar el lead: ' + (e.message||'revisa tu conexion.'));
  }
}

function renderMarketing() {
  const mes  = mesActual();
  const anio = anioActual();
  const filS  = document.getElementById('mkt-fil-semana')?.value || '';
  const filM  = document.getElementById('mkt-fil-mes')?.value || '';
  const filE  = document.getElementById('mkt-fil-estado')?.value || '';

  const delMes = leadsData.filter(l => l.mes===mes && l.anio===anio);
  // Visitas: registros de ventas del mes que vienen de leads (origen Facebook/CRM/Instagram)
  const fuentesLeads = ['Facebook Ads','Instagram','CRM','WhatsApp','Web','Facebook'];
  const visitasDeLeads = todosRegs.filter(r =>
    r.mes===mes && fuentesLeads.some(f => ((r.origen||r.procedencia)||'').toLowerCase().includes(f.toLowerCase()))
  );
  const cierres = todosRegs.filter(r => r.mes===mes && (r.conclusion==='Reserva' || r.huboCierre==='SI'));

  setText('mkt-leads-n',    delMes.length);
  setText('mkt-visitas-n',  visitasDeLeads.length);
  setText('mkt-cierres-n',  cierres.length);
  const convPct = delMes.length ? Math.round(cierres.length/delMes.length*100) : 0;
  setText('mkt-conv-pct', convPct+'%');

  // Metas marketing
  window._fbListenMetaUsuario(asesorActual?._key||'mkt', anio, mes, metas => {
    const metaLeads   = metas?.leads?.monto || 0;
    const metaVisitas = metas?.visitas?.monto || 0;
    const metaCierres = metas?.cierres?.monto || 0;
    updateMetaBarra('mkt-leads',   delMes.length,         metaLeads,   'var(--info)');
    updateMetaBarra('mkt-visitas', visitasDeLeads.length, metaVisitas, 'var(--warn)');
    updateMetaBarra('mkt-cierres', cierres.length,        metaCierres, 'var(--ok)');
  });

  // Embudo
  const emEl = document.getElementById('mkt-embudo');
  if (emEl) {
    const etapas = [
      { label:'Leads captados', n: delMes.length, color:'var(--info)' },
      { label:'Visitas realizadas', n: visitasDeLeads.length, color:'var(--warn)' },
      { label:'Cierres / Reservas', n: cierres.length, color:'var(--ok)' },
    ];
    const max = Math.max(...etapas.map(e=>e.n), 1);
    emEl.innerHTML = etapas.map((e,i) => `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:var(--fs-base);margin-bottom:4px;">
          <span style="font-weight:500;">${e.label}</span>
          <span style="font-weight:700;color:${e.color};">${e.n}${i>0&&etapas[i-1].n>0?' ('+Math.round(e.n/etapas[i-1].n*100)+'%)':''}</span>
        </div>
        <div style="height:28px;background:var(--fill);border-radius:var(--r-sm);overflow:hidden;">
          <div style="height:100%;width:${e.n/max*100}%;background:${e.color};border-radius:var(--r-sm);display:flex;align-items:center;padding-left:8px;transition:width .5s;">
            ${e.n>0?`<span style="color:#fff;font-size:var(--fs-xs);font-weight:600;">${e.n}</span>`:''}
          </div>
        </div>
      </div>`).join('');
  }

  // Filtros lista leads
  let datos = leadsData;
  if (filS) datos = datos.filter(l=>l.semana===filS);
  if (filM) datos = datos.filter(l=>l.mes===filM);
  if (filE) datos = datos.filter(l=>l.estado===filE);
  renderLeads(datos);
}

function renderLeads(datos) {
  if (!datos) {
    const filS = document.getElementById('mkt-fil-semana')?.value||'';
    const filM = document.getElementById('mkt-fil-mes')?.value||'';
    const filE = document.getElementById('mkt-fil-estado')?.value||'';
    datos = leadsData.filter(l=>{
      if(filS&&l.semana!==filS)return false;
      if(filM&&l.mes!==filM)return false;
      if(filE&&l.estado!==filE)return false;
      return true;
    });
  }
  const cont = document.getElementById('mkt-leads-lista');
  if (!cont) return;
  const estColor = { Nuevo:'var(--info)', Contactado:'var(--warn)', Agendado:'var(--ok)', Descartado:'var(--danger)' };
  cont.innerHTML = datos.length ? datos.map(l => `
    <div class="cobro-card">
      <div class="cobro-card-left">
        <div class="cobro-nombre">${esc(l.nombre)}</div>
        <div class="cobro-meta">${l.telefono||'—'} · ${l.fuente||'—'} · ${l.semana||''} ${l.mes||''}</div>
        ${l.obs?`<div style="font-size:var(--fs-sm);color:var(--gris);font-style:italic;">${esc(l.obs)}</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <select onchange="actualizarEstadoLead('${l._key}',this.value)" style="padding:4px 8px;border:1.5px solid ${estColor[l.estado]||'#e5e7eb'};border-radius:var(--r-sm);font-size:var(--fs-sm);color:${estColor[l.estado]||'#374151'};font-family:'DM Sans',sans-serif;background:#fff;">
          <option value="Nuevo"      ${l.estado==='Nuevo'?'selected':''}>Nuevo</option>
          <option value="Contactado" ${l.estado==='Contactado'?'selected':''}>Contactado</option>
          <option value="Agendado"   ${l.estado==='Agendado'?'selected':''}>Agendado</option>
          <option value="Descartado" ${l.estado==='Descartado'?'selected':''}>Descartado</option>
        </select>
        <button onclick="window._fbRemoveLead('${l._key}')" class="btn-del" style="font-size:var(--fs-xs);">🗑</button>
      </div>
    </div>`).join('')
  : '<div class="empty-state">Sin leads con los filtros aplicados.</div>';
}

async function actualizarEstadoLead(key, estado) {
  await window._fbUpdateLead(key, { estado });
}

function descargarPlantillaLeads() {
  const rows = [{ 'Nombre':'Ejemplo Cliente','Teléfono':'+591 70000000','Fuente':'Facebook Ads','Semana':'S1','Mes':'Mayo','Estado':'Nuevo','Observaciones':'Lead de campaña mayo' }];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, 'plantilla_leads.xlsx');
}

function procesarExcelLeads(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, {type:'binary'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    leadsExcelPend = rows.map(r=>({
      nombre:    String(r['Nombre']||'').trim(),
      telefono:  String(r['Teléfono']||r['Telefono']||'').trim(),
      fuente:    String(r['Fuente']||'').trim() || 'Facebook Ads',
      semana:    String(r['Semana']||'S1').trim(),
      mes:       String(r['Mes']||'').trim(),
      anio:      new Date().getFullYear(),
      estado:    String(r['Estado']||'Nuevo').trim(),
      obs:       String(r['Observaciones']||'').trim(),
      cargadoPor: asesorActual?.nombre || 'Admin',
      fechaCarga: new Date().toLocaleString('es-BO'),
    })).filter(r=>r.nombre);
    setText('mkt-preview-count', leadsExcelPend.length);
    const tbody = document.getElementById('mkt-preview-body');
    if (tbody) tbody.innerHTML = leadsExcelPend.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.nombre)}</td><td>${r.telefono}</td><td>${r.fuente}</td><td>${r.semana}</td><td>${r.mes}</td><td>${r.estado}</td></tr>`).join('');
    const prev = document.getElementById('mkt-excel-preview');
    if (prev) prev.style.display = 'block';
  };
  reader.readAsBinaryString(file);
}

async function confirmarImportLeads() {
  let ok=0;
  for (const r of leadsExcelPend) { try { await window._fbPushLead(r); ok++; } catch(e){} }
  toastOk(ok + ' leads importados.');
  cancelarImportLeads();
}

function cancelarImportLeads() {
  leadsExcelPend = [];
  const prev = document.getElementById('mkt-excel-preview');
  if (prev) prev.style.display = 'none';
  const inp = document.getElementById('mkt-excel-file');
  if (inp) inp.value = '';
}

/* ═══════════════════════════════════════════
   CARTERA — VARIABLES
═══════════════════════════════════════════ */
let cartaMetaData  = [];   // clientes en meta mensual
let cartaCobroData = [];   // cobros registrados
let catCarteraData = [];   // categorías libres — Cartera
let catExpensasData = [];  // categorías libres — Expensas (independientes de Cartera)
let cartaAdminData = [];   // legacy compat
let cartaAdminPend = [];   // pendientes importación Excel
let metaExcelPend  = [];   // pendientes Excel meta
let expAdminData   = [];   // cobros expensas admin

/* ═══════════════════════════════════════════
   HELPERS — Importador Excel "Arqueo de Caja" (Orange)
═══════════════════════════════════════════ */
const MESES_ES_NUM = {
  ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6,
  JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12
};
const MESES_ES_NOMBRE = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// "637,50" o "1.234,56" (formato boliviano: punto=miles, coma=decimal) → 637.5
function parseMontoBO(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).trim().replace(/[^\d,.\-]/g,'');
  if (!s) return 0;
  return parseFloat(s.replace(/\./g,'').replace(',', '.')) || 0;
}

// Extrae mes/año/tipo de pago del texto "Concepto" del Arqueo de Caja
// Ej: "Expensas (JULIO 2026)" | "Pago parcial de la Expensas (AGOSTO 2026)" | "Pago Final de la Expensas (JUNIO 2026)"
function parseConceptoExpensa(texto) {
  if (!texto) return null;
  const m = String(texto).match(/Expensas\s*\(\s*([A-ZÁÉÍÓÚÑ]+)\s+(\d{4})\s*\)/i);
  if (!m) return null;
  const mesNombre = m[1].toUpperCase().replace('Á','A').replace('É','E').replace('Í','I').replace('Ó','O').replace('Ú','U').replace('Ñ','N');
  const mesNum = MESES_ES_NUM[mesNombre];
  if (!mesNum) return null;
  const tipoPago = /pago\s*parcial/i.test(texto) ? 'parcial' : /pago\s*final/i.test(texto) ? 'final' : 'completo';
  return { mesNum, anio: parseInt(m[2],10), tipoPago };
}

// Número de semana ISO-8601 de una fecha
function semanaISO(fecha) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Convierte serial de Excel o Date a objeto Date de JS
function excelFechaToDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    return new Date(Math.round((v - 25569) * 86400 * 1000));
  }
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

// Estado real de mora: compara el ÚLTIMO período pagado por el lote contra el mes actual.
// Vigente = pagó dentro del mismo mes en que vence (0 meses de atraso).
// Mora 1-30 = se atrasó 1 mes completo. Mora 31-60 = 2 meses. Mora 61-90 = 3 meses. Mora +91 = 4 meses o más.
// periodos: array de {mesNum, anio}
// Estado de UN pago puntual: compara el mes en que se PAGÓ contra el mes de la CUOTA que salda.
// Esto es lo correcto para clasificar cada fila del historial (ej. la cuota de Febrero 2026
// pagada en Agosto 2026 quedó con 6 meses de atraso → Mora +91), a diferencia del estado
// "actual" del cliente (calcularEstadoExpensa), que compara contra HOY y sirve para el
// resumen del lote (¿está al día ahora?), no para clasificar pagos históricos individuales.
/* ═══════════════════════════════════════════
   ESTADO DE MORA EN VIVO — Orange (de acá en adelante, reemplaza el Excel semanal)
═══════════════════════════════════════════ */
const ORANGE_API_URL = 'http://urubovillage.sistemas.com.bo/api_dashboard.php?Token=48dfdd9b91be80ae8bea753cae3da126&Operation=GetExpensas&Ordenar=ascendente';
let orangeMoraData = [];

function estadoPorDiasMora(dias) {
  dias = dias || 0;
  if (dias <= 0)  return 'Vigente';
  if (dias <= 30) return 'Mora 1-30';
  if (dias <= 60) return 'Mora 31-60';
  if (dias <= 90) return 'Mora 61-90';
  if (dias <= 180) return 'Mora 91-180';
  return 'Mora +180';
}

async function sincronizarOrangeExpensas() {
  const btn = document.getElementById('btn-sync-orange');
  if (btn) { btn.disabled = true; btn.textContent = '🔄 Sincronizando...'; }
  try {
    const resp = await fetch(ORANGE_API_URL);
    if (!resp.ok) throw new Error('HTTP '+resp.status);
    const json = await resp.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error('Respuesta inesperada de Orange');

    // Por cada Terreno: nos quedamos con la cuota de MAYOR días de mora (la más vieja pendiente)
    // para definir el estado del lote, y sumamos TODAS sus cuotas pendientes como el monto adeudado total.
    const peorPorTerreno = {};
    const totalesPorTerreno = {};
    const cuotasPorTerreno = {};
    json.data.forEach(r => {
      const t = r.Terreno; if (!t) return;
      totalesPorTerreno[t] = (totalesPorTerreno[t]||0) + (r.Cobranza_BS||0);
      cuotasPorTerreno[t]  = (cuotasPorTerreno[t]||0) + 1;
      if (!peorPorTerreno[t] || (r.DiasMora||0) > (peorPorTerreno[t].DiasMora||0)) {
        peorPorTerreno[t] = r;
      }
    });

    let n = 0;
    for (const [terreno, r] of Object.entries(peorPorTerreno)) {
      const key = terreno.replace(/[^a-zA-Z0-9]/g,'-');
      await window._fbSetOrangeMora(key, {
        terreno,
        cliente: r.NombreCliente || '',
        asesor: r.Asesor || '',
        modalidad: r.Modalidad || '',
        modulo: r.Modulo || '',
        diasMora: r.DiasMora || 0,
        estado: estadoPorDiasMora(r.DiasMora),
        montoAdeudadoBS: Math.round((totalesPorTerreno[terreno]||0)*100)/100,
        cuotasPendientes: cuotasPorTerreno[terreno]||0,
      });
      n++;
    }
    await window._fbSetOrangeSyncInfo({ ts: Date.now(), cantidad: n });
    toastOk('Sincronizado: ' + n + ' lotes actualizados desde Orange.');
  } catch(e) {
    toastErr('No se pudo conectar con Orange (' + e.message + '). Puede ser un bloqueo de seguridad del navegador (CORS) — avisame para revisarlo.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Sincronizar con Orange'; }
  }
}

function renderOrangeSyncInfo(info) {
  const lbl = document.getElementById('orange-sync-label');
  if (!lbl) return;
  lbl.textContent = info?.ts ? new Date(info.ts).toLocaleString('es-BO') + ' (' + info.cantidad + ' lotes)' : 'nunca';
}

function renderOrangeMoraKPIs() {
  const tiers = { 'Mora 1-30':'m1', 'Mora 31-60':'m2', 'Mora 61-90':'m3', 'Mora 91-180':'m4', 'Mora +180':'m5' };
  const acc = {}; Object.values(tiers).forEach(id => acc[id] = {n:0, monto:0});
  orangeMoraData.forEach(r => {
    const id = tiers[r.estado];
    if (!id) return;
    acc[id].n++; acc[id].monto += (r.montoAdeudadoBS||0);
  });
  Object.entries(tiers).forEach(([label,id]) => {
    setText('orange-kpi-'+id+'-val', 'Bs '+Math.round(acc[id].monto).toLocaleString('es-BO'));
    setText('orange-kpi-'+id+'-n', acc[id].n+' lote(s)');
  });
}

function renderOrangeMoraTabla() {
  const tbody = document.getElementById('orange-mora-tbody');
  if (!tbody) return;
  const term = (document.getElementById('orange-buscar')?.value||'').trim().toLowerCase();
  let datos = orangeMoraData;
  if (term) datos = datos.filter(r =>
    (r.cliente||'').toLowerCase().includes(term) ||
    (r.terreno||'').toLowerCase().includes(term) ||
    (r.asesor||'').toLowerCase().includes(term)
  );
  datos = [...datos].sort((a,b)=>(b.diasMora||0)-(a.diasMora||0));

  if (!datos.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Sin datos — sincronizá con Orange arriba.</div></td></tr>'; return; }

  tbody.innerHTML = datos.map(r => `<tr>
    <td style="font-weight:600;font-family:monospace;">${esc(r.terreno)}</td>
    <td>${esc(r.cliente)}</td>
    <td style="font-size:var(--fs-sm);">${esc(r.asesor||'—')}</td>
    <td style="font-weight:600;">${r.diasMora}</td>
    <td>${_pintarEstadoExp(r.estado)}</td>
    <td style="font-weight:600;color:var(--cartera);">Bs ${(r.montoAdeudadoBS||0).toLocaleString('es-BO',{minimumFractionDigits:2})}</td>
    <td>${r.cuotasPendientes||1}</td>
  </tr>`).join('');
}

function renderOrangeMoraPanel() {
  renderOrangeMoraKPIs();
  renderOrangeMoraTabla();
}

function calcularEstadoPago(anioCobro, mesCobroNum, anioPeriodo, mesPeriodoNum) {
  const diff = (anioCobro*12+mesCobroNum) - (anioPeriodo*12+mesPeriodoNum);
  if (diff < 0)  return 'Adelantado';
  if (diff === 0) return 'Vigente';
  if (diff === 1) return 'Mora 1-30';
  if (diff === 2) return 'Mora 31-60';
  if (diff === 3) return 'Mora 61-90';
  if (diff <= 6)  return 'Mora 91-180';
  return 'Mora +180';
}

function calcularEstadoExpensa(periodos) {
  if (!periodos || !periodos.length) return 'Sin gestión';
  const maxPeriodo = Math.max(...periodos.map(p => p.anio*12 + p.mesNum));
  const hoy = new Date();
  const actual = hoy.getFullYear()*12 + (hoy.getMonth()+1);
  const diff = actual - maxPeriodo;
  if (diff < 0)  return 'Adelantado';
  if (diff === 0) return 'Vigente';
  if (diff === 1) return 'Mora 1-30';
  if (diff === 2) return 'Mora 31-60';
  if (diff === 3) return 'Mora 61-90';
  if (diff <= 6)  return 'Mora 91-180';
  return 'Mora +180';
}

// Busca, entre las categorías de Expensas ya creadas por el usuario, la que corresponde
// a un estado (ej. "Mora Expensas" para Mora, "Vigente Expensas" para Vigente, "Pagos Adelantados").
function matchCategoriaPorEstado(estado) {
  const cats = (typeof categoriasData !== 'undefined' ? categoriasData : []).filter(c => c.tipo === 'expensas');
  const term = estado === 'Vigente' ? 'vigente'
             : estado === 'Adelantado' ? 'adelant'
             : estado.startsWith('Mora') ? 'mora'
             : null;
  if (!term) return null;
  return cats.find(c => (c.nombre||'').toLowerCase().includes(term)) || null;
}

/* ═══════════════════════════════════════════
   CATEGORÍAS CARTERA (Config)
═══════════════════════════════════════════ */
function renderCatCarteraConfig() {
  const cont = document.getElementById('cat-cartera-lista');
  if (!cont) return;
  if (!catCarteraData.length) {
    cont.innerHTML = '<div class="empty-state">Sin categorías. Agregá una.</div>';
  } else {
    cont.innerHTML = catCarteraData.map(c => `
      <div class="vendor-item">
        <span class="v-name">${esc(c.nombre)}</span>
        <button class="btn-remove-vendor" onclick="window._fbRemoveCatCartera('${c._key}')">×</button>
      </div>`).join('');
  }
  // Populate selects
  const opts = '<option value="">Seleccionar...</option>' +
    catCarteraData.map(c=>`<option value="${c._key}" data-nombre="${c.nombre}">${c.nombre}</option>`).join('');
  ['mc-categoria','cob-categoria','ucob-categoria'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
  populateCobFiltCat();
}

async function agregarCatCartera() {
  const nombre = document.getElementById('new-cat-cartera')?.value.trim();
  if (!nombre) { toastErr('Ingresa un nombre para la categoria.'); return; }
  const btnCat = document.querySelector('[onclick="agregarCatCartera()"]');
  btnLoading(btnCat, true);
  await window._fbPushCatCartera(nombre);
  btnSuccess(btnCat);
  toastOk('Categoria agregada.');
  const el = document.getElementById('new-cat-cartera');
  if (el) el.value = '';
}

/* ═══════════════════════════════════════════
   CATEGORÍAS EXPENSAS (Config) — independientes de Cartera
═══════════════════════════════════════════ */
function renderCatExpensasConfig() {
  const cont = document.getElementById('cat-expensas-lista');
  if (cont) {
    if (!catExpensasData.length) {
      cont.innerHTML = '<div class="empty-state">Sin categorías. Agregá una.</div>';
    } else {
      cont.innerHTML = catExpensasData.map(c => `
        <div class="vendor-item">
          <span class="v-name">${esc(c.nombre)}</span>
          <button class="btn-remove-vendor" onclick="window._fbRemoveCatExpensas('${c._key}')">×</button>
        </div>`).join('');
    }
  }
  // Populate el select del formulario rápido de expensas del asesor
  const opts = '<option value="">Seleccionar...</option>' +
    catExpensasData.map(c=>`<option value="${c._key}" data-nombre="${c.nombre}">${c.nombre}</option>`).join('');
  const el = document.getElementById('uexp-categoria');
  if (el) el.innerHTML = opts;
}

async function agregarCatExpensas() {
  const nombre = document.getElementById('new-cat-expensas')?.value.trim();
  if (!nombre) { toastErr('Ingresa un nombre para la categoria.'); return; }
  const btnCat = document.querySelector('[onclick="agregarCatExpensas()"]');
  btnLoading(btnCat, true);
  await window._fbPushCatExpensas(nombre);
  btnSuccess(btnCat);
  toastOk('Categoria agregada.');
  const el = document.getElementById('new-cat-expensas');
  if (el) el.value = '';
}

/* ═══════════════════════════════════════════
   META DE CLIENTES (clientes vigentes del mes)
═══════════════════════════════════════════ */
function toggleFormMetaCliente() {
  const f = document.getElementById('form-meta-cliente');
  const e = document.getElementById('form-excel-meta');
  if (f) f.style.display = f.style.display==='none' ? 'block' : 'none';
  if (e) e.style.display = 'none';
  // Set mes actual
  const mc_mes = document.getElementById('mc-mes');
  if (mc_mes) {
    const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    mc_mes.value = meses[new Date().getMonth()];
  }
}

function abrirExcelMeta() {
  const f = document.getElementById('form-excel-meta');
  const g = document.getElementById('form-meta-cliente');
  if (f) f.style.display = f.style.display==='none' ? 'block' : 'none';
  if (g) g.style.display = 'none';
}

async function guardarClienteMeta() {
  const nombre = document.getElementById('mc-nombre')?.value.trim();
  const monto  = parseFloat(document.getElementById('mc-monto')?.value) || 0;
  const catKey = document.getElementById('mc-categoria')?.value || '';
  const catEl  = document.getElementById('mc-categoria');
  const catNom = catEl?.options[catEl.selectedIndex]?.text || '';
  const mes    = document.getElementById('mc-mes')?.value || mesActual();
  if (!nombre) { toastErr('El nombre del cliente es obligatorio.'); return; }
  const btn = document.querySelector('[onclick="guardarClienteMeta()"]');
  btnLoading(btn, true);
  try {
    await window._fbPushCartaMeta({ nombre, monto, catKey, catNombre:catNom, mes, anio:new Date().getFullYear(), ts:Date.now() });
    btnSuccess(btn);
    document.getElementById('mc-nombre').value = '';
    document.getElementById('mc-monto').value  = '';
    toggleFormMetaCliente();
    toastOk('Cliente agregado a la meta.');
  } catch(e) {
    btnLoading(btn, false);
    toastErr('No se pudo guardar: ' + (e.message||'revisa tu conexion.'));
  }
}

function renderCartaMeta() {
  const filMes = document.getElementById('meta-fil-mes')?.value || '';
  const mes    = filMes || mesActual();
  const anio   = anioActual();
  const datos  = cartaMetaData.filter(c => (!filMes || c.mes===filMes) && c.anio===anio);
  const totalMeta = datos.reduce((s,c)=>s+(c.monto||0),0);
  const countEl = document.getElementById('cart-meta-count');
  if (countEl) countEl.textContent = `(${datos.length} clientes · $${totalMeta.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})})`;
  countUpMoney(document.getElementById('cart-kpi-meta'), totalMeta);
  setText('cart-kpi-meta-n', datos.length + ' clientes en meta');

  const cont = document.getElementById('cart-meta-lista');
  if (!cont) return;
  cont.innerHTML = datos.length ? datos.map(c => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1.5px solid #f0f1f3;border-radius:var(--r-md);margin-bottom:6px;background:#fff;">
      <div>
        <div style="font-size:var(--fs-base);font-weight:600;color:var(--ink-900);">${esc(c.nombre)}</div>
        <div style="font-size:var(--fs-xs);color:var(--gris);">${c.catNombre||'Sin categoría'} · ${c.mes||''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:var(--sp-2);">
        <span style="font-size:var(--fs-md);font-weight:700;color:var(--cartera);">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        <button onclick="window._fbRemoveCartaMeta('${c._key}')" class="btn-del" style="font-size:var(--fs-xs);padding:3px 6px;">🗑</button>
      </div>
    </div>`).join('')
  : '<div class="empty-state">Sin clientes en la meta este mes.</div>';
}

/* Plantilla Excel meta */
function descargarPlantillaMeta() {
  const rows = [
    { 'Cliente':'Juan Perez', 'Monto ($)':1500, 'Categoria':'Terreno' },
    { 'Cliente':'Maria Gomez', 'Monto ($)':800, 'Categoria':'Accion' },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{wch:30},{wch:14},{wch:16}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Meta');
  XLSX.writeFile(wb, 'plantilla_meta_cartera.xlsx');
}

function procesarExcelMeta(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, {type:'binary'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    const mes  = document.getElementById('meta-fil-mes')?.value || mesActual();
    const anio = anioActual();
    metaExcelPend = rows.map(r => ({
      nombre:    String(r['Cliente']||'').trim(),
      monto:     parseFloat(r['Monto ($)']||r['Monto']||0),
      catNombre: String(r['Categoria']||r['Categoría']||'').trim(),
      catKey:    '',
      mes, anio, ts: Date.now(),
    })).filter(r => r.nombre);
    // Match categorías
    metaExcelPend.forEach(r => {
      const cat = catCarteraData.find(c=>c.nombre.toLowerCase()===r.catNombre.toLowerCase());
      if (cat) r.catKey = cat._key;
    });
    setText('meta-prev-count', metaExcelPend.length);
    const tbody = document.getElementById('meta-prev-body');
    if (tbody) tbody.innerHTML = metaExcelPend.map(r=>`<tr>
      <td>${esc(r.nombre)}</td>
      <td style="font-weight:600;color:var(--cartera);">$${r.monto.toFixed(2)}</td>
      <td>${r.catNombre ? esc(r.catNombre) : '—'}${(!r.catKey && r.catNombre) ? ' <span style="font-size:var(--fs-xs);padding:1px 7px;border-radius:999px;background:var(--verde-bg);color:var(--verde);font-weight:600;">nueva</span>' : ''}</td>
    </tr>`).join('');
    const prev = document.getElementById('meta-excel-preview');
    if (prev) prev.style.display = 'block';
  };
  reader.readAsBinaryString(file);
}

async function confirmarExcelMeta() {
  let ok = 0;
  const nuevasCats = {}; // nombre en minúscula -> key, evita crear duplicados dentro del mismo import
  for (const r of metaExcelPend) {
    if (!r.catKey && r.catNombre) {
      const clave = r.catNombre.toLowerCase();
      if (nuevasCats[clave]) {
        r.catKey = nuevasCats[clave];
      } else {
        try {
          const nuevaRef = window._fbPushCatCartera(r.catNombre); // el key ya está disponible sin esperar
          r.catKey = nuevaRef.key;
          nuevasCats[clave] = nuevaRef.key;
          await nuevaRef; // esperar a que la escritura se confirme en el servidor
        } catch (e) { console.error(e); }
      }
    }
    try { await window._fbPushCartaMeta(r); ok++; } catch(e){}
  }
  const nNuevas = Object.keys(nuevasCats).length;
  toastOk(ok + ' clientes importados a la meta.' + (nNuevas ? ' Se crearon ' + nNuevas + ' categoría(s) nueva(s) automáticamente.' : ''));
  cancelarExcelMeta();
}

function cancelarExcelMeta() {
  metaExcelPend=[];
  const prev=document.getElementById('meta-excel-preview');
  if(prev) prev.style.display='none';
  const inp=document.getElementById('meta-excel-file');
  if(inp) inp.value='';
}

/* ═══════════════════════════════════════════
   COBROS CARTERA (pagos del mes)
═══════════════════════════════════════════ */
function toggleFormCobro() {
  const f = document.getElementById('form-cobro-nuevo');
  if (!f) return;
  const open = f.style.display==='none';
  f.style.display = open ? 'block' : 'none';
  if (open) {
    const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const selMes = document.getElementById('cob-mes');
    if (selMes) selMes.value = meses[new Date().getMonth()];
  }
}

async function guardarCobro_cartera() {
  const nombre = document.getElementById('cob-nombre')?.value.trim();
  const monto  = parseFloat(document.getElementById('cob-monto')?.value) || 0;
  if (!nombre) { toastErr('El nombre del cliente es obligatorio.'); return; }
  if (!monto)  { toastErr('Ingresa un monto valido.'); return; }
  const catEl  = document.getElementById('cob-categoria');
  const catKey = catEl?.value || '';
  const catNom = catEl?.options[catEl?.selectedIndex]?.text || '';
  const suma   = document.querySelector('input[name=cob-suma]:checked')?.value || 'SI';
  const semana = document.getElementById('cob-semana')?.value || 'S1';
  const mes    = document.getElementById('cob-mes')?.value || mesActual();
  const obs    = document.getElementById('cob-obs')?.value.trim() || '';
  const btn    = document.querySelector('[onclick="guardarCobro_cartera()"]');
  btnLoading(btn, true);
  try {
    await window._fbPushCartaCobro({
      nombre, monto, catKey, catNombre:catNom, sumaMeta:suma,
      semana, mes, anio:anioActual(), obs,
      cargadoPor:'Admin', fechaCarga:new Date().toLocaleString('es-BO')
    });
    btnSuccess(btn);
    ['cob-nombre','cob-monto','cob-obs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    toggleFormCobro();
    toastOk('Cobro registrado correctamente.');
  } catch(e) {
    btnLoading(btn, false);
    toastErr('No se pudo guardar el cobro: ' + (e.message||'revisa tu conexion.'));
  }
}

function renderCartaCobros() {
  const filMes  = document.getElementById('cob-fil-mes')?.value || '';
  const filSuma = document.getElementById('cob-fil-suma')?.value || '';
  const filCat  = document.getElementById('cob-fil-cat')?.value || '';
  const mes     = mesActual();
  const anio    = anioActual();
  let datos = cartaCobroData.filter(c => c.anio===anio);
  if (filMes)  datos = datos.filter(c=>c.mes===filMes);
  if (filSuma) datos = datos.filter(c=>c.sumaMeta===filSuma);
  if (filCat)  datos = datos.filter(c=>c.catKey===filCat);
  const countEl = document.getElementById('cart-cobros-count');
  if (countEl) countEl.textContent = `(${datos.length})`;
  const cont = document.getElementById('cart-cobros-lista');
  if (!cont) return;
  cont.innerHTML = datos.length ? datos.map(c => {
    const sumaOn = c.sumaMeta==='SI';
    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 12px;border:1.5px solid ${sumaOn?'#d1fae5':'#fef3c7'};border-radius:var(--r-md);margin-bottom:6px;background:#fff;">
      <div>
        <div style="font-size:var(--fs-base);font-weight:600;color:var(--ink-900);">${esc(c.nombre)}</div>
        <div style="font-size:var(--fs-xs);color:var(--gris);">${c.catNombre||'—'} · ${c.semana||''} · ${c.mes||''}</div>
        <span style="font-size:var(--fs-2xs);font-weight:600;padding:2px 8px;border-radius:999px;margin-top:4px;display:inline-block;${sumaOn?'background:var(--ok-bg);color:var(--ok-ink);':'background:var(--warn-bg);color:var(--warn-ink);'}">${sumaOn?'✓ Suma meta':'✗ No suma'}</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <span style="font-size:var(--fs-base);font-weight:700;color:${sumaOn?'var(--cartera)':'var(--warn)'};">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        <div style="display:flex;gap:4px;">
          <button onclick="toggleSumaMeta_carta('${c._key}','${sumaOn?'NO':'SI'}')" style="font-size:var(--fs-2xs);padding:3px 7px;border:1px solid var(--line);border-radius:var(--r-sm);cursor:pointer;background:#f9fafb;">${sumaOn?'→ No suma':'→ Suma'}</button>
          <button onclick="eliminarCobro_carta('${c._key}')" class="btn-del" style="font-size:var(--fs-xs);padding:3px 6px;">🗑</button>
        </div>
      </div>
    </div>`;
  }).join('')
  : '<div class="empty-state">Sin cobros este mes.</div>';
}

async function toggleSumaMeta_carta(key, nuevoVal) {
  await window._fbUpdateCartaCobro(key, { sumaMeta: nuevoVal });
  toastInfo('Actualizado.');
}

async function eliminarCobro_carta(key) {
  const ok = await confirmDialog('Eliminar este cobro?', { title:'Eliminar cobro', okText:'Eliminar' });
  if (ok) {
    await window._fbRemoveCartaCobro(key);
    toastOk('Cobro eliminado.');
  }
}

/* ═══════════════════════════════════════════
   KPIs RESUMEN CARTERA
═══════════════════════════════════════════ */
function renderCartaKPIs() {
  const mes  = mesActual();
  const anio = anioActual();
  setText('cart-mes-label2', mes + ' ' + anio);
  setText('cart-resumen-mes', mes + ' ' + anio);

  const delMes   = cartaCobroData.filter(c=>c.mes===mes&&c.anio===anio);
  const siMeta   = delMes.filter(c=>c.sumaMeta==='SI');
  const noMeta   = delMes.filter(c=>c.sumaMeta==='NO');
  const totalSi  = siMeta.reduce((s,c)=>s+(c.monto||0),0);
  const totalNo  = noMeta.reduce((s,c)=>s+(c.monto||0),0);
  const totalAll = totalSi + totalNo;
  const metaDatos= cartaMetaData.filter(c=>c.mes===mes&&c.anio===anio);
  const totalMeta= metaDatos.reduce((s,c)=>s+(c.monto||0),0);

  // KPIs
  countUpMoney(document.getElementById('cart-kpi-cobrado'), totalSi);
  const pct = totalMeta ? Math.round(totalSi/totalMeta*100) : 0;
  setText('cart-kpi-cobrado-pct', pct+'% de la meta');
  countUpMoney(document.getElementById('cart-kpi-nometa'), totalNo);
  setText('cart-kpi-nometa-n', noMeta.length+' cobros adicionales');
  countUpMoney(document.getElementById('cart-kpi-total'), totalAll);
  setText('cart-kpi-total-n', delMes.length+' cobros en total');

  // Barra progreso
  setText('cart-cobrado-display', '$'+totalSi.toLocaleString('es-BO',{maximumFractionDigits:0}));
  setText('cart-pct-display', pct+'%');
  const bar = document.getElementById('cart-barra-main');
  if (bar) {
    bar.style.width=Math.min(pct,100)+'%';
    bar.style.background=pct>=100?'linear-gradient(90deg,var(--ok),var(--ok-light))':pct>=75?'linear-gradient(90deg,var(--warn),var(--warn-light))':'linear-gradient(90deg,var(--cartera),var(--cartera-light))';
  }

  // Meta global del mes (de Firebase metas/)
  window._fbListenMetas(anio, mes, metas => {
    const metaGlobal = metas?.cartera?.monto || 0;
    setText('cart-meta-global-display', metaGlobal ? '$'+Number(metaGlobal).toLocaleString('es-BO') : 'No configurada');
    if (typeof updateHomeMetas==='function') updateHomeMetas('cartera', totalSi, metaGlobal, metaGlobal?Math.round(totalSi/metaGlobal*100):0);
  });

  // Resumen por categoría — SÍ suman
  _renderResumenCat('cart-resumen-si', siMeta, 'var(--verde)');
  setText('cart-subtotal-si', '$'+totalSi.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}));
  // Resumen por categoría — NO suman
  _renderResumenCat('cart-resumen-no', noMeta, 'var(--warn)');
  setText('cart-subtotal-no', '$'+totalNo.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}));
  // Total general
  setText('cart-total-general', '$'+totalAll.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}));

  // Tabla detalle
  renderCartaTabla();
}

function _renderResumenCat(elId, datos, color) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!datos.length) {
    el.innerHTML = `<div style="font-size:var(--fs-base);color:var(--gris);padding:8px;">Sin cobros.</div>`;
    return;
  }
  const porCat = {};
  datos.forEach(c => {
    const cat = c.catNombre || 'Sin categoría';
    if (!porCat[cat]) porCat[cat] = { total:0, n:0 };
    porCat[cat].total += (c.monto||0);
    porCat[cat].n++;
  });
  el.innerHTML = Object.entries(porCat).sort((a,b)=>b[1].total-a[1].total).map(([cat,d])=>`
    <div style="background:#fff;border:1.5px solid #f0f1f3;border-radius:var(--r-md);padding:14px;">
      <div style="font-size:var(--fs-xs);font-weight:600;color:var(--gris);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">${cat}</div>
      <div style="font-size:var(--fs-2xl);font-weight:700;color:${color};font-family:'Cormorant Garamond',serif;">$${d.total.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <div style="font-size:var(--fs-xs);color:var(--gris);margin-top:2px;">${d.n} cobro${d.n!==1?'s':''}</div>
    </div>`).join('');
}

function renderCartaTabla() {
  const mes  = mesActual();
  const anio = anioActual();
  const datos = cartaCobroData.filter(c=>c.anio===anio);
  const tb = document.getElementById('cart-tabla-body');
  if (!tb) return;
  tb.innerHTML = datos.length ? datos.map(c=>{
    const sumaOn=c.sumaMeta==='SI';
    return `<tr>
      <td><strong>${esc(c.nombre)}</strong></td>
      <td style="font-size:var(--fs-sm);">${c.catNombre||'—'}</td>
      <td style="font-weight:600;color:${sumaOn?'var(--cartera)':'var(--warn)'};">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td style="font-size:var(--fs-sm);text-align:center;">${c.semana||'—'}</td>
      <td style="font-size:var(--fs-sm);">${c.mes||'—'}</td>
      <td style="text-align:center;"><span style="font-size:var(--fs-xs);font-weight:600;padding:2px 8px;border-radius:999px;${sumaOn?'background:var(--ok-bg);color:var(--ok-ink);':'background:var(--warn-bg);color:var(--warn-ink);'}">${sumaOn?'✓ Sí':'✗ No'}</span></td>
      <td style="font-size:var(--fs-sm);color:var(--gris);">${c.obs||''}</td>
      <td><button class="btn-del" onclick="eliminarCobro_carta('${c._key}')">🗑</button></td>
    </tr>`;
  }).join('')
  : '<tr><td colspan="8" class="empty-state">Sin datos.</td></tr>';
}

function exportarCartaCompleto() {
  if (!cartaCobroData.length) { toastErr('Sin cobros para exportar.'); return; }
  const rows = cartaCobroData.map(c=>({
    'Cliente':c.nombre, 'Categoria':c.catNombre, 'Monto ($)':c.monto,
    'Suma meta':c.sumaMeta, 'Semana':c.semana, 'Mes':c.mes, 'Observaciones':c.obs
  }));
  const ws=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Cartera');
  XLSX.writeFile(wb,`cartera_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ══ SWITCH TAB INTERNO CARTERA ══
function switchCartaTab(id) {
  ['cobros','meta','resumen','detalle'].forEach(t => {
    const el = document.getElementById('ctab-' + t);
    const btn = document.getElementById('ctab-btn-' + t);
    if (el) el.style.display = t===id ? 'block' : 'none';
    if (btn) {
      btn.style.background    = t===id ? '#fff' : 'transparent';
      btn.style.color         = t===id ? 'var(--verde)' : '#6b7280';
      btn.style.fontWeight    = t===id ? '600' : '500';
      btn.style.boxShadow     = t===id ? '0 1px 4px rgba(0,0,0,.06)' : 'none';
    }
  });
  if (id==='resumen') { _renderResumenCat('cart-resumen-si', cartaCobroData.filter(c=>c.sumaMeta==='SI'&&c.mes===mesActual()&&c.anio===anioActual()), 'var(--verde)'); _renderResumenCat('cart-resumen-no', cartaCobroData.filter(c=>c.sumaMeta==='NO'&&c.mes===mesActual()&&c.anio===anioActual()), 'var(--warn)'); }
  if (id==='detalle') renderCartaTabla();
  if (id==='meta')    renderCartaMeta();
  if (id==='cobros')  { renderCartaCobros(); populateCobFiltCat(); }
}

// Populate category filter in cobros
function populateCobFiltCat() {
  const sel = document.getElementById('cob-fil-cat');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todas las categorias</option>' +
    catCarteraData.map(c=>`<option value="${c._key}"${c._key===cur?' selected':''}>${c.nombre}</option>`).join('');
}

// Legacy compat
function renderCartaAdmin() { renderCartaCobros(); renderCartaKPIs(); }
function renderCartaAdminKPIs() { renderCartaKPIs(); }

/* Meta cartera: modal prolijo consolidado más arriba, junto al Panel de Control. */

const ESTADOS_COLOR = {
  'Al día':    'var(--ok)', 'Vigente':    'var(--ok)', 'Pagado':    'var(--ok)', 'Adelantado':'var(--info)',
  'Mora':      'var(--danger)', 'Mora 1-30':  'var(--warn)', 'Mora 31-60':'var(--warn-strong)',
  'Mora 61-90':'var(--danger)', 'Mora 91-180':'#8b1a1a', 'Mora +180': '#5c0f0f',
  'Mora +60':  'var(--danger)', 'Parcial':    'var(--warn)', 'Sin gestión':'#9ca3af'
};

/* ── PLANTILLA EXCEL ── */
function descargarPlantillaCartaAdmin() {
  const rows = [
    { 'Cliente':'Ejemplo Cliente A', 'Cobranza ($)': 1500, 'Estado':'Al día',    'Concepto':'Terreno' },
    { 'Cliente':'Ejemplo Cliente B', 'Cobranza ($)': 800,  'Estado':'Mora',      'Concepto':'Acción' },
    { 'Cliente':'Ejemplo Cliente C', 'Cobranza ($)': 2000, 'Estado':'Mora 1-30', 'Concepto':'Terreno' },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  // Bold header
  ws['!cols'] = [{wch:30},{wch:14},{wch:16},{wch:12}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cartera');
  XLSX.writeFile(wb, 'plantilla_cartera.xlsx');
}

/* ── PROCESAR EXCEL CARTERA ── */
function procesarExcelCartaAdmin(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, {type:'binary'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    // Pedir semana y mes al usuario
    const semana = prompt('Semana del archivo (S1, S2, S3 o S4):') || 'S1';
    const mesOpt = prompt('Mes del archivo (ej: Junio):') || mesActual();
    const anio   = new Date().getFullYear();

    cartaAdminPend = rows.map(r => ({
      cliente:  String(r['Cliente']||'').trim(),
      monto:    parseFloat(r['Cobranza ($)']||r['Cobranza']||r['Monto']||0),
      estado:   String(r['Estado']||'Sin gestión').trim(),
      concepto: String(r['Concepto']||'Terreno').trim(),
      semana,
      mes:      mesOpt,
      anio,
      cargadoPor: 'Admin',
      fechaCarga: new Date().toLocaleString('es-BO'),
    })).filter(r => r.cliente && r.monto > 0);

    setText('cart-admin-prev-count', cartaAdminPend.length);
    const tbody = document.getElementById('cart-admin-prev-body');
    if (tbody) {
      tbody.innerHTML = cartaAdminPend.map((r,i) => `<tr>
        <td style="color:var(--gris);font-size:var(--fs-sm);">${i+1}</td>
        <td><strong>${r.cliente}</strong></td>
        <td style="font-weight:600;color:var(--cartera);">$${r.monto.toFixed(2)}</td>
        <td><span style="padding:2px 8px;border-radius:999px;font-size:var(--fs-xs);font-weight:600;background:${ESTADOS_COLOR[r.estado]||'#9ca3af'}22;color:${ESTADOS_COLOR[r.estado]||'#6b7280'};">${r.estado}</span></td>
        <td style="font-size:var(--fs-sm);">${r.concepto}</td>
      </tr>`).join('');
    }
    const prev = document.getElementById('cart-admin-preview');
    if (prev) prev.style.display = 'block';
  };
  reader.readAsBinaryString(file);
}

async function confirmarImportCartaAdmin() {
  if (!cartaAdminPend.length) return;
  const btn = document.querySelector('[onclick="confirmarExcelMeta()"]');
  if (btn) { btn.textContent = 'Importando...'; btn.disabled = true; }
  let ok = 0;
  for (const r of cartaAdminPend) {
    try { await window._fbPushCartaAdmin(r); ok++; } catch(e) { console.error(e); }
  }
  toastOk(ok + ' clientes importados.');
  cancelarImportCartaAdmin();
}

function cancelarImportCartaAdmin() {
  cartaAdminPend = [];
  const prev = document.getElementById('cart-admin-preview');
  if (prev) prev.style.display = 'none';
  const inp = document.getElementById('cart-admin-excel');
  if (inp) inp.value = '';
}

/* ── KPIs CARTERA ── */
// renderCartaAdminKPIs — legacy, see renderCartaKPIs()

/* ── RENDER CARTERA PRINCIPAL ── */
// renderCartaAdmin — legacy, see renderCartaCobros()

function exportarCartaAdmin() {
  if (!cartaAdminData.length) { toastErr('Sin datos para exportar.'); return; }
  const rows = cartaAdminData.map(c => ({
    'Cliente':c.cliente, 'Cobranza ($)':c.monto, 'Estado':c.estado,
    'Concepto':c.concepto, 'Semana':c.semana, 'Mes':c.mes, 'Año':c.anio
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Cartera');
  XLSX.writeFile(wb, `cartera_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/* ═══════════════════════════════════════════
   EXPENSAS ADMIN — FUNCIONES
═══════════════════════════════════════════ */
function abrirModalMetaExpensas() {
  const anioSel = document.getElementById('meta-exp-anio');
  const mesSel  = document.getElementById('meta-exp-mes');
  const montoEl = document.getElementById('meta-exp-monto');
  if (!anioSel || !mesSel || !montoEl) return;

  const anioActualN = new Date().getFullYear();
  const anios = [...new Set([...expAdminData.map(e=>e.anio).filter(Boolean), anioActualN, anioActualN-1, anioActualN-2])]
    .sort((a,b)=>b-a);
  anioSel.innerHTML = anios.map(a=>`<option value="${a}">${a}</option>`).join('');
  anioSel.value = anioActualN;
  mesSel.value  = mesActual();
  montoEl.value = '';

  cargarMetaExpensasExistente();
  document.getElementById('modal-meta-expensas').classList.add('open');
}

async function cargarMetaExpensasExistente() {
  const anio = document.getElementById('meta-exp-anio')?.value;
  const mes  = document.getElementById('meta-exp-mes')?.value;
  const montoEl = document.getElementById('meta-exp-monto');
  if (!anio || !mes || !montoEl) return;
  const actual = await window._fbGetMetaOnce(anio, mes, 'expensas');
  montoEl.value = actual || '';
  montoEl.placeholder = actual ? '' : 'Sin meta cargada para este período';
}

function cerrarModalMetaExpensas() {
  document.getElementById('modal-meta-expensas')?.classList.remove('open');
}

async function guardarMetaExpensasModal() {
  const anio = document.getElementById('meta-exp-anio')?.value;
  const mes  = document.getElementById('meta-exp-mes')?.value;
  const val  = parseFloat(document.getElementById('meta-exp-monto')?.value);
  if (!anio || !mes || !val) { toastErr('Elegí un período y un monto válido.'); return; }
  const btn = document.querySelector('#modal-meta-expensas .confirm-btn-ok');
  btnLoading(btn, true);
  await window._fbSetMeta(anio, mes, 'expensas', val);
  btnSuccess(btn);
  toastOk('Meta de ' + mes + ' ' + anio + ' guardada (Bs ' + val.toLocaleString('es-BO') + ').');
  setTimeout(() => { cerrarModalMetaExpensas(); renderExpensasAdmin(); }, 500);
}

function toggleFormExpensa() {
  const f = document.getElementById('exp-form-nuevo');
  if (f) f.style.display = f.style.display==='none' ? 'block' : 'none';
}

async function guardarCobradoExpensa() {
  const cliente = document.getElementById('exp-nuevo-cliente')?.value.trim();
  const monto   = parseFloat(document.getElementById('exp-nuevo-monto')?.value) || 0;
  if (!cliente) { toastErr('El nombre del cliente es obligatorio.'); return; }
  if (!monto)   { toastErr('Ingresa un monto valido.'); return; }
  const semana  = document.getElementById('exp-nuevo-semana')?.value || 'S1';
  const mes     = document.getElementById('exp-nuevo-mes')?.value || mesActual();
  const btnExp  = document.querySelector('[onclick="guardarCobradoExpensa()"]');
  btnLoading(btnExp, true);
  try {
    await window._fbPushExpAdmin({
      cliente,
      terreno:    document.getElementById('exp-nuevo-terreno')?.value.trim() || '',
      monto,
      semana,
      mes,
      anio:       new Date().getFullYear(),
      obs:        document.getElementById('exp-nuevo-obs')?.value.trim() || '',
      cargadoPor: 'Admin',
      fechaCarga: new Date().toLocaleString('es-BO'),
    });
    ['exp-nuevo-cliente','exp-nuevo-terreno','exp-nuevo-monto','exp-nuevo-obs'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    btnSuccess(btnExp);
    toastOk('Cobro de expensa guardado.');
    toggleFormExpensa();
  } catch(e) {
    btnLoading(btnExp, false);
    toastErr('No se pudo guardar el cobro: ' + (e.message||'revisa tu conexion.'));
  }
}

/* ═══════════════════════════════════════════
   IMPORTAR EXCEL — COBROS DE EXPENSAS (módulo aparte de Cartera)
═══════════════════════════════════════════ */
let expensasExcelPend = [];
let expensasExcelNombreArchivo = '';

function abrirExcelExpensas() {
  const f = document.getElementById('form-excel-expensas');
  if (!f) return;
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function _pintarEstadoExp(estado) {
  const color = ESTADOS_COLOR[estado] || '#9ca3af';
  return `<span style="padding:2px 8px;border-radius:999px;font-size:var(--fs-xs);font-weight:600;background:${color}22;color:${color};">${esc(estado)}</span>`;
}

function procesarExcelExpensas(input) {
  const file = input.files[0]; if (!file) return;
  expensasExcelNombreArchivo = file.name;
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, {type:'binary', cellDates:true});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:null});

    // ¿Es el formato "Arqueo de Caja" (Orange)? Buscamos la fila de encabezados reales.
    let headerRow = -1;
    for (let i = 0; i < Math.min(aoa.length, 15); i++) {
      if (String(aoa[i]?.[0]||'').trim() === 'Nro Operación') { headerRow = i; break; }
    }

    let parsed = [];

    if (headerRow >= 0) {
      // ── FORMATO ORANGE: Arqueo de Caja ──
      for (let i = headerRow+1; i < aoa.length; i++) {
        const row = aoa[i];
        if (!row) continue;
        const col0 = String(row[0]||'').trim();
        if (!col0 || col0 === 'Subtotal :' || col0 === 'Total :' || col0.toUpperCase().includes('EGRESO')) continue;
        if (!col0.startsWith('Venta Nro')) continue; // salta subtítulos tipo "Cobro de Expensas"

        const fecha    = excelFechaToDate(row[1]);
        const cliente  = String(row[7]||'').trim();
        const terreno  = String(row[11]||'').replace(/\u00a0/g,'').trim();
        const conceptoTxt = String(row[10]||'');
        const montoRaw = row[13];
        const per = parseConceptoExpensa(conceptoTxt);
        if (!cliente || !terreno || !per || !fecha) continue;

        parsed.push({
          cliente, terreno,
          monto: parseMontoBO(montoRaw),
          // "Concepto" → SOLO indica qué cuota se está pagando (para calcular estado / mora):
          mesPeriodoNum: per.mesNum,
          anioPeriodo: per.anio,
          tipoPago: per.tipoPago,
          cuotaLabel: MESES_ES_NOMBRE[per.mesNum] + ' ' + per.anio,
          // "Fecha Comprobante" → cuándo pagó el cliente: esto organiza semana/mes/año de COBRO:
          mes: MESES_ES_NOMBRE[fecha.getMonth()+1],
          anio: fecha.getFullYear(),
          semana: 'S' + Math.ceil(fecha.getDate() / 7), // semana relativa al mes de cobro
          semanaIso: semanaISO(fecha),
          fechaComprobante: fecha.toLocaleDateString('es-BO'),
          obs: conceptoTxt,
          cargadoPor: 'Admin (Excel Orange)',
          fechaCarga: new Date().toLocaleString('es-BO'),
        });
      }

      // Estado de CADA cuota individual: cuándo se pagó vs. a qué mes correspondía.
      // (El estado "actual" del lote basado en hoy sigue existiendo aparte, para el
      // resumen del cliente en "Detalle por cliente" — ver calcularEstadoExpensa.)
      parsed.forEach(r => {
        const mesCobroNum = MESES_ES_NOMBRE.indexOf(r.mes);
        r.estado = calcularEstadoPago(r.anio, mesCobroNum, r.anioPeriodo, r.mesPeriodoNum);
        // Categoría automática según el estado de ESA cuota (vos ya creaste "Mora Expensas" / "Vigente Expensas" / "Pagos Adelantados")
        const cat = matchCategoriaPorEstado(r.estado);
        r.categoriaKey    = cat?._key || '';
        r.categoriaNombre = cat?.nombre || r.estado;
      });

    } else {
      // ── FORMATO SIMPLE (plantilla propia) ──
      const rows = XLSX.utils.sheet_to_json(ws);
      parsed = rows.map(r => ({
        cliente: String(r['Cliente']||r['Cliente / Propietario']||'').trim(),
        terreno: String(r['Terreno']||r['Unidad']||r['Unidad / Terreno']||'').trim(),
        monto:   parseFloat(r['Monto']||r['Monto cobrado']||r['Monto ($)']||0) || 0,
        semana:  String(r['Semana']||'S1').trim(),
        mes:     String(r['Mes']||mesActual()).trim(),
        anio:    new Date().getFullYear(),
        estado:  'Sin gestión',
        obs:     String(r['Observaciones']||r['Obs']||'').trim(),
        cargadoPor: 'Admin',
        fechaCarga: new Date().toLocaleString('es-BO'),
      })).filter(r => r.cliente);
    }

    expensasExcelPend = parsed;

    setText('exp-prev-count', expensasExcelPend.length);
    const tbody = document.getElementById('exp-prev-body');
    if (tbody) tbody.innerHTML = expensasExcelPend.map(r=>`<tr>
      <td>${esc(r.cliente)}</td>
      <td>${esc(r.terreno)}</td>
      <td>${esc(r.mes)} ${esc(String(r.anio))} <span style="color:var(--gris);font-size:var(--fs-xs);">(${esc(r.semana)})</span></td>
      <td>${esc(r.cuotaLabel||'')}${r.tipoPago && r.tipoPago!=='completo' ? ' <span style="color:var(--gris);font-size:var(--fs-xs);">('+esc(r.tipoPago)+')</span>' : ''}</td>
      <td style="font-weight:600;color:var(--cartera);">${r.monto?'Bs '+r.monto.toLocaleString('es-BO',{minimumFractionDigits:2}):'—'}</td>
      <td>${_pintarEstadoExp(r.estado)}</td>
      <td>${r.categoriaNombre ? `<span class="cat-badge" style="font-size:var(--fs-xs);">${esc(r.categoriaNombre)}</span>` : '<span style="color:var(--gris);font-size:var(--fs-xs);">sin categoría creada</span>'}</td>
    </tr>`).join('');

    const prev = document.getElementById('exp-excel-preview');
    if (prev) prev.style.display = 'block';
  };
  reader.readAsBinaryString(file);
}

async function confirmarExcelExpensas() {
  const cargaId   = 'carga_' + Date.now();
  const cargaNombreArchivo = expensasExcelNombreArchivo || 'archivo.xlsx';

  let ok = 0;
  for (const r of expensasExcelPend) {
    try {
      const data = { ...r, cargaId, cargaArchivo: cargaNombreArchivo };
      if (r.terreno && r.mesPeriodoNum && r.anioPeriodo) {
        // Upsert determinístico: mismo lote + mismo período → actualiza, no duplica.
        const idKey = `orange_${r.terreno.replace(/[^a-zA-Z0-9]/g,'-')}_${r.anioPeriodo}_${String(r.mesPeriodoNum).padStart(2,'0')}`;
        await window._fbSetExpPeriodo(idKey, data);
      } else {
        await window._fbPushExpAdmin(data);
      }
      ok++;
    } catch(e) {}
  }
  toastOk(ok + ' cobros de expensas importados.');
  cancelarExcelExpensas();
}

function cancelarExcelExpensas() {
  expensasExcelPend = [];
  const prev = document.getElementById('exp-excel-preview');
  if (prev) prev.style.display = 'none';
  const inp = document.getElementById('exp-excel-file');
  if (inp) inp.value = '';
}

// Distribuye la meta MENSUAL entre semanas. Los pesos dependen de si el mes tiene 4 o 5 semanas
// (usando la misma definición de "semana" que el resto del sistema: ceil(día/7)).
function diasEnMes(anio, mesNum) { return new Date(anio, mesNum, 0).getDate(); }
function pesosMetaSemanal(anio, mesNum) {
  const nSemanas = Math.ceil(diasEnMes(anio, mesNum) / 7);
  return nSemanas <= 4 ? [0.18, 0.27, 0.30, 0.25] : [0.12, 0.18, 0.30, 0.24, 0.16];
}
function metaSemanaMonto(metaMensual, anio, mesNum, semanaNum) {
  const pesos = pesosMetaSemanal(anio, mesNum);
  return metaMensual * (pesos[semanaNum-1] || 0);
}

/* ═══════════════════════════════════════════
   GRÁFICO — Tendencia de cobranza vs meta (Expensas)
═══════════════════════════════════════════ */
let _chartTendenciaExpensas = null;
let _tendenciaExpGranActual = 'mes';

function cambiarGranularidadTendenciaExp(gran) {
  _tendenciaExpGranActual = gran;
  document.querySelectorAll('#exp-tendencia-gran button').forEach(b => {
    const on = b.dataset.gran === gran;
    b.style.background = on ? '#fff' : 'transparent';
    b.style.color = on ? 'var(--ink-900)' : 'var(--gris)';
    b.style.boxShadow = on ? 'var(--shadow-xs)' : 'none';
  });
  renderTendenciaExpensas();
}

async function renderTendenciaExpensas() {
  const canvas = document.getElementById('exp-chart-tendencia');
  if (!canvas) return;
  const gran = _tendenciaExpGranActual;

  if (!expAdminData.length) {
    if (_chartTendenciaExpensas) { _chartTendenciaExpensas.destroy(); _chartTendenciaExpensas = null; }
    return;
  }

  // 1. Agrupar por FECHA DE COBRO (mes/año/semana ya calculados al importar) según la granularidad elegida
  const buckets = {};
  expAdminData.forEach(e => {
    if (!e.anio || !e.mes) return;
    const mesNum = MESES_ES_NOMBRE.indexOf(e.mes);
    if (mesNum < 1) return;
    let key, label, orden, semNum = null;
    if (gran === 'anio') {
      key = String(e.anio); label = key; orden = e.anio;
    } else if (gran === 'semana') {
      semNum = parseInt((e.semana||'S1').replace('S',''))||1;
      orden = e.anio*48 + mesNum*4 + semNum;
      key = e.anio+'-'+mesNum+'-'+semNum;
      label = 'S'+semNum+' '+MESES_ES_NOMBRE[mesNum].slice(0,3)+' '+String(e.anio).slice(2);
    } else {
      orden = e.anio*12+mesNum;
      key = e.anio+'-'+mesNum;
      label = MESES_ES_NOMBRE[mesNum].slice(0,3)+' '+String(e.anio).slice(2);
    }
    (buckets[key] ||= {label, orden, monto:0, anio:e.anio, mesNum, semNum}).monto += (e.monto||0);
  });

  const ordenados = Object.values(buckets).sort((a,b)=>a.orden-b.orden);
  if (!ordenados.length) return;

  // 2. Meta correspondiente a cada bucket (según granularidad).
  //    Para "semana", la meta mensual se reparte con los pesos de metaSemanaMonto,
  //    no se repite plana — así se puede ver si superás o no la meta DE ESA semana puntual.
  const metaMensualCache = {};
  const metaPorBucket = [];
  for (const b of ordenados) {
    if (gran === 'anio') {
      let sum = 0;
      for (let m=1;m<=12;m++) sum += await window._fbGetMetaOnce(b.anio, MESES_ES_NOMBRE[m], 'expensas');
      metaPorBucket.push(sum);
    } else {
      const ck = b.anio+'_'+b.mesNum;
      if (!(ck in metaMensualCache)) metaMensualCache[ck] = await window._fbGetMetaOnce(b.anio, MESES_ES_NOMBRE[b.mesNum], 'expensas');
      const metaMensual = metaMensualCache[ck];
      metaPorBucket.push(gran === 'semana' ? metaSemanaMonto(metaMensual, b.anio, b.mesNum, b.semNum) : metaMensual);
    }
  }

  // 3. Render Chart.js
  if (_chartTendenciaExpensas) _chartTendenciaExpensas.destroy();
  _chartTendenciaExpensas = new Chart(canvas, {
    type: 'line',
    data: {
      labels: ordenados.map(b=>b.label),
      datasets: [
        { label:'Cobranza', data: ordenados.map(b=>b.monto), borderColor:'#1E8E3E', backgroundColor:'rgba(30,142,62,.14)',
          fill:true, tension:.35, pointRadius:3, pointBackgroundColor:'#1E8E3E' },
        { label:'Meta', data: metaPorBucket, borderColor:'#E0951A', borderDash:[6,4], backgroundColor:'transparent',
          fill:false, tension:.2, pointRadius:2, pointBackgroundColor:'#E0951A' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect:false, mode:'index' },
      plugins: {
        legend: { display:true, position:'bottom', labels:{ usePointStyle:true, color:'#0A0A0A' } },
        datalabels: {
          align: 'top', anchor: 'end', offset: 4,
          font: { family: "'DM Sans',sans-serif", weight: '700', size: 10 },
          color: (ctx) => ctx.dataset.borderColor,
          formatter: (v) => v > 0 ? 'Bs '+Math.round(v).toLocaleString('es-BO') : '',
        }
      },
      scales: {
        y: { ticks: { color:'#0A0A0A', callback: v => 'Bs '+Number(v).toLocaleString('es-BO',{maximumFractionDigits:0}) }, grid:{color:'rgba(10,10,10,.10)'} },
        x: { ticks: { color:'#0A0A0A', autoSkip:true, maxRotation:0 }, grid:{color:'rgba(10,10,10,.10)'} }
      }
    }
  });
}

async function renderCumplimientoMensual() {
  const cont = document.getElementById('exp-cumplimiento-tbody');
  if (!cont) return;

  const buckets = {};
  expAdminData.forEach(e => {
    if (!e.anio || !e.mes) return;
    const mesNum = MESES_ES_NOMBRE.indexOf(e.mes);
    if (mesNum < 1) return;
    const key = e.anio+'-'+mesNum;
    (buckets[key] ||= {anio:e.anio, mesNum, monto:0}).monto += (e.monto||0);
  });
  const ordenados = Object.values(buckets).sort((a,b)=> (b.anio*12+b.mesNum)-(a.anio*12+a.mesNum));

  if (!ordenados.length) { cont.innerHTML = '<tr><td colspan="5"><div class="empty-state">Sin datos.</div></td></tr>'; return; }

  const filas = [];
  for (const b of ordenados) {
    const meta = await window._fbGetMetaOnce(b.anio, MESES_ES_NOMBRE[b.mesNum], 'expensas');
    const pct  = meta ? Math.round(b.monto/meta*100) : null;
    filas.push({...b, meta, pct});
  }

  cont.innerHTML = filas.map(f => `<tr>
    <td>${f.anio}</td>
    <td>${esc(MESES_ES_NOMBRE[f.mesNum])}</td>
    <td>${f.meta ? 'Bs '+f.meta.toLocaleString('es-BO',{maximumFractionDigits:0}) : '<span style="color:var(--gris);">sin meta</span>'}</td>
    <td style="font-weight:600;color:var(--cartera);">Bs ${f.monto.toLocaleString('es-BO',{maximumFractionDigits:0})}</td>
    <td>${f.pct!==null ? `<span style="font-weight:700;color:${f.pct>=100?'var(--ok)':f.pct>=75?'var(--warn)':'var(--danger)'}">${f.pct}%</span>` : '—'}</td>
  </tr>`).join('');
}

async function renderCumplimientoSemanal() {
  const cont = document.getElementById('exp-cumplimiento-sem-tbody');
  if (!cont) return;

  const buckets = {};
  expAdminData.forEach(e => {
    if (!e.anio || !e.mes || !e.semana) return;
    const mesNum = MESES_ES_NOMBRE.indexOf(e.mes);
    if (mesNum < 1) return;
    const semNum = parseInt((e.semana||'S1').replace('S',''))||1;
    const key = e.anio+'-'+mesNum+'-'+semNum;
    (buckets[key] ||= {anio:e.anio, mesNum, semNum, monto:0}).monto += (e.monto||0);
  });
  const ordenados = Object.values(buckets).sort((a,b)=>
    (b.anio*48+b.mesNum*4+b.semNum) - (a.anio*48+a.mesNum*4+a.semNum));

  if (!ordenados.length) { cont.innerHTML = '<tr><td colspan="6"><div class="empty-state">Sin datos.</div></td></tr>'; return; }

  const metaMensualCache = {};
  const filas = [];
  for (const b of ordenados) {
    const ck = b.anio+'_'+b.mesNum;
    if (!(ck in metaMensualCache)) metaMensualCache[ck] = await window._fbGetMetaOnce(b.anio, MESES_ES_NOMBRE[b.mesNum], 'expensas');
    const metaMensual = metaMensualCache[ck];
    const metaSem = metaMensual ? metaSemanaMonto(metaMensual, b.anio, b.mesNum, b.semNum) : 0;
    const pct = metaSem ? Math.round(b.monto/metaSem*100) : null;
    filas.push({...b, metaSem, pct});
  }

  cont.innerHTML = filas.map(f => `<tr>
    <td>${f.anio}</td>
    <td>${esc(MESES_ES_NOMBRE[f.mesNum])}</td>
    <td>S${f.semNum}</td>
    <td>${f.metaSem ? 'Bs '+f.metaSem.toLocaleString('es-BO',{maximumFractionDigits:0}) : '<span style="color:var(--gris);">sin meta</span>'}</td>
    <td style="font-weight:600;color:var(--cartera);">Bs ${f.monto.toLocaleString('es-BO',{maximumFractionDigits:0})}</td>
    <td>${f.pct!==null ? `<span style="font-weight:700;color:${f.pct>=100?'var(--ok)':f.pct>=75?'var(--warn)':'var(--danger)'}">${f.pct}%</span>` : '—'}</td>
  </tr>`).join('');
}

/* ═══════════════════════════════════════════
   GESTIÓN DE CARGAS (borrar por lote — útil durante pruebas)
═══════════════════════════════════════════ */
function renderCargasExpensas() {
  const cont = document.getElementById('exp-cargas-lista');
  if (!cont) return;
  const porCarga = {};
  expAdminData.forEach(e => {
    if (!e.cargaId) return; // registros manuales (uno por uno) no forman "carga"
    (porCarga[e.cargaId] ||= { archivo:e.cargaArchivo||'—', registros:[], fecha:e.fechaCarga||'' }).registros.push(e);
  });
  const cargas = Object.entries(porCarga).sort((a,b)=> b[0].localeCompare(a[0]));

  if (!cargas.length) { cont.innerHTML = '<div class="empty-state">Sin cargas de Excel registradas (los cobros manuales uno-por-uno no cuentan como carga).</div>'; return; }

  cont.innerHTML = cargas.map(([cargaId, c]) => {
    const total = c.registros.reduce((s,r)=>s+(r.monto||0),0);
    return `
      <div class="vendor-item">
        <span class="v-name">📄 ${esc(c.archivo)} <span style="color:var(--gris);font-weight:400;">— ${c.registros.length} registro(s) · Bs ${total.toLocaleString('es-BO',{maximumFractionDigits:0})} · ${esc(c.fecha)}</span></span>
        <button class="btn-remove-vendor" onclick="eliminarCargaExpensas('${cargaId}', ${c.registros.length})" title="Eliminar esta carga completa">🗑 Eliminar carga</button>
      </div>`;
  }).join('');
}

async function eliminarCargaExpensas(cargaId, n) {
  const ok = await confirmDialog(`Se eliminarán los ${n} registros de esta carga de Excel. Esta acción no se puede deshacer.`, { title:'Eliminar carga completa', okText:'Eliminar carga' });
  if (!ok) return;
  const keys = expAdminData.filter(e => e.cargaId === cargaId).map(e => e._key);
  for (const k of keys) { try { await window._fbRemoveExpAdmin(k); } catch(e) {} }
  toastOk(keys.length + ' registros eliminados.');
  setTimeout(renderCargasExpensas, 400);
}

async function vaciarTodoExpensas() {
  if (!expAdminData.length) { toastErr('No hay nada que borrar.'); return; }
  const ok = await confirmDialog(`Se eliminarán TODOS los ${expAdminData.length} cobros de expensas cargados (manuales y de Excel). Pensado solo para pruebas. Esta acción no se puede deshacer.`, { title:'⚠️ Vaciar todo Expensas', okText:'Sí, vaciar todo' });
  if (!ok) return;
  const keys = expAdminData.map(e => e._key);
  for (const k of keys) { try { await window._fbRemoveExpAdmin(k); } catch(e) {} }
  toastOk('Se vació todo el módulo de Expensas.');
  setTimeout(renderCargasExpensas, 400);
}

function renderExpensasAdmin() {
  const mes  = mesActual();
  const anio = anioActual();
  const lbl  = document.getElementById('exp-periodo-label');
  if (lbl) lbl.textContent = mes + ' ' + anio;

  // Poblar el filtro de Año dinámicamente según los datos que hay cargados
  const anioSel = document.getElementById('exp-fil-anio');
  const mesSel  = document.getElementById('exp-fil-mes');
  if (anioSel && !anioSel.dataset.filled) {
    const anios = [...new Set(expAdminData.map(e=>e.anio).filter(Boolean))].sort((a,b)=>b-a);
    if (!anios.length) anios.push(new Date().getFullYear());
    if (!anios.includes(anio)) anios.unshift(anio);
    anioSel.innerHTML = '<option value="">Todos los años</option>' +
      anios.map(a=>`<option value="${a}">${a}</option>`).join('');
    anioSel.value = anio; // por defecto: año en curso
    if (mesSel) mesSel.value = mes; // por defecto: mes en curso
    anioSel.dataset.filled = '1';
  }

  const filAnio = document.getElementById('exp-fil-anio')?.value || '';
  const filMes  = document.getElementById('exp-fil-mes')?.value || '';
  const filSem  = document.getElementById('exp-fil-semana')?.value || '';
  let datos = expAdminData;
  if (filAnio) datos = datos.filter(e => String(e.anio)===String(filAnio));
  if (filMes)  datos = datos.filter(e => e.mes===filMes);
  if (filSem)  datos = datos.filter(e => e.semana===filSem);

  const delMes  = expAdminData.filter(e => e.mes===mes && e.anio===anio);
  const total   = delMes.reduce((s,e)=>s+(e.monto||0), 0);
  const historico = expAdminData.reduce((s,e)=>s+(e.monto||0), 0);

  countUpMoney(document.getElementById('exp-cobrado-val'), total, 900, 'Bs ');
  setText('exp-cobrado-n', delMes.length+' cobros');
  countUpMoney(document.getElementById('exp-historico-val'), historico, 900, 'Bs ');

  // ── KPIs por estado, según el período filtrado (Año/Mes/Semana de arriba) ──
  const ESTADOS_KPI = ['Adelantado','Vigente','Mora 1-30','Mora 31-60','Mora 61-90','Mora 91-180','Mora +180'];
  const porEstado = {};
  ESTADOS_KPI.concat('Sin gestión').forEach(k => porEstado[k] = {monto:0, n:0});
  datos.forEach(e => {
    const key = porEstado[e.estado] ? e.estado : 'Sin gestión';
    porEstado[key].monto += (e.monto||0);
    porEstado[key].n += 1;
  });
  const idsEstado = { 'Adelantado':'adelantado', 'Vigente':'vigente', 'Mora 1-30':'mora1', 'Mora 31-60':'mora2', 'Mora 61-90':'mora3', 'Mora 91-180':'mora4', 'Mora +180':'mora5' };
  ESTADOS_KPI.forEach(k => {
    const id = idsEstado[k];
    setText('exp-kpi-'+id+'-val', 'Bs '+porEstado[k].monto.toLocaleString('es-BO',{maximumFractionDigits:0}));
    setText('exp-kpi-'+id+'-n', porEstado[k].n+' cobro(s)');
  });
  const totalFiltrado = datos.reduce((s,e)=>s+(e.monto||0),0);
  setText('exp-kpi-periodo-label', (filAnio||filMes||filSem) ? [filMes,filAnio,filSem].filter(Boolean).join(' · ') : 'Todo el histórico');
  setText('exp-kpi-total-filtrado', 'Bs '+totalFiltrado.toLocaleString('es-BO',{maximumFractionDigits:0}));

  // Meta y % de cumplimiento del período filtrado (solo tiene sentido si se eligió un Mes + Año puntual)
  const metaBox = document.getElementById('exp-kpi-meta-box');
  if (metaBox) {
    if (filAnio && filMes) {
      metaBox.style.display = 'block';
      window._fbGetMetaOnce(filAnio, filMes, 'expensas').then(metaF => {
        const pctF = metaF ? Math.round(totalFiltrado/metaF*100) : 0;
        setText('exp-kpi-meta-filtrada', metaF ? 'Bs '+metaF.toLocaleString('es-BO',{maximumFractionDigits:0}) : 'Sin meta cargada');
        setText('exp-kpi-pct-filtrado', metaF ? pctF+'%' : '—');
        const pctEl = document.getElementById('exp-kpi-pct-filtrado');
        if (pctEl) pctEl.style.color = pctF>=100 ? 'var(--ok)' : pctF>=75 ? 'var(--warn)' : 'var(--danger)';
      });
    } else {
      metaBox.style.display = 'none';
    }
  }

  // ── Tabla: cantidad de CLIENTES (lotes distintos) por estado, según el mismo filtro de arriba ──
  const clientesTbody = document.getElementById('exp-clientes-estado-tbody');
  if (clientesTbody) {
    const porEstadoClientes = {};
    ESTADOS_KPI.forEach(k => porEstadoClientes[k] = { lotes:new Set(), monto:0 });
    datos.forEach(e => {
      const key = porEstadoClientes[e.estado] ? e.estado : null;
      if (!key) return;
      porEstadoClientes[key].lotes.add(e.terreno || e.cliente);
      porEstadoClientes[key].monto += (e.monto||0);
    });
    const filasClientes = ESTADOS_KPI.map(k => ({ estado:k, n:porEstadoClientes[k].lotes.size, monto:porEstadoClientes[k].monto }))
      .filter(f => f.n > 0);
    clientesTbody.innerHTML = filasClientes.length ? filasClientes.map(f => `<tr>
      <td>${_pintarEstadoExp(f.estado)}</td>
      <td style="font-weight:600;">${f.n} cliente(s)</td>
      <td style="font-weight:600;color:var(--cartera);">Bs ${f.monto.toLocaleString('es-BO',{maximumFractionDigits:0})}</td>
    </tr>`).join('') : '<tr><td colspan="3"><div class="empty-state">Sin datos para este período.</div></td></tr>';
  }

  window._fbListenMetas(anio, mes, metas => {
    const meta  = metas?.expensas?.monto || 0;
    const pct   = meta ? Math.round(total/meta*100) : 0;
    const falta = meta ? Math.max(0, meta-total) : 0;
    setText('exp-meta-val',   meta ? 'Bs '+Number(meta).toLocaleString('es-BO') : '—');
    setText('exp-pct-val',    pct+'%');
    setText('exp-falta-val',  meta ? 'Falta: Bs '+falta.toLocaleString('es-BO',{maximumFractionDigits:0}) : '—');
    setText('exp-barra-pct',  pct+'%');
    const bar = document.getElementById('exp-barra');
    if (bar) {
      bar.style.width = Math.min(pct,100)+'%';
      bar.style.background = pct>=100 ? 'linear-gradient(90deg,var(--ok),var(--ok-light))'
                           : pct>=75  ? 'linear-gradient(90deg,var(--warn),var(--warn-light))'
                           :            'linear-gradient(90deg,var(--info),var(--accent))';
    }
    if (typeof updateHomeMetas === 'function') updateHomeMetas('expensas', total, meta, pct);
  });

  // Lista cobros
  const lista = document.getElementById('exp-cobros-lista');
  if (lista) {
    lista.innerHTML = datos.length ? datos.map(e => `
      <div class="cobro-card">
        <div class="cobro-card-left">
          <div class="cobro-nombre">${e.cliente} ${e.estado?_pintarEstadoExp(e.estado):''}</div>
          <div class="cobro-meta">${e.terreno||'—'} · ${e.semana||''} ${e.mes||''} ${e.anio||''}</div>
          ${e.obs?`<div style="font-size:var(--fs-sm);color:var(--gris);font-style:italic;">${esc(e.obs)}</div>`:''}
        </div>
        <div class="cobro-monto">
          <div class="cobro-monto-val">Bs ${(e.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div class="cobro-monto-label">${e.fechaCarga||''}</div>
          <button class="btn-del" style="margin-top:6px;" onclick="window._fbRemoveExpAdmin('${e._key}')">🗑</button>
        </div>
      </div>`).join('')
    : '<div class="empty-state">Sin cobros de expensas.</div>';
  }

  renderTendenciaExpensas();
  renderCumplimientoMensual();
  renderCumplimientoSemanal();
}

/* ═══════════════════════════════════════════
   VISTA — Detalle por cliente/lote (histórico semanal)
═══════════════════════════════════════════ */
function cambiarVistaExpensas(vista) {
  const btnC = document.getElementById('exp-vista-cobros-btn');
  const btnD = document.getElementById('exp-vista-detalle-btn');
  const listaC = document.getElementById('exp-cobros-lista');
  const listaD = document.getElementById('exp-detalle-lista');
  const on  = {background:'#fff', color:'var(--ink-900)', boxShadow:'var(--shadow-xs)'};
  const off = {background:'transparent', color:'var(--gris)', boxShadow:'none'};
  if (vista === 'detalle') {
    Object.assign(btnD.style, on); Object.assign(btnC.style, off);
    listaC.style.display = 'none'; listaD.style.display = 'block';
    renderDetalleExpensasPorCliente();
  } else {
    Object.assign(btnC.style, on); Object.assign(btnD.style, off);
    listaD.style.display = 'none'; listaC.style.display = 'block';
  }
}

function buscarClienteExpensas() {
  const term = document.getElementById('exp-buscar-cliente')?.value || '';
  renderDetalleExpensasPorCliente(term);
}

function renderDetalleExpensasPorCliente(searchTerm) {
  const cont = document.getElementById('exp-detalle-lista-body');
  if (!cont) return;
  if (!expAdminData.length) { cont.innerHTML = '<div class="empty-state">Sin datos.</div>'; return; }

  // Agrupar por lote (terreno)
  const porLote = {};
  expAdminData.forEach(e => {
    const key = e.terreno || e.cliente;
    (porLote[key] ||= { cliente:e.cliente, terreno:e.terreno, registros:[] }).registros.push(e);
  });

  let grupos = Object.values(porLote).sort((a,b)=> (a.cliente||'').localeCompare(b.cliente||''));

  const term = (searchTerm||'').trim().toLowerCase();
  if (term) {
    grupos = grupos.filter(g =>
      (g.cliente||'').toLowerCase().includes(term) || (g.terreno||'').toLowerCase().includes(term));
    if (!grupos.length) {
      cont.innerHTML = `<div class="empty-state" style="padding:24px;">
        🆕 <b>Cliente 1er pago</b> — no se encontró "${esc(searchTerm)}" en ningún registro cargado hasta ahora.
        <br><span style="font-size:var(--fs-sm);">Si acaba de pagar por primera vez, cuando lo cargues quedará marcado así automáticamente.</span>
      </div>`;
      return;
    }
  }

  cont.innerHTML = grupos.map((g, idx) => {
    const periodos = g.registros.filter(r=>r.mesPeriodoNum && r.anioPeriodo).map(r=>({mesNum:r.mesPeriodoNum, anio:r.anioPeriodo}));
    const estado = periodos.length ? calcularEstadoExpensa(periodos) : 'Sin gestión';
    const totalPagado = g.registros.reduce((s,r)=>s+(r.monto||0),0);
    const esPrimerPago = periodos.length === 1;
    const filas = [...g.registros].sort((a,b)=>{
      const pa = (a.anioPeriodo||a.anio||0)*12+(a.mesPeriodoNum||0);
      const pb = (b.anioPeriodo||b.anio||0)*12+(b.mesPeriodoNum||0);
      return pb - pa;
    });
    return `
      <div class="admin-section" style="margin-bottom:10px;padding:16px 18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="const el=document.getElementById('exp-det-${idx}'); el.style.display = el.style.display==='none'?'block':'none';">
          <div>
            <div style="font-weight:600;">${esc(g.cliente)} ${_pintarEstadoExp(estado)} ${esPrimerPago?'<span style="padding:2px 8px;border-radius:999px;font-size:var(--fs-xs);font-weight:600;background:var(--info)22;color:var(--info);">🆕 Cliente 1er pago</span>':''}</div>
            <div style="font-size:var(--fs-sm);color:var(--gris);">Lote ${esc(g.terreno||'—')} · ${g.registros.length} período(s) registrado(s)</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:600;color:var(--cartera);">Bs ${totalPagado.toLocaleString('es-BO',{minimumFractionDigits:2})}</div>
            <div style="font-size:var(--fs-xs);color:var(--gris);">total histórico ▾</div>
          </div>
        </div>
        <div id="exp-det-${idx}" style="display:none;margin-top:12px;">
          <div class="tabla-wrap">
            <table><thead><tr><th>Cuota pagada</th><th>Fecha de pago</th><th>Monto</th><th>Tipo</th><th>Categoría</th></tr></thead>
            <tbody>
              ${filas.map(r=>`<tr>
                <td>${esc(r.cuotaLabel || ((r.mes||'')+' '+(r.anio||'')))}</td>
                <td>${esc(r.mes||'')} ${esc(String(r.anio||''))} <span style="color:var(--gris);font-size:var(--fs-xs);">(${esc(r.semana||'—')})</span></td>
                <td style="font-weight:600;">Bs ${(r.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2})}</td>
                <td>${esc(r.tipoPago||'—')}</td>
                <td style="font-size:var(--fs-xs);">${esc(r.categoriaNombre||'—')}</td>
              </tr>`).join('')}
            </tbody></table>
          </div>
        </div>
      </div>`;
  }).join('');
}

function exportarExpensasAdmin() {
  if (!expAdminData.length) { toastErr('Sin datos para exportar.'); return; }
  const rows = expAdminData.map(e=>({
    'Cliente':e.cliente,'Terreno':e.terreno,'Monto (Bs)':e.monto,
    'Semana':e.semana,'Mes':e.mes,'Año':e.anio,'Estado':e.estado||'','Categoría':e.categoriaNombre||'','Observaciones':e.obs
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Expensas');
  XLSX.writeFile(wb,`expensas_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/* ═══════════════════════════════════════════
   MARKETING — PANEL ADMIN
═══════════════════════════════════════════ */
function renderAdminMarketing() {
  const mes  = mesActual();
  const anio = anioActual();
  const filS  = document.getElementById('adm-fil-semana')?.value || '';
  const filM  = document.getElementById('adm-fil-mes-mkt')?.value || '';
  const filE  = document.getElementById('adm-fil-estado-mkt')?.value || '';

  renderCallCenterKPIs();

  // Label mes
  const lbl = document.getElementById('adm-mkt-mes-label');
  if (lbl) lbl.textContent = mes + ' ' + anio;

  const anioC = new Date().getFullYear();
  const delMes = leadsData.filter(l => l.mes===mes && l.anio===anio);
  const funnelData = calcularFunnelDatos(mes, anioC);
  const [etapaLeads, etapaAgendadas, etapaConcretadas, etapaCierres] = funnelData;

  // KPIs — mismos números que ve Marketing y el dashboard de Gerencia (calcularFunnelDatos)
  countUp(document.getElementById('adm-leads-total'), etapaLeads.n);
  setText('adm-leads-mes', 'este mes (' + mes + ')');
  countUp(document.getElementById('adm-visitas-total'), etapaConcretadas.n);
  countUp(document.getElementById('adm-cierres-total'), etapaCierres.n);
  const conv = etapaLeads.n ? Math.round(etapaCierres.n/etapaLeads.n*100) : 0;
  setText('adm-conv-pct', conv + '% conversion');

  // Metas
  window._fbListenMetas(anio, mes, metas => {
    const metaL = metas?.mkt_leads?.monto   || 0;
    const metaV = metas?.mkt_visitas?.monto || 0;
    const metaC = metas?.mkt_cierres?.monto || 0;
    const pctL = metaL ? Math.round(etapaLeads.n/metaL*100) : 0;
    const pctV = metaV ? Math.round(etapaConcretadas.n/metaV*100) : 0;
    const pctC = metaC ? Math.round(etapaCierres.n/metaC*100) : 0;

    setText('adm-leads-actual',    etapaLeads.n);
    setText('adm-leads-meta-txt',  metaL ? 'meta: '+metaL : 'meta: —');
    setText('adm-leads-pct',       pctL+'%');
    const bL = document.getElementById('adm-leads-bar');
    if (bL) bL.style.width = Math.min(pctL,100)+'%';

    setText('adm-visitas-actual',   etapaConcretadas.n);
    setText('adm-visitas-meta-txt', metaV ? 'meta: '+metaV : 'meta: —');
    setText('adm-visitas-pct',      pctV+'%');
    const bV = document.getElementById('adm-visitas-bar');
    if (bV) bV.style.width = Math.min(pctV,100)+'%';

    setText('adm-cierres-actual',   etapaCierres.n);
    setText('adm-cierres-meta-txt', metaC ? 'meta: '+metaC : 'meta: —');
    setText('adm-cierres-pct',      pctC+'%');
    const bC = document.getElementById('adm-cierres-bar');
    if (bC) bC.style.width = Math.min(pctC,100)+'%';
  });

  // Embudo — el mismo de 4 etapas que ve Marketing (Leads → Agendadas → Concretadas → Cierres)
  pintarFunnelEnDiv('adm-mkt-embudo', funnelData);
  renderTendenciaMarketing('adm-mkt-chart-tendencia');

  // Leads por campaña (fuente real: los códigos que carga Marketing)
  const fuentesEl = document.getElementById('adm-mkt-fuentes');
  if (fuentesEl) {
    const porCampania = {};
    leadsSemanalesData.filter(l=>l.mes===mes && l.anio===anioC).forEach(l => {
      const k = l.campaniaCodigo || 'Sin campaña';
      porCampania[k] = (porCampania[k]||0) + (l.cantidad||0);
    });
    if (!Object.keys(porCampania).length) {
      delMes.forEach(l => { porCampania[l.fuente||'Otro'] = (porCampania[l.fuente||'Otro']||0)+1; });
    }
    const maxF = Math.max(...Object.values(porCampania), 1);
    const colFuente = ['var(--info)','var(--warn)','var(--ok)','var(--accent)','var(--danger)','var(--warn-strong)'];
    fuentesEl.innerHTML = Object.entries(porCampania).sort((a,b)=>b[1]-a[1]).map(([f,n],i)=>`
      <div class="bar-item">
        <div class="bar-label"><span>${f}</span><span><strong>${n}</strong></span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${n/maxF*100}%;background:${colFuente[i%colFuente.length]};"></div></div>
      </div>`).join('') || '<div class="empty-state">Sin datos.</div>';
  }

  // Por semana
  const semanasEl = document.getElementById('adm-mkt-semanas');
  if (semanasEl) {
    const porSem = { S1:0, S2:0, S3:0, S4:0 };
    delMes.forEach(l => { if (l.semana && porSem[l.semana]!==undefined) porSem[l.semana]++; });
    const maxS = Math.max(...Object.values(porSem), 1);
    semanasEl.innerHTML = Object.entries(porSem).map(([s,n])=>`
      <div class="bar-item">
        <div class="bar-label"><span>${s}</span><span><strong>${n}</strong></span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${n/maxS*100}%;background:var(--info);"></div></div>
      </div>`).join('');
  }

  // Por estado
  const estadosEl = document.getElementById('adm-mkt-estados');
  if (estadosEl) {
    const porEst = {};
    delMes.forEach(l => { porEst[l.estado||'Nuevo'] = (porEst[l.estado||'Nuevo']||0)+1; });
    const colEst = { Nuevo:'var(--info)', Contactado:'var(--warn)', Agendado:'var(--ok)', Descartado:'var(--danger)' };
    const maxE = Math.max(...Object.values(porEst), 1);
    estadosEl.innerHTML = Object.entries(porEst).sort((a,b)=>b[1]-a[1]).map(([e,n])=>`
      <div class="bar-item">
        <div class="bar-label"><span>${e}</span><span><strong>${n}</strong></span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${n/maxE*100}%;background:${colEst[e]||'#6b7280'};"></div></div>
      </div>`).join('') || '<div class="empty-state">Sin datos.</div>';
  }

  // Tabla leads filtrada
  let datos = leadsData;
  if (filS) datos = datos.filter(l=>l.semana===filS);
  if (filM) datos = datos.filter(l=>l.mes===filM);
  if (filE) datos = datos.filter(l=>l.estado===filE);
  const tb = document.getElementById('adm-leads-tabla-body');
  if (tb) {
    tb.innerHTML = datos.length ? datos.map(l=>`<tr>
      <td><strong>${esc(l.nombre)}</strong></td>
      <td style="font-size:var(--fs-sm);">${l.telefono||'—'}</td>
      <td style="font-size:var(--fs-sm);">${l.fuente||'—'}</td>
      <td style="font-size:var(--fs-sm);text-align:center;">${l.semana||'—'}</td>
      <td style="font-size:var(--fs-sm);">${l.mes||'—'}</td>
      <td><select onchange="actualizarEstadoLead('${l._key}',this.value)" style="padding:3px 8px;border:1.5px solid var(--line);border-radius:var(--r-sm);font-size:var(--fs-sm);font-family:'DM Sans',sans-serif;">
        <option ${l.estado==='Nuevo'?'selected':''}>Nuevo</option>
        <option ${l.estado==='Contactado'?'selected':''}>Contactado</option>
        <option ${l.estado==='Agendado'?'selected':''}>Agendado</option>
        <option ${l.estado==='Descartado'?'selected':''}>Descartado</option>
      </select></td>
      <td style="font-size:var(--fs-sm);">${l.cargadoPor||'—'}</td>
      <td style="font-size:var(--fs-xs);color:var(--gris);">${l.fechaCarga||''}</td>
    </tr>`).join('')
    : '<tr><td colspan="8" class="empty-state">Sin leads con los filtros aplicados.</td></tr>';
  }
}

function abrirModalMetaMarketing() {
  const anioSel = document.getElementById('meta-mkt-anio');
  const anioActualN = new Date().getFullYear();
  const anios = [...new Set([anioActualN, anioActualN-1, anioActualN+1])].sort((a,b)=>b-a);
  anioSel.innerHTML = anios.map(a=>`<option value="${a}">${a}</option>`).join('');
  anioSel.value = anioActualN;
  document.getElementById('meta-mkt-mes').value = mesActual();
  cargarMetaMarketingExistente();
  document.getElementById('modal-meta-marketing').classList.add('open');
}
function cerrarModalMetaMarketing() {
  document.getElementById('modal-meta-marketing').classList.remove('open');
}
function cargarMetaMarketingExistente() {
  const anio = document.getElementById('meta-mkt-anio').value;
  const mes  = document.getElementById('meta-mkt-mes').value;
  window._fbListenMetas(anio, mes, metas => {
    document.getElementById('meta-mkt-leads').value   = metas?.mkt_leads?.monto   || '';
    document.getElementById('meta-mkt-visitas').value = metas?.mkt_visitas?.monto || '';
    document.getElementById('meta-mkt-cierres').value = metas?.mkt_cierres?.monto || '';
  });
}
async function guardarMetaMarketing() {
  const anio = document.getElementById('meta-mkt-anio').value;
  const mes  = document.getElementById('meta-mkt-mes').value;
  const metaL = Number(document.getElementById('meta-mkt-leads').value) || 0;
  const metaV = Number(document.getElementById('meta-mkt-visitas').value) || 0;
  const metaC = Number(document.getElementById('meta-mkt-cierres').value) || 0;

  const btn = document.querySelector('#modal-meta-marketing .confirm-btn-ok');
  btnLoading(btn, true);
  await window._fbSetMeta(anio, mes, { mkt_leads:{monto:metaL}, mkt_visitas:{monto:metaV}, mkt_cierres:{monto:metaC} });
  btnSuccess(btn);
  toastOk('Metas de ' + mes + ' ' + anio + ' guardadas.');
  setTimeout(() => { cerrarModalMetaMarketing(); renderAdminMarketing(); renderDashboard(); }, 500);
}

function exportarLeads() {
  if (!leadsData.length) { toastErr('Sin leads para exportar.'); return; }
  const rows = leadsData.map(l=>({ Nombre:l.nombre, Teléfono:l.telefono, Fuente:l.fuente, Semana:l.semana, Mes:l.mes, Estado:l.estado, Observaciones:l.obs, 'Fecha carga':l.fechaCarga }));
  const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Leads'); XLSX.writeFile(wb,`leads_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/* ═══════════════════════════════════════════
   VENTAS — FICHERO INDIVIDUAL
═══════════════════════════════════════════ */
function renderFicheroVendedor() {
  if (!asesorActual) return;
  const mes  = mesActual();
  const anio = anioActual();
  setText('fichero-nombre', asesorActual.nombre);
  setText('fichero-mes-label', mes + ' ' + anio);
  const rolInfo = ROL_LABELS[asesorActual.rol||'ventas'] || ROL_LABELS.ventas;
  const badgeEl = document.getElementById('fichero-rol-badge');
  if (badgeEl) badgeEl.innerHTML = `<span class="rol-badge" style="background:${rolInfo.bg};color:${rolInfo.color};">${rolInfo.icon} ${rolInfo.label}</span>`;

  const misReg = misRegs.filter(r => r.mes===mes);
  const visitas   = misReg.length; // cada registro YA es una visita concretada
  const cierres   = misReg.filter(r => r.conclusion==='Reserva' || r.huboCierre==='SI').length;

  setText('fich-total-reg', misReg.length);
  setText('fich-visitas-conc', visitas);
  setText('fich-con-cierre', cierres);
  // Hero stats
  countUp(document.getElementById('fich-total-reg-hero'), misReg.length);
  countUp(document.getElementById('fich-visitas-hero'),   visitas);
  countUp(document.getElementById('fich-cierres-hero'),   cierres);

  window._fbListenMetaUsuario(asesorActual._key, anio, mes, metas => {
    const metaVisitas = metas?.visitas?.monto || 0;
    const metaCierres = metas?.cierres?.monto || 0;
    const pctV = metaVisitas ? Math.round(visitas/metaVisitas*100) : 0;
    const pctC = metaCierres ? Math.round(cierres/metaCierres*100) : 0;

    setText('fichero-visitas-real', visitas);
    setText('fichero-visitas-meta', metaVisitas || '—');
    setText('fichero-visitas-pct', pctV+'%');
    const bV = document.getElementById('fichero-visitas-bar');
    if (bV) { bV.style.width=Math.min(pctV,100)+'%'; bV.style.background=pctV>=100?'linear-gradient(90deg,var(--ok),var(--ok-light))':pctV>=75?'linear-gradient(90deg,var(--warn),var(--warn-light))':'linear-gradient(90deg,var(--info),var(--info-light))'; }

    setText('fichero-cierres-real', cierres);
    setText('fichero-cierres-meta', metaCierres || '—');
    setText('fichero-cierres-pct', pctC+'%');
    const bC = document.getElementById('fichero-cierres-bar');
    if (bC) { bC.style.width=Math.min(pctC,100)+'%'; bC.style.background=pctC>=100?'linear-gradient(90deg,var(--ok),var(--ok-light))':pctC>=75?'linear-gradient(90deg,var(--warn),var(--warn-light))':'linear-gradient(90deg,var(--ok),var(--ok-light))'; }
  });

  // Lista registros del mes
  const lista = document.getElementById('fichero-registros-lista');
  if (lista) {
    lista.innerHTML = misReg.length ? misReg.map(r=>`
      <div class="cobro-card">
        <div class="cobro-card-left">
          <div class="cobro-nombre">${r.nombre||'—'}</div>
          <div class="cobro-meta">${r.origen||'—'} · ${r.fecha||r.fechaCarga||''}</div>
          <div class="cobro-pills">
            ${r.terrenoInteres?`<span class="badge badge-contrato" style="font-size:var(--fs-xs);">🗺 ${r.terrenoInteres}</span>`:''}
            ${r.conclusion==='Reserva'?'<span class="badge badge-contrato" style="font-size:var(--fs-xs);">🏆 Reserva</span>':''}
            ${r.estado?`<span class="badge badge-def" style="font-size:var(--fs-xs);">${r.estado}</span>`:''}
          </div>
        </div>
      </div>`).join('')
    : '<div class="empty-state">Sin registros este mes.</div>';
  }
}

/* ═══════════════════════════════════════════
   CARTERA — EXCEL + AGRUPACIÓN
═══════════════════════════════════════════ */
function descargarPlantillaCobranza() {
  const rows = [{ 'Cliente':'Ejemplo','Terreno':'UV1-4-31','Monto ($)':'500','Estado':'Al día','Fecha':'2026-05-15','Mes':'Mayo','Año':'2026','Observaciones':'' }];
  const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Cobranza'); XLSX.writeFile(wb,'plantilla_cobranza.xlsx');
}

function procesarExcelCobranza(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, {type:'binary'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    cobranzaExcelPend = rows.map(r=>({
      cliente:  String(r['Cliente']||'').trim(),
      terreno:  String(r['Terreno']||'').trim(),
      monto:    parseFloat(r['Monto ($)']||r['Monto']||0),
      estado:   String(r['Estado']||'Sin gestión').trim(),
      fecha:    String(r['Fecha']||'').trim(),
      mes:      String(r['Mes']||'').trim(),
      anio:     parseInt(r['Año']||r['Anio']||new Date().getFullYear()),
      obs:      String(r['Observaciones']||'').trim(),
      cargadoPor: asesorActual?.nombre||'Admin',
      fechaCarga: new Date().toLocaleString('es-BO'),
    })).filter(r=>r.cliente);
    setText('cart-preview-count', cobranzaExcelPend.length);
    const tbody = document.getElementById('cart-preview-body');
    if (tbody) tbody.innerHTML = cobranzaExcelPend.map(r=>`<tr><td>${r.cliente}</td><td>${r.terreno}</td><td style="font-weight:600;color:var(--cartera);">$${r.monto.toFixed(2)}</td><td>${r.estado}</td><td>${r.fecha}</td><td>${r.mes}</td></tr>`).join('');
    const prev = document.getElementById('cart-excel-preview');
    if (prev) prev.style.display = 'block';
  };
  reader.readAsBinaryString(file);
}

async function confirmarImportCobranza() {
  let ok=0;
  for (const r of cobranzaExcelPend) { try { await window._fbPushCobranzaExcel(r); ok++; } catch(e){} }
  toastOk(ok + ' registros importados.');
  cancelarImportCobranza();
}

function cancelarImportCobranza() {
  cobranzaExcelPend=[];
  const prev = document.getElementById('cart-excel-preview');
  if (prev) prev.style.display='none';
  const inp = document.getElementById('cart-excel-file');
  if (inp) inp.value='';
}

const ESTADOS_CARTERA_COLOR = {
  'Al día':       'var(--ok)', 'Pagado':     'var(--ok)',
  'Mora 1-30':    'var(--warn)', 'Mora 31-60': 'var(--warn-strong)',
  'Mora +60':     'var(--danger)', 'Parcial':    'var(--warn)',
  'Sin gestión':  '#9ca3af'
};

function renderCobranzaKPIs() {
  const mes  = mesActual();
  const anio = anioActual();
  const delMes = cobranzaExcelData.filter(c=>c.mes===mes&&c.anio===anio);
  const total  = delMes.reduce((s,c)=>s+(c.monto||0),0);
  const clientes = [...new Set(delMes.map(c=>c.cliente))].length;

  setText('cart-total',     '$'+total.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setText('cart-total-sub', 'este mes');
  setText('cart-clientes',  clientes);
  setText('cart-registros', cobranzaExcelData.length);

  // Meta cartera
  window._fbListenMetaUsuario(asesorActual?._key||'cart', anio, mes, metas => {
    const meta = metas?.cartera?.monto || 0;
    const pct  = meta ? Math.round(total/meta*100) : 0;
    setText('cart-meta',     meta ? '$'+Number(meta).toLocaleString('es-BO') : '—');
    setText('cart-meta-pct', meta ? pct+'% alcanzado' : 'sin meta asignada');
    setText('cart-barra-pct', pct+'%');
    const bar = document.getElementById('cart-barra');
    if (bar) { bar.style.width=Math.min(pct,100)+'%'; bar.style.background=pct>=100?'linear-gradient(90deg,var(--ok),var(--ok-light))':pct>=75?'linear-gradient(90deg,var(--warn),var(--warn-light))':'linear-gradient(90deg,var(--cartera),var(--cartera-light))'; }
  });
}

function renderCobranzaAgrupada() {
  const filMes  = document.getElementById('cart-fil-mes')?.value || '';
  const filEst  = document.getElementById('cart-fil-estado')?.value || '';
  let datos = cobranzaExcelData;
  if (filMes) datos = datos.filter(c=>c.mes===filMes);
  if (filEst) datos = datos.filter(c=>c.estado===filEst);

  // Agrupar por estado
  const grupos = {};
  datos.forEach(c => {
    const est = c.estado || 'Sin gestión';
    if (!grupos[est]) grupos[est] = { registros:[], total:0 };
    grupos[est].registros.push(c);
    grupos[est].total += (c.monto||0);
  });

  const cont = document.getElementById('cart-agrupada-lista');
  if (!cont) return;
  if (!Object.keys(grupos).length) { cont.innerHTML='<div class="empty-state">Sin datos.</div>'; return; }

  const totalGlobal = datos.reduce((s,c)=>s+(c.monto||0),0);
  cont.innerHTML = Object.entries(grupos)
    .sort((a,b)=>b[1].total-a[1].total)
    .map(([est, g]) => {
      const color = ESTADOS_CARTERA_COLOR[est] || '#6b7280';
      const pct   = totalGlobal ? Math.round(g.total/totalGlobal*100) : 0;
      return `<div style="border:1.5px solid #f3f4f6;border-radius:var(--r-lg);margin-bottom:10px;overflow:hidden;">
        <div style="background:var(--bg-soft);padding:12px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <div style="display:flex;align-items:center;gap:var(--sp-2);">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></div>
            <strong style="font-size:var(--fs-md);">${est}</strong>
            <span style="font-size:var(--fs-sm);color:var(--gris);">${g.registros.length} registros</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:var(--fs-base);font-weight:700;color:${color};">$${g.total.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
            <div style="font-size:var(--fs-xs);color:var(--gris);">${pct}% del total</div>
          </div>
        </div>
        <div style="display:none;">
          <div class="tabla-wrap">
            <table>
              <thead><tr><th>Cliente</th><th>Terreno</th><th>Monto</th><th>Fecha</th><th>Obs.</th></tr></thead>
              <tbody>${g.registros.map(r=>`<tr>
                <td>${r.cliente}</td><td>${r.terreno||'—'}</td>
                <td style="font-weight:600;color:${color};">$${(r.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                <td style="font-size:var(--fs-sm);">${r.fecha||''}</td>
                <td style="font-size:var(--fs-sm);color:var(--gris);">${r.obs||''}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>`;
    }).join('');
}

function exportarCobranzaExcel() {
  if (!cobranzaExcelData.length) { toastErr('Sin datos para exportar.'); return; }
  const rows = cobranzaExcelData.map(r=>({ Cliente:r.cliente, Terreno:r.terreno, 'Monto ($)':r.monto, Estado:r.estado, Fecha:r.fecha, Mes:r.mes, Año:r.anio, Observaciones:r.obs, 'Fecha carga':r.fechaCarga }));
  const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Cobranza'); XLSX.writeFile(wb,`cobranza_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function updateMetaBarra(prefix, actual, meta, color) {
  const pct = meta ? Math.round(actual/meta*100) : 0;
  setText(prefix+'-cobrado', actual);
  setText(prefix+'-meta-txt', meta ? 'meta: '+meta : 'meta: —');
  setText(prefix+'-pct-txt', pct+'%');
  const bar = document.getElementById(prefix+'-bar');
  if (bar) bar.style.width = Math.min(pct,100)+'%';
}

/* ═══════════════════════════════════════════
   SUB-TABS COBRANZA
═══════════════════════════════════════════ */
function switchCobTab(id) {
  document.querySelectorAll('.cob-m-tab').forEach((b,i) => {
    const ids = ['resumen','cargar','registros','excel','api'];
    b.classList.toggle('active', ids[i] === id);
  });
  ['resumen','cargar','registros','excel','api'].forEach(t => {
    const el = document.getElementById('cobt-' + t);
    if (el) el.style.display = t === id ? 'block' : 'none';
  });
  if (id === 'registros') renderCobros();
}

/* ═══════════════════════════════════════════
   CATEGORÍAS
═══════════════════════════════════════════ */
function renderCategoriasConfig() {
  const cont = document.getElementById('categorias-list');
  if (!cont) return;
  const tipoLabel = { cartera:'💰 Cartera', expensas:'🏘 Expensas', ambos:'📊 Ambos' };
  cont.innerHTML = categoriasData.length ? categoriasData.map(c => `
    <div class="vendor-item">
      <div style="display:flex;align-items:center;gap:var(--sp-2);">
        <div style="width:12px;height:12px;border-radius:50%;background:${c.color};flex-shrink:0;"></div>
        <span class="v-name">${esc(c.nombre)}</span>
        <span style="font-size:var(--fs-xs);padding:2px 8px;border-radius:999px;background:${c.color}22;color:${c.color};font-weight:600;">${tipoLabel[c.tipo]||c.tipo}</span>
      </div>
      <button class="btn-remove-vendor" onclick="eliminarCategoria('${c._key}','${escJs(c.nombre)}')">×</button>
    </div>`).join('')
  : '<div class="empty-state">Sin categorías.</div>';

  // Poblar selects de categoría en formularios
  const opts = categoriasData.map(c =>
    `<option value="${c._key}" data-tipo="${c.tipo}" data-color="${c.color}">${c.nombre}</option>`).join('');
  ['nc-categoria','fil-cob-cat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const first = el.options[0]?.value === '' ? `<option value="">${el.id==='fil-cob-cat'?'Todas':'Seleccionar...'}</option>` : '';
      el.innerHTML = first + opts;
    }
  });
}

async function agregarCategoria() {
  const nombre = document.getElementById('new-cat-nombre').value.trim();
  const tipo   = document.getElementById('new-cat-tipo').value;
  const color  = document.getElementById('new-cat-color').value;
  if (!nombre) { toastErr('El nombre de la categoria es obligatorio.'); return; }
  await window._fbAddCategoria(nombre, tipo, color);
  document.getElementById('new-cat-nombre').value = '';
}

async function eliminarCategoria(key, nombre) {
  const _ok4 = await confirmDialog('Se eliminara la categoria ' + nombre + '.', { title:'Eliminar categoria', okText:'Eliminar' }); if (!_ok4) return;
  await window._fbRemoveCategoria(key);
}

/* ═══════════════════════════════════════════
   GUARDAR COBRO MANUAL
═══════════════════════════════════════════ */
async function guardarCobro(dataBulk) {
  const data = dataBulk || {
    cliente:    document.getElementById('nc-cliente').value.trim(),
    terreno:    document.getElementById('nc-terreno').value.trim(),
    categoriaKey: document.getElementById('nc-categoria').value,
    categoriaNombre: document.getElementById('nc-categoria').options[document.getElementById('nc-categoria').selectedIndex]?.text || '',
    monto:      parseFloat(document.getElementById('nc-monto').value) || 0,
    mes:        document.getElementById('nc-mes').value,
    anio:       parseInt(document.getElementById('nc-anio').value),
    fecha:      document.getElementById('nc-fecha').value,
    asesor:     document.getElementById('nc-asesor').value.trim(),
    obs:        document.getElementById('nc-obs').value.trim(),
    sumaMeta:   document.querySelector('input[name=nc-suma-meta]:checked')?.value || 'SI',
    tipoMeta:   document.querySelector('input[name=nc-tipo-meta]:checked')?.value || 'cartera',
    cargadoPor: 'Admin',
    fechaCarga: new Date().toLocaleString('es-BO'),
  };

  if (!data.cliente) { if (!dataBulk) toastErr('El nombre del cliente es obligatorio.'); return false; }
  if (!data.monto || data.monto <= 0) { if (!dataBulk) toastErr('El monto debe ser mayor a 0.'); return false; }

  try {
    await window._fbPushCobro(data);
    if (!dataBulk) {
      // Limpiar formulario
      ['nc-cliente','nc-terreno','nc-monto','nc-fecha','nc-asesor','nc-obs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const sb = document.getElementById('cobro-success');
      if (sb) { sb.style.display='block'; setTimeout(()=>sb.style.display='none',3000); }
    }
    return true;
  } catch(e) {
    if (!dataBulk) toastErr('Error: ' + e.message);
    return false;
  }
}

/* ═══════════════════════════════════════════
   RENDER REGISTROS
═══════════════════════════════════════════ */
function renderCobros() {
  const filMes  = document.getElementById('fil-cob-mes')?.value || '';
  const filCat  = document.getElementById('fil-cob-cat')?.value || '';
  const filMeta = document.getElementById('fil-cob-meta')?.value || '';
  const filSuma = document.getElementById('fil-cob-suma')?.value || '';

  let datos = cobrosData.filter(c => {
    if (filMes  && c.mes  !== filMes)  return false;
    if (filCat  && c.categoriaKey !== filCat) return false;
    if (filMeta && c.tipoMeta !== filMeta) return false;
    if (filSuma && c.sumaMeta !== filSuma) return false;
    return true;
  });

  // Resumen filtrado
  const totalFil = datos.reduce((s,c)=>s+(c.monto||0),0);
  const sumafil  = datos.filter(c=>c.sumaMeta==='SI').reduce((s,c)=>s+(c.monto||0),0);
  const resEl = document.getElementById('cob-resumen-filtrado');
  if (resEl) {
    resEl.innerHTML = `<div style="display:flex;gap:var(--sp-3);flex-wrap:wrap;margin-bottom:8px;">
      <div style="background:var(--verde-bg);padding:10px 16px;border-radius:var(--r-md);font-size:var(--fs-base);">
        <span style="color:var(--gris);">Total filtrado:</span>
        <strong style="color:var(--cartera);margin-left:6px;">$${totalFil.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
        <span style="color:var(--gris);margin-left:6px;">(${datos.length} registros)</span>
      </div>
      <div style="background:var(--info-bg);padding:10px 16px;border-radius:var(--r-md);font-size:var(--fs-base);">
        <span style="color:var(--info-ink);">Suma a meta:</span>
        <strong style="color:var(--info-ink);margin-left:6px;">$${sumafil.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
      </div>
    </div>`;
  }

  const cont = document.getElementById('cob-registros-lista');
  if (!cont) return;
  if (!datos.length) {
    cont.innerHTML = '<div class="empty-state">Sin cobros con los filtros aplicados.</div>';
    return;
  }

  cont.innerHTML = datos.map(c => {
    const cat = categoriasData.find(x=>x._key===c.categoriaKey);
    const catColor = cat?.color || '#6b7280';
    const sumaOn = c.sumaMeta === 'SI';
    const tipoIcon = { cartera:'💰', expensas:'🏘', ninguna:'➖' };
    return `<div class="cobro-card">
      <div class="cobro-card-left">
        <div class="cobro-nombre">${c.cliente || '—'}</div>
        <div class="cobro-meta">${c.terreno||''} · ${c.mes||''} ${c.anio||''} · ${c.asesor||''}</div>
        <div class="cobro-pills">
          ${cat ? `<span class="cat-badge" style="background:${catColor}22;color:${catColor};border:1px solid ${catColor}44;">${cat.nombre}</span>` : ''}
          <span class="suma-toggle ${sumaOn?'on':'off'}" onclick="toggleSumaMeta('${c._key}','${sumaOn?'NO':'SI'}')">
            ${sumaOn ? '✓ Suma a meta' : '✗ No suma'}
          </span>
          <span style="font-size:var(--fs-xs);color:var(--gris);">${tipoIcon[c.tipoMeta]||''} ${c.tipoMeta||''}</span>
        </div>
        ${c.obs ? `<div style="font-size:var(--fs-sm);color:var(--gris);margin-top:4px;font-style:italic;">${esc(c.obs)}</div>` : ''}
      </div>
      <div class="cobro-monto">
        <div class="cobro-monto-val">${c.tipoMeta==='expensas'?'Bs ':'$'}${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        <div class="cobro-monto-label">${c.fechaCarga||''}</div>
        <button class="btn-del" style="margin-top:8px;" onclick="eliminarCobro('${c._key}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

async function toggleSumaMeta(key, nuevoVal) {
  await window._fbUpdateCobro(key, { sumaMeta: nuevoVal });
}

async function eliminarCobro(key) {
  const _ok5 = await confirmDialog('Esta accion no se puede deshacer.', { title:'Eliminar cobro', okText:'Eliminar' }); if (!_ok5) return;
  await window._fbRemoveCobro(key);
}

function limpiarFiltrosCobros() {
  ['fil-cob-mes','fil-cob-cat','fil-cob-meta','fil-cob-suma'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  renderCobros();
}

/* ═══════════════════════════════════════════
   EXCEL — IMPORTAR COBROS
═══════════════════════════════════════════ */
function descargarPlantillaExcel(tipo) {
  const rows = [
    { 'Cliente':'Ejemplo Cliente', 'Terreno':'UV1-4-31', 'Categoria':'Cuota terreno',
      'Monto ($)':'1500.00', 'Mes':'Mayo', 'Año':'2026', 'Fecha':'2026-05-15',
      'Asesor':'Luis Carlos', 'Suma a meta (SI/NO)':'SI',
      'Tipo meta (cartera/expensas/ninguna)': tipo, 'Observaciones':'Pago cuota 5' }
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cobros');
  XLSX.writeFile(wb, `plantilla_cobros_${tipo}.xlsx`);
}

function handleExcelDrop(event, tipo) {
  event.preventDefault();
  document.getElementById('upload-zone-cob').classList.remove('drag');
  const file = event.dataTransfer.files[0];
  if (file) procesarArchivoExcel(file);
}

function procesarExcelCobros(input) {
  const file = input.files[0];
  if (file) procesarArchivoExcel(file);
}

function procesarArchivoExcel(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type:'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      excelPendiente = rows.map(r => ({
        cliente:         String(r['Cliente']||'').trim(),
        terreno:         String(r['Terreno']||'').trim(),
        categoriaNombre: String(r['Categoria']||r['Categoría']||'').trim(),
        monto:           parseFloat(r['Monto ($)']||r['Monto']||0),
        mes:             String(r['Mes']||'').trim(),
        anio:            parseInt(r['Año']||r['Anio']||2026),
        fecha:           String(r['Fecha']||'').trim(),
        asesor:          String(r['Asesor']||'').trim(),
        sumaMeta:        String(r['Suma a meta (SI/NO)']||'SI').trim().toUpperCase() === 'NO' ? 'NO' : 'SI',
        tipoMeta:        String(r['Tipo meta (cartera/expensas/ninguna)']||'cartera').trim().toLowerCase(),
        obs:             String(r['Observaciones']||'').trim(),
        cargadoPor:      'Excel',
        fechaCarga:      new Date().toLocaleString('es-BO'),
      })).filter(r => r.cliente && r.monto > 0);

      // Preview
      document.getElementById('excel-count').textContent = excelPendiente.length;
      const tbody = document.getElementById('excel-preview-body');
      tbody.innerHTML = excelPendiente.map((r,i) => `<tr>
        <td>${i+1}</td>
        <td>${r.cliente}</td>
        <td>${r.terreno}</td>
        <td>${r.categoriaNombre}</td>
        <td style="font-weight:600;color:var(--cartera);">$${r.monto.toFixed(2)}</td>
        <td>${r.mes}</td>
        <td>${r.anio}</td>
        <td><span class="suma-toggle ${r.sumaMeta==='SI'?'on':'off'}" style="cursor:default;">${r.sumaMeta==='SI'?'✓ Sí':'✗ No'}</span></td>
        <td>${r.tipoMeta}</td>
      </tr>`).join('');
      document.getElementById('excel-preview').style.display = 'block';
    } catch(err) {
      toastErr('Error al leer el archivo: ' + err.message);
    }
  };
  reader.readAsBinaryString(file);
}

async function confirmarImport() {
  if (!excelPendiente.length) return;
  const btn = document.querySelector('[onclick="confirmarImport()"]');
  if (btn) { btn.textContent = 'Importando...'; btn.disabled = true; }
  let ok = 0;
  for (const row of excelPendiente) {
    // Buscar categoría por nombre
    const cat = categoriasData.find(c => c.nombre.toLowerCase() === row.categoriaNombre.toLowerCase());
    if (cat) { row.categoriaKey = cat._key; }
    try { await window._fbPushCobro(row); ok++; } catch(e) { console.error(e); }
  }
  toastOk(ok + ' cobros importados.');
  cancelarImport();
  switchCobTab('registros');
}

function cancelarImport() {
  excelPendiente = [];
  document.getElementById('excel-preview').style.display = 'none';
  const inp = document.getElementById('excel-file-cob');
  if (inp) inp.value = '';
}

/* ═══════════════════════════════════════════
   RESUMEN COBRANZA (tab Resumen)
═══════════════════════════════════════════ */
function renderResumenCobranza() {
  const mes  = mesActual();
  const anio = anioActual();
  const delMes   = cobrosData.filter(c => c.mes === mes && c.anio === anio);
  const sumaMeta = delMes.filter(c => c.sumaMeta === 'SI' && c.tipoMeta === 'cartera')
                         .reduce((s,c) => s + (c.monto||0), 0);
  const total    = delMes.reduce((s,c) => s + (c.monto||0), 0);
  const clientes = [...new Set(delMes.map(c => c.cliente))].length;

  // KPIs del resumen (si existen en HTML original)
  const kpiTotal   = document.getElementById('ck-total');
  const kpiCob     = document.getElementById('ck-vigente');
  if (kpiTotal) { kpiTotal.textContent = '$' + total.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  if (kpiCob)   { kpiCob.textContent = clientes; document.getElementById('ck-vigente-sub').textContent = 'clientes cobrados'; }

  // Label mes
  const mesLbl = document.getElementById('cob-mes-label');
  if (mesLbl) mesLbl.textContent = mes + ' ' + anio;

  // Últimos 5 cobros
  const ultEl = document.getElementById('cob-ultimos');
  if (ultEl) {
    const ult = cobrosData.slice(0,5);
    ultEl.innerHTML = ult.length ? ult.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6;">
        <div>
          <div style="font-size:var(--fs-base);font-weight:500;">${esc(c.cliente)}</div>
          <div style="font-size:var(--fs-xs);color:var(--gris);">${c.categoriaNombre||'—'} · ${c.mes} ${c.anio}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:var(--fs-md);font-weight:700;color:var(--cartera);">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div style="font-size:var(--fs-2xs);color:${c.sumaMeta==='SI'?'var(--ok)':'#9ca3af'};">${c.sumaMeta==='SI'?'✓ Suma meta':'✗ No suma'}</div>
        </div>
      </div>`).join('')
    : '<div style="font-size:var(--fs-base);color:var(--gris);">Sin cobros recientes.</div>';
  }

  // Resumen por categoría en el tab resumen
  const resEl = document.getElementById('cob-resumen-mes');
  if (!resEl) return;
  const porCat = {};
  delMes.forEach(c => {
    const cat = c.categoriaNombre || 'Sin categoría';
    if (!porCat[cat]) porCat[cat] = { total:0, n:0 };
    porCat[cat].total += (c.monto||0);
    porCat[cat].n++;
  });
  const max = Math.max(...Object.values(porCat).map(x=>x.total), 1);
  resEl.innerHTML = Object.entries(porCat).sort((a,b)=>b[1].total-a[1].total).map(([cat,v]) => `
    <div class="bar-item">
      <div class="bar-label">
        <span>${cat}</span>
        <span><strong>$${v.total.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
        <span style="color:var(--gris);font-size:var(--fs-xs);"> (${v.n})</span></span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${v.total/max*100}%;background:var(--verde);"></div></div>
    </div>`).join('') || '<div class="empty-state">Sin cobros este mes.</div>';

  // Progreso resumen
  const prog = document.getElementById('cob-prog-resumen');
  if (prog) {
    prog.innerHTML = `
      <div class="prog-item"><div class="pv">${delMes.length}</div><div class="pl">Cobros mes</div></div>
      <div class="prog-item"><div class="pv" style="color:var(--cartera);">$${total.toLocaleString('es-BO',{maximumFractionDigits:0})}</div><div class="pl">Total cobrado</div></div>
      <div class="prog-item"><div class="pv" style="color:var(--info);">${clientes}</div><div class="pl">Clientes</div></div>
    `;
  }
}

function renderResumenExpensas() {
  // Placeholder para cuando se expanda expensas manual
}

/* ═══════════════════════════════════════════
   EXPORTAR COBROS
═══════════════════════════════════════════ */
function exportarCobros() {
  const datos = cobrosData;
  if (!datos.length) { toastErr('Sin cobros para exportar.'); return; }
  const rows = datos.map(c => ({
    'Cliente':      c.cliente||'',
    'Terreno':      c.terreno||'',
    'Categoría':    c.categoriaNombre||'',
    'Monto ($)':    c.monto||0,
    'Mes':          c.mes||'',
    'Año':          c.anio||'',
    'Fecha cobro':  c.fecha||'',
    'Asesor':       c.asesor||'',
    'Suma a meta':  c.sumaMeta||'',
    'Tipo meta':    c.tipoMeta||'',
    'Observaciones':c.obs||'',
    'Fecha carga':  c.fechaCarga||'',
    'Cargado por':  c.cargadoPor||'',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cobros');
  XLSX.writeFile(wb, `cobros_urubo_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/* ═══════════════════════════════════════════
   METAS — USAR COBROS MANUALES
═══════════════════════════════════════════ */
function calcularMetaManual(tipo) {
  const mes  = mesActual();
  const anio = anioActual();
  const cobrado = cobrosData
    .filter(c => c.mes === mes && c.anio === anio && c.sumaMeta === 'SI' && c.tipoMeta === tipo)
    .reduce((s,c) => s + (c.monto||0), 0);

  window._fbListenMetas(anio, mes, metas => {
    const meta = metas?.[tipo]?.monto || 0;
    const pct  = meta ? Math.round(cobrado / meta * 100) : 0;

    if (tipo === 'cartera') {
      const cobEl  = document.getElementById('meta-cob-cobrado');
      const metaEl = document.getElementById('meta-cob-val');
      const pctEl  = document.getElementById('meta-cob-pct');
      const barEl  = document.getElementById('meta-cob-bar');
      if (cobEl)  cobEl.textContent  = '$' + cobrado.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2});
      if (metaEl) metaEl.textContent = meta ? '$' + Number(meta).toLocaleString('es-BO') : '— (sin meta)';
      if (pctEl)  { pctEl.textContent = pct+'%'; pctEl.style.color = pct>=100?'var(--ok)':pct>=75?'var(--warn)':'var(--danger)'; }
      if (barEl)  { barEl.style.width = Math.min(pct,100)+'%'; barEl.style.background = pct>=100?'linear-gradient(90deg,var(--ok),var(--ok-light))':pct>=75?'linear-gradient(90deg,var(--warn),var(--warn-light))':'linear-gradient(90deg,var(--danger),var(--danger-light))'; }
      updateHomeMetas('cartera', cobrado, meta, pct);
    } else {
      const cobEl  = document.getElementById('meta-exp-cobrado');
      const metaEl = document.getElementById('meta-exp-val');
      const pctEl  = document.getElementById('meta-exp-pct');
      const barEl  = document.getElementById('meta-exp-bar');
      if (cobEl)  cobEl.textContent  = '$' + cobrado.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2});
      if (metaEl) metaEl.textContent = meta ? '$' + Number(meta).toLocaleString('es-BO') : '— (sin meta)';
      if (pctEl)  { pctEl.textContent = pct+'%'; pctEl.style.color = pct>=100?'var(--ok)':pct>=75?'var(--warn)':'var(--danger)'; }
      if (barEl)  barEl.style.width = Math.min(pct,100)+'%';
      updateHomeMetas('expensas', cobrado, meta, pct);
    }
  });
}

/* ═══════════════════════════════════════════
   VALIDACIÓN DE CAMPOS — borde verde al llenar
═══════════════════════════════════════════ */
// Field validation — green border when filled
document.addEventListener('blur', function(e) {
  const el = e.target;
  if (!['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) return;
  if (el.type==='radio'||el.type==='checkbox'||el.type==='file'||el.type==='color') return;
  if (el.value && el.value.trim()) {
    el.classList.add('field-valid');
  } else {
    el.classList.remove('field-valid');
  }
}, true);
// Remove valid on focus
document.addEventListener('focus', function(e) {
  const el = e.target;
  if (!['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) return;
  el.classList.remove('field-valid');
}, true);
