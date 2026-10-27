# Mesa Viajera · Panel y operación por responsable

El editor publicado incorpora `mesa-viajera-panel.html` a Recursos internos. Se añadió la foto de experiencia a la vista del certificado y el código para conectar Google Sheets, con configuración Google instalada y lectura y guardado reales confirmados por el titular. El sitio de Proyecto EVA continúa alojado en su repositorio actual. No se modifica la mesa pública de Roberto y Fernanda ni su Apps Script.

## Qué puede hacer el equipo

1. Abrir Recursos internos y elegir Mesa Viajera.
2. Pulsar Nueva mesa o Duplicar diseño. Duplicar conserva la paleta, las fuentes y los textos del certificado; limpia los nombres, la fecha y el prefijo.
3. En Datos, completar ¿Quiénes celebran?, nombre de mesa y prefijo; añadir fecha si está confirmada.
4. En Diseño, elegir cinco colores y cuatro tipografías. La vista previa usa esos valores.
5. En Certificado, editar título y frase; revisar la vista de ejemplo. La maquetación del PDF real se valida por separado en Apps Script.
6. Descargar el borrador JSON como respaldo. Cargar un borrador lo agrega como un registro independiente; no sustituye otro.

El guardado automático existe solamente en el navegador y origen actuales. No se comparte entre equipos ni con Sheets. No guarda bancos, credenciales, pagos ni transacciones. El borrado de datos del navegador elimina sus copias locales. Si el navegador impide guardar o se alcanza su cuota, la interfaz informa que se debe descargar el respaldo.

## Modelo y límites

- Almacenamiento: `eva.mesa-viajera.drafts.v1` en localStorage; máximo 100 borradores.
- Exportación: `type=eva.mesa-viajera.personalizacion`, `version=1`, fecha y CONFIG de personalización.
- Las importaciones aceptan solo claves permitidas, colores hexadecimales de seis cifras y las fuentes admitidas. No aceptan URLs, credenciales, código o parámetros de pagos.
- La vista usa texto DOM y una lista cerrada de estilos; no interpreta HTML del cliente.
- La fecha es un dato provisional del editor, separado de CONFIG hasta verificar la clave definitiva en el backend.
- Los prefijos se normalizan a letras y números, máximo 16; la unicidad entre mesas se validará al conectarse al registro central.
- CONFIG prevista: NOMBRES, NOMBRE_MESA, PREFIJO_FOLIO, CERT_TITULO, CERT_SUBTITULO, COLOR_PRIMARIO, COLOR_FONDO, COLOR_SECUNDARIO, COLOR_ACENTO, COLOR_DORADO, FUENTE_NOMBRES, FUENTE_TITULOS, FUENTE_CATEGORIAS y FUENTE_CUERPO. Antes de escribir en Sheets, cotejar estos nombres con PANEL_CAMPOS y conservar las demás claves.

## Operación y funciones pendientes

La página pública y los borradores locales no constituyen un sistema de acceso. La conexión preparada utiliza autorización de Google por archivo y permisos de Drive. Los permisos por funciones comerciales dentro del panel siguen pendientes. No introducir datos financieros o secretos en el código público. No exponer una llave de Apps Script en JavaScript ni publicar una hoja privada.

Para conectar operaciones reales:

1. Implementar identidad y autorización en el servidor, con usuarios y permisos verificados: Rodrigo administración/autorizaciones; Roberto fotos y catálogo; Fer comercial; Omar apoyo asignado. No usar un selector de rol del navegador como autorización.
2. Conectar un registro central privado de mesas, cada una con identificador, hoja, proyecto, estado, configuración y responsables. Separar el folio visible del identificador único.
3. Crear/duplicar la mesa de forma idempotente y validar los datos en servidor. No heredar operaciones, cuentas bancarias, credenciales ni aprobaciones al duplicar.
4. Guardar cambios autorizados en CONFIG mediante una lista permitida y una revisión/versionado para evitar sobreescrituras. Confirmar el guardado leyendo el resultado del servidor. Mantener registro de autor y fecha.
5. Recuperar catálogo e indicadores desde operaciones reales. Mostrar sin conexión o pendiente cuando no existan datos; no sustituirlo por ceros de ejemplo.
6. Separar la activación de pagos. Verificar cuentas de los destinatarios, estados y pruebas antes de habilitar cobros.
7. Revisar enlace y funcionamiento como invitado antes de publicar. Incorporar la mesa existente después, conservando sus operaciones.

## Responsables

Rodrigo dirige desarrollo y dineros, y autoriza precios, descuentos y plataformas. Para experiencias reales se trabaja con aerolíneas directamente y Expedia TAAP; otros servicios requieren su autorización. Roberto prepara la lista de experiencias, solicita especificaciones y monta fotos generadas con IA. Fer lleva la negociación y el seguimiento comercial. Omar apoya con captura y seguimiento asignados.

## Certificado

El titular confirmó el 26 de octubre de 2026 que el certificado generado funciona bien. El registro de ejecución compartido muestra recursos preparados, PDF de ejemplo y ejecución completada sin cobros ni envíos. La validación visual fue del titular; el agente no pudo abrir ese PDF privado. Esta aceptación no valida pagos ni la integración web.


## Foto de la experiencia en el certificado

El certificado debe incluir la foto correspondiente al ID de la experiencia comprada. La paleta y las fuentes pertenecen a la celebración; la foto pertenece al regalo. No guardar una única foto del certificado en CONFIG para reutilizarla en todas las experiencias.

La vista previa utiliza una foto de ejemplo de los activos existentes de Mesa Viajera. Con un catálogo conectado, el selector cambia el nombre y la foto de la experiencia elegida. Si falta la foto o falla su carga, se muestra una indicación para corregirla. Esta comprobación visual no sustituye el control que debe realizar Apps Script al generar el PDF de una compra.

El generador guardado en Google no se modificó en esta etapa: el navegador recibió una verificación de tráfico inusual. Queda pendiente comprobar con un regalo de prueba que la imagen real se resuelva por su ID y que no se emita un PDF sin esa foto. No se cambió la mesa de Roberto y Fernanda.

## Conexión preparada con Google Sheets

Archivos nuevos: `js/mesa-viajera-sheets.js` y `js/mesa-viajera-google-config.js`. El titular facilitó los datos de la aplicación Google y se completó la configuración pública. Solo se habilitó la copia de desarrollo. El titular confirmó autorización, lectura y guardado reales desde el panel, comprobando los valores en Sheets.

Recorrido actual:

1. Pulsar Abrir mesa. Las bibliotecas se preparan al entrar; el botón inicia el acceso de Google cuando hace falta y abre el selector.
2. Elegir la copia de desarrollo autorizada. El panel verifica CONFIG y los permisos de Drive y carga automáticamente la personalización en un borrador independiente. El borrador anterior se conserva.
3. Editar los datos cargados. Actualizar datos permite releer opcionalmente la misma hoja, revisando antes las diferencias; no se necesita para abrir la mesa.
4. Pulsar Revisar cambios y guardar. Confirmar el nombre de la hoja y cada valor anterior/nuevo antes de escribir.
5. El editor escribe únicamente las celdas B de las claves de personalización existentes, con `valueInputOption=RAW`. No inserta claves, no limpia rangos y no modifica pagos, bancos, catálogo ni operaciones.
6. Volver a leer la hoja y comparar el resultado antes de mostrar Guardado verificado. Si la hoja cambia después de la lectura usada para revisión, se detiene el guardado. Esta comparación previa no es un bloqueo transaccional; durante el piloto debe editar una sola persona cada mesa.

Los tokens se conservan únicamente en memoria durante la sesión. No se guardan en localStorage, JSON, URLs ni el repositorio. Desconectar sesión elimina la copia del token en el editor; no revoca el consentimiento de Google. Recargar o caducar la sesión exige volver a conectar. Cambiar o duplicar el borrador limpia el vínculo con la hoja para evitar guardar sobre el cliente anterior.

El catálogo se lee de `EXPERIENCIAS!A1:Z1000`. La detección requiere ID, nombre y URL de imagen inequívocos. Si los encabezados reales no coinciden con los alias admitidos, se muestra un error y se debe ajustar el mapeo tras inspeccionarlos; no se adivinan columnas. El ID de experiencia es la referencia de la foto. Las imágenes deben estar disponibles como imágenes HTTPS cargables por el navegador; una página de vista de Drive no equivale necesariamente a una URL de imagen.

## Activación inicial por Rodrigo

Esta configuración se hace una sola vez para el sitio, antes de incorporar a Omar. El titular creó el proyecto Mesa Viajera EVA, habilitó las tres API y creó el cliente OAuth web y la clave de navegador restringida. Se instalaron esos datos en el panel, sin incorporar un client_secret. El titular completó la autorización y confirmó lectura y guardado reales.

1. En un proyecto de Google Cloud de Proyecto EVA, habilitar Google Sheets API, Google Drive API y Google Picker API.
2. Configurar la pantalla de consentimiento y un cliente OAuth de tipo Aplicación web. Registrar `https://proyectoeva.mx` como origen JavaScript autorizado. Empezar con el titular como usuario de prueba; añadir al equipo solo después de definir los accesos reales.
3. Crear una clave de API para el uso del selector en navegador. Restringirla a Google Picker API y Google Drive API; autorizar las referencias HTTP `https://proyectoeva.mx/*` y `https://docs.google.com/*`. No utilizar una clave de servidor ni un client_secret.
4. Completar `clientId`, `pickerApiKey`, `projectNumber` y `allowedSpreadsheetIds` en el archivo de configuración público del editor. Para el piloto, registrar solamente la copia de desarrollo; no registrar la maestra original ni mesas con operaciones.
5. Si la aplicación está en pruebas, añadir primero el correo del titular en Google Auth Platform > Audiencia > Usuarios de prueba. Autorizar el permiso `https://www.googleapis.com/auth/drive.file`. El usuario elige el archivo en Google Picker; Drive decide si puede leerlo o editarlo. La lista del editor es una protección adicional de interfaz, no una autorización de servidor.
6. Probar primero lectura y carga de CONFIG. Guardar un cambio reversible en un campo de ejemplo y comprobar la celda, la lectura posterior y que las banderas de pagos sigan en NO. Después verificar una foto del catálogo en la vista previa y en el PDF generado por Apps Script.
7. Solo después de esa prueba habilitar otras hojas o usuarios. Las autorizaciones de precios, descuentos y plataformas necesitan su propio control de servidor antes de integrarse.

Validación: sintaxis y modelo; navegador para foto de ejemplo; API simulada para guardado limitado, conflictos, solo lectura, caducidad y lectura posterior. El titular confirmó OAuth, lectura y guardado reales. La apertura unificada se probó con datos simulados, incluyendo cancelación, errores y conservación del borrador; requiere confirmación con la cuenta real.

Referencias oficiales de implementación:
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/drive/picker/guides/overview
- https://developers.google.com/workspace/sheets/api/scopes
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate

La carga de las bibliotecas de Google se comprobó en el panel publicado después de instalar la configuración. Después, el titular confirmó en su navegador autorización, carga y escritura reales.

### Compatibilidad de tipografías
El panel admite Cormorant Garamond para los cuatro campos de tipografía. Al leer CONFIG conserva esta fuente y la carga en ambas vistas previas; no requiere modificar la hoja. Si aparece otra fuente no admitida, registrar su nombre y añadir soporte antes de sustituirla.

## Abrir una mesa sin pasos duplicados

En Recursos internos → Mesa Viajera, pulsar **Abrir mesa**. Google solicita la cuenta solo si hace falta. Elegir la hoja autorizada carga automáticamente CONFIG y la vista previa; ya no hay un segundo paso obligatorio de carga. El acceso de Google se prepara al entrar, sin autorizar ni leer archivos hasta la acción del usuario. La apertura conserva el borrador anterior y crea uno independiente para la hoja elegida. Cancelar o fallar la lectura no reemplaza el trabajo anterior. La fecha local no se copia a otra mesa.

**Actualizar datos** es una acción opcional para releer una mesa ya abierta; muestra las diferencias antes de reemplazar la personalización local. **Revisar cambios y guardar** mantiene la revisión del destino y la lectura posterior al guardado. Abrir no publica ni activa pagos. Durante el piloto solo está habilitada la copia de desarrollo.

## Recorrido por responsable

- **Fer — Comercial:** negociación, datos de quienes celebran, alcance y preferencias. Solicita a Rodrigo autorización de precios, descuentos y excepciones antes de comprometerlos.
- **Roberto — Fotos y lista de experiencias:** prepara el catálogo acordado, pide especificaciones, monta imágenes y verifica que la foto de cada experiencia corresponda al regalo y su certificado.
- **Rodrigo — Desarrollo y dineros:** configuración técnica, accesos, medios de pago, precios, descuentos y plataformas autorizadas. Experiencias reales con aerolíneas directamente y Expedia TAAP; otros servicios requieren su autorización.
- **Omar — Apoyo:** captura y seguimiento asignados, utilizando el instructivo sin editar código.

El titular confirmó en su navegador carga real y guardado en Sheets, comprobando la celda directamente. Cormorant Garamond es compatible. El nuevo flujo unificado requiere aún una comprobación real del titular. Las secciones Personalización y Experiencias ya están disponibles. Los permisos por rol, la duplicación de hojas, los pagos y la publicación de mesas siguen pendientes; estas responsabilidades describen la operación acordada y no permisos ya implementados.

## Experiencias desde el panel

El menú lateral separa Personalización y Experiencias. Solo muestra una sección a la vez; el nombre de la hoja seleccionada permanece visible. Roberto abre la mesa y entra en Experiencias para buscar, agregar o editar desde un panel lateral. Las fotografías se capturan mediante URL HTTPS directa, con vista previa y comprobación de carga; aún no se suben archivos desde el equipo.

Se inspeccionaron en la copia real los encabezados: ID, EXPERIENCIA, DESCRIPCION, PRECIO, META, MONEDA, IMAGEN, TIPO, ESTADO, CATEGORIA, ORDEN y DESTINO. Apps Script utiliza IDs de texto y exige ESTADO=DISPONIBLE para cobrar. Las altas del panel crean un ID permanente y ESTADO=BORRADOR; el precio y la configuración comercial quedan pendientes de Rodrigo. El backend todavía puede incluir borradores en su listado: no publicar la copia de desarrollo.

El adaptador detecta por encabezados ID, nombre, descripción, imagen y estado, y consulta precio y moneda. Nunca escribe precios, metas, monedas, tipos, categorías, orden, destino, vínculos de pago ni movimientos. En ediciones conserva ID y estado existentes. En altas solo crea ID, nombre, descripción, imagen y BORRADOR; no duplica otras columnas ni habilita venta. La descripción se deshabilita si no existe una columna inequívoca. Los encabezados ambiguos detienen la edición.

Antes de guardar muestra la hoja y diferencias. Escribe celdas puntuales con RAW, rechaza campos que contienen fórmulas, relee la firma del catálogo y comprueba el resultado posterior. No hay borrado de experiencias, para conservar las referencias de regalos existentes. El catálogo se limita al piloto de hasta 1000 filas y 26 columnas leídas. Solo se habilita la copia de desarrollo.

Pruebas: alta y edición, búsqueda, foto cargada y faltante, revisión de cambios y traslado al selector del certificado en navegador con datos simulados. Pruebas de API simulada verificaron columnas reordenadas, precios/pagos/fórmulas intactos, IDs conservados, BORRADOR en altas, conflictos, solo lectura y lectura posterior. La lectura y el guardado del catálogo desde una sesión real quedan pendientes de comprobación. La apertura automática de CONFIG ya fue confirmada por el titular.

Recorrido de Roberto:
1. Abrir mesa y elegir la copia de desarrollo; entrar en Experiencias.
2. Agregar experiencia o buscar una existente y pulsar Editar.
3. Capturar nombre y descripción, pegar la URL de la foto y comprobar que cargue.
4. Pulsar Revisar y guardar experiencia, comprobar hoja y diferencias, confirmar Guardar experiencia.
5. Volver a Personalización > Certificado, elegir la experiencia y comprobar su foto.
6. Entregar a Rodrigo la lista para completar y autorizar configuración comercial antes de ofrecerla.

La sesión real y los permisos de Drive determinan lectura o edición. Estos responsables no son un selector que conceda permisos: el control de precios por rol requiere implementación de servidor y no se sustituye con una casilla de autorización.
