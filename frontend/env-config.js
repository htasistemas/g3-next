(function (window) {
  window.__env = window.__env || {};

  // URL base da API. Em producao, o G3-Next usa a mesma origem do frontend.
  window.__env.apiUrl = window.location.origin;

  // Caso queira controlar multiplos valores, adicione novas chaves aqui.
  // window.__env.appVersion = "1.0.0";
  // window.__env.featureFlag = false;
})(this);
