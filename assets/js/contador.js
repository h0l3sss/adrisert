// Envia uma visita por carregamento de página. Falha na contagem não afeta o visitante.
(function () {
  if (location.pathname.indexOf('painel-acessos') !== -1) return;

  var corpo = JSON.stringify({ caminho: location.pathname });
  var enviado = navigator.sendBeacon
    && navigator.sendBeacon('/api/hit', new Blob([corpo], { type: 'application/json' }));
  if (enviado) return;

  fetch('/api/hit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: corpo,
    keepalive: true,
  }).catch(function () {});
})();
