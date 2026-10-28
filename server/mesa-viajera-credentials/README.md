# Conexión privada de Stripe y PayPal de EVA

**Estado: código preparatorio probado con dependencias simuladas; no desplegado ni conectado a V2 o bodafyr.** No hay credenciales reales en este directorio. No se han realizado cobros, capturas ni escrituras en Google Cloud. Este servicio administra versiones de credenciales; no sustituye el procesamiento de pagos.

## Lo encontrado en los dos archivos del titular

`Texto pegado.txt` incluye Stripe y PayPal. `Texto pegado (2).txt` incluye PayPal y carece de las funciones Stripe del primero. Se usa el primero como referencia técnica; no se ha confirmado a qué despliegue corresponde cada archivo. Ambos son código servidor, no incluyen la plantilla HTML que consume `doGet`.

| Dato | Ubicación actual observada | Tratamiento previsto |
| --- | --- | --- |
| STRIPE_SECRET_KEY | Propiedades del script | Bóveda central de EVA; admitir clave restringida compatible |
| STRIPE_CONNECTED_ACCOUNT_ID | CONFIG de la mesa | Mantener por mesa; no reemplazar por el ID de la plataforma EVA |
| PAYPAL_CLIENT_ID | Propiedades del script | Paquete central de PayPal, por ambiente; el script entrega el ID público a su plantilla |
| PAYPAL_CLIENT_SECRET | Propiedades del script | Paquete central; nunca devolverlo al navegador |
| PAYPAL_ENV | Propiedades del script | LIVE o SANDBOX; el valor por defecto del código es SANDBOX |
| PAYPAL_ME | CONFIG | Enlace complementario; no es la autenticación de Checkout |
| COMISION_EVA_PCT e IVA_PCT | CONFIG | Conservar la fórmula observada y valores de cada mesa |

`crearCheckoutStripeDesdeWeb` crea Checkout Sessions con encabezado `Stripe-Account` y `payment_intent_data[application_fee_amount]`. Por ello el cargo se crea en la cuenta conectada y EVA aplica una comisión. La fórmula observada usa porcentaje de EVA y su IVA, en centavos. No se ha modificado ni validado fiscalmente esa fórmula.

`crearOrdenPayPal_` obtiene OAuth con el ID y secreto del script, crea `/v2/checkout/orders` y captura posteriormente con recuperación/idempotencia basada en transacciones. El cuerpo observado no establece `payee` por mesa ni reparto automático. No afirmar que PayPal entrega directamente los fondos a una cuenta distinta por boda sin una adaptación adicional.

Se observa `doGet` que consulta y confirma sesiones Stripe al regreso del invitado, y una función de reconciliación. No se observa `doPost` ni un receptor de webhooks en los archivos entregados. No se puede concluir que no exista otro componente externo. Antes de activar la nueva integración, confirmar y completar la recepción verificada de eventos; conservar el retorno y la reconciliación como complementos. No activar una migración basándose solo en el regreso del navegador.

## Componentes preparados

- `service.mjs`: control de administradores por `sub` de Google, validación por proveedor/ambiente, estados sin secretos, control de versión previo a escritura y auditoría solo de metadatos.
- `google-vault.mjs`: consulta metadatos y agrega versiones en Google Secret Manager. No implementa lectura de valores, borrado, cambios IAM ni activación de medios.
- `http.mjs`: API JSON con origen HTTPS exacto y bearer explícito, sin cookies ni parámetros con tokens, cuerpos limitados y respuestas sin caché. No es el endpoint de login POST de GIS. El frontend enviará el ID token obtenido de su callback en Authorization; no debe usar el access token del selector de Sheets como identidad.
- `start.mjs`: verificación mediante `google-auth-library`, con audiencia, emisor, expiración y lista explícita de sujetos autorizados. No confía en un selector de rol del navegador ni en correo/subject enviados en el cuerpo.
- `apps-script-adapter.gs`: lectura privada de versiones numéricas de la bóveda por el propietario de ejecución. Por defecto LEGACY conserva las propiedades del script; en VAULT, un fallo detiene la conexión sin volver silenciosamente a credenciales antiguas. No instalar todavía en bodafyr.

## API de administración prevista

| Operación | Ruta | Respuesta |
| --- | --- | --- |
| Consultar estados | GET /v1/admin/providers | Proveedor, ambiente, versión, configured y verification pendiente; sin claves |
| Agregar versión | PUT /v1/admin/providers/stripe/sandbox | Versión guardada; no cobra ni activa medios |
| Agregar versión | PUT /v1/admin/providers/paypal/sandbox | ID y secreto en una sola versión; ambiente derivado del servidor |
| Producción | Mismas rutas con /live | Requiere confirmLive=true; no activa ni cambia consumidores |

PUT requiere `expectedVersion` ("0" si no hay versión), `credentials` con el conjunto exacto de claves del proveedor y, en live, `confirmLive`. No hay endpoint para recuperar secretos existentes. La verificación de formato no verifica la cuenta del proveedor, sus permisos ni su capacidad de cobro. El servicio no marca credenciales como verificadas.

## Preparación del despliegue — aún no ejecutada

1. Revisar y fijar dependencias mediante un lockfile y análisis de dependencias antes del despliegue. El núcleo y transporte se probaron sin instalar ni ejecutar la biblioteca Google real.
2. Usar el proyecto Google de Mesa Viajera ya existente, sujeto a verificar su ID y habilitación de servicios. Crear cuatro contenedores vacíos: `eva-payments-stripe-sandbox`, `eva-payments-stripe-live`, `eva-payments-paypal-sandbox`, `eva-payments-paypal-live`. No agregar credenciales desde comandos con valores literales ni desde el chat.
3. Identidad de administración: definir el `sub` de la cuenta Google autorizada de Rodrigo mediante un flujo Google verificado. No se deduce del correo del repositorio ni se permite autoalta del primer visitante.
4. Identidad del servicio: cuenta de ejecución sin claves descargadas. Darle `secretmanager.versions.get` y `secretmanager.versions.add` únicamente sobre los cuatro secretos existentes. Puede implementarse con roles predefinidos mínimos o rol personalizado revisado. No necesita `versions.access`, administrar IAM ni borrar secretos.
5. Configuración del servicio sin secretos de proveedor: GOOGLE_CLOUD_PROJECT, EVA_GOOGLE_CLIENT_ID, EVA_ADMIN_GOOGLE_SUBS, EVA_PANEL_ORIGIN y PORT. La audiencia será la del cliente OAuth autorizado; el origen previsto es https://proyectoeva.mx. No sustituir GOOGLE_CLOUD_PROJECT por un ID adivinado.
6. Servir por HTTPS, limitar tráfico y configurar registro sin cuerpos ni cabeceras Authorization. La cola actual solo serializa dentro de una instancia. **Antes de producción, añadir bloqueo/control de concurrencia entre instancias o una política de despliegue que garantice un solo escritor, incluidas revisiones solapadas.** El chequeo de versión por sí solo no es una comparación y escritura atómica distribuida.
7. Conectar la sección central del panel únicamente después de desplegar, verificar autorización y obtener su URL exacta. Hasta entonces, no mostrar un formulario que pida secretos en el sitio estático. La identidad de Google será independiente de la autorización drive.file actual, conservando el selector y guardado de mesas.
8. Consumidor V2: conceder al propietario de ejecución acceso a las versiones necesarias únicamente de los secretos de pruebas y autorizar cloud-platform en el manifiesto del proyecto. Este permiso nuevo no se configura desde el navegador ni se ha concedido en esta etapa. La administración no entrega claves al consumidor; este lee la bóveda directamente con su identidad Google.
9. Incorporar el adaptador en una copia de desarrollo del script. Reemplazar solo las lecturas de credenciales indicadas abajo; conservar cálculo, destinatarios, reservas, conciliación, certificados y correos. Completar webhooks y su verificación antes de activación. Verificar además que los métodos públicos de cobro rechacen en servidor los medios desactivados; ocultar un botón o guardar NO no sustituye esa validación. Las pruebas operativas se realizan al final, como pidió el titular.
10. Una vez verificado V2, definir una migración independiente de bodafyr. No borrar ni rotar sus propiedades actuales ni cambiar sus versiones automáticamente. Revertir la fuente a LEGACY solo mediante una acción administrativa deliberada; no como respuesta automática a un fallo de la bóveda.

## Puntos exactos de adaptación del script de referencia

- `getStripeSecretKey_`: obtener STRIPE_SECRET_KEY de `evaPaymentCredentialBundle_('stripe')`, conservando su control de ausencia de clave.
- `getPayPalAccessToken_`: sustituir su lectura inicial de Script Properties por **una sola lectura del paquete PayPal** y tomar de ella ID y secreto juntos. Conservar el resto del intercambio OAuth. No copiar el access_token al frontend administrativo.
- `getPayPalBaseUrl_`: derivar el endpoint únicamente del PAYPAL_ENV del mismo origen de credenciales, sin aceptar una URL proporcionada por el navegador.
- `doGet`: cambiar las lecturas de PAYPAL_CLIENT_ID y PAYPAL_ENV a la fuente central cuando se seleccione VAULT. El ID público del SDK puede seguir en la plantilla. No entregar PAYPAL_CLIENT_SECRET o STRIPE_SECRET_KEY al HTML.
- Conservar otras propiedades: la secuencia de folios, los pendientes y Microsoft se usan en el mismo script. **Nunca reemplazar el conjunto completo de propiedades para actualizar pagos.**

Propiedades no secretas del adaptador: EVA_PAYMENT_CREDENTIALS_SOURCE (LEGACY/VAULT), EVA_PAYMENT_GCP_PROJECT, EVA_PAYMENT_ENVIRONMENT (sandbox/live), EVA_PAYMENT_STRIPE_VERSION y EVA_PAYMENT_PAYPAL_VERSION (versiones numéricas aprobadas). Añadir una versión en el administrador no cambia estas referencias automáticamente: la activación de una versión se trata por separado.

## Validación realizada

`node --test *.test.mjs`: catorce pruebas con bóveda/identidad simuladas y transporte HTTP local. Incluyen cinco comprobaciones del adaptador (LEGACY, versiones fijas, separación de ambientes y fallo sin fallback). Cubren acceso no autorizado, separación de ambientes, no exposición, rechazo de campos extra, conflicto entre escrituras de una instancia, paquete indivisible PayPal y errores saneados. No hay llamadas a Stripe, PayPal o Google Cloud, ni comprobación real de credenciales. La biblioteca Google, IAM, el despliegue, el formulario administrativo y la integración del consumidor permanecen pendientes.

Fuentes técnicas: [verificación de ID token de Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [versiones de Secret Manager](https://docs.cloud.google.com/secret-manager/docs/add-secret-version), [acceso IAM de Secret Manager](https://docs.cloud.google.com/secret-manager/docs/access-control).
