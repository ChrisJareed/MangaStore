// SOLO PRUEBAS: no se importa desde server.js ni se usa como fallback de MongoDB.
import { datos } from '../src/modelo.js';
export class RepositorioPrueba {
  constructor() { this.nombre = 'mangastore_ep3_web_demo'; this.datos = structuredClone(datos); this.caido = false; this.preparado = true; }
  async estado() { if (this.caido) throw new Error('mongodb://credencial-privada'); return { listo: this.preparado, mangas: this.datos.mangas.length, clientes: this.datos.clientes.length, ventas: this.datos.ventas.length, criticos: this.datos.mangas.filter(m => m.stock < 3).length }; }
  match(doc, filtro) {
    return Object.entries(filtro).every(([campo, valor]) => {
      if (campo === '$or') return valor.some(f => this.match(doc, f));
      if (valor && typeof valor === 'object' && '$regex' in valor) return new RegExp(valor.$regex, valor.$options).test(doc[campo]);
      if (valor && typeof valor === 'object' && '$lt' in valor) return doc[campo] < valor.$lt;
      return doc[campo] === valor;
    });
  }
  async mangas(filtro) { return this.datos.mangas.filter(d => this.match(d, filtro)).sort((a,b) => a.titulo.localeCompare(b.titulo) || a.numero_tomo-b.numero_tomo); }
  async clientes(filtro) { return this.datos.clientes.filter(d => this.match(d, filtro)).sort((a,b) => a._id-b._id); }
  async cliente(id) { return this.datos.clientes.find(d => d._id === id) || null; }
  async crearCliente(doc) {
    if (this.datos.clientes.some(c => c._id === doc._id || c.correo === doc.correo)) throw Object.assign(new Error('duplicate'), { code: 11000 });
    this.datos.clientes.push(structuredClone(doc)); return { acknowledged: true, insertedId: doc._id };
  }
  async editarCliente(id, cambios) {
    const doc = await this.cliente(id); if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    if (this.datos.clientes.some(c => c._id !== id && c.correo === cambios.correo)) throw Object.assign(new Error('duplicate'), { code: 11000 });
    const modificado = Object.keys(cambios).some(k => doc[k] !== cambios[k]); Object.assign(doc, cambios);
    return { matchedCount: 1, modifiedCount: Number(modificado) };
  }
  async ventasCliente(id) { return this.datos.ventas.filter(v => v.cliente_id === id).length; }
  async borrarCliente(id) { const antes = this.datos.clientes.length; this.datos.clientes = this.datos.clientes.filter(c => c._id !== id); return { deletedCount: antes-this.datos.clientes.length }; }
  async venta(id) { return this.datos.ventas.find(v => v._id === id) || null; }
}

