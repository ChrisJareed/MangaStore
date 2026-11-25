export function configuracion(env = process.env) {
  const dbName = env.MONGODB_DB || 'mangastore_ep3_web_demo';
  // Nunca permitir la base original ni las bases administrativas.
  if (!/^mangastore_ep3_(?:web_demo|ensayo[a-zA-Z0-9]*)$/.test(dbName)) {
    throw new Error('Usa una base de ensayo: mangastore_ep3_web_demo o mangastore_ep3_ensayo2. La base original está protegida.');
  }
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe estar entre 1 y 65535.');
  return { dbName, port, uri: env.MONGODB_URI || 'mongodb://127.0.0.1:27017' };
}
