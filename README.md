# Cuaderno — app de notas libre y offline

App de notas / cuaderno digital 100% local (IndexedDB, sin servidor, sin
internet), inspirada en el estilo oscuro y minimalista de **Jotter**
(fondos casi negros, tarjetas redondeadas, acentos en teal).

A diferencia de una app de notas normal, el modo **"Cuaderno libre"**
permite colocar cajas de texto e imagenes en cualquier parte de la
pagina, moverlas y redimensionarlas libremente (como decorar un
cuaderno). También existe un modo **"Texto tradicional"** clásico, para
cuando prefieras simplemente escribir de forma lineal. Cada nota guarda
su propio modo.

## Estructura del proyecto

```
notebook-app/
├── www/                     ← toda la app (HTML/CSS/JS puro, sin frameworks)
│   ├── index.html           ← lista de notas
│   ├── editor.html          ← editor (libre + texto)
│   ├── css/style.css        ← tema oscuro/teal
│   └── js/
│       ├── db.js            ← capa IndexedDB (almacenamiento local)
│       ├── app.js            ← logica de la lista
│       └── editor.js         ← logica del editor (drag/resize)
├── capacitor.config.json    ← configuracion de Capacitor
├── package.json
└── .github/workflows/build-android.yml  ← compila el APK automaticamente
```

## Cómo compilarla en GitHub Actions (APK de Android)

1. Crea un repositorio nuevo en GitHub y sube **todo el contenido** de esta
   carpeta (`notebook-app/`) tal cual, respetando la estructura.
2. En GitHub, ve a la pestaña **Actions** del repositorio y confirma que
   el workflow "Build Android APK" está habilitado (se activa solo con
   cada `push` a `main`/`master`, o manualmente con "Run workflow").
3. Espera a que termine el job `build`. Al finalizar, en la sección
   **Artifacts** del run encontrarás `cuaderno-debug-apk`: descárgalo,
   descomprímelo y ahí está tu `app-debug.apk`, listo para instalar en
   un Android (activa "Instalar apps de origenes desconocidos").

El workflow hace todo el trabajo pesado: instala Node y Java, agrega la
plataforma Android de Capacitor (`npx cap add android`), sincroniza los
archivos web y compila el APK con Gradle. No necesitas tener Android
Studio instalado en tu computadora.

### Firmar un APK de release (opcional, para publicar)

El workflow genera un APK de **debug**, perfecto para probar. Si más
adelante quieres una versión firmada de release (para subir a una
tienda), se puede ampliar el workflow con un `keystore` guardado como
GitHub Secret — avísame cuando llegues a ese paso y lo agregamos.

## Probarla en el navegador sin compilar nada

Como es HTML/CSS/JS puro, puedes abrir `www/index.html` directamente en
Chrome de tu computador (o servirla con cualquier servidor estático) y
ya funciona igual que en el celular — IndexedDB guarda las notas en el
propio navegador.

## Funcionalidades incluidas

- **100% offline**: todo se guarda con IndexedDB en el propio dispositivo.
- Lista de notas con buscador, categorías (chips, con "+ Añadir"), tarjetas
  redondeadas y menú de acciones (eliminar, archivar, compartir, duplicar,
  exportar a .txt, copiar texto, fijar, bloquear) — igual que en las
  capturas de referencia.
- Cada nota puede alternar entre:
  - **Libre**: lienzo con puntos, donde tocas "Texto" o "Imagen" para
    añadir elementos; se arrastran tocando/arrastrando el cuerpo, y se
    redimensionan desde la manija teal inferior-derecha; el botón rojo
    superior-izquierdo elimina el elemento.
  - **Texto tradicional**: un área de texto simple, como un bloc de notas.
- Guardado automático (autosave) mientras escribes o mueves elementos.

## Personalización rápida

- Colores: todo el tema vive en `www/css/style.css` dentro de `:root`
  (`--teal`, `--bg`, etc.) — cambia esas variables para ajustar la paleta.
- Ícono/splash de la app: coloca tus imágenes en `resources/` (icon.png
  1024×1024 y splash.png 2732×2732) y usa
  `npx @capacitor/assets generate` antes de compilar si quieres generar
  automáticamente todos los tamaños para Android.
