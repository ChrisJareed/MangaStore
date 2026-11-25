# MangaStore Web
Interfaz local de gestión para demostrar el modelo documental de la EP3. Incluye HTML, CSS adaptable, JavaScript y un backend Node.js + Express conectado a MongoDB. Tiene navegación lateral, resumen de la tienda, tablas con indicadores de stock, formularios y comprobantes de venta.

## Qué permite hacer
- Mangas: catálogo, búsqueda por título y filtro de stock crítico (stock menor a 3).
- Clientes: alta, consulta, edición y eliminación de clientes temporales con ID desde 9900.
- Ventas: búsqueda por folio, comprador, detalle embebido y total con precios históricos.
- Mensajes claros de confirmación y error, sin mostrar consultas MongoDB, trazas técnicas ni respuestas JSON en la pantalla.

La página muestra únicamente la interfaz de la tienda. Los contadores provienen de la API; no son cifras decorativas. Los mensajes de stock incluyen texto, no dependen solamente del color. No necesita descargar fuentes, imágenes ni librerías visuales externas.
El backend conserva su contrato de API y sus metadatos de operación por compatibilidad con las pruebas anteriores; la interfaz no los dibuja. Quitar el panel no equivale a ocultar las respuestas a las herramientas de desarrollador del navegador.

## Actualizar desde la versión anterior
Si ya instalaste dependencias y preparaste mangastore_ep3_web_demo, no repitas esos pasos.
Detén el servidor con Ctrl + C y reemplaza únicamente public/index.html, public/styles.css y public/app.js por los de este paquete.
Inicia otra vez con npm.cmd start y recarga el navegador con Ctrl + F5.
No reemplaces tu .env si lo configuraste. Esta actualización no modifica la base de datos.

## Empezar en Windows
1. Extrae el ZIP. Conserva la carpeta completa MangaStore_Web.
2. Necesitas Node.js 24 o superior y un servidor MongoDB iniciado. Compass solo es la herramienta para verlo, no sustituye al servidor. Si tu conexión Localhost de Compass ya funciona, el servicio normalmente está disponible.
3. Abre una terminal en la carpeta que contiene package.json. Puedes abrirla desde VS Code o desde el Explorador con “Abrir en Terminal”.
4. Comprueba Node:
~~~sh
node --version
~~~
5. Instala las dependencias (solo la primera vez):
~~~sh
npm.cmd install
~~~
6. Prepara la base independiente (solo la primera vez):
~~~sh
npm.cmd run preparar-demo
~~~
7. Inicia la web:
~~~sh
npm.cmd start
~~~
8. Mantén la terminal abierta y visita:
http://localhost:3000

En macOS/Linux usa npm en lugar de npm.cmd. No abras public/index.html con doble clic para usar MongoDB: el backend debe estar iniciado.

## Protección de tus datos
La base predeterminada es mangastore_ep3_web_demo. Se crea con 6 mangas, 3 clientes y 2 ventas de muestra.
La base original mangastore_ep3 NO se utiliza, ni se copia, ni se modifica.
El servidor tampoco acepta ese nombre si alguien lo configura por error.
El preparador se detiene sin modificar nada cuando encuentra colecciones en la base elegida.
Si ya preparaste la base, no repitas la preparación: usa npm.cmd start.
Si una preparación falló a la mitad, revisa esa base antes de repetir. No se borra ni reinicializa automáticamente.
Las escrituras de la API requieren que existan las tres colecciones.

En la interfaz, los clientes originales (IDs inferiores a 9900) son de solo consulta.
Los clientes temporales pueden editarse y borrarse. Antes de borrar, el backend comprueba si tienen ventas.
Consultar una venta no inserta otra compra, no descuenta stock y no altera sus precios históricos.

## Recorrido para presentar
1. Mangas: busca One Piece. Deben aparecer dos tomos.
2. Borra la búsqueda y activa Stock crítico. Deben aparecer Berserk (2, stock bajo) y Nana (0, agotado).
3. Clientes: pulsa Nuevo cliente. Usa ID 9901, nombre Cliente, apellido Prueba, correo ep3@example.com.
4. Guarda y observa la confirmación, el nuevo contacto en la tabla y el contador actualizado.
5. Edita el cliente y agrega teléfono 900000001. Comprueba el teléfono guardado y el mensaje de confirmación.
6. Intenta crear otro cliente con el mismo correo. Debe aparecer un error y no crearse otro documento.
7. Elimina al cliente temporal mediante el diálogo de confirmación. Comprueba que desaparece de la tabla y se actualiza el contador.
8. Ventas: consulta 1001. Debe mostrar Valeria, dos líneas, tres unidades y $39.970.
9. Consulta 8888 para mostrar el caso de un folio inexistente.
10. Abre Compass, actualiza la lista de bases y revisa mangastore_ep3_web_demo.

El ID sugerido es solo una ayuda para el formulario. MongoDB es quien impide los duplicados. Un error de conexión durante una escritura debe comprobarse con una consulta antes de repetirla.

## Qué hace cada archivo
- public/index.html: estructura, navegación y formularios.
- public/styles.css: diseño adaptable, navegación, tablas, indicadores de stock, formularios y comprobantes.
- public/app.js: interacción, llamadas fetch y presentación de datos y mensajes, sin panel de consultas.
- server.js: inicia Express y escucha solo en 127.0.0.1.
- src/app.js: rutas HTTP, validaciones, protecciones y respuestas.
- src/repositorio.js: operaciones reales del driver de MongoDB.
- src/modelo.js: validadores y muestra coherente con la EP3.
- src/config.js: conexión, nombre permitido y puerto.
- scripts/preparar-demo.js: crea únicamente una base vacía de demostración.
- test/: comprobaciones HTTP y de interfaz con un repositorio simulado, separadas de MongoDB real.

## Configuración opcional
No hace falta crear .env para la conexión local predeterminada.
Si necesitas cambiarla, copia .env.example como .env y ajusta los valores:
~~~text
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=mangastore_ep3_web_demo
PORT=3000
~~~
También se admiten nombres como mangastore_ep3_ensayo2. No selecciones una base de ensayo que contenga datos importantes que quieras conservar sin cambios.
La cadena de conexión se queda en el backend. No la pongas en public/, capturas ni código que se comparta. .env no se incluye en este paquete.

## Problemas habituales
- “node no se reconoce”: instala Node.js desde https://nodejs.org/ y abre otra terminal.
- PowerShell bloquea npm.ps1: usa npm.cmd, como en los pasos anteriores, sin cambiar las políticas de seguridad.
- “No se pudo conectar a MongoDB”: verifica Localhost en Compass y que el servicio MongoDB esté iniciado. La web no inventa datos si la conexión falla.
- “La base ya tiene colecciones”: es una protección. Si la preparación ya concluyó correctamente, ejecuta npm.cmd start.
- “Falta preparar la base”: ejecuta npm.cmd run preparar-demo en la carpeta del proyecto y pulsa Reintentar.
- Puerto ocupado: define otro PORT en .env, por ejemplo 3001, e ingresa a http://localhost:3001.
- “Ese ID o correo ya está registrado”: usa otro ID/correo o edita el cliente existente.
- La base web no aparece en Compass: actualiza la lista de bases después de la preparación.

## Pruebas y límites
~~~sh
npm.cmd test
~~~
Este comando prueba la API HTTP, sus protecciones y el JavaScript de la interfaz con un repositorio simulado. No conecta a tu MongoDB y no equivale a aprobar las 22 pruebas anteriores del proyecto.
La integración con tu servidor real se comprueba con el recorrido manual anterior y observando los documentos en Compass.
No se pudo probar MongoDB real desde el entorno de preparación porque allí no hay un servidor disponible.
Se aprobaron 39 registros de prueba de API y DOM simulado. También se revisó el diseño en navegador de escritorio y se comprobó el filtro de stock, el alta, la edición y la eliminación de un cliente temporal, y la consulta de la venta 1001. Para esa revisión se utilizó un repositorio simulado, identificado explícitamente en pantalla y separado del servidor real; esa preparación de QA no se incluye en el ZIP ni existe como reemplazo automático de MongoDB. Esta revisión no sustituye la comprobación de integración en tu computador. El CSS incluye adaptación a pantallas pequeñas; no se hizo una inspección manual en un teléfono real.
Esta demo no incluye login, pagos, altas de ventas ni descuentos automáticos de inventario. No es un sistema de producción.
Las comprobaciones de referencias antes de borrar no son una transacción entre colecciones. Son adecuadas para esta demo sin registro concurrente de ventas, no una garantía general de integridad en una tienda real.
La API limita los listados a 200 documentos. Es suficiente para la muestra, no sustituye a la paginación de un sistema grande.
La validación adicional del backend verifica formato de correo y longitudes. El esquema original de la EP3 y sus índices también se mantienen en MongoDB.

## Relación con la entrega académica
Esta interfaz es un apoyo opcional y nuevo. No modifica automáticamente el informe, la presentación, el ZIP anterior ni sus estados de pruebas.
Cuando compruebes la demo en tu computador, se podrán incorporar las nuevas evidencias al informe si lo necesitas.

## Referencias técnicas
- MongoDB Node.js CRUD: https://www.mongodb.com/docs/drivers/node/current/crud/
- MongoDB validación: https://www.mongodb.com/docs/manual/core/schema-validation/
- Express: https://expressjs.com/en/5x/api/
- Node.js: https://nodejs.org/en/download

