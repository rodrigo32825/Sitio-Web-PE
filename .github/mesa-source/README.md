# Mesa Viajera: sitio principal y sitio independiente

El interruptor está en **Actions → Visibilidad de Mesa Viajera en Proyecto EVA → Run workflow → visible / oculta**.

- **visible** devuelve Mesa Viajera a `proyectoeva.mx` como estaba antes: menú y logo, tarjeta del inicio, enlaces, página `/mesa-viajera.html`, estilos, imágenes y entrada en el sitemap. Los enlaces del sitio principal llevan a esa página.
- **oculta** retira esos elementos y la página del sitio principal. Es el estado actual.

La copia para `mesaviajera.proyectoeva.mx` vive por separado en `_mesaviajera/`. Cambiar el interruptor no la publica ni la apaga; el subdominio requiere configurar alojamiento y DNS. La carpeta `.github/mesa-source/` conserva los archivos de la página original que el interruptor vuelve a instalar en la raíz.

Para publicar el sitio independiente, conecta Cloudflare Pages a este repositorio y la rama `main`, sin framework, con directorio de salida `_mesaviajera`. Después añade `mesaviajera.proyectoeva.mx` como dominio personalizado y configura en GoDaddy el CNAME `mesaviajera` hacia el destino que indique Cloudflare Pages. El dominio principal y los registros de correo quedan aparte.

El repositorio es público.
