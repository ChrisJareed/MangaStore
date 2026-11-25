// El mismo modelo documental de la EP3. No se crean tablas ni objetos PL/SQL.
const entero = { bsonType: 'number', minimum: 1, multipleOf: 1 };
const texto = { bsonType: 'string', minLength: 1 };
const precio = { bsonType: 'number', minimum: 0, exclusiveMinimum: true };
export const modelos = {
  mangas: { required: ['_id', 'titulo', 'numero_tomo', 'precio', 'stock', 'editorial', 'autores', 'generos'], properties: {
    _id: entero, titulo: texto, numero_tomo: entero, precio,
    stock: { bsonType: 'number', minimum: 0, multipleOf: 1 }, editorial: texto,
    autores: { bsonType: 'array', minItems: 1, items: { bsonType: 'object', required: ['nombre', 'apellido'], properties: { nombre: texto, apellido: texto } } },
    generos: { bsonType: 'array', minItems: 1, items: texto }
  } },
  clientes: { required: ['_id', 'nombre', 'apellido', 'correo'], properties: {
    _id: entero, nombre: texto, apellido: texto, correo: texto, telefono: { bsonType: 'string' }
  } },
  ventas: { required: ['_id', 'fecha', 'cliente_id', 'detalle'], properties: {
    _id: entero, fecha: { bsonType: 'date' }, cliente_id: entero,
    detalle: { bsonType: 'array', minItems: 1, items: { bsonType: 'object', required: ['manga_id', 'titulo', 'numero_tomo', 'cantidad', 'precio_unitario'], properties: {
      manga_id: entero, titulo: texto, numero_tomo: entero, cantidad: entero, precio_unitario: precio
    } } }
  } }
};
export const datos = {
  mangas: [
    { _id: 1, titulo: 'One Piece', numero_tomo: 1, precio: 12990, stock: 15, editorial: 'Planeta Comic', autores: [{ nombre: 'Eiichiro', apellido: 'Oda' }], generos: ['Aventura', 'Acción'] },
    { _id: 2, titulo: 'One Piece', numero_tomo: 2, precio: 12990, stock: 8, editorial: 'Planeta Comic', autores: [{ nombre: 'Eiichiro', apellido: 'Oda' }], generos: ['Aventura', 'Acción'], idioma: 'Español' },
    { _id: 3, titulo: 'Naruto', numero_tomo: 1, precio: 11990, stock: 10, editorial: 'Ivrea', autores: [{ nombre: 'Masashi', apellido: 'Kishimoto' }], generos: ['Acción', 'Aventura'] },
    { _id: 4, titulo: 'Death Note', numero_tomo: 1, precio: 13990, stock: 7, editorial: 'Ivrea', autores: [{ nombre: 'Tsugumi', apellido: 'Ohba' }, { nombre: 'Takeshi', apellido: 'Obata' }], generos: ['Misterio'] },
    { _id: 5, titulo: 'Berserk', numero_tomo: 1, precio: 15990, stock: 2, editorial: 'Norma Editorial', autores: [{ nombre: 'Kentaro', apellido: 'Miura' }], generos: ['Fantasía', 'Acción'] },
    { _id: 6, titulo: 'Nana', numero_tomo: 1, precio: 14990, stock: 0, editorial: 'Norma Editorial', autores: [{ nombre: 'Ai', apellido: 'Yazawa' }], generos: ['Drama'], formato: 'Rústica' }
  ],
  clientes: [
    { _id: 1, nombre: 'Valeria', apellido: 'Morales', correo: 'valeria@example.com', telefono: '912345678' },
    { _id: 2, nombre: 'Tomas', apellido: 'Herrera', correo: 'tomas@example.com', telefono: '923456789' },
    { _id: 3, nombre: 'Fernanda', apellido: 'Riquelme', correo: 'fernanda@example.com' }
  ],
  ventas: [
    { _id: 1001, fecha: new Date('2026-09-01T12:00:00Z'), cliente_id: 1, detalle: [
      { manga_id: 1, titulo: 'One Piece', numero_tomo: 1, cantidad: 2, precio_unitario: 12990 },
      { manga_id: 4, titulo: 'Death Note', numero_tomo: 1, cantidad: 1, precio_unitario: 13990 }
    ] },
    { _id: 1002, fecha: new Date('2026-09-02T12:00:00Z'), cliente_id: 2, detalle: [
      { manga_id: 3, titulo: 'Naruto', numero_tomo: 1, cantidad: 1, precio_unitario: 11990 }
    ] }
  ]
};
