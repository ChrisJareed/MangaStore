import express from 'express';
import { fileURLToPath } from 'node:url';
const publico = fileURLToPath(new URL('../public/', import.meta.url));
class ErrorUsuario extends Error { constructor(status, mensaje) { super(mensaje); this.status = status; } }
const entero = valor => {
  if (typeof valor !== 'string' && typeof valor !== 'number') throw new ErrorUsuario(400, 'El ID debe ser un número entero positivo.');
  if (!/^\d+$/.test(String(valor)) || !Number.isSafeInteger(Number(valor)) || Number(valor) < 1) throw new ErrorUsuario(400, 'El ID debe ser un número entero positivo.');
  return Number(valor);
};
const escapeRegex = texto => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function busqueda(valor) {
  if (valor === undefined) return '';
  if (typeof valor !== 'string' || valor.length > 100) throw new ErrorUsuario(400, 'La búsqueda admite hasta 100 caracteres.');
  return valor.trim();
}
function camposCliente(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ErrorUsuario(400, 'Envía un cliente válido.');
  const limites = { nombre: 50, apellido: 50, correo: 100, telefono: 20 };
  const resultado = {};
  for (const [campo, max] of Object.entries(limites)) {
    const valor = body[campo] ?? (campo === 'telefono' ? '' : undefined);
    if (typeof valor !== 'string' || valor.trim().length > max || (campo !== 'telefono' && !valor.trim())) throw new ErrorUsuario(400, `Revisa ${campo}: es texto ${campo === 'telefono' ? 'opcional' : 'obligatorio'} de hasta ${max} caracteres.`);
    resultado[campo] = valor.trim();
  }
  resultado.correo = resultado.correo.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resultado.correo)) throw new ErrorUsuario(400, 'Ingresa un correo válido, por ejemplo cliente@example.com.');
  return resultado;
}
function temporal(id) { if (id < 9900) throw new ErrorUsuario(403, 'Los clientes originales son de solo consulta. Usa un ID desde 9900 para la demostración.'); }
const serializar = obj => JSON.stringify(obj, null, 2);
function traza(tipo, consulta, explicacion, resultado) { return { tipo, consulta, explicacion, resultado }; }
export function crearApp({ repositorio, modoPrueba = false }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', (req, res, next) => {
    if (Object.keys(req.query).some(k => !['q', 'criticos'].includes(k))) return next(new ErrorUsuario(400, 'Parámetro de consulta no permitido.'));
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (req.headers['x-mangastore-request'] !== 'local-demo') return next(new ErrorUsuario(403, 'Solicitud no autorizada para esta demo local.'));
      if (req.headers.origin) {
        let url; try { url = new URL(req.headers.origin); } catch { return next(new ErrorUsuario(403, 'Origen no válido.')); }
        if (url.host !== req.headers.host) return next(new ErrorUsuario(403, 'La operación debe venir de la propia interfaz local.'));
      }
      if (!req.is('application/json')) return next(new ErrorUsuario(415, 'El cuerpo debe usar application/json.'));
    }
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  app.use('/api', async (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) && !(await repositorio.estado()).listo) {
      throw new ErrorUsuario(409, 'Prepara primero la base de demostración con npm run preparar-demo.');
    }
    next();
  });
  app.get('/api/estado', async (req, res) => {
    const estado = await repositorio.estado();
    res.json({ ok: true, datos: { ...estado, base: repositorio.nombre, modoPrueba }, mensaje: estado.listo ? 'MongoDB conectado' : 'Conectado. Falta preparar la base de demostración.' });
  });
  app.get('/api/mangas', async (req, res) => {
    const q = busqueda(req.query.q);
    const filtro = {};
    if (q) filtro.titulo = { $regex: escapeRegex(q), $options: 'i' };
    if (req.query.criticos === 'true') filtro.stock = { $lt: 3 };
    const datos = await repositorio.mangas(filtro);
    res.json({ ok: true, datos, mensaje: `${datos.length} tomo(s) encontrado(s).`, operacion: traza('READ', `db.mangas.find(${serializar(filtro)})\n  .sort({ titulo: 1, numero_tomo: 1 })\n  .limit(200);`, 'find consulta el catálogo. $lt: 3 selecciona stock menor a tres. La consulta no modifica datos.', { documentos: datos.length }) });
  });
  app.get('/api/clientes', async (req, res) => {
    const q = busqueda(req.query.q);
    const filtro = q ? { $or: ['nombre', 'apellido', 'correo'].map(c => ({ [c]: { $regex: escapeRegex(q), $options: 'i' } })) } : {};
    const datos = await repositorio.clientes(filtro);
    let siguiente = 9901;
    while (await repositorio.cliente(siguiente)) siguiente++;
    res.json({ ok: true, datos, siguienteId: siguiente, mensaje: `${datos.length} cliente(s) encontrado(s).`, operacion: traza('READ', `db.clientes.find(${serializar(filtro)})\n  .sort({ _id: 1 }).limit(200);`, 'find recupera los contactos. Los IDs inferiores a 9900 están protegidos en esta interfaz.', { documentos: datos.length }) });
  });
  app.get('/api/clientes/:id', async (req, res) => {
    const id = entero(req.params.id); const datos = await repositorio.cliente(id);
    if (!datos) throw new ErrorUsuario(404, 'El cliente no existe.');
    res.json({ ok: true, datos, operacion: traza('READ', `db.clientes.findOne({ _id: ${id} });`, 'findOne recupera un documento por su ID.', datos) });
  });
  app.post('/api/clientes', async (req, res) => {
    const id = entero(req.body?._id); temporal(id);
    const datos = { _id: id, ...camposCliente(req.body) };
    const resultado = await repositorio.crearCliente(datos);
    res.status(201).json({ ok: true, datos, mensaje: 'Cliente creado correctamente.', operacion: traza('CREATE', `db.clientes.insertOne(${serializar(datos)});`, 'insertOne agrega un documento. El índice único rechaza IDs o correos repetidos.', { acknowledged: resultado.acknowledged, insertedId: resultado.insertedId }) });
  });
  app.put('/api/clientes/:id', async (req, res) => {
    const id = entero(req.params.id); temporal(id);
    const cambios = camposCliente(req.body);
    const resultado = await repositorio.editarCliente(id, cambios);
    if (!resultado.matchedCount) throw new ErrorUsuario(404, 'El cliente no existe.');
    res.json({ ok: true, datos: { _id: id, ...cambios }, mensaje: resultado.modifiedCount ? 'Cliente actualizado correctamente.' : 'El cliente ya tenía esos datos. No hubo cambios.', operacion: traza('UPDATE', `db.clientes.updateOne(\n  { _id: ${id} },\n  { $set: ${serializar(cambios)} }\n);`, '$set cambia solo los campos indicados. matchedCount indica coincidencias y modifiedCount, cambios efectivos.', { matchedCount: resultado.matchedCount, modifiedCount: resultado.modifiedCount }) });
  });
  app.delete('/api/clientes/:id', async (req, res) => {
    const id = entero(req.params.id); temporal(id);
    if (await repositorio.ventasCliente(id)) throw new ErrorUsuario(409, 'Este cliente tiene ventas asociadas y no se puede eliminar.');
    const resultado = await repositorio.borrarCliente(id);
    if (!resultado.deletedCount) throw new ErrorUsuario(404, 'El cliente ya no existe.');
    res.json({ ok: true, mensaje: 'Cliente eliminado correctamente.', operacion: traza('DELETE', `db.ventas.countDocuments({ cliente_id: ${id} });\n// Si devuelve 0:\ndb.clientes.deleteOne({ _id: ${id} });`, 'Se revisan referencias antes de eliminar. Esta demo local no registra ventas concurrentes.', { deletedCount: resultado.deletedCount }) });
  });
  app.get('/api/ventas/:folio', async (req, res) => {
    const id = entero(req.params.folio); const venta = await repositorio.venta(id);
    if (!venta) throw new ErrorUsuario(404, `No existe una venta con el folio ${id}. Prueba con 1001 o 1002.`);
    const cliente = await repositorio.cliente(venta.cliente_id);
    if (!Array.isArray(venta.detalle) || venta.detalle.some(d => !Number.isFinite(d.cantidad) || !Number.isFinite(d.precio_unitario))) throw new ErrorUsuario(422, 'El detalle de la venta contiene datos no válidos.');
    const detalle = venta.detalle.map(d => ({ ...d, subtotal: d.cantidad * d.precio_unitario }));
    const total = detalle.reduce((s, d) => s + d.subtotal, 0);
    const unidades = detalle.reduce((s, d) => s + d.cantidad, 0);
    res.json({ ok: true, datos: { ...venta, cliente, detalle, total, unidades }, mensaje: 'Venta encontrada. No se modificó el stock.', operacion: traza('READ', `const venta = db.ventas.findOne({ _id: ${id} });\nconst cliente = db.clientes.findOne({ _id: venta.cliente_id });\nconst total = venta.detalle.reduce(\n  (suma, linea) => suma + linea.cantidad * linea.precio_unitario, 0\n);`, 'La venta contiene su detalle embebido. El backend calcula el total con precios históricos, sin insertar otra venta ni descontar stock.', { folio: id, lineas: detalle.length, unidades, total }) });
  });
  app.use('/api', (req, res) => res.status(404).json({ ok: false, mensaje: 'Operación no disponible.' }));
  app.use(express.static(publico, { dotfiles: 'deny', index: 'index.html' }));
  app.use((err, req, res, next) => {
    let status = err.status || 500; let mensaje = err.message;
    if (err.code === 11000) { status = 409; mensaje = 'Ese ID o correo ya está registrado. Usa otro.'; }
    else if (err.code === 121) { status = 422; mensaje = 'MongoDB rechazó el documento porque no cumple el esquema de validación.'; }
    else if (err.type === 'entity.parse.failed') { status = 400; mensaje = 'El cuerpo JSON no es válido.'; }
    else if (status === 500) { console.error('Fallo de API:', err.name, err.code || 'sin código'); status = 503; mensaje = 'No se pudo consultar MongoDB. Comprueba que el servicio esté iniciado y revisa la consola del servidor.'; }
    res.status(status).json({ ok: false, mensaje });
  });
  return app;
}
