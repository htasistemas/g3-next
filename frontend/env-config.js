(function (window) {
  window.__env = window.__env || {};

  // URL base da API. Em producao, o G3-Next usa a mesma origem do frontend.
  var apiUrl = "__ENV_API_URL__";
  if (apiUrl && apiUrl !== "__ENV_API_URL__") {
    window.__env.apiUrl = apiUrl;
  }

  var googleClientId = "__ENV_GOOGLE_CLIENT_ID__";
  if (googleClientId && googleClientId !== "__ENV_GOOGLE_CLIENT_ID__") {
    window.__env.googleClientId = googleClientId;
  } else {
    window.__env.googleClientId = "324955391921-cb42mh8f88pu7o0l1h4bl8sur5soh3vv.apps.googleusercontent.com";
  }

  var googleAllowedOrigins = "__ENV_GOOGLE_ALLOWED_ORIGINS__";
  if (
    googleAllowedOrigins &&
    googleAllowedOrigins !== "__ENV_GOOGLE_ALLOWED_ORIGINS__"
  ) {
    window.__env.googleAllowedOrigins = googleAllowedOrigins;
  }

  // Caso queira controlar multiplos valores, adicione novas chaves aqui.
  // window.__env.appVersion = "1.0.0";
  // window.__env.featureFlag = false;
})(this);
