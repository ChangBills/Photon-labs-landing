# Landing page · A01744124 · Photon Labs (TE1020)

Página estática (HTML + CSS, sin dependencias ni compilación) que presenta la solución de la situación problema.

## Cómo publicarla en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `photon-labs`).
2. Sube **el contenido de esta carpeta** a la raíz del repositorio: `index.html`, `css/`, `assets/` y `.nojekyll`.
3. En el repositorio ve a **Settings → Pages**.
4. En *Build and deployment* elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`, y guarda.
5. En uno o dos minutos tu sitio estará en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

Después agrega las URL del repositorio y de GitHub Pages en el pie de `index.html` (hay un comentario que indica dónde), porque la entrega las pide.

## Estructura

```
index.html
css/styles.css
assets/   logo-horizontal.svg, logo-horizontal-claro.svg, logo-vertical.svg,
          favicon.svg, apple-touch-icon.png
.nojekyll
```

## Notas

- Los colores salen de la paleta del logo y están como variables CSS al inicio de `css/styles.css`.
- Las tipografías (Poppins e Inter) se cargan desde Google Fonts; sin internet la página usa fuentes del sistema.
- Los valores del ejemplo de dimensionamiento son **ilustrativos** (paneles, inversor y batería genéricos, sin marcas ni precios).
