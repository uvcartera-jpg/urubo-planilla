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

function countUpMoney(el, target, duration=900) {
  if (!el) return;
  const start = parseFloat(el.dataset.prev || 0);
  const diff  = target - start;
  const startTs = performance.now();
  function step(now) {
    const elapsed  = now - startTs;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    const current  = start + diff * ease;
    el.textContent = '$' + current.toLocaleString('es-BO', {minimumFractionDigits:2, maximumFractionDigits:2});
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
    document.getElementById('confirm-icon').style.color = opts.positive ? 'var(--verde)' : '#ef4444';
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
    btn.innerHTML = '<span class="btn-spinner"></span>Guardando...';
  } else {
    btn.classList.remove('is-loading');
  }
}
function btnSuccess(btn, duration=1800) {
  if (!btn) return;
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
    const rolInfo = (typeof ROL_LABELS !== 'undefined' && ROL_LABELS[a.rol]) || { label:'Asesor comercial', color:'#2d5a27', icon:'' };
    return `
    <button class="asesor-btn" onclick="seleccionarAsesor('${a._key}', this)">
      <div class="av" style="background:${rolInfo.color};">${iniciales(a.nombre)}</div>
      <div class="info">
        <div class="name">${esc(a.nombre)}</div>
        <div class="role">${rolInfo.icon||''} ${rolInfo.label}</div>
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
    // Ocultar section labels que quedan vacías
    // Pequeño delay para que el display:none se aplique
    setTimeout(() => {
      document.querySelectorAll('.nav-section-label').forEach(lbl => {
        let sibling = lbl.nextElementSibling;
        let allHidden = true;
        while (sibling && !sibling.classList.contains('nav-section-label')) {
          if (sibling.style.display !== 'none') { allHidden = false; break; }
          sibling = sibling.nextElementSibling;
        }
        if (allHidden) lbl.style.display = 'none';
      });
    }, 50);
  }
}

function entrarAdmin() {
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
  });

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
  'tabla':'Registros', 'inventario':'Inventario', 'asesores':'Usuarios', 'config':'Config'
};

function switchAdminTab(id) {
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

/* ═══════════════════════════════════════════
   GUARDAR REGISTRO
═══════════════════════════════════════════ */
async function guardarRegistro() {
  const nombre = document.getElementById('f-nombre').value.trim();
  if (!nombre) { toastErr('El nombre del cliente es obligatorio.'); return; }

  const data = {
    ts:                Date.now(),
    fechaCarga:        new Date().toLocaleString('es-BO'),
    asesorNombre:      asesorActual.nombre,
    /* BBDD */
    nombre,
    telefono:          document.getElementById('f-telefono').value.trim(),
    procedencia:       document.getElementById('f-procedencia').value,
    fechaLlamada:      document.getElementById('f-fecha-llamada').value,
    /* TLMK */
    gestion:           document.getElementById('f-gestion').value,
    mes:               document.getElementById('f-mes').value,
    /* AGENDA */
    fechaAgenda:       document.getElementById('f-fecha-agenda').value,
    horaAgenda:        document.getElementById('f-hora-agenda').value,
    tipoVisita:        document.getElementById('f-tipo-visita').value,
    visitaConcretada:  (document.querySelector('input[name=visitaConcretada]:checked')||{}).value || '',
    fechaVisita:       document.getElementById('f-fecha-visita').value,
    horaVisita:        document.getElementById('f-hora-visita').value,
    /* SHOW */
    show:              document.getElementById('f-show').value,
    linea:             document.getElementById('f-linea').value.trim(),
    cierre:            document.getElementById('f-cierre').value.trim(),
    huboCierre:        (document.querySelector('input[name=huboCierre]:checked')||{}).value || '',
    /* VENTA */
    unidad:            document.getElementById('f-unidad').value.trim(),
    precio:            parseFloat(document.getElementById('f-precio').value) || 0,
    formaPago:         document.getElementById('f-pago').value,
    cuotaInicial:      parseFloat(document.getElementById('f-cuota').value) || 0,
    /* PERFIL */
    leGusto:           (document.querySelector('input[name=gusto]:checked')||{}).value || '',
    puedePagar:        (document.querySelector('input[name=pagar]:checked')||{}).value || '',
    puedeDecidir:      (document.querySelector('input[name=decidir]:checked')||{}).value || '',
    expectativa:       document.getElementById('f-expectativa').value,
    conclusion:        document.getElementById('f-conclusion').value,
    /* ESTADO */
    estado:            document.getElementById('f-estado').value,
    tt:                document.getElementById('f-tt').value.trim(),
    comentarios:       document.getElementById('f-comentarios').value.trim(),
  };


  const btnR = document.querySelector('[onclick="guardarRegistro()"]');
  btnLoading(btnR, true);
  try {
    await window._fbPushRegistro(asesorActual._key, data);
    btnSuccess(btnR);
    toastOk('Registro guardado correctamente.');
    limpiarForm();
    const sb = document.getElementById('success-banner');
    if (sb) { sb.style.display='block'; setTimeout(()=>sb.style.display='none',3000); }
  } catch(e) {
    btnLoading(btnR, false);
    toastErr('Error al guardar: ' + e.message);
  }
}

function limpiarForm() {
  ['f-nombre','f-telefono','f-fecha-llamada','f-linea','f-unidad',
   'f-precio','f-cuota','f-cierre','f-tt','f-comentarios',
   'f-fecha-agenda','f-hora-agenda','f-fecha-visita','f-hora-visita'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['f-procedencia','f-gestion','f-tipo-visita','f-show','f-pago',
   'f-expectativa','f-conclusion','f-estado'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const vw = document.getElementById('visita-warning');
  if (vw) vw.style.display = 'none';
  document.querySelectorAll('input[type=radio]').forEach(r => {
    r.checked = false;
    r.closest('.radio-pill')?.classList.remove('sel-si','sel-no','sel-gen');
  });
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('f-mes').value = meses[new Date().getMonth()];
  document.getElementById('f-fecha-llamada').value = new Date().toISOString().split('T')[0];
}

/* ═══════════════════════════════════════════
   VERIFICAR VISITA REPETIDA
═══════════════════════════════════════════ */
function verificarVisitaRepetida() {
  const nombre = document.getElementById('f-nombre').value.trim().toLowerCase();
  const tipoSel = document.getElementById('f-tipo-visita').value;
  const warn = document.getElementById('visita-warning');
  if (!nombre || tipoSel !== '1era Visita') { warn.style.display='none'; return; }
  // Buscar si ya existe una 1era Visita para este cliente en mis registros
  const yaExiste = misRegs.some(r =>
    r.nombre && r.nombre.toLowerCase() === nombre && r.tipoVisita === '1era Visita'
  );
  warn.style.display = yaExiste ? 'block' : 'none';
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
    'Coordinación Firma':'badge-firma','Desistido':'badge-desistido'
  };
  return 'badge ' + (m[estado]||'badge-def');
}

function renderMisRegistros() {
  const cont = document.getElementById('mis-reg-list');
  if (!misRegs.length) {
    cont.innerHTML = '<div class="empty-state">Todavía no cargaste ningún registro.<br>Usá la pestaña "Cargar registro" para empezar.</div>';
    return;
  }
  cont.innerHTML = misRegs.map(r => `
    <div class="reg-card">
      <div class="reg-card-top">
        <div>
          <div class="reg-cliente">${r.nombre || '—'}</div>
          <div class="reg-fecha">${r.fechaCarga || ''}</div>
        </div>
        <span class="${estadoBadgeClass(r.estado)}">${r.estado||'Sin estado'}</span>
      </div>
      <div class="reg-pills">
        ${r.tipoVisita ? `<span class="badge badge-def">${r.tipoVisita}</span>` : ''}
        ${r.unidad     ? `<span class="badge badge-bbdd">${r.unidad}</span>` : ''}
        ${r.formaPago  ? `<span class="badge badge-def">${r.formaPago}</span>` : ''}
        ${r.conclusion ? `<span class="badge badge-def">${r.conclusion}</span>` : ''}
        ${r.expectativa? `<span class="badge badge-def">Expectativa: ${r.expectativa}</span>` : ''}
      </div>
      ${r.comentarios ? `<div class="reg-comentario">"${r.comentarios}"</div>` : ''}
    </div>`).join('');
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
    if (r.huboCierre === 'SI') buckets[clave].cierres++;
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
  gradTotal.addColorStop(0, 'rgba(28,28,30,.25)');
  gradTotal.addColorStop(1, 'rgba(28,28,30,0)');

  const gradCierres = ctx.createLinearGradient(0, 0, 0, alto);
  gradCierres.addColorStop(0, 'rgba(56,161,105,.28)');
  gradCierres.addColorStop(1, 'rgba(56,161,105,0)');

  if (_chartTendenciaVentas) { _chartTendenciaVentas.destroy(); }

  _chartTendenciaVentas = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Registros totales',
          data: dataTotal,
          borderColor: '#1c1c1e',
          backgroundColor: gradTotal,
          borderWidth: 2.5,
          tension: .35,
          fill: true,
          pointRadius: 0,
          pointHitRadius: 12,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#1c1c1e',
          pointHoverBorderColor: '#fff',
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
          pointHoverBorderColor: '#fff',
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
          labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { family: "'DM Sans',sans-serif", size: 12 } }
        },
        tooltip: {
          backgroundColor: '#1c1c1e', titleColor: '#fff', bodyColor: '#fff',
          titleFont: { family: "'DM Sans',sans-serif", weight: '600' },
          bodyFont: { family: "'DM Sans',sans-serif" },
          padding: 10, cornerRadius: 8, displayColors: true,
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: "'DM Sans',sans-serif", size: 11 }, color: '#718096' } },
        y: { beginAtZero: true, grid: { color: '#f0f3f6' }, ticks: { font: { family: "'DM Sans',sans-serif", size: 11 }, color: '#718096', precision: 0 } }
      }
    }
  });
}

function renderDashboard() {
  const mes = new Date().toLocaleString('es-BO',{month:'long'}).charAt(0).toUpperCase()
    + new Date().toLocaleString('es-BO',{month:'long'}).slice(1);
  const vMes = todosRegs.filter(r => r.mes === mes);

  renderTendenciaVentasChart();

  // KPIs generales
  countUp(document.getElementById('kpi-total'), todosRegs.length);
  document.getElementById('kpi-total-sub').textContent = asesores.length + ' asesor' + (asesores.length!==1?'es':'');
  countUp(document.getElementById('kpi-mes'), vMes.length);
  document.getElementById('kpi-mes-sub').textContent   = 'registros en ' + mes;

  const contratosReservas = todosRegs.filter(r =>
    ['Contrato','Reserva','Coordinación Firma','Entrega','En Tramitación Bancaria'].includes(r.estado));
  document.getElementById('kpi-contratos').textContent = contratosReservas.length;
  document.getElementById('kpi-contratos-sub').textContent =
    todosRegs.length ? `${Math.round(contratosReservas.length/todosRegs.length*100)}% del total` : '—';

  const conPrecio = todosRegs.filter(r => r.precio > 0);
  const totalPrecio = conPrecio.reduce((s,r)=>s+(r.precio||0),0);
  document.getElementById('kpi-precio').textContent =
    totalPrecio ? '$' + totalPrecio.toLocaleString('es-BO') : '—';
  document.getElementById('kpi-precio-sub').textContent = `${conPrecio.length} registros con precio`;

  // Funnel de conversión (mes actual)
  const agendadas     = vMes.filter(r => r.fechaAgenda).length;
  const concretadas   = vMes.filter(r => r.visitaConcretada === 'SI').length;
  const conCierre     = vMes.filter(r => r.huboCierre === 'SI').length;
  const conv1 = agendadas ? Math.round(concretadas/agendadas*100) : 0;
  const conv2 = concretadas ? Math.round(conCierre/concretadas*100) : 0;

  const funnelEl = document.getElementById('chart-funnel');
  if (funnelEl) {
    const funnelData = [
      { label:'Agendadas', n:agendadas, color:'#2563eb' },
      { label:'Visitas concretadas', n:concretadas, color:'#d97706', pct:conv1 },
      { label:'Con cierre', n:conCierre, color:'#2d5a27', pct:conv2 },
    ];
    const maxF = Math.max(...funnelData.map(f=>f.n), 1);
    funnelEl.innerHTML = funnelData.map(f => `
      <div class="bar-item">
        <div class="bar-label">
          <span>${f.label}</span>
          <span><strong>${f.n}</strong>${f.pct!==undefined ? ` <span style="color:${f.color};font-size:var(--fs-xs);">(${f.pct}%)</span>` : ''}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${f.n/maxF*100}%;background:${f.color};"></div>
        </div>
      </div>`).join('');
  }

  // Visitas por número (1era, 2da, 3era)
  const visitasTipo = {};
  vMes.filter(r=>r.tipoVisita).forEach(r => visitasTipo[r.tipoVisita]=(visitasTipo[r.tipoVisita]||0)+1);
  const visitasEl = document.getElementById('chart-visitas');
  if (visitasEl) {
    const maxV = Math.max(...Object.values(visitasTipo),1);
    const colV = {'1era Visita':'#2563eb','2da Visita':'#d97706','3era Visita':'#7c3aed','Re-Agenda':'#dc2626','Reunión Virtual':'#059669'};
    visitasEl.innerHTML = Object.entries(visitasTipo).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`
      <div class="bar-item">
        <div class="bar-label"><span>${k}</span><span>${n}</span></div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${n/maxV*100}%;background:${colV[k]||'#6b7280'};"></div>
        </div>
      </div>`).join('') || '<p style="font-size:var(--fs-base);color:var(--ink-400);">Sin datos este mes.</p>';
  }

  /* Chart asesores */
  const asesorCounts = {};
  vMes.forEach(r => asesorCounts[r.asesorNombre]=(asesorCounts[r.asesorNombre]||0)+1);
  const maxA = Math.max(...Object.values(asesorCounts),1);
  const colores = ['#2d5a27','#4a8c3f','#2563eb','#d97706','#7c3aed','#dc2626'];
  document.getElementById('chart-asesores').innerHTML =
    Object.entries(asesorCounts).sort((a,b)=>b[1]-a[1]).map(([k,n],i)=>`
      <div class="bar-item">
        <div class="bar-label"><span>${k}</span><span>${n}</span></div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${n/maxA*100}%;background:${colores[i%colores.length]};"></div>
        </div>
      </div>`).join('') || '<p style="font-size:var(--fs-base);color:var(--ink-400);">Sin datos este mes.</p>';

  /* Chart estados */
  const estadoCounts = {};
  todosRegs.forEach(r => estadoCounts[r.estado||'Sin estado']=(estadoCounts[r.estado||'Sin estado']||0)+1);
  const maxE = Math.max(...Object.values(estadoCounts),1);
  document.getElementById('chart-estados').innerHTML =
    Object.entries(estadoCounts).sort((a,b)=>b[1]-a[1]).map(([k,n],i)=>`
      <div class="bar-item">
        <div class="bar-label"><span>${k}</span><span>${n}</span></div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${n/maxE*100}%;background:${colores[i%colores.length]};"></div>
        </div>
      </div>`).join('') || '<p style="font-size:var(--fs-base);color:var(--ink-400);">Sin datos.</p>';

  /* Perfil de cierre */
  const perfilEl = document.getElementById('chart-perfil');
  const fields = [
    {label:'Le gustó', key:'leGusto'},
    {label:'Puede pagar', key:'puedePagar'},
    {label:'Puede decidir', key:'puedeDecidir'}
  ];
  const total = vMes.length || 1;
  perfilEl.innerHTML = fields.map(f => {
    const si = vMes.filter(r=>r[f.key]==='SI').length;
    const pct = Math.round(si/total*100);
    return `<div style="text-align:center;">
      <div style="font-size:var(--fs-3xl);font-weight:700;color:var(--verde);font-family:'Cormorant Garamond',serif;">${pct}%</div>
      <div style="font-size:var(--fs-xs);color:var(--gris);margin-top:2px;">${f.label}</div>
      <div style="font-size:var(--fs-sm);color:var(--ink-700);margin-top:2px;">${si}/${vMes.length}</div>
    </div>`;
  }).join('');

  /* Chart forma pago */
  const pagoCounts = {};
  todosRegs.filter(r=>r.formaPago).forEach(r => pagoCounts[r.formaPago]=(pagoCounts[r.formaPago]||0)+1);
  const maxP = Math.max(...Object.values(pagoCounts),1);
  document.getElementById('chart-pago').innerHTML =
    Object.entries(pagoCounts).sort((a,b)=>b[1]-a[1]).map(([k,n],i)=>`
      <div class="bar-item">
        <div class="bar-label"><span>${k}</span><span>${n}</span></div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${n/maxP*100}%;background:${colores[i%colores.length]};"></div>
        </div>
      </div>`).join('') || '<p style="font-size:var(--fs-base);color:var(--ink-400);">Sin datos.</p>';
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

function renderTablaAdmin() {
  const datos = filtradosAdmin();
  const tb = document.getElementById('tabla-admin-body');
  if (!datos.length) {
    tb.innerHTML = '<tr><td colspan="20" class="empty-state">Sin registros con los filtros aplicados.</td></tr>';
    return;
  }
  tb.innerHTML = datos.map(r => `
    <tr>
      <td style="font-size:var(--fs-sm);color:var(--ink-400);white-space:nowrap;">${r.fechaCarga||''}</td>
      <td><strong>${r.asesorNombre||'—'}</strong></td>
      <td>${r.nombre||'—'}</td>
      <td style="font-size:var(--fs-sm);">${r.telefono||''}</td>
      <td style="font-size:var(--fs-sm);">${r.procedencia||''}</td>
      <td style="font-size:var(--fs-sm);">${r.gestion||''}</td>
      <td style="font-size:var(--fs-sm);">${r.mes||''}</td>
      <td style="font-size:var(--fs-sm);font-weight:600;">${r.tipoVisita||''}</td>
      <td style="font-size:var(--fs-sm);">${r.fechaAgenda||''}</td>
      <td style="font-size:var(--fs-sm);">${r.horaAgenda||''}</td>
      <td style="text-align:center;">${r.visitaConcretada ? concretadaBadge(r.visitaConcretada) : ''}</td>
      <td style="font-size:var(--fs-sm);">${r.fechaVisita||''}</td>
      <td style="font-size:var(--fs-sm);">${r.show||''}</td>
      <td style="font-size:var(--fs-sm);">${r.linea||''}</td>
      <td style="font-size:var(--fs-sm);">${r.cierre||''}</td>
      <td style="text-align:center;">${r.huboCierre ? yesNo(r.huboCierre) : ''}</td>
      <td style="font-size:var(--fs-sm);font-weight:600;">${r.unidad||''}</td>
      <td style="font-size:var(--fs-sm);">${r.precio?'$'+r.precio.toLocaleString('es-BO'):''}</td>
      <td style="font-size:var(--fs-sm);">${r.formaPago||''}</td>
      <td style="text-align:center;">${r.leGusto ? yesNo(r.leGusto) : ''}</td>
      <td style="text-align:center;">${r.puedePagar ? yesNo(r.puedePagar) : ''}</td>
      <td style="text-align:center;">${r.puedeDecidir ? yesNo(r.puedeDecidir) : ''}</td>
      <td style="font-size:var(--fs-sm);">${r.expectativa||''}</td>
      <td style="font-size:var(--fs-sm);">${r.conclusion||''}</td>
      <td><span class="${estadoBadgeClass(r.estado)}" style="font-size:var(--fs-xs);">${r.estado||'—'}</span></td>
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

/* ═══════════════════════════════════════════
   EXPORTAR EXCEL
═══════════════════════════════════════════ */
function exportarExcel() {
  const datos = filtradosAdmin();
  if (!datos.length) { toastErr('Sin datos para exportar.'); return; }
  const rows = datos.map(r => ({
    'Fecha carga':          r.fechaCarga||'',
    'Asesor':               r.asesorNombre||'',
    'Nombre cliente':       r.nombre||'',
    'Teléfono':             r.telefono||'',
    'Procedencia':          r.procedencia||'',
    'Gestión':              r.gestion||'',
    'Mes':                  r.mes||'',
    'Nº Visita':            r.tipoVisita||'',
    'Fecha agendada':       r.fechaAgenda||'',
    'Hora agendada':        r.horaAgenda||'',
    'Visita concretada':    r.visitaConcretada||'',
    'Fecha concretada':     r.fechaVisita||'',
    'Hora concretada':      r.horaVisita||'',
    'Show de venta':        r.show||'',
    'Asesor de línea':      r.linea||'',
    'Asesor de cierre':     r.cierre||'',
    '¿Hubo cierre?':        r.huboCierre||'',
    'Unidad':               r.unidad||'',
    'Precio':               r.precio||'',
    'Forma de pago':        r.formaPago||'',
    'Cuota inicial':        r.cuotaInicial||'',
    'Le gustó':             r.leGusto||'',
    'Puede pagar':          r.puedePagar||'',
    'Puede decidir':        r.puedeDecidir||'',
    'Expectativa':          r.expectativa||'',
    'Conclusión':           r.conclusion||'',
    'Estado':               r.estado||'',
    'TT':                   r.tt||'',
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
        <button class="btn-remove-vendor" onclick="eliminarAsesor('${a._key}','${escJs(a.nombre)}')" title="Eliminar">×</button>
      </div>
    </div>`;
  }).join('');
}

async function agregarAsesor() {
  const nombre = document.getElementById('new-asesor-name').value.trim();
  const pin    = document.getElementById('new-asesor-pin').value.trim();
  const rol    = document.getElementById('new-asesor-rol')?.value || 'ventas';
  if (!nombre) { toastErr('El nombre es obligatorio.'); return; }
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { toastErr('El PIN debe ser de 4 digitos numericos.'); return; }
  if (asesores.some(a=>a.nombre.toLowerCase()===nombre.toLowerCase())) {
    toastErr('Ya existe un usuario con ese nombre.'); return;
  }
  const mods = rol === 'mixto' ? modulosSeleccionados : (ROL_MODULOS[rol] || ['ventas']);
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
  });
}

function renderInvStats() {
  document.getElementById('inv-total').textContent       = todosLotes.length;
  document.getElementById('inv-disponibles').textContent = todosLotes.filter(l=>l.estado==='Disponible').length;
  document.getElementById('inv-reservados').textContent  = todosLotes.filter(l=>l.estado==='Reservado').length;
  document.getElementById('inv-vendidos').textContent    = todosLotes.filter(l=>l.estado==='Vendido').length;
}

function renderInventario() {
  const filtroEst = document.getElementById('fil-inv-estado')?.value || '';
  const datos = filtroEst ? todosLotes.filter(l=>l.estado===filtroEst) : todosLotes;
  const tb = document.getElementById('inv-tabla-body');
  if (!tb) return;
  if (!datos.length) {
    tb.innerHTML = '<tr><td colspan="9" class="empty-state">Sin lotes registrados todavía.</td></tr>';
    return;
  }

  const estadoColor = {
    'Disponible':    'background:var(--ok-bg);color:var(--ok-ink);',
    'Reservado':     'background:var(--warn-bg);color:var(--warn-ink);',
    'Vendido':       'background:var(--danger-bg);color:var(--danger-ink);',
    'No disponible': 'background:var(--fill);color:var(--ink-500);'
  };

  tb.innerHTML = datos.map(l => {
    const codigo = `${l.uv}-${l.manzano}-${l.lote}`;
    const estStyle  = estadoColor[l.estado] || 'background:var(--fill);color:var(--ink-500);';
    return `<tr>
      <td style="font-weight:600;font-family:monospace;font-size:var(--fs-base);">${codigo}</td>
      <td style="text-align:center;">${l.uv||''}</td>
      <td style="text-align:center;">${l.manzano||''}</td>
      <td style="text-align:center;">${l.lote||''}</td>
      <td style="text-align:center;">${l.metraje ? l.metraje.toLocaleString('es-BO') + ' m²' : '—'}</td>
      <td style="font-weight:600;color:#2d5a27;">${l.precio ? '$'+Number(l.precio).toLocaleString('es-BO') : '—'}</td>
      <td><span style="padding:3px 10px;border-radius:999px;font-size:var(--fs-xs);font-weight:600;${estStyle}">${l.estado||'—'}</span></td>
      <td style="font-size:var(--fs-sm);color:var(--ink-500);">${l.obs||''}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn-clear" style="padding:4px 10px;font-size:var(--fs-sm);" onclick="editarLote('${l._key}')">✏️</button>
          <button class="btn-del" onclick="eliminarLote('${l._key}','${escJs(codigo)}')">🗑</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function mostrarFormLote() {
  loteEditKey = null;
  document.getElementById('form-lote-title').textContent = 'Agregar lote';
  document.getElementById('btn-guardar-lote').textContent = 'Guardar lote';
  ['l-uv','l-manzano','l-lote','l-metraje','l-precio','l-obs'].forEach(id => {
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
  document.getElementById('l-uv').value       = lote.uv      || '';
  document.getElementById('l-manzano').value  = lote.manzano || '';
  document.getElementById('l-lote').value     = lote.lote    || '';
  document.getElementById('l-metraje').value  = lote.metraje || '';
  document.getElementById('l-precio').value   = lote.precio  || '';
  document.getElementById('l-estado').value   = lote.estado  || '';
  document.getElementById('l-obs').value      = lote.obs     || '';
  document.getElementById('form-lote').style.display = 'block';
  document.getElementById('form-lote').scrollIntoView({ behavior:'smooth' });
}

async function guardarLote() {
  const uv      = parseInt(document.getElementById('l-uv').value);
  const manzano = parseInt(document.getElementById('l-manzano').value);
  const lote    = parseInt(document.getElementById('l-lote').value);
  if (!uv || !manzano || !lote) {
    toastErr('UV, Manzano y Lote son obligatorios.'); return;
  }
  const precio = parseFloat(document.getElementById('l-precio').value) || 0;

  const data = {
    uv,
    manzano,
    lote,
    codigo:       `${uv}-${manzano}-${lote}`,
    metraje:      parseFloat(document.getElementById('l-metraje').value) || 0,
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

async function eliminarLote(key, codigo) {
  const _ok3 = await confirmDialog('Se eliminara el lote ' + codigo + '.', { title:'Eliminar lote', okText:'Eliminar' }); if (!_ok3) return;
  try { await window._fbRemoveLote(key); }
  catch(e) { toastErr('Error: ' + e.message); }
}

function exportarInventario() {
  if (!todosLotes.length) { toastErr('Sin lotes en el inventario.'); return; }
  const rows = todosLotes.map(l => ({
    'Código':               `${l.uv}-${l.manzano}-${l.lote}`,
    'UV':                   l.uv||'',
    'Manzano':              l.manzano||'',
    'Lote':                 l.lote||'',
    'Metraje (m²)':         l.metraje||'',
    'Precio ($)':           l.precio||'',
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
  const vMes       = todosRegs.filter(r => r.mes===mesC);
  const vVisitas   = vMes.filter(r => r.visitaConcretada==='SI');
  const vCierres   = vMes.filter(r => r.huboCierre==='SI');
  countUp(document.getElementById('kpi-total'), todosRegs.length);
  setText('kpi-total-sub', asesores.length + ' asesores');
  countUp(document.getElementById('kpi-mes'), vMes.length);
  setText('kpi-mes-sub', 'registros en ' + mesC);
  countUp(document.getElementById('h-visitas-mes'), vVisitas.length);
  countUp(document.getElementById('h-cierres-mes'), vCierres.length);

  // ══ MARKETING ══
  const leadsM   = leadsData.filter(l => l.mes===mesC && l.anio===anioC);
  const fuentesL = ['Facebook Ads','Instagram','CRM','WhatsApp','Web','Facebook'];
  const visitasL = todosRegs.filter(r => r.mes===mesC && fuentesL.some(f=>(r.procedencia||'').toLowerCase().includes(f.toLowerCase())));
  const cierresL = vCierres;
  const conv     = leadsM.length ? Math.round(cierresL.length/leadsM.length*100) : 0;
  const leadNuevo= leadsM.filter(l=>l.estado==='Nuevo').length;
  countUp(document.getElementById('h-leads-mes'), leadsM.length);
  countUp(document.getElementById('h-visitas-leads'), visitasL.length);
  setText('h-conv-leads', conv+'%');
  countUp(document.getElementById('h-leads-nuevos'), leadNuevo);

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

  // ══ EXPENSAS ══
  const expMes     = (expAdminData||[]).filter(e=>e.mes===mesC&&e.anio===anioC);
  const totalExp   = expMes.reduce((s,e)=>s+(e.monto||0),0);
  const histExp    = (expAdminData||[]).reduce((s,e)=>s+(e.monto||0),0);
  countUpMoney(document.getElementById('h-exp-total'), totalExp);
  setText('h-exp-n', expMes.length+' cobros');
  countUpMoney(document.getElementById('h-exp-historico'), histExp);
  setText('h-exp-props', expMes.length);

  // ══ INVENTARIO ══
  const disp  = todosLotes.filter(l=>l.estado==='Disponible').length;
  const vend  = todosLotes.filter(l=>l.estado==='Vendido').length;
  const resv  = todosLotes.filter(l=>l.estado==='Reservado').length;
  const ocup  = todosLotes.length ? Math.round((vend+resv)/todosLotes.length*100) : 0;
  countUp(document.getElementById('h-disponibles'), disp);
  countUp(document.getElementById('h-inv-vendidos'), vend);
  countUp(document.getElementById('h-inv-reservados'), resv);
  setText('h-inv-ocupacion', ocup+'%');

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
        <div class="alerta-dot" style="background:#ef4444;"></div>
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
          <div class="alerta-dot" style="background:${a.tipo==='mora'?'#ef4444':a.tipo==='gestion'?'#f59e0b':a.tipo==='meta-pct'?'#10b981':'#9ca3af'};"></div>
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
      <div class="home-stat-row"><span class="home-stat-label">Visitas concretadas</span><span class="home-stat-val">${vMes.filter(r=>r.visitaConcretada==='SI').length}</span></div>
      <div class="home-stat-row"><span class="home-stat-label">Con cierre</span><span class="home-stat-val" style="color:#2d5a27;">${vMes.filter(r=>r.huboCierre==='SI').length}</span></div>
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
  ventas:    ['ventas'],
  marketing: ['marketing'],
  cobranza:  ['cobranza'],
  expensas:  ['expensas'],
  gerencia:  ['ventas','marketing','cobranza','expensas','inventario','dashboard'],
  mixto:     []
};

const ROL_LABELS = {
  ventas:    { label:'Vendedor',   color:'#065f46', bg:'#d1fae5', icon:'🟢' },
  marketing: { label:'Marketing',  color:'#1e40af', bg:'#dbeafe', icon:'🔵' },
  cobranza:  { label:'Cartera',    color:'#5b21b6', bg:'#ede9fe', icon:'🟣' },
  expensas:  { label:'Expensas',   color:'#991b1b', bg:'#fee2e2', icon:'🔴' },
  gerencia:  { label:'Gerencia',   color:'#92400e', bg:'#fef3c7', icon:'🟡' },
  mixto:     { label:'Personalizado', color:'#374151', bg:'#f3f4f6', icon:'⚙️' }
};

// Módulos seleccionados en el form
let modulosSeleccionados = ['ventas'];

function actualizarModulosSegunRol() {
  const rol = document.getElementById('new-asesor-rol').value;
  const wrap = document.getElementById('modulos-custom');
  if (rol === 'mixto') {
    wrap.style.display = 'block';
  } else {
    wrap.style.display = 'none';
    modulosSeleccionados = [...(ROL_MODULOS[rol] || ['ventas'])];
  }
}

function toggleModulo(el, mod) {
  el.classList.toggle('sel');
  const inp = el.querySelector('input');
  if (inp) inp.checked = el.classList.contains('sel');
  modulosSeleccionados = Array.from(document.querySelectorAll('#modulos-checkboxes .modulo-check.sel'))
    .map(e => e.querySelector('input')?.value).filter(Boolean);
}

/* ══ ENTRAR COMO USUARIO LIMITADO ══ */
function entrarUsuario() {
  const a = asesorActual;
  if (!a) return;

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
    { id:'fichero',   label:'🎯 Mi Fichero',  check:'ventas' },
    { id:'ventas',    label:'📋 Cargar',       check:'ventas' },
    { id:'marketing', label:'📊 Marketing',    check:'marketing' },
    { id:'expensas',  label:'🏘 Expensas',     check:'expensas' },
  ];
  // Cobranza → va al panel admin directamente (mismo panel-cartera)
  const tabConfigFinal = tabConfig.filter(t => {
    if (t.id==='fichero'   && !modulos.includes('ventas'))    return false;
    if (t.id==='ventas'    && !modulos.includes('ventas'))    return false;
    if (t.id==='marketing' && !modulos.includes('marketing')) return false;
    if (t.id==='expensas'  && !modulos.includes('expensas'))  return false;
    return true;
  });
  tabsWrap.innerHTML = tabConfigFinal.map((t,i) =>
    `<button class="user-tab ${i===0?'active':''}" onclick="switchUserTab('${t.id}')">${t.label}</button>`
  ).join('');

  // Mostrar primer tab disponible
  if (tabConfigFinal.length) switchUserTab(tabConfigFinal[0].id, false);

  // Escuchar registros de ventas propios
  if (modulos.includes('ventas')) {
    window._fbListenRegistros(a._key, arr => {
      misRegs = arr;
      renderMisRegistros();
      renderFicheroVendedor();
    });
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const fMesEl = document.getElementById('f-mes');
    const fFecEl = document.getElementById('f-fecha-llamada');
    if (fMesEl) fMesEl.value = meses[new Date().getMonth()];
    if (fFecEl) fFecEl.value = new Date().toISOString().split('T')[0];

    // Inject asesor-panel content into utab-ventas
    const asesorPanel = document.getElementById('asesor-panel');
    const ventasInner = document.getElementById('utab-ventas-inner');
    if (asesorPanel && ventasInner) {
      // Clone the tabs + form from asesor-panel into user panel
      const tabs    = asesorPanel.querySelector('.asesor-tabs');
      const cargar  = asesorPanel.querySelector('#atab-cargar');
      const misReg  = asesorPanel.querySelector('#atab-mis-registros');
      if (tabs && cargar && misReg) {
        ventasInner.innerHTML = '';
        ventasInner.appendChild(tabs.cloneNode(true));
        // Make tab buttons work (they have onclick with hardcoded function)
        ventasInner.querySelectorAll('.a-tab').forEach(btn => {
          const orig = btn.getAttribute('onclick') || '';
          btn.setAttribute('onclick', orig);
        });
        const cargarClone = cargar.cloneNode(true);
        cargarClone.id = 'atab-cargar-user';
        cargarClone.classList.add('a-tab-panel','active');
        ventasInner.appendChild(cargarClone);
        const misRegClone = misReg.cloneNode(true);
        misRegClone.id = 'atab-mis-registros-user';
        misRegClone.classList.add('a-tab-panel');
        misRegClone.style.display = 'none';
        ventasInner.appendChild(misRegClone);
        // Override tab buttons to toggle user copies
        ventasInner.querySelectorAll('.a-tab').forEach(btn => {
          btn.addEventListener('click', function() {
            const isCargar = btn.textContent.includes('Cargar');
            ventasInner.querySelectorAll('.a-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const c = ventasInner.querySelector('#atab-cargar-user');
            const m = ventasInner.querySelector('#atab-mis-registros-user');
            if (c) c.classList.toggle('active', isCargar);
            if (m) m.classList.toggle('active', !isCargar);
            if (!isCargar) {
              const listEl = ventasInner.querySelector('#mis-reg-list');
              if (listEl) listEl.innerHTML = document.getElementById('mis-reg-list')?.innerHTML || '';
            }
          });
        });
      }
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
    if (bar) { bar.style.width=Math.min(pct,100)+'%'; bar.style.background=pct>=100?'linear-gradient(90deg,#10b981,#34d399)':pct>=75?'linear-gradient(90deg,#f59e0b,#fbbf24)':'linear-gradient(90deg,#2d5a27,#4a8c3f)'; }
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

  setText('uexp-mes-total', '$'+total.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}));
  setText('uexp-mes-n', delMes.length+' cobros');
  setText('uexp-historico', '$'+hist.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2}));

  window._fbListenMetas(anio, mes, metas => {
    const metaUser = metas?.['u_'+asesorActual._key+'_expensas']?.monto || metas?.expensas?.monto || 0;
    const pct = metaUser ? Math.round(total/metaUser*100) : 0;
    setText('uexp-meta-val', metaUser ? '$'+Number(metaUser).toLocaleString('es-BO') : '—');
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
          <div class="cobro-monto-val">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
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
    if (bar) { bar.style.width=Math.min(pctGlobal,100)+'%'; bar.style.background=pctGlobal>=100?'linear-gradient(90deg,#10b981,#34d399)':pctGlobal>=75?'linear-gradient(90deg,#f59e0b,#fbbf24)':'linear-gradient(90deg,#2d5a27,#4a8c3f)'; }

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
            <div style="font-size:var(--fs-xl);font-weight:700;color:#2d5a27;font-family:'Cormorant Garamond',serif;">
              $${(u.cartera+u.expensas).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}
            </div>
            <div style="font-size:var(--fs-xs);color:var(--gris);">total cobrado ${mes}</div>
          </div>
        </div>
        ${metaCob>0 ? `<div class="meta-barra-wrap">
          <div class="meta-barra-row">
            <span>💰 Cartera: $${u.cartera.toLocaleString('es-BO',{maximumFractionDigits:0})}</span>
            <span style="color:${pctC>=100?'#10b981':pctC>=75?'#f59e0b':'#ef4444'};font-weight:600;">${pctC}% de $${Number(metaCob).toLocaleString('es-BO',{maximumFractionDigits:0})}</span>
          </div>
          <div class="meta-barra-track">
            <div class="meta-barra-fill" style="width:${Math.min(pctC,100)}%;background:${pctC>=100?'#10b981':pctC>=75?'#f59e0b':'#ef4444'};"></div>
          </div>
        </div>` : ''}
        ${metaExp>0 ? `<div class="meta-barra-wrap">
          <div class="meta-barra-row">
            <span>🏘 Expensas: $${u.expensas.toLocaleString('es-BO',{maximumFractionDigits:0})}</span>
            <span style="color:${pctE>=100?'#10b981':pctE>=75?'#f59e0b':'#ef4444'};font-weight:600;">${pctE}% de $${Number(metaExp).toLocaleString('es-BO',{maximumFractionDigits:0})}</span>
          </div>
          <div class="meta-barra-track">
            <div class="meta-barra-fill" style="width:${Math.min(pctE,100)}%;background:${pctE>=100?'#10b981':pctE>=75?'#f59e0b':'#7c3aed'};"></div>
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
  // Visitas: registros de ventas del mes que vienen de leads (procedencia Facebook/CRM/Instagram)
  const fuentesLeads = ['Facebook Ads','Instagram','CRM','WhatsApp','Web','Facebook'];
  const visitasDeLeads = todosRegs.filter(r =>
    r.mes===mes && fuentesLeads.some(f => (r.procedencia||'').toLowerCase().includes(f.toLowerCase()))
  );
  const cierres = todosRegs.filter(r => r.mes===mes && r.huboCierre==='SI');

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
    updateMetaBarra('mkt-leads',   delMes.length,         metaLeads,   '#2563eb');
    updateMetaBarra('mkt-visitas', visitasDeLeads.length, metaVisitas, '#d97706');
    updateMetaBarra('mkt-cierres', cierres.length,        metaCierres, '#10b981');
  });

  // Embudo
  const emEl = document.getElementById('mkt-embudo');
  if (emEl) {
    const etapas = [
      { label:'Leads captados', n: delMes.length, color:'#2563eb' },
      { label:'Visitas agendadas', n: visitasDeLeads.filter(r=>r.tipoVisita==='1era Visita').length, color:'#d97706' },
      { label:'Visitas concretadas', n: visitasDeLeads.filter(r=>r.visitaConcretada==='SI').length, color:'#f59e0b' },
      { label:'Cierres / Ventas', n: cierres.length, color:'#10b981' },
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
  const estColor = { Nuevo:'#2563eb', Contactado:'#d97706', Agendado:'#10b981', Descartado:'#ef4444' };
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
        <span style="font-size:var(--fs-md);font-weight:700;color:#2d5a27;">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
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
      <td style="font-weight:600;color:#2d5a27;">$${r.monto.toFixed(2)}</td>
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
        <span style="font-size:var(--fs-base);font-weight:700;color:${sumaOn?'#2d5a27':'#d97706'};">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
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
    bar.style.background=pct>=100?'linear-gradient(90deg,#10b981,#34d399)':pct>=75?'linear-gradient(90deg,#f59e0b,#fbbf24)':'linear-gradient(90deg,#2d5a27,#4a8c3f)';
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
  _renderResumenCat('cart-resumen-no', noMeta, '#d97706');
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
      <td style="font-weight:600;color:${sumaOn?'#2d5a27':'#d97706'};">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
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
  if (id==='resumen') { _renderResumenCat('cart-resumen-si', cartaCobroData.filter(c=>c.sumaMeta==='SI'&&c.mes===mesActual()&&c.anio===anioActual()), 'var(--verde)'); _renderResumenCat('cart-resumen-no', cartaCobroData.filter(c=>c.sumaMeta==='NO'&&c.mes===mesActual()&&c.anio===anioActual()), '#d97706'); }
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

/* ═══════════════════════════════════════════
   META CARTERA GLOBAL
═══════════════════════════════════════════ */
function abrirModalMetaCartera() {
  const mes  = mesActual();
  const anio = anioActual();
  const val  = prompt('Meta global de CARTERA para ' + mes + ' ' + anio + ' (en $):');
  if (val !== null && val.trim()) {
    window._fbSetMeta(anio, mes, 'cartera', parseFloat(val));
    toastOk('Meta de cartera guardada.');
    setTimeout(renderCartaKPIs, 500);
  }
}

const ESTADOS_COLOR = {
  'Al día':    '#10b981', 'Vigente':    '#10b981', 'Pagado':    '#10b981',
  'Mora':      '#ef4444', 'Mora 1-30':  '#f59e0b', 'Mora 31-60':'#ea580c',
  'Mora +60':  '#ef4444', 'Parcial':    '#d97706', 'Sin gestión':'#9ca3af'
};

/* ── META CARTERA ── */
function abrirModalMetaCartera() {
  const mes  = mesActual();
  const anio = anioActual();
  const val  = prompt('Meta de CARTERA para ' + mes + ' ' + anio + ' (en $):');
  if (val !== null && val.trim()) {
    window._fbSetMeta(anio, mes, 'cartera', parseFloat(val));
    setTimeout(renderCartaAdminKPIs, 500);
  }
}

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
        <td style="font-weight:600;color:#2d5a27;">$${r.monto.toFixed(2)}</td>
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
  const mes  = mesActual();
  const anio = anioActual();
  const val  = prompt('Meta de EXPENSAS para ' + mes + ' ' + anio + ' (en $):');
  if (val !== null && val.trim()) {
    window._fbSetMeta(anio, mes, 'expensas', parseFloat(val));
    setTimeout(renderExpensasAdmin, 500);
  }
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
  btnSuccess(btn);
  toastOk('Cobro de expensa guardado.');
  toggleFormExpensa();
}

function renderExpensasAdmin() {
  const mes  = mesActual();
  const anio = anioActual();
  const lbl  = document.getElementById('exp-periodo-label');
  if (lbl) lbl.textContent = mes + ' ' + anio;

  const filMes  = document.getElementById('exp-fil-mes')?.value || '';
  const filSem  = document.getElementById('exp-fil-semana')?.value || '';
  let datos = expAdminData;
  if (filMes) datos = datos.filter(e => e.mes===filMes);
  if (filSem) datos = datos.filter(e => e.semana===filSem);

  const delMes  = expAdminData.filter(e => e.mes===mes && e.anio===anio);
  const total   = delMes.reduce((s,e)=>s+(e.monto||0), 0);
  const historico = expAdminData.reduce((s,e)=>s+(e.monto||0), 0);

  countUpMoney(document.getElementById('exp-cobrado-val'), total);
  setText('exp-cobrado-n', delMes.length+' cobros');
  countUpMoney(document.getElementById('exp-historico-val'), historico);

  window._fbListenMetas(anio, mes, metas => {
    const meta  = metas?.expensas?.monto || 0;
    const pct   = meta ? Math.round(total/meta*100) : 0;
    const falta = meta ? Math.max(0, meta-total) : 0;
    setText('exp-meta-val',   meta ? '$'+Number(meta).toLocaleString('es-BO') : '—');
    setText('exp-pct-val',    pct+'%');
    setText('exp-falta-val',  meta ? 'Falta: $'+falta.toLocaleString('es-BO',{maximumFractionDigits:0}) : '—');
    setText('exp-barra-pct',  pct+'%');
    const bar = document.getElementById('exp-barra');
    if (bar) {
      bar.style.width = Math.min(pct,100)+'%';
      bar.style.background = pct>=100 ? 'linear-gradient(90deg,#10b981,#34d399)'
                           : pct>=75  ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                           :            'linear-gradient(90deg,#2563eb,#7c3aed)';
    }
    if (typeof updateHomeMetas === 'function') updateHomeMetas('expensas', total, meta, pct);
  });

  // Lista cobros
  const lista = document.getElementById('exp-cobros-lista');
  if (lista) {
    lista.innerHTML = datos.length ? datos.map(e => `
      <div class="cobro-card">
        <div class="cobro-card-left">
          <div class="cobro-nombre">${e.cliente}</div>
          <div class="cobro-meta">${e.terreno||'—'} · ${e.semana||''} ${e.mes||''} ${e.anio||''}</div>
          ${e.obs?`<div style="font-size:var(--fs-sm);color:var(--gris);font-style:italic;">${esc(e.obs)}</div>`:''}
        </div>
        <div class="cobro-monto">
          <div class="cobro-monto-val">$${(e.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div class="cobro-monto-label">${e.fechaCarga||''}</div>
          <button class="btn-del" style="margin-top:6px;" onclick="window._fbRemoveExpAdmin('${e._key}')">🗑</button>
        </div>
      </div>`).join('')
    : '<div class="empty-state">Sin cobros de expensas.</div>';
  }
}

function exportarExpensasAdmin() {
  if (!expAdminData.length) { toastErr('Sin datos para exportar.'); return; }
  const rows = expAdminData.map(e=>({
    'Cliente':e.cliente,'Terreno':e.terreno,'Monto ($)':e.monto,
    'Semana':e.semana,'Mes':e.mes,'Año':e.anio,'Observaciones':e.obs
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

  // Label mes
  const lbl = document.getElementById('adm-mkt-mes-label');
  if (lbl) lbl.textContent = mes + ' ' + anio;

  const delMes = leadsData.filter(l => l.mes===mes && l.anio===anio);
  const fuentesLeads = ['Facebook Ads','Instagram','CRM','WhatsApp','Web','Facebook'];
  const visitasDeLeads = todosRegs.filter(r =>
    r.mes===mes && fuentesLeads.some(f=>(r.procedencia||'').toLowerCase().includes(f.toLowerCase()))
  );
  const cierres = todosRegs.filter(r => r.mes===mes && r.huboCierre==='SI');
  const conv = delMes.length ? Math.round(cierres.length/delMes.length*100) : 0;

  // KPIs
  countUp(document.getElementById('adm-leads-total'), delMes.length);
  setText('adm-leads-mes', 'este mes (' + mes + ')');
  countUp(document.getElementById('adm-visitas-total'), visitasDeLeads.length);
  countUp(document.getElementById('adm-cierres-total'), cierres.length);
  setText('adm-conv-pct', conv + '% conversion');

  // Metas
  window._fbListenMetas(anio, mes, metas => {
    const metaL = metas?.mkt_leads?.monto   || 0;
    const metaV = metas?.mkt_visitas?.monto || 0;
    const metaC = metas?.mkt_cierres?.monto || 0;
    const pctL = metaL ? Math.round(delMes.length/metaL*100) : 0;
    const pctV = metaV ? Math.round(visitasDeLeads.length/metaV*100) : 0;
    const pctC = metaC ? Math.round(cierres.length/metaC*100) : 0;

    setText('adm-leads-actual',    delMes.length);
    setText('adm-leads-meta-txt',  metaL ? 'meta: '+metaL : 'meta: —');
    setText('adm-leads-pct',       pctL+'%');
    const bL = document.getElementById('adm-leads-bar');
    if (bL) bL.style.width = Math.min(pctL,100)+'%';

    setText('adm-visitas-actual',   visitasDeLeads.length);
    setText('adm-visitas-meta-txt', metaV ? 'meta: '+metaV : 'meta: —');
    setText('adm-visitas-pct',      pctV+'%');
    const bV = document.getElementById('adm-visitas-bar');
    if (bV) bV.style.width = Math.min(pctV,100)+'%';

    setText('adm-cierres-actual',   cierres.length);
    setText('adm-cierres-meta-txt', metaC ? 'meta: '+metaC : 'meta: —');
    setText('adm-cierres-pct',      pctC+'%');
    const bC = document.getElementById('adm-cierres-bar');
    if (bC) bC.style.width = Math.min(pctC,100)+'%';
  });

  // Embudo
  const emEl = document.getElementById('adm-mkt-embudo');
  if (emEl) {
    const etapas = [
      { label:'Leads captados',       n: delMes.length,                                          color:'#2563eb' },
      { label:'Agendados',            n: delMes.filter(l=>l.estado==='Agendado').length,          color:'#d97706' },
      { label:'Visitas concretadas',  n: visitasDeLeads.filter(r=>r.visitaConcretada==='SI').length, color:'#f59e0b' },
      { label:'Cierres / Ventas',     n: cierres.length,                                          color:'#10b981' },
    ];
    const maxN = Math.max(...etapas.map(e=>e.n), 1);
    emEl.innerHTML = etapas.map((e,i) => `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:var(--fs-base);margin-bottom:4px;">
          <span style="font-weight:500;">${e.label}</span>
          <span style="font-weight:700;color:${e.color};">${e.n}${i>0&&etapas[i-1].n>0?' ('+Math.round(e.n/etapas[i-1].n*100)+'%)':''}</span>
        </div>
        <div style="height:28px;background:var(--fill);border-radius:var(--r-sm);overflow:hidden;">
          <div style="height:100%;width:${e.n/maxN*100}%;background:${e.color};border-radius:var(--r-sm);transition:width .5s;">
          </div>
        </div>
      </div>`).join('');
  }

  // Leads por fuente
  const fuentesEl = document.getElementById('adm-mkt-fuentes');
  if (fuentesEl) {
    const porFuente = {};
    delMes.forEach(l => { porFuente[l.fuente||'Otro'] = (porFuente[l.fuente||'Otro']||0)+1; });
    const maxF = Math.max(...Object.values(porFuente), 1);
    const colFuente = ['#2563eb','#d97706','#10b981','#7c3aed','#ef4444','#ea580c'];
    fuentesEl.innerHTML = Object.entries(porFuente).sort((a,b)=>b[1]-a[1]).map(([f,n],i)=>`
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
        <div class="bar-track"><div class="bar-fill" style="width:${n/maxS*100}%;background:#2563eb;"></div></div>
      </div>`).join('');
  }

  // Por estado
  const estadosEl = document.getElementById('adm-mkt-estados');
  if (estadosEl) {
    const porEst = {};
    delMes.forEach(l => { porEst[l.estado||'Nuevo'] = (porEst[l.estado||'Nuevo']||0)+1; });
    const colEst = { Nuevo:'#2563eb', Contactado:'#d97706', Agendado:'#10b981', Descartado:'#ef4444' };
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
  const mes  = mesActual();
  const anio = anioActual();
  const metaL = prompt('Meta de LEADS para ' + mes + ' ' + anio + ' (ej: 100):');
  if (metaL !== null && metaL.trim()) {
    window._fbSetMeta(anio, mes, 'mkt_leads', Number(metaL));
  }
  const metaV = prompt('Meta de VISITAS para ' + mes + ' ' + anio + ' (ej: 40):');
  if (metaV !== null && metaV.trim()) {
    window._fbSetMeta(anio, mes, 'mkt_visitas', Number(metaV));
  }
  const metaC = prompt('Meta de CIERRES para ' + mes + ' ' + anio + ' (ej: 10):');
  if (metaC !== null && metaC.trim()) {
    window._fbSetMeta(anio, mes, 'mkt_cierres', Number(metaC));
  }
  setTimeout(renderAdminMarketing, 600);
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
  const visitas   = misReg.filter(r => r.visitaConcretada==='SI').length;
  const cierres   = misReg.filter(r => r.huboCierre==='SI').length;

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
    if (bV) { bV.style.width=Math.min(pctV,100)+'%'; bV.style.background=pctV>=100?'linear-gradient(90deg,#10b981,#34d399)':pctV>=75?'linear-gradient(90deg,#f59e0b,#fbbf24)':'linear-gradient(90deg,#2563eb,#60a5fa)'; }

    setText('fichero-cierres-real', cierres);
    setText('fichero-cierres-meta', metaCierres || '—');
    setText('fichero-cierres-pct', pctC+'%');
    const bC = document.getElementById('fichero-cierres-bar');
    if (bC) { bC.style.width=Math.min(pctC,100)+'%'; bC.style.background=pctC>=100?'linear-gradient(90deg,#10b981,#34d399)':pctC>=75?'linear-gradient(90deg,#f59e0b,#fbbf24)':'linear-gradient(90deg,#10b981,#34d399)'; }
  });

  // Lista registros del mes
  const lista = document.getElementById('fichero-registros-lista');
  if (lista) {
    lista.innerHTML = misReg.length ? misReg.map(r=>`
      <div class="cobro-card">
        <div class="cobro-card-left">
          <div class="cobro-nombre">${r.nombre||'—'}</div>
          <div class="cobro-meta">${r.tipoVisita||'—'} · ${r.fechaAgenda||r.fechaCarga||''}</div>
          <div class="cobro-pills">
            ${r.visitaConcretada==='SI'?'<span class="badge badge-contrato" style="font-size:var(--fs-xs);">✓ Visita concretada</span>':''}
            ${r.huboCierre==='SI'?'<span class="badge badge-contrato" style="font-size:var(--fs-xs);">🏆 Cierre</span>':''}
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
    if (tbody) tbody.innerHTML = cobranzaExcelPend.map(r=>`<tr><td>${r.cliente}</td><td>${r.terreno}</td><td style="font-weight:600;color:#2d5a27;">$${r.monto.toFixed(2)}</td><td>${r.estado}</td><td>${r.fecha}</td><td>${r.mes}</td></tr>`).join('');
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
  'Al día':       '#10b981', 'Pagado':     '#10b981',
  'Mora 1-30':    '#f59e0b', 'Mora 31-60': '#ea580c',
  'Mora +60':     '#ef4444', 'Parcial':    '#d97706',
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
    if (bar) { bar.style.width=Math.min(pct,100)+'%'; bar.style.background=pct>=100?'linear-gradient(90deg,#10b981,#34d399)':pct>=75?'linear-gradient(90deg,#f59e0b,#fbbf24)':'linear-gradient(90deg,#2d5a27,#4a8c3f)'; }
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
        <strong style="color:#2d5a27;margin-left:6px;">$${totalFil.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
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
        <div class="cobro-monto-val">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
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
        <td style="font-weight:600;color:#2d5a27;">$${r.monto.toFixed(2)}</td>
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
          <div style="font-size:var(--fs-md);font-weight:700;color:#2d5a27;">$${(c.monto||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div style="font-size:var(--fs-2xs);color:${c.sumaMeta==='SI'?'#10b981':'#9ca3af'};">${c.sumaMeta==='SI'?'✓ Suma meta':'✗ No suma'}</div>
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
      <div class="prog-item"><div class="pv" style="color:#2d5a27;">$${total.toLocaleString('es-BO',{maximumFractionDigits:0})}</div><div class="pl">Total cobrado</div></div>
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
      if (pctEl)  { pctEl.textContent = pct+'%'; pctEl.style.color = pct>=100?'#10b981':pct>=75?'#f59e0b':'#ef4444'; }
      if (barEl)  { barEl.style.width = Math.min(pct,100)+'%'; barEl.style.background = pct>=100?'linear-gradient(90deg,#10b981,#34d399)':pct>=75?'linear-gradient(90deg,#f59e0b,#fbbf24)':'linear-gradient(90deg,#ef4444,#f87171)'; }
      updateHomeMetas('cartera', cobrado, meta, pct);
    } else {
      const cobEl  = document.getElementById('meta-exp-cobrado');
      const metaEl = document.getElementById('meta-exp-val');
      const pctEl  = document.getElementById('meta-exp-pct');
      const barEl  = document.getElementById('meta-exp-bar');
      if (cobEl)  cobEl.textContent  = '$' + cobrado.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2});
      if (metaEl) metaEl.textContent = meta ? '$' + Number(meta).toLocaleString('es-BO') : '— (sin meta)';
      if (pctEl)  { pctEl.textContent = pct+'%'; pctEl.style.color = pct>=100?'#10b981':pct>=75?'#f59e0b':'#ef4444'; }
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
