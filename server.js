import { MongoClient } from 'mongodb';
import { configuracion } from './src/config.js';
import { RepositorioMongo } from './src/repositorio.js';
import { crearApp } from './src/app.js';
const config = configuracion();
const cliente = new MongoClient(config.uri, { serverSelectionTimeoutMS: 4000 });
const app = crearApp({ repositorio: new RepositorioMongo(cliente.db(config.dbName)) });
// Escucha solo en este computador. No es un servidor de producción público.
const servidor = app.listen(config.port, '127.0.0.1', () => {
  console.log(`MangaStore: http://localhost:${config.port}`);
  console.log(`Base de demostración: ${config.dbName}`);
  console.log('Preparación inicial: npm run preparar-demo (solo si la base está vacía).');
});
async function cerrar() { servidor.close(); await cliente.close(); }
process.on('SIGINT', () => cerrar().then(() => process.exit(0)));
process.on('SIGTERM', () => cerrar().then(() => process.exit(0)));
servidor.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'El puerto está ocupado. Cambia PORT en .env.' : 'No se pudo iniciar el servidor.'); process.exitCode = 1; });
