import { MongoClient } from 'mongodb';
import { configuracion } from '../src/config.js';
import { modelos, datos } from '../src/modelo.js';
const config = configuracion();
const cliente = new MongoClient(config.uri, { serverSelectionTimeoutMS: 4000 });
try {
  await cliente.connect(); const db = cliente.db(config.dbName);
  if ((await db.listCollections({}, { nameOnly: true }).toArray()).length) {
    throw new Error(`La base ${config.dbName} ya tiene colecciones. No se modificó nada. Si ya está preparada, ejecuta npm start.`);
  }
  for (const [nombre, modelo] of Object.entries(modelos)) {
    await db.createCollection(nombre, { validator: { $jsonSchema: { bsonType: 'object', ...modelo } }, validationLevel: 'strict', validationAction: 'error' });
  }
  await db.collection('clientes').createIndex({ correo: 1 }, { unique: true });
  await db.collection('mangas').createIndex({ titulo: 1, numero_tomo: 1, editorial: 1 }, { unique: true });
  await db.collection('ventas').createIndex({ cliente_id: 1, fecha: -1 });
  for (const [nombre, docs] of Object.entries(datos)) await db.collection(nombre).insertMany(docs);
  console.log(`Base preparada: ${config.dbName}`);
  console.log('6 mangas, 3 clientes y 2 ventas. La base original mangastore_ep3 no se tocó.');
  console.log('Ahora ejecuta npm start y abre http://localhost:3000');
} catch (error) {
  console.error(error.name === 'MongoServerSelectionError' ? 'No se pudo conectar a MongoDB. Comprueba el servicio local y MONGODB_URI.' : error.message);
  console.error('Si la preparación se interrumpió después de crear colecciones, revisa esa base. No se elimina ni reinicializa automáticamente.');
  process.exitCode = 1;
} finally { await cliente.close(); }
