# Proyecto EVA

Sitio web oficial de Proyecto EVA.

Educación, viajes y experiencias para llevarte más lejos.

## Inicio

- `index.html` presenta EVA como **Estudia, Viaja y Aprende**, con una entrada clara a Educación internacional, Viajes a medida y Mesa Viajera.
- `assets/Home/hero-home.webp`: fotografía del Home. Para cambiarla, reemplaza este archivo con otra imagen WebP y conserva el nombre; no afecta la portada de Estudia.
- `assets/Home/logo_eva_home.png`: versión recortada del logo oficial para la portada y el cierre. Si lo actualizas, conserva el nombre y el fondo transparente.
- `css/styles.css`: diseño del Home para computadora y celular. El menú móvil se abre sin JavaScript.

## Estudia

- `estudia.html`: portada de educación y catálogo de instituciones.
- `estudia/*.html`: una ficha por institución. Se puede actualizar cada historia, área y enlace oficial en su propio archivo.
- `assets/Estudia/hero-estudia.webp`: fotografía de portada. Sustituye este archivo manteniendo el mismo nombre para cambiar la imagen sin editar HTML o CSS. Fotografía editorial creada para Proyecto EVA; no representa un campus concreto.
- `assets/Estudia/logos/`: logotipos tomados de los sitios oficiales de las instituciones. Mantén el nombre y formato del archivo al reemplazarlos por versiones autorizadas.
- `css/estudia.css`: Estudia conserva el blanco, el verde azulado y la tipografía Manrope de EVA. Las clases `.study-trent`, `.study-yorkville`, `.study-tfs` y `.study-original` definen acentos discretos por institución (verde, azul, rojo sobrio y ámbar). Los logotipos oficiales claros se presentan sobre placas pequeñas de color oscuro para mantener su legibilidad.

Fuentes de los logotipos, para cotejar la versión de cada marca:

- Trent: `https://www.trentu.ca/about/themes/custom/trent/dist/images/logo.png`
- Yorkville: `https://www.yorkvilleu.ca/wp-content/uploads/2023/10/yorkville-logo.png` (servido como WebP)
- Toronto Film School: `https://www.torontofilmschool.ca/wp-content/uploads/2023/03/TFS_Logo_CMYK-One-Colour_Horizontal_White_010220.png` (servido como WebP)
- Original Campus: `https://originalcampus.edu.au/images/logo.svg`

Los programas, modalidades y requisitos pueden cambiar; se consultan en los enlaces oficiales antes de orientar a una familia.

## Recursos internos y solicitudes de pago

- `viajes.html` enlaza a `recursos-internos.html`, que reúne SIVE y Facturación.
- `facturacion.html` permite crear un Payment Request con resumen en la primera hoja y gastos detallados desde la segunda. El botón **Generar PDF** abre la impresión del navegador; elige **Guardar como PDF**, papel carta y gráficos de fondo.
- En **Detalle de gastos** se pueden añadir renglones o pegar cinco columnas desde Excel: Fecha, Tipo, Descripción, Ciudad y MXN. El formulario suma los gastos, el cargo de procesamiento y el ajuste de redondeo; muestra el total en ambas hojas.
- **Descargar borrador** guarda un archivo JSON en el equipo. **Cargar borrador** recupera los datos, incluida la información bancaria que se haya escrito. El sitio no conserva estos datos y no incluye enlaces de pago de clientes en el código.
- Los archivos HTML están fuera del sitemap y usan `noindex`, pero GitHub Pages no ofrece acceso privado. Quien conozca la dirección puede abrir el formulario; no lo uses como almacenamiento de documentos confidenciales.

## Visibilidad en buscadores

- `robots.txt` anuncia `sitemap.xml`; el mapa enumera las páginas públicas que queremos que los buscadores descubran.
- Cada HTML tiene una URL canónica absoluta de `https://proyectoeva.mx/`. Al añadir una página, agrega su URL al mapa y su propia etiqueta `rel="canonical"`.
- Los títulos y descripciones resumen cada servicio en lenguaje natural. Las cuatro páginas principales incluyen etiquetas para compartir sus enlaces en redes y mensajería.
- La portada declara el nombre, sitio, correo y logotipo de Proyecto EVA como datos estructurados de la organización.
- Para medir la presencia en Google, verificar el dominio en Google Search Console y enviar `https://proyectoeva.mx/sitemap.xml`. Search Console mide impresiones y clics de la Búsqueda de Google; no sustituye una herramienta de análisis de todas las visitas del sitio.
