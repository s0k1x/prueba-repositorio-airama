# Airama Propiedades

Web estática (HTML, CSS y JS sin dependencias) para una inmobiliaria de vivienda prime.

- `index.html`: estructura de la página
- `css/styles.css`: diseño, con modo claro y oscuro
- `js/main.js`: cartera de propiedades (array `PROPS`), buscador, filtros, ficha y formulario

Para verla, abre `index.html` en el navegador o sírvela con `python3 -m http.server`.

## Pendiente para producción
- Sustituir las propiedades de ejemplo por las reales.
- Poner fotos propias en el campo `photo` (si una foto no carga, se muestra una ilustración generada).
- Conectar el formulario a un servicio de envío (ver comentario en `js/main.js`).
