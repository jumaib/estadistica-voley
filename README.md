# Vóley Son Ferrer · Estadísticas

Aplicación para registrar partidos de voleibol, gestionar plantillas y guardar
las estadísticas en Cloudflare D1, con acceso propio independiente de ChatGPT.

Producción: https://voley-son-ferrer-estadisticas.jumaib.workers.dev/

## Funciones

- Estadísticas por jugadora, marcador automático y correcciones manuales.
- Selección de seis jugadoras y dos líberos para asignar estadísticas.
- Líberos en amarillo, resto de jugadoras en azul y cambios en naranja.
- Relevos de líbero separados de las sustituciones normales.
- Plantillas guardadas, búsqueda por rival o fecha y fechas españolas.
- Informes Word y PDF mediante impresión; compartir el informe completo.
- Copia local sin conexión y sincronización con detección de conflictos.

## Compilar y comprobar

Requiere Node.js 24 o posterior. No necesita dependencias externas.

```sh
npm run build
npm test
```

La salida para producción es `dist/cloudflare/index.js`.

## Estructura

- `public/`: interfaz, estadísticas, plantillas, sincronización y acceso.
- `worker/api.js`: almacenamiento y validación de los partidos.
- `worker/independent-auth.js`: autenticación de la instalación de Cloudflare.
- `cloudflare-schema.sql`: estructura de la base de datos independiente.
- `cloudflare-deployment.json`: plantilla de configuración con valores de ejemplo.
- `scripts/`: compilación del Worker con los recursos integrados.
- `tests/`: pruebas del marcador, plantillas, líberos, guardado y autenticación.

## Despliegue

La instalación principal utiliza directamente Cloudflare Workers y D1.
Completa los valores de ejemplo de `cloudflare-deployment.json` con los de tu
cuenta. La configuración real de la instalación original se conserva localmente
en `cloudflare-deployment.local.json`, que se excluye de Git.
Sube `dist/cloudflare/index.js` como módulo Worker, con el enlace `DB` a la base
de datos indicada en `cloudflare-deployment.json` y la variable `OWNER_EMAIL`
con el correo del propietario. Conserva los enlaces, datos y acceso existentes.
Usa la fecha de compatibilidad `2026-11-01` y la opción `nodejs_compat`.

Para una instalación nueva, aplica `cloudflare-schema.sql` una sola vez y prepara
un enlace de activación temporal para que el propietario elija su contraseña.
Una actualización normal no debe regenerar cuentas ni aplicar datos de prueba.

La carpeta `.openai/` y las migraciones de `drizzle/` se conservan por la versión
anterior de Sites; no son el destino de producción actual. No publiques futuras
actualizaciones en Sites salvo que el propietario lo solicite.

## Datos y credenciales

Este repositorio contiene el código y la estructura de almacenamiento, no los
partidos reales, contraseñas, sesiones ni enlaces de activación. Los datos del
club permanecen en D1. El código de demostración usa nombres ficticios.

Las contraseñas se guardan mediante PBKDF2 con sal individual; los tokens de sesión
se almacenan como hashes y viajan en cookies seguras HttpOnly. Nunca subas copias
de la base de datos, secretos, archivos `.env` o enlaces de activación a GitHub.
