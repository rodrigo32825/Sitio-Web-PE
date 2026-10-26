'use strict';
// Configuración pública de la aplicación web. No incluir client_secret, tokens,
// contraseñas ni claves de servicios privados en este archivo.
window.EVA_MESA_GOOGLE = Object.freeze({
  clientId: '',
  pickerApiKey: '',
  projectNumber: '',
  // Primera activación: registrar únicamente la copia de desarrollo.
  // Este filtro del editor no sustituye los permisos de Google Drive.
  allowedSpreadsheetIds: []
});
