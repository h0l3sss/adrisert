// Envia uma visita por página aberta e um clique por botão de contato ([data-track]).
// Falha na contagem não afeta o visitante.
(function () {
  if (location.pathname.indexOf('painel-acessos') !== -1) return;

  function enviar(dados) {
    var corpo = JSON.stringify(dados);
    var enviado = navigator.sendBeacon
      && navigator.sendBeacon('/api/hit', new Blob([corpo], { type: 'application/json' }));
    if (enviado) return;

    fetch('/api/hit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: corpo,
      keepalive: true,
    }).catch(function () { /* contagem é opcional; o site segue normal */ });
  }

  enviar({
    tipo: 'visita',
    caminho: location.pathname,
    referrer: document.referrer,
    utm: new URLSearchParams(location.search).get('utm_source'),
  });

  document.addEventListener('click', function (evento) {
    var alvo = evento.target.closest && evento.target.closest('[data-track]');
    if (!alvo) return;
    enviar({ tipo: 'clique', nome: alvo.getAttribute('data-track'), caminho: location.pathname });
  });
})();
