# Mesa Viajera · Panel y operación por responsable

El editor publicado incorpora `mesa-viajera-panel.html` a Recursos internos. Se añadió la foto de experiencia a la vista del certificado y el código para conectar Google Sheets, con configuración Google instalada y lectura y guardado reales confirmados por el titular. El sitio de Proyecto EVA continúa alojado en su repositorio actual. No se modifica la mesa pública de Roberto y Fernanda ni su Apps Script.

## Qué puede hacer el equipo

1. Abrir Recursos internos y elegir Mesa Viajera.
2. Pulsar Nueva mesa o Duplicar diseño. Duplicar conserva la paleta, las fuentes y los textos del certificado; limpia los nombres, la fecha y el prefijo.
3. En Datos, completar ¿Quiénes celebran?, nombre de mesa y prefijo; añadir fecha si está confirmada.
4. En Diseño, elegir cinco colores y cuatro tipografías. La vista previa usa esos valores.
5. En Certificado, editar título y frase; revisar la vista de ejemplo. La maquetación del PDF real se valida por separado en Apps Script.
6. Pulsar Crear mesa en Sheets para preparar su copia independiente con el diseño actual y continuar a Experiencias. Si ya está conectada, usar Revisar cambios y guardar.
7. Descargar el borrador JSON como respaldo. Cargar un borrador lo agrega como un registro independiente; no sustituye otro ni arrastra su vínculo a Sheets.

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

Los tokens se conservan únicamente en memoria durante la sesión. No se guardan en localStorage, JSON, URLs ni el repositorio. Desconectar sesión elimina la copia del token en el editor; no revoca el consentimiento de Google. Recargar o caducar la sesión exige volver a conectar. Cambiar el borrador suspende la conexión activa y conserva la referencia a su propia hoja para reconectarla. Duplicar diseño no copia esa referencia; evita guardar sobre el cliente anterior.

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

**Actualizar datos** es una acción opcional para releer una mesa ya abierta; muestra las diferencias antes de reemplazar la personalización local. **Revisar cambios y guardar** mantiene la revisión del destino y la lectura posterior al guardado. Abrir no publica ni activa pagos. Se pueden abrir la plantilla de desarrollo y las mesas creadas desde este panel.

## Recorrido por responsable

- **Fer — Comercial:** negociación, datos de quienes celebran, alcance y preferencias. Solicita a Rodrigo autorización de precios, descuentos y excepciones antes de comprometerlos.
- **Roberto — Fotos y lista de experiencias:** prepara el catálogo acordado, pide especificaciones, monta imágenes y verifica que la foto de cada experiencia corresponda al regalo y su certificado.
- **Rodrigo — Desarrollo y dineros:** configuración técnica, accesos, medios de pago, precios, descuentos y plataformas autorizadas. Experiencias reales con aerolíneas directamente y Expedia TAAP; otros servicios requieren su autorización.
- **Omar — Apoyo:** captura y seguimiento asignados, utilizando el instructivo sin editar código.

El titular confirmó en su navegador carga real y guardado en Sheets, comprobando la celda directamente. Cormorant Garamond es compatible. El nuevo flujo unificado requiere aún una comprobación real del titular. Las secciones Personalización y Experiencias ya están disponibles. Los permisos por rol, los pagos y la publicación de mesas siguen pendientes; estas responsabilidades describen la operación acordada y no permisos ya implementados.

## Experiencias desde el panel

El menú lateral separa Personalización y Experiencias. Solo muestra una sección a la vez; el nombre de la hoja seleccionada permanece visible. Roberto abre la mesa y entra en Experiencias para buscar, agregar o editar desde un panel lateral. Las fotografías se seleccionan desde Google Drive o se capturan mediante enlace del archivo, con vista previa y comprobación de carga. También se conservan las imágenes HTTPS directas existentes. No se suben archivos desde el equipo.

Se inspeccionaron en la copia real los encabezados: ID, EXPERIENCIA, DESCRIPCION, PRECIO, META, MONEDA, IMAGEN, TIPO, ESTADO, CATEGORIA, ORDEN y DESTINO. Apps Script utiliza IDs de texto y exige ESTADO=DISPONIBLE para cobrar. Las altas del panel crean un ID permanente y ESTADO=BORRADOR; el precio y la configuración comercial quedan pendientes de Rodrigo. El backend todavía puede incluir borradores en su listado: no publicar la copia de desarrollo.

El adaptador detecta por encabezados ID, nombre, descripción, imagen y estado, y consulta precio y moneda. Nunca escribe precios, metas, monedas, tipos, categorías, orden, destino, vínculos de pago ni movimientos. En ediciones conserva ID y estado existentes. En altas solo crea ID, nombre, descripción, imagen y BORRADOR; no duplica otras columnas ni habilita venta. La descripción se deshabilita si no existe una columna inequívoca. Los encabezados ambiguos detienen la edición.

Antes de guardar muestra la hoja y diferencias. Escribe celdas puntuales con RAW, rechaza campos que contienen fórmulas, relee la firma del catálogo y comprueba el resultado posterior. No hay borrado de experiencias, para conservar las referencias de regalos existentes. El catálogo se limita al piloto de hasta 1000 filas y 26 columnas leídas. Se habilitan la plantilla de desarrollo y las mesas creadas por el panel, identificadas mediante su marca privada y permisos de Drive.

Pruebas: alta y edición, búsqueda, foto cargada y faltante, revisión de cambios y traslado al selector del certificado en navegador con datos simulados. Pruebas de API simulada verificaron columnas reordenadas, precios/pagos/fórmulas intactos, IDs conservados, BORRADOR en altas, conflictos, solo lectura y lectura posterior. La lectura y el guardado del catálogo desde una sesión real quedan pendientes de comprobación. La apertura automática de CONFIG ya fue confirmada por el titular.

Recorrido de Roberto:
1. Abrir la mesa correspondiente, o crear su hoja desde el borrador y pulsar Continuar a Experiencias.
2. Agregar experiencia o buscar una existente y pulsar Editar.
3. Capturar nombre y descripción. Pulsar Seleccionar foto de Drive, elegir una imagen JPG/PNG/WebP y comprobar la vista previa. También se puede pegar su enlace; si falta autorización por archivo, volver a seleccionarla con el botón de Drive.
4. Pulsar Revisar y guardar experiencia, comprobar hoja y diferencias, confirmar Guardar experiencia.
5. Volver a Personalización > Certificado, elegir la experiencia y comprobar su foto.
6. Entregar a Rodrigo la lista para completar y autorizar configuración comercial antes de ofrecerla.

La sesión real y los permisos de Drive determinan lectura o edición. Estos responsables no son un selector que conceda permisos: el control de precios por rol requiere implementación de servidor y no se sustituye con una casilla de autorización.

La prueba de catálogo con la cuenta real llegó al selector de Google, pero este navegador no avanzó en «Permitir cookies». No se escribieron experiencias en la hoja durante ese intento. La comprobación del guardado real del catálogo sigue pendiente; el panel publicado y el flujo con datos simulados sí se verificaron.


## Fotografías desde Google Drive

El editor utiliza el mismo acceso drive.file de la sesión; no se amplían los scopes ni se pide acceso completo al Drive. El selector muestra imágenes JPG/PNG/WebP y carpetas para navegación, sin permitir seleccionar carpetas. Seleccionar solo vincula: no copia, mueve, borra ni cambia permisos. La selección no escribe en Sheets hasta revisar y guardar.

El adaptador admite enlaces file/d/ID/view, open?id=ID, uc?id=ID y thumbnail?id=ID. Conserva la clave de recurso cuando existe; elimina parámetros ajenos a la referencia. La vista previa, las tarjetas y el certificado del panel convierten el ID a una URL de visualización de Drive; no guardan tokens ni enlaces de miniaturas temporales devueltos por la API. Los enlaces que apuntan a carpetas se rechazan.

Al seleccionar, y antes de guardar una foto nueva de Drive, se consulta el archivo y se exige MIME admitido, que no esté en papelera y permiso vigente de lectura para anyone. Si no se puede confirmar, se detiene el vínculo/guardado. Para fotos destinadas a invitados: en Drive → Compartir → Acceso general → Cualquier persona con el enlace → Lector. Esta acción la realiza el titular; el panel nunca publica el archivo por sí mismo. Un permiso de dominio o solo del propietario no basta. Un enlace pegado puede requerir selección con Picker para autorizar el archivo con drive.file.

La vista previa debe cargar antes de guardar. Drive puede limitar la visualización aunque el archivo tenga permiso público; no se considera un CDN ni se garantiza disponibilidad permanente. El certificado PDF de Apps Script y la mesa pública aún requieren verificación conjunta con una imagen real del titular; el ajuste de este bloque corresponde al panel, no modifica el Apps Script ni la mesa activa.

El diálogo lateral se cierra temporalmente al abrir Picker para evitar que el modal nativo oculte el selector. Cancelar conserva foto y campos. Una imagen privada, incorrecta o en papelera no reemplaza la foto previa. La sesión vencida pide abrir de nuevo la mesa conservando antes los cambios pendientes.

Verificación de este bloque: pruebas automatizadas con API/Picker simulados para formatos de enlace, claves de recurso, selección/cancelación, permisos privados/públicos, MIME, papelera y ausencia de mutaciones de Drive. La comprobación real con la foto del titular se registra por separado, sin presentar la simulación como un guardado real.


### Error 404 al guardar una foto

El titular reportó HTTP 404 al guardar una experiencia. No se conoce todavía la solicitud concreta que falló. Una foto pública puede verse en el navegador sin que el panel tenga autorización drive.file para consultar su metadata. La lectura de fotos ahora diferencia 403/404 y pide seleccionar el archivo mediante Picker con la cuenta de la mesa. Si el error es de la hoja, mantiene un mensaje separado y recomienda actualizar el catálogo antes de repetir un guardado no confirmado. No se amplían scopes ni permisos. Pruebas simuladas reproducen 403/404 de fotos y 404 de hoja; el caso real requiere nueva comprobación del titular.


## Crear una mesa desde un borrador personalizado

El bloque Guardar mesa está visible en Personalización aunque no exista una hoja conectada. Nueva mesa y Duplicar diseño conservan su funcionamiento local; al terminar datos, colores, fuentes y certificado, usar Crear mesa en Sheets. El botón confirma el nombre y la celebración, conecta Google si hace falta y solicita seleccionar la plantilla únicamente cuando falta acceso por archivo. No reemplaza el diseño por los valores de la plantilla.

La fuente es el primer ID de plantilla configurado, actualmente Mesa Viajera Maestra V2 - Desarrollo (19nLAPkUkRIyAbTRkvu1GdFvCPOHGdjc2o6FG574jlzk). Se verificaron en lectura de la hoja real las pestañas EXPERIENCIAS, REGALOS, TRANSACCIONES, PANEL_CAMPOS y CONFIG; CONFIG tiene encabezado CLAVE y 42 claves. Se lee exclusivamente su columna de claves para construir el reinicio; no se leen sus valores bancarios para reutilizarlos.

Drive files.copy crea una copia en Mi unidad con marca privada evaMesa=mesa-viajera-v2, evaMesaDraft=ID del borrador y estado preparing. El original no se escribe. La copia conserva formato, encabezados y código vinculado. Antes de habilitarla, Sheets batchUpdate reinicia todas las celdas de CONFIG con las claves originales, los 15 valores de personalización actuales, los tres flags de pago en NO y MODO_PAGO=ONLINE; los demás valores quedan vacíos. Se borran valores y notas de todas las filas desde la 2 en EXPERIENCIAS, REGALOS y TRANSACCIONES, incluyendo todas sus columnas. PANEL_CAMPOS se conserva como diccionario. No se admiten pestañas inesperadas para evitar copiar tablas desconocidas sin revisión.

Se verifica por lectura CONFIG, los flags NO y el rango completo de datos de las tres tablas vacías. Solo después se marca ready y se conecta la hoja al borrador. Si hay un fallo tras crear la copia, su referencia se conserva y Continuar preparación reutiliza esa copia. Si la respuesta de creación se pierde, se busca por la marca del borrador antes de duplicar; si no se confirma su existencia, se detiene la nueva copia automática. Las respuestas 4xx explícitas permiten reintentar tras corregir permisos. Una marca de otro borrador o una copia ambigua se rechaza.

El diseño y la referencia de la hoja se guardan en el navegador, sin credenciales. Exportar JSON lleva solo diseño y fecha; importar o duplicar no arrastra el vínculo a otra mesa. Después de recargar, Conectar esta mesa vuelve a abrir el destino sin crear otro y conserva los cambios locales pendientes. Desde otro navegador se puede usar Abrir mesa y elegir el archivo con Picker: la marca privada permite admitirlo sin editar la lista pública de IDs. Esta marca no sustituye la autorización ni los permisos de Drive; no hay roles comerciales de servidor todavía.

Al terminar aparece el enlace de la nueva hoja, Revisar cambios y guardar, Actualizar datos y Continuar a Experiencias. Esta última acción abre el catálogo vacío y permite preparar las fotos y descripciones de la siguiente etapa. La fecha aún permanece local; el despliegue de Apps Script, los recursos propios de certificados/comprobantes, la configuración de precios y medios de pago y la publicación siguen pendientes. Crear la hoja no equivale a activar la mesa pública.

Pruebas automatizadas con Google simulado: copia con destino independiente, limpieza de CONFIG y tablas completas, exclusión de datos financieros heredados, pagos NO, reapertura por marca, permisos por archivo, referencias del navegador sin secretos, cancelación, copia pendiente, respuesta perdida, verificación fallida y prevención de duplicados. Prueba de navegador con fixture rotulado: datos y color conservados al cancelar y crear, referencia recuperada tras recarga y paso directo a Experiencias. No se creó una mesa real durante estas pruebas; la creación real queda pendiente de comprobación con el titular.

## Datos de cobro por mesa

La sección Pagos agrega un espacio separado para Rodrigo. Al abrir una mesa, el menú Pagos lee su CONFIG. Se pueden preparar MONEDA, STRIPE_CONNECTED_ACCOUNT_ID, PAYPAL_ME, TRANSFERENCIA_BENEFICIARIO, TRANSFERENCIA_BANCO, TRANSFERENCIA_CLABE, TRANSFERENCIA_CUENTA y TRANSFERENCIA_HORAS_RESERVA. La edición no se activa sin hoja conectada y acceso de edición, ni cuando los medios ya estén activos. Los permisos comerciales por rol todavía no están implementados; el acceso real lo determina Drive.

Se exige que la hoja no tenga permisos anyone ni domain antes de leer datos de cobro. No se cambian permisos automáticamente. La revisión de cambios oculta los dígitos anteriores de CLABE y cuenta, mostrando los cuatro finales. Los valores solo se mantienen en memoria y se escriben mediante RAW en las celdas B existentes de las claves permitidas. No se guardan en localStorage ni se incluyen en exportaciones de diseño. Cambiar la mesa o desconectar limpia el formulario.

Antes de escribir, se vuelven a comprobar permisos y firma de configuración; después se releen los valores y los flags de los tres medios. TARJETAS_ACTIVAS, PAYPAL_ACTIVO y TRANSFERENCIA_ACTIVA deben estar NO y nunca se escriben desde este módulo. Comisiones e IVA se consultan como valores guardados, sin modificar ni calcular tarifas. Los medios activos impiden editar destinatarios desde esta sección de preparación.

El ID acct_ únicamente se captura como dato de la mesa. No se creó ni vinculó una cuenta Stripe, no se consultaron capacidades reales y no se ejecutaron cobros o transferencias mediante Stripe. El permiso de escritura del conector no se utilizó. Falta establecer la cuenta destinataria, completar su conexión y comprobar charges_enabled/payouts_enabled y requisitos, revisar la fórmula de comisiones del backend existente e implementar/verificar confirmaciones de pago seguras antes de activar. PayPal.Me conserva su condición de enlace; no equivale a PayPal Checkout ni a verificación automática de recepción. Los datos de transferencia tampoco verifican titularidad.

Las pruebas operativas de compra, confirmación y certificado quedan para el final de la configuración, conforme al flujo acordado. Las comprobaciones internas del código validan que solo se guarden campos permitidos y que los medios permanezcan NO. No se introdujeron datos reales bancarios ni de Stripe durante el desarrollo.

## Orden de operación — limpieza de interfaz (28 de octubre de 2026)

Se trabaja sobre **Mesa Viajera Maestra V2 - Desarrollo**. No hace falta crear una boda para preparar la plantilla; en V2 se conservan vacíos los destinatarios de pagos. Esta reorganización no cambia OAuth, las APIs, las validaciones, los datos de Sheets, los medios activos, las comisiones ni la publicación.

1. **Elegir mesa.** En «Mis mesas», buscar por nombre o filtrar Borradores, Productivas, referencias a Sheets y mesas sin Sheets. «Borrador» indica preparación y puede tener o no una hoja; «Con Sheets» es una referencia guardada que no confirma publicación. Productiva es una clasificación manual de trabajo en este navegador, editable desde «Clasificación de la mesa» cuando hay una referencia lista a Sheets; no activa ni publica nada. Los estados previos permanecen como Borrador y su publicación no se presume. El panel aún no verifica la publicación. La lista corresponde a este navegador, no a un inventario completo de Drive. Se conservan los diseños anteriores.
2. **Crear o abrir.** Un solo menú reúne Nueva mesa (crea únicamente borrador local), Abrir mesa de Sheets (incluida la V2 existente), Duplicar diseño y Respaldos JSON. Los respaldos solo contienen personalización: no incluyen catálogo, pagos ni vinculación a una hoja. Las importaciones nuevas indican «diseño importado de JSON»; las anteriores no se reclasifican por conjetura. No se afirma que exista un respaldo JSON si no se descargó.
3. **Datos.** Fer/Omar capturan nombres, nombre de mesa, fecha y prefijo. El guardado automático es local. La fecha continúa local como antes.
4. **Diseño.** Colores y tipografías; pestaña Certificado para texto y foto de experiencia por ID. Al final se usa la acción existente: conectar su referencia, abrir una hoja existente desde el menú o crear su copia de V2 si corresponde a una boda nueva. Revisar y guardar envía la personalización a Sheets. En V2 se abre su hoja existente; no se crea una boda para continuar.
5. **Experiencias.** Roberto prepara nombres, descripciones y fotos desde el panel o en EXPERIENCIAS de la misma hoja. Después de editar Sheets, pulsar Actualizar catálogo. Rodrigo configura PRECIO y MONEDA en Sheets por ID de experiencia y actualiza el catálogo. Se muestra el layout existente de 12 columnas, sin añadir una carga masiva no implementada.
6. **Pagos.** Rodrigo prepara moneda y destinatarios de la boda. Stripe corresponde a tarjetas y el campo PayPal es PayPal.Me. El guardado existente conserva los medios en NO. Los interruptores de activación siguen pendientes de conexión técnica: esta limpieza no habilita cobros, no cambia permisos ni modifica la privacidad de V2.
7. **Conexión.** Muestra el estado pendiente del enlace público. Las pruebas operativas van al final. La generación del enlace, el despliegue de Apps Script y la entrega del destino DNS aún no están conectados al panel. No se presenta una URL de Sheets como enlace para invitados ni como destino DNS de GoDaddy.

El recorrido tiene navegación directa y botones para continuar; la organización visual no sustituye las validaciones existentes. Los cambios de módulos preservan el formulario mientras la fuente no cambie. Al cambiar de mesa se conserva el comportamiento existente de limpieza de sesión y de datos sensibles.
