import test from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../src/app.js';
import { configuracion } from '../src/config.js';
import { RepositorioPrueba } from './fake-repository.js';
test('API HTTP con repositorio simulado; no es una prueba de MongoDB real', async t => {
  const repo = new RepositorioPrueba();
  const server = crearApp({ repositorio: repo, modoPrueba: true }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  async function request(path, method = 'GET', body, headers = {}) {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-MangaStore-Request': 'local-demo', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: r.status, body: await r.json() };
  }
  const client = { _id: 9901, nombre: 'Cliente', apellido: 'Prueba', correo: 'ep3@example.com', telefono: '' };
  await t.test('Estado: 6 mangas, 3 clientes, 2 ventas y 2 críticos', async () => {
    const r = await request('/api/estado'); assert.equal(r.status,200); assert.equal(r.body.datos.mangas,6); assert.equal(r.body.datos.criticos,2); assert.equal(r.body.datos.modoPrueba,true);
  });
  await t.test('Catálogo y búsqueda de One Piece', async () => {
    const r = await request('/api/mangas?q=one%20piece'); assert.equal(r.body.datos.length,2); assert.equal(r.body.operacion.tipo,'READ');
  });
  await t.test('Stock crítico estricto menor a tres', async () => {
    const r = await request('/api/mangas?criticos=true'); assert.deepEqual(r.body.datos.map(m=>m._id).sort(),[5,6]);
  });
  await t.test('Caracteres regex se buscan como texto literal', async () => {
    assert.equal((await request('/api/mangas?q=.*')).body.datos.length,0);
  });
  await t.test('Rechazo de inyección en parámetros de búsqueda', async () => {
    assert.equal((await request('/api/mangas?q[a]=1')).status,400);
  });
  await t.test('Cliente original de solo lectura', async () => {
    assert.equal((await request('/api/clientes/1','PUT',client)).status,403);
    assert.equal((await request('/api/clientes/1','DELETE',{})).status,403);
  });
  await t.test('Crear cliente temporal y consultar', async () => {
    const r = await request('/api/clientes','POST',client); assert.equal(r.status,201); assert.equal(r.body.operacion.resultado.insertedId,9901);
    assert.equal((await request('/api/clientes/9901')).body.datos.nombre,'Cliente');
  });
  await t.test('Rechazo de ID duplicado', async () => { assert.equal((await request('/api/clientes','POST',client)).status,409); });
  await t.test('Rechazo de correo duplicado', async () => {
    assert.equal((await request('/api/clientes','POST',{...client,_id:9902,correo:'valeria@example.com'})).status,409);
  });
  await t.test('Validación de correo, nombre, ID entero y tipos', async () => {
    for (const campos of [{correo:'sin-arroba'}, {nombre:' '}, {_id:9901.5}, {nombre:{$gt:''}}, {_id:true}])
      assert.equal((await request('/api/clientes','POST',{...client,...campos})).status,400);
  });
  await t.test('Actualizar teléfono y detectar operación sin cambios', async () => {
    const body = {...client,telefono:'900000001'};
    const r = await request('/api/clientes/9901','PUT',body); assert.equal(r.body.operacion.resultado.modifiedCount,1);
    assert.equal((await request('/api/clientes/9901','PUT',body)).body.operacion.resultado.modifiedCount,0);
  });
  await t.test('Los campos no autorizados no se guardan', async () => {
    await request('/api/clientes/9901','PUT',{...client,admin:true,$set:{nombre:'hack'}});
    assert.equal((await repo.cliente(9901)).admin,undefined);
  });
  await t.test('Folio 1001: Valeria, dos líneas, tres unidades, 39970', async () => {
    const r = await request('/api/ventas/1001'); assert.equal(r.body.datos.total,39970); assert.equal(r.body.datos.unidades,3); assert.equal(r.body.datos.detalle.length,2); assert.equal(r.body.datos.cliente.nombre,'Valeria');
  });
  await t.test('La consulta de venta no cambia inventario', async () => {
    const antes = JSON.stringify(repo.datos.mangas); await request('/api/ventas/1001'); assert.equal(JSON.stringify(repo.datos.mangas),antes);
  });
  await t.test('Folio inexistente y folio inválido', async () => {
    assert.equal((await request('/api/ventas/8888')).status,404); assert.equal((await request('/api/ventas/1.5')).status,400);
  });
  await t.test('No eliminar cliente temporal con ventas asociadas', async () => {
    repo.datos.ventas.push({_id:9999,cliente_id:9901,detalle:[]});
    assert.equal((await request('/api/clientes/9901','DELETE',{})).status,409);
    repo.datos.ventas.pop();
  });
  await t.test('Eliminar cliente temporal y verificar ausencia', async () => {
    assert.equal((await request('/api/clientes/9901','DELETE',{})).body.operacion.resultado.deletedCount,1);
    assert.equal((await request('/api/clientes/9901')).status,404);
  });
  await t.test('Bloqueo de solicitudes de otro origen y sin cabecera', async () => {
    assert.equal((await request('/api/clientes','POST',client,{Origin:'https://otro.example'})).status,403);
    assert.equal((await request('/api/clientes','POST',client,{'X-MangaStore-Request':''})).status,403);
  });
  await t.test('No exponer archivos del servidor ni .env', async () => {
    for(const path of ['/server.js','/.env','/src/modelo.js']) assert.equal((await fetch(base+path)).status,404);
  });
  await t.test('Interfaz estática y política de seguridad', async () => {
    const r = await fetch(base); assert.equal(r.status,200); assert.match(await r.text(),/MangaStore/); assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  });
  await t.test('Error de conexión sin exponer secretos', async () => {
    repo.caido = true; const r = await request('/api/estado'); assert.equal(r.status,503); assert.ok(!JSON.stringify(r.body).includes('credencial-privada')); repo.caido = false;
  });
  await t.test('Base sin preparar se indica expresamente', async () => {
    repo.preparado = false; assert.equal((await request('/api/estado')).body.datos.listo,false); repo.preparado = true;
  });
  await t.test('Base sin preparar no admite altas que evadan los validadores', async () => {
    repo.preparado = false;
    assert.equal((await request('/api/clientes','POST',client)).status,409);
    assert.equal(await repo.cliente(9901),null);
    repo.preparado = true;
  });
});
test('Configuración: no permite usar la base original ni bases administrativas', () => {
  for (const MONGODB_DB of ['mangastore_ep3','admin','local','testing','mangastore_ep3_web_demo_x'])
    assert.throws(()=>configuracion({MONGODB_DB}));
  assert.equal(configuracion({}).dbName,'mangastore_ep3_web_demo');
  assert.equal(configuracion({MONGODB_DB:'mangastore_ep3_ensayo2'}).dbName,'mangastore_ep3_ensayo2');
});

