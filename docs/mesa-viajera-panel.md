# Mesa Viajera · Editor de personalización, etapa 4A

Esta etapa incorpora `mesa-viajera-panel.html` a Recursos internos. El sitio de Proyecto EVA continúa alojado en su repositorio actual. No se modifica la mesa pública de Roberto y Fernanda ni su Apps Script.

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
- Las importaciones aceptan solo claves permitidas, colores hexadecimales de seis cifras y cuatro fuentes. No aceptan URLs, credenciales, código o parámetros de pagos.
- La vista usa texto DOM y una lista cerrada de estilos; no interpreta HTML del cliente.
- La fecha es un dato provisional del editor, separado de CONFIG hasta verificar la clave definitiva en el backend.
- Los prefijos se normalizan a letras y números, máximo 16; la unicidad entre mesas se validará al conectarse al registro central.
- CONFIG prevista: NOMBRES, NOMBRE_MESA, PREFIJO_FOLIO, CERT_TITULO, CERT_SUBTITULO, COLOR_PRIMARIO, COLOR_FONDO, COLOR_SECUNDARIO, COLOR_ACENTO, COLOR_DORADO, FUENTE_NOMBRES, FUENTE_TITULOS, FUENTE_CATEGORIAS y FUENTE_CUERPO. Antes de escribir en Sheets, cotejar estos nombres con PANEL_CAMPOS y conservar las demás claves.

## Pendiente: etapa 4B y activación

La página pública no tiene autenticación. Sus borradores locales no constituyen control de acceso. No introducir datos financieros o secretos en el código público. No exponer una llave de Apps Script en JavaScript ni publicar una hoja privada.

Para conectar operaciones reales:

1. Implementar identidad y autorización en el servidor, con usuarios y permisos verificados: Rodrigo administración/autorizaciones; Roberto imágenes; Fernanda y Omar preparación comercial. No usar un selector de rol del navegador como autorización.
2. Conectar un registro central privado de mesas, cada una con identificador, hoja, proyecto, estado, configuración y responsables. Separar el folio visible del identificador único.
3. Crear/duplicar la mesa de forma idempotente y validar los datos en servidor. No heredar operaciones, cuentas bancarias, credenciales ni aprobaciones al duplicar.
4. Guardar cambios autorizados en CONFIG mediante una lista permitida y una revisión/versionado para evitar sobreescrituras. Confirmar el guardado leyendo el resultado del servidor. Mantener registro de autor y fecha.
5. Recuperar catálogo e indicadores desde operaciones reales. Mostrar sin conexión o pendiente cuando no existan datos; no sustituirlo por ceros de ejemplo.
6. Separar la activación de pagos. Verificar cuentas de los destinatarios, estados y pruebas antes de habilitar cobros.
7. Revisar enlace y funcionamiento como invitado antes de publicar. Incorporar la mesa existente después, conservando sus operaciones.

## Responsables

Rodrigo autoriza precios, descuentos y plataformas. Para experiencias reales se trabaja con aerolíneas directamente y Expedia TAAP; servicios fuera de ese marco requieren su autorización. Roberto solicita especificaciones y monta fotos generadas con IA. Fernanda aporta asesoría de bodas. Omar captura datos y realiza seguimiento comercial.

## Certificado

El titular confirmó el 26 de octubre de 2026 que el certificado generado funciona bien. El registro de ejecución compartido muestra recursos preparados, PDF de ejemplo y ejecución completada sin cobros ni envíos. La validación visual fue del titular; el agente no pudo abrir ese PDF privado. Esta aceptación no valida pagos ni la integración web.
