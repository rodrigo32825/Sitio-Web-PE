/** Adaptador de preparación para V2; no instalar todavía en bodafyr.
 * Todas las funciones son privadas para google.script.run (sufijo _).
 * El modo por defecto LEGACY conserva Script Properties.
 * VAULT requiere versiones numéricas explícitas; nunca usa latest.
 */
function evaPaymentCredentialBundle_(provider) {
  if (provider !== 'stripe' && provider !== 'paypal') throw new Error('Proveedor no admitido.');
  const props = PropertiesService.getScriptProperties();
  const source = props.getProperty('EVA_PAYMENT_CREDENTIALS_SOURCE') || 'LEGACY';
  if (source === 'LEGACY') {
    if (provider === 'stripe') return { STRIPE_SECRET_KEY: props.getProperty('STRIPE_SECRET_KEY') || '' };
    return {
      PAYPAL_CLIENT_ID: props.getProperty('PAYPAL_CLIENT_ID') || '',
      PAYPAL_CLIENT_SECRET: props.getProperty('PAYPAL_CLIENT_SECRET') || '',
      PAYPAL_ENV: (props.getProperty('PAYPAL_ENV') || 'SANDBOX').toUpperCase()
    };
  }
  if (source !== 'VAULT') throw new Error('Origen de credenciales no admitido.');
  const project = props.getProperty('EVA_PAYMENT_GCP_PROJECT') || '';
  const environment = props.getProperty('EVA_PAYMENT_ENVIRONMENT') || '';
  const version = props.getProperty(provider === 'stripe' ? 'EVA_PAYMENT_STRIPE_VERSION' : 'EVA_PAYMENT_PAYPAL_VERSION') || '';
  if (!/^([a-z][a-z0-9-]{4,61}[a-z0-9]|[0-9]{6,20})$/.test(project) || !/^(sandbox|live)$/.test(environment) || !/^[1-9][0-9]{0,19}$/.test(version)) {
    throw new Error('Falta configurar la conexión central de EVA y su versión.');
  }
  const resource = 'projects/' + project + '/secrets/eva-payments-' + provider + '-' + environment + '/versions/' + version;
  // El propietario de ejecución requiere acceso IAM a este secreto, no al proyecto entero.
  // Necesita cloud-platform en el manifiesto y autorización nueva antes de usar VAULT.
  const response = UrlFetchApp.fetch('https://secretmanager.googleapis.com/v1/' + resource + ':access', {
    method: 'get', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('La conexión central de EVA no está disponible.');
  let bundle;
  try {
    const data = JSON.parse(response.getContentText());
    const json = Utilities.newBlob(Utilities.base64Decode(data.payload.data)).getDataAsString('UTF-8');
    bundle = JSON.parse(json);
  } catch (ignored) { throw new Error('La configuración central de EVA no es válida.'); }
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) throw new Error('La configuración central de EVA no es válida.');
  if (provider === 'stripe') {
    const key = bundle.STRIPE_SECRET_KEY;
    if (typeof key !== 'string' || !(new RegExp('^(rk|sk)_' + (environment === 'live' ? 'live' : 'test') + '_[A-Za-z0-9]{12,}$')).test(key)) throw new Error('Revisa el ambiente de la conexión de Stripe.');
    return { STRIPE_SECRET_KEY: key };
  }
  if (typeof bundle.PAYPAL_CLIENT_ID !== 'string' || !bundle.PAYPAL_CLIENT_ID || typeof bundle.PAYPAL_CLIENT_SECRET !== 'string' || !bundle.PAYPAL_CLIENT_SECRET || bundle.PAYPAL_ENV !== (environment === 'live' ? 'LIVE' : 'SANDBOX')) {
    throw new Error('Revisa el ambiente de la conexión de PayPal.');
  }
  return { PAYPAL_CLIENT_ID: bundle.PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET: bundle.PAYPAL_CLIENT_SECRET, PAYPAL_ENV: bundle.PAYPAL_ENV };
}
