# Mesa Viajera como sitio independiente

La página pública se edita en `_mesaviajera/index.html`; sus estilos e imágenes están en esa misma carpeta. El sitio principal de EVA sigue en la raíz del repositorio.

El acceso desde `proyectoeva.mx` se controla en **Actions → Enlace de Mesa Viajera en Proyecto EVA → Run workflow → visible / oculta**. `Visible` muestra enlaces a `https://mesaviajera.proyectoeva.mx/` en el sitio principal. `Oculta` retira esos enlaces. La página independiente permanece publicada en ambos casos.

Cloudflare Pages debe conectarse a este repositorio, rama `main`, sin framework, con directorio de salida `_mesaviajera`. Tras obtener el dominio `<proyecto>.pages.dev`, agrega `mesaviajera.proyectoeva.mx` como dominio personalizado dentro de Cloudflare Pages y crea en GoDaddy el CNAME `mesaviajera` → `<proyecto>.pages.dev`. El subdominio principal y sus registros de correo no se modifican.

Esta carpeta guarda una copia de la antigua página y los fragmentos del interruptor. El repositorio sigue siendo público.
