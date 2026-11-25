import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { setTimeout as pausa } from 'node:timers/promises';
import { crearApp } from '../src/app.js';
import { RepositorioPrueba } from './fake-repository.js';

test('Interfaz con DOM simulado; no es un navegador ni MongoDB real', async t => {
  const repo = new RepositorioPrueba();
  const server = crearApp({repositorio:repo,modoPrueba:true}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const html=await fs.readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const code=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const {document,Event}=parseHTML(html);
  const $=s=>document.querySelector(s);
  const form=$('#client-form'); form.reset=()=>{};
  for(const dialog of document.querySelectorAll('dialog')){
    dialog.showModal=()=>{dialog.open=true;}; dialog.close=()=>{dialog.open=false;};
  }
  const context=vm.createContext({
    document, Event, location:{hash:''},history:{replaceState(){}},
    URLSearchParams,Intl,AbortController,setTimeout,clearTimeout,console,
    fetch:(ruta,options)=>fetch(new URL(ruta,base),options)
  });
  vm.runInContext(code,context);
  async function esperar(check){
    for(let i=0;i<150;i++){if(check())return;await pausa(10);}
    throw new Error('La interfaz no llegó al estado esperado.');
  }
  function click(selector){$(selector).dispatchEvent(new Event('click',{bubbles:true}));}
  function submit(selector){$(selector).dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}
  function escribir(selector,texto){$(selector).value=texto;}
  await t.test('Inicio y catálogo: seis tomos con conexión de QA rotulada',async()=>{
    await esperar(()=>document.querySelectorAll('.manga-card').length===6);
    assert.match($('#connection-text').textContent,/simulados/);
    assert.equal($('#stat-mangas').textContent,'6');
  });
  await t.test('Búsqueda y filtro de stock crítico',async()=>{
    escribir('#manga-search','One Piece'); $('#manga-search').dispatchEvent(new Event('input'));
    await esperar(()=>document.querySelectorAll('.manga-card').length===2);
    assert.match($('#manga-list').textContent,/One Piece/);
    escribir('#manga-search',''); click('#critical-filter');
    await esperar(()=>$('#manga-list').textContent.includes('Berserk') && !$('#manga-list').textContent.includes('One Piece'));
    assert.match($('#manga-list').textContent,/Nana/);
  });
  await t.test('Navegación a clientes y protección de originales',async()=>{
    click('[data-view="clientes"]'); await esperar(()=>$('#client-list').children.length===3);
    assert.equal(document.querySelectorAll('[data-edit]').length,0);
    assert.equal($('#view-mangas').hidden,true);
  });
  await t.test('Formulario crea cliente y muestra CREATE',async()=>{
    click('#new-client'); assert.equal($('#client-dialog').open,true);
    escribir('#client-name','Lector'); escribir('#client-lastname','Prueba'); escribir('#client-email','lector@example.com');
    submit('#client-form'); await esperar(()=>$('#operation-type').textContent==='CREATE');
    assert.match($('#client-list').textContent,/Lector Prueba/); assert.equal($('#client-dialog').open,false);
    assert.equal($('#stat-clientes').textContent,'4');
  });
  await t.test('Formulario edita y muestra modifiedCount',async()=>{
    click('[data-edit="9901"]'); await esperar(()=>$('#client-dialog').open===true);
    escribir('#client-phone','900000001'); submit('#client-form');
    await esperar(()=>$('#operation-type').textContent==='UPDATE');
    assert.match($('#client-list').textContent,/900000001/);
    assert.match($('#operation-result').textContent,/"modifiedCount": 1/);
  });
  await t.test('Correo duplicado muestra error sin cerrar el formulario',async()=>{
    click('#new-client'); escribir('#client-name','Duplicado'); escribir('#client-lastname','Prueba'); escribir('#client-email','lector@example.com');
    submit('#client-form'); await esperar(()=>$('#client-form-error').hidden===false);
    assert.match($('#client-form-error').textContent,/registrado/);
    assert.equal($('#client-dialog').open,true); click('#cancel-client');
  });
  await t.test('Borrado requiere confirmación y actualiza listado',async()=>{
    click('[data-delete="9901"]'); assert.equal($('#delete-dialog').open,true);
    assert.equal(await repo.ventasCliente(9901),0);
    submit('#delete-form'); await esperar(()=>$('#operation-type').textContent==='DELETE');
    assert.equal($('#client-list').children.length,3); assert.equal($('#stat-clientes').textContent,'3');
  });
  await t.test('Folio 1001 presenta total histórico y comprador',async()=>{
    click('[data-view="ventas"]'); submit('#sale-search-form');
    await esperar(()=>$('#sale-result').textContent.includes('39.970'));
    assert.match($('#sale-result').textContent,/Valeria Morales/);
    assert.match($('#sale-result').textContent,/2 líneas · 3 unidades/);
  });
  await t.test('Folio inexistente presenta mensaje explicativo',async()=>{
    escribir('#sale-folio','8888'); submit('#sale-search-form');
    await esperar(()=>$('#sale-result').textContent.includes('No existe'));
    assert.equal($('#operation-type').textContent,'ERROR');
  });
  // Los timers de notificación son parte del UI; cerrarlos al finalizar el test.
  vm.runInContext('clearTimeout(timerToast)',context);
});

