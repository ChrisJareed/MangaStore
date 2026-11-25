/* Interfaz de MangaStore. El navegador muestra datos, no consultas ni trazas técnicas. */
const $ = selector => document.querySelector(selector);
const moneda = valor => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor);
const estado = { vista: 'mangas', criticos: false, siguienteId: 9901, editarId: null, borrarId: null, conectado: false, versiones: { mangas: 0, clientes: 0 } };
let timerToast;
function el(tag, clase, texto) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = String(texto);
  return nodo;
}
async function api(ruta, opciones = {}) {
  const controlador = new AbortController();
  const tiempo = setTimeout(() => controlador.abort(), 10000);
  try {
    const response = await fetch(ruta, { ...opciones, signal: controlador.signal, headers: { 'Content-Type': 'application/json', 'X-MangaStore-Request': 'local-demo' } });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      const error = new Error(data.mensaje || 'No se pudo completar la operación.');
      error.status = response.status; throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('La solicitud tardó demasiado. Revisa la conexión y consulta nuevamente el estado.');
    if (error instanceof TypeError) throw new Error('No se pudo contactar al backend. Abre http://localhost:3000 después de ejecutar npm start.');
    throw error;
  } finally { clearTimeout(tiempo); }
}
function notificar(mensaje, error = false) {
  clearTimeout(timerToast); $('#toast').textContent = mensaje;
  $('#toast').classList.toggle('error', error); $('#toast').hidden = false;
  timerToast = setTimeout(() => { $('#toast').hidden = true; }, 6500);
}
function fallo(error, avisar = true) {
  if (avisar) notificar(error.message, true);
}
function resumen(datos = null) {
  for (const nombre of ['mangas', 'clientes', 'ventas']) {
    const cantidad = datos?.listo ? datos[nombre] : '—';
    $('#summary-' + nombre).textContent = cantidad;
    $('#nav-' + nombre + '-count').textContent = cantidad;
  }
  $('#critical-count').textContent = datos?.listo ? datos.criticos : '—';
}
async function actualizarEstado() {
  try {
    const { datos } = await api('/api/estado');
    estado.conectado = datos.listo;
    $('#connection-text').textContent = datos.modoPrueba ? 'Prueba · datos simulados' : datos.listo ? 'Sistema conectado' : 'Preparación pendiente';
    $('#connection-status').dataset.status = datos.modoPrueba ? 'test' : datos.listo ? 'online' : 'loading';
    resumen(datos);
    $('#system-alert').hidden = datos.listo && !datos.modoPrueba;
    if (!datos.listo) {
      $('#system-alert-title').textContent = 'La demostración aún no está preparada';
      $('#system-alert-text').textContent = 'Sigue los pasos de preparación del proyecto y después vuelve a intentar la conexión.';
    } else if (datos.modoPrueba) {
      $('#system-alert-title').textContent = 'Entorno de pruebas técnicas';
      $('#system-alert-text').textContent = 'Esta vista usa datos simulados para revisar el diseño y las acciones. No representa una conexión real a MongoDB.';
    }
    $('#new-client').disabled = !datos.listo;
    return datos.listo;
  } catch (error) {
    estado.conectado = false;
    $('#connection-text').textContent = 'Sin conexión'; $('#connection-status').dataset.status = 'offline';
    resumen(); $('#system-alert').hidden = false;
    $('#system-alert-title').textContent = 'No pudimos conectar con los datos de la tienda';
    $('#system-alert-text').textContent = 'Comprueba que los servicios del proyecto estén iniciados y pulsa Reintentar. No se muestran datos de ejemplo en lugar de los reales.';
    $('#new-client').disabled = true;
    return false;
  }
}
function vacio(selector, mensaje) { $(selector).replaceChildren(el('p', 'empty-state', mensaje)); }
function dibujarMangas(mangas) {
  $('#manga-results').textContent = mangas.length + (mangas.length === 1 ? ' tomo' : ' tomos');
  if (!mangas.length) return vacio('#manga-list', estado.criticos ? 'No hay mangas con stock crítico que coincidan con tu búsqueda.' : 'No encontramos ese título. Prueba con otro nombre.');
  const tabla = el('table'), cabecera = el('thead'), fila = el('tr'), cuerpo = el('tbody');
  const caption = el('caption', 'sr-only', estado.criticos ? 'Mangas con stock menor a tres' : 'Catálogo de mangas');
  ['ID', 'Título', 'Tomo', 'Autor(es)', 'Editorial', 'Género(s)', 'Precio', 'Stock'].forEach(t => { const th = el('th', '', t); th.scope = 'col'; fila.append(th); });
  cabecera.append(fila);
  for (const m of mangas) {
    const autores = (Array.isArray(m.autores) ? m.autores : []).map(a => a.nombre + ' ' + a.apellido).join(', ');
    const row = el('tr'), titulo = el('td'), nombre = el('div', 'manga-name');
    const libro = el('span', 'book-tile', m.titulo.slice(0, 2).toUpperCase());
    libro.dataset.tone = m._id % 4; libro.setAttribute('aria-hidden', 'true');
    const texto = el('div'); texto.append(el('span', 'manga-title', m.titulo), el('span', 'manga-subtitle', 'Tomo ' + m.numero_tomo));
    nombre.append(libro, texto); titulo.append(nombre);
    const generos = el('td'), tags = el('div', 'tag-list');
    for (const genero of m.generos || []) tags.append(el('span', 'genre-tag', genero));
    generos.append(tags);
    const stock = el('td'), nivel = m.stock === 0 ? 'empty' : m.stock < 3 ? 'low' : '';
    const etiqueta = m.stock === 0 ? 'Agotado' : m.stock < 3 ? 'Stock bajo' : 'Disponible';
    const badge = el('span', 'stock-badge ' + nivel);
    badge.append(el('span', 'stock-number', m.stock), document.createTextNode(' · ' + etiqueta));
    stock.append(badge);
    row.append(el('td', 'id-cell', '#' + m._id), titulo, el('td', 'tomo-cell', m.numero_tomo), el('td', 'author-cell', autores), el('td', 'editorial-cell', m.editorial), generos, el('td', 'price-cell', moneda(m.precio)), stock);
    cuerpo.append(row);
  }
  tabla.append(caption, cabecera, cuerpo);
  $('#manga-list').replaceChildren(tabla);
}
async function cargarMangas() {
  const version = ++estado.versiones.mangas;
  const q = new URLSearchParams({ q: $('#manga-search').value.trim(), criticos: String(estado.criticos) });
  $('#manga-list').classList.add('loading');
  $('#manga-list').setAttribute('aria-busy', 'true');
  try {
    const respuesta = await api('/api/mangas?' + q);
    if (version !== estado.versiones.mangas) return;
    dibujarMangas(respuesta.datos);
  } catch (error) {
    if (version !== estado.versiones.mangas) return;
    vacio('#manga-list', error.message); $('#manga-results').textContent = 'No disponible'; fallo(error, false);
  } finally { if (version === estado.versiones.mangas) { $('#manga-list').classList.remove('loading'); $('#manga-list').setAttribute('aria-busy', 'false'); } }
}
async function cargarClientes() {
  const version = ++estado.versiones.clientes;
  $('#client-list').setAttribute('aria-busy', 'true');
  try {
    const r = await api('/api/clientes?' + new URLSearchParams({ q: $('#client-search').value.trim() }));
    if (version !== estado.versiones.clientes) return;
    estado.siguienteId = r.siguienteId;
    $('#client-results').textContent = r.datos.length + (r.datos.length === 1 ? ' cliente' : ' clientes');
    const filas = r.datos.map(c => {
      const tr = el('tr'), acciones = el('td');
      tr.append(el('td', 'id-cell', '#' + c._id));
      [c.nombre, c.apellido, c.correo, c.telefono || 'Sin teléfono'].forEach(valor => tr.append(el('td', '', valor)));
      if (c._id >= 9900) {
        const grupo = el('div', 'row-actions'), editar = el('button', 'text-button', 'Editar'), borrar = el('button', 'text-button remove', 'Eliminar');
        editar.type = 'button'; borrar.type = 'button';
        editar.setAttribute('aria-label', 'Editar a ' + c.nombre + ' ' + c.apellido);
        borrar.setAttribute('aria-label', 'Eliminar a ' + c.nombre + ' ' + c.apellido);
        editar.dataset.edit = c._id; borrar.dataset.delete = c._id; borrar.dataset.name = c.nombre + ' ' + c.apellido;
        grupo.append(editar, borrar); acciones.append(grupo);
      } else acciones.append(el('span', 'protected', 'Solo consulta'));
      tr.append(acciones); return tr;
    });
    if (!filas.length) { const tr = el('tr'), td = el('td', '', 'No hay clientes que coincidan con la búsqueda.'); td.colSpan = 6; tr.append(td); filas.push(tr); }
    $('#client-list').replaceChildren(...filas);
  } catch (error) {
    if (version !== estado.versiones.clientes) return;
    $('#client-results').textContent = 'No disponible';
    const tr = el('tr'), td = el('td', 'empty-state', error.message); td.colSpan = 6; tr.append(td); $('#client-list').replaceChildren(tr); fallo(error, false);
  } finally { if (version === estado.versiones.clientes) $('#client-list').setAttribute('aria-busy', 'false'); }
}
const vistas = ['mangas', 'clientes', 'ventas'];
const titulos = {
  mangas: ['Catálogo de mangas', 'Encuentra cada tomo y revisa su disponibilidad.', 'Catálogo'],
  clientes: ['Clientes de la tienda', 'Todos tus contactos, organizados y a mano.', 'Clientes'],
  ventas: ['Consulta de ventas', 'Cada compra con su detalle, sus productos y su total.', 'Ventas']
};
async function mostrarVista(nombre) {
  if (!vistas.includes(nombre)) nombre = 'mangas';
  estado.vista = nombre;
  $('#page-title').textContent = titulos[nombre][0];
  $('#page-description').textContent = titulos[nombre][1];
  $('#breadcrumb-view').textContent = titulos[nombre][2];
  document.title = 'MangaStore · ' + titulos[nombre][2];
  for (const boton of document.querySelectorAll('[data-view]')) {
    const activo = boton.dataset.view === nombre;
    boton.classList.toggle('active', activo);
    if (activo) boton.setAttribute('aria-current', 'page'); else boton.removeAttribute('aria-current');
  }
  for (const n of vistas) $('#view-' + n).hidden = n !== nombre;
  history.replaceState(null, '', '#' + nombre);
  if (nombre === 'mangas') await cargarMangas();
  if (nombre === 'clientes') await cargarClientes();
}
function abrirFormulario(cliente = null) {
  $('#client-form').reset(); $('#client-form-error').hidden = true;
  estado.editarId = cliente?._id ?? null;
  $('#client-dialog-title').textContent = cliente ? 'Editar cliente' : 'Nuevo cliente';
  $('#save-client').textContent = cliente ? 'Guardar cambios' : 'Crear cliente';
  $('#client-id').disabled = Boolean(cliente); $('#client-id').value = cliente?._id ?? estado.siguienteId;
  $('#client-name').value = cliente?.nombre ?? ''; $('#client-lastname').value = cliente?.apellido ?? '';
  $('#client-email').value = cliente?.correo ?? ''; $('#client-phone').value = cliente?.telefono ?? '';
  $('#client-dialog').showModal(); setTimeout(() => $('#client-name').focus(), 0);
}
async function guardarCliente(event) {
  event.preventDefault(); const boton = $('#save-client'); if (boton.disabled) return;
  boton.disabled = true; $('#client-form-error').hidden = true;
  const doc = { _id: Number($('#client-id').value), nombre: $('#client-name').value, apellido: $('#client-lastname').value, correo: $('#client-email').value, telefono: $('#client-phone').value };
  try {
    const editar = estado.editarId !== null;
    const r = await api(editar ? '/api/clientes/' + estado.editarId : '/api/clientes', { method: editar ? 'PUT' : 'POST', body: JSON.stringify(doc) });
    $('#client-dialog').close(); notificar(r.mensaje); $('#client-search').value = '';
    await cargarClientes(); await actualizarEstado();
  } catch (error) { $('#client-form-error').textContent = error.message; $('#client-form-error').hidden = false; fallo(error); }
  finally { boton.disabled = false; }
}
async function eliminarCliente(event) {
  event.preventDefault(); const boton = $('#confirm-delete'); if (boton.disabled) return;
  boton.disabled = true; $('#delete-error').hidden = true;
  try {
    const r = await api('/api/clientes/' + estado.borrarId, { method: 'DELETE', body: '{}' });
    $('#delete-dialog').close(); notificar(r.mensaje);
    await cargarClientes(); await actualizarEstado();
  } catch (error) { $('#delete-error').textContent = error.message; $('#delete-error').hidden = false; fallo(error); }
  finally { boton.disabled = false; }
}
function dibujarVenta(v) {
  const resultado = el('article', 'receipt');
  const fecha = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'America/Santiago' }).format(new Date(v.fecha));
  const nombre = v.cliente ? v.cliente.nombre + ' ' + v.cliente.apellido : 'Cliente ' + v.cliente_id + ' no encontrado';
  const header = el('div', 'receipt-header'), titulo = el('div');
  titulo.append(el('p', 'eyebrow', 'COMPROBANTE DE VENTA'), el('h3', '', 'Venta #' + v._id));
  header.append(titulo, el('span', 'receipt-brand', 'MangaStore.'));
  const meta = el('div', 'receipt-meta');
  for (const [etiqueta, valor] of [['CLIENTE', nombre], ['FECHA DE COMPRA', fecha]]) {
    const campo = el('div'); campo.append(el('span', 'meta-label', etiqueta), el('p', 'meta-value', valor)); meta.append(campo);
  }
  resultado.append(header, meta);
  const table = el('table'), head = el('thead'), headrow = el('tr'), body = el('tbody');
  table.append(el('caption', 'sr-only', 'Productos de la venta ' + v._id));
  ['Manga', 'Tomo', 'Cantidad', 'Precio unitario', 'Subtotal'].forEach(t => { const th = el('th', '', t); th.scope = 'col'; headrow.append(th); }); head.append(headrow);
  for (const d of v.detalle) {
    const tr = el('tr');
    [d.titulo, d.numero_tomo, d.cantidad, moneda(d.precio_unitario), moneda(d.subtotal)].forEach((valor, i) => tr.append(el('td', i >= 3 ? 'price-cell' : '', valor)));
    body.append(tr);
  }
  table.append(head, body);
  const wrap = el('div', 'table-wrap'); wrap.append(table);
  const resumen = el('div', 'receipt-summary'), total = el('div', 'receipt-total');
  total.append(el('span', '', 'Total de la compra'), el('strong', '', moneda(v.total)));
  resumen.append(el('p', 'receipt-units', v.detalle.length + ' líneas · ' + v.unidades + ' unidades'), total);
  resultado.append(wrap, resumen);
  $('#sale-result').replaceChildren(resultado);
}
async function buscarVenta(event) {
  event.preventDefault(); const boton = $('#sale-search-form button'); if (boton.disabled) return;
  boton.disabled = true; $('#sale-result').setAttribute('aria-busy', 'true');
  try { const r = await api('/api/ventas/' + encodeURIComponent($('#sale-folio').value)); dibujarVenta(r.datos); notificar('Comprobante encontrado.'); }
  catch (error) { vacio('#sale-result', error.message); fallo(error); }
  finally { boton.disabled = false; $('#sale-result').setAttribute('aria-busy', 'false'); }
}
function diferir(fn) { let timer; return () => { clearTimeout(timer); timer = setTimeout(fn, 250); }; }
for (const boton of document.querySelectorAll('[data-view]')) boton.addEventListener('click', () => mostrarVista(boton.dataset.view));
$('#manga-search-form').addEventListener('submit', event => { event.preventDefault(); cargarMangas(); });
$('#client-search-form').addEventListener('submit', event => { event.preventDefault(); cargarClientes(); });
$('#manga-search').addEventListener('input', diferir(cargarMangas));
$('#client-search').addEventListener('input', diferir(() => cargarClientes()));
$('#critical-filter').addEventListener('click', () => {
  estado.criticos = !estado.criticos;
  $('#critical-filter').setAttribute('aria-pressed', String(estado.criticos));
  $('#catalog-title').textContent = estado.criticos ? 'Tomos con stock crítico' : 'Todos los tomos';
  cargarMangas();
});
$('#new-client').addEventListener('click', () => abrirFormulario());
$('#client-form').addEventListener('submit', guardarCliente);
$('#cancel-client').addEventListener('click', () => $('#client-dialog').close());
$('#client-list').addEventListener('click', async event => {
  const editar = event.target.closest('[data-edit]'), eliminar = event.target.closest('[data-delete]');
  if (editar) { try { const r = await api('/api/clientes/' + editar.dataset.edit); abrirFormulario(r.datos); } catch (error) { fallo(error); } }
  else if (eliminar) { estado.borrarId = Number(eliminar.dataset.delete); $('#delete-description').textContent = eliminar.dataset.name + ', ID ' + estado.borrarId + '.'; $('#delete-error').hidden = true; $('#delete-dialog').showModal(); }
});
$('#cancel-delete').addEventListener('click', () => $('#delete-dialog').close());
for (const boton of document.querySelectorAll('[data-close]')) boton.addEventListener('click', () => $('#' + boton.dataset.close).close());
$('#delete-form').addEventListener('submit', eliminarCliente);
$('#sale-search-form').addEventListener('submit', buscarVenta);
$('#retry-connection').addEventListener('click', async () => { if (await actualizarEstado()) await mostrarVista(estado.vista); });
async function iniciar() { $('#new-client').disabled = true; await actualizarEstado(); await mostrarVista(location.hash.slice(1) || 'mangas'); }
iniciar();

