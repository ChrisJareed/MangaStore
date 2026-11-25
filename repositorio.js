// Solo este módulo realiza operaciones sobre MongoDB.
export class RepositorioMongo {
  constructor(db) { this.db = db; this.nombre = db.databaseName; }
  async estado() {
    await this.db.command({ ping: 1 });
    const existentes = await this.db.listCollections({}, { nameOnly: true }).toArray();
    const listo = ['mangas', 'clientes', 'ventas'].every(c => existentes.some(x => x.name === c));
    if (!listo) return { listo: false, mangas: 0, clientes: 0, ventas: 0, criticos: 0 };
    const [mangas, clientes, ventas, criticos] = await Promise.all([
      this.db.collection('mangas').countDocuments(), this.db.collection('clientes').countDocuments(),
      this.db.collection('ventas').countDocuments(), this.db.collection('mangas').countDocuments({ stock: { $lt: 3 } })
    ]);
    return { listo: true, mangas, clientes, ventas, criticos };
  }
  async mangas(filtro) { return this.db.collection('mangas').find(filtro).sort({ titulo: 1, numero_tomo: 1 }).limit(200).toArray(); }
  async clientes(filtro) { return this.db.collection('clientes').find(filtro).sort({ _id: 1 }).limit(200).toArray(); }
  async cliente(id) { return this.db.collection('clientes').findOne({ _id: id }); }
  async crearCliente(doc) { return this.db.collection('clientes').insertOne(doc); }
  async editarCliente(id, cambios) { return this.db.collection('clientes').updateOne({ _id: id }, { $set: cambios }); }
  async ventasCliente(id) { return this.db.collection('ventas').countDocuments({ cliente_id: id }); }
  async borrarCliente(id) { return this.db.collection('clientes').deleteOne({ _id: id }); }
  async venta(id) { return this.db.collection('ventas').findOne({ _id: id }); }
}
