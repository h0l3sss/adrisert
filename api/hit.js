// Registra visitas e cliques de contato. Não guarda IP nem cookie:
// o visitante vira um código que muda todo dia, só para separar pessoas diferentes no mesmo dia.
import { createHmac } from 'node:crypto';

const TAMANHO_MAXIMO_CAMINHO = 200;
const NOME_EVENTO = /^[a-z0-9_-]{1,60}$/i;
const ROBOS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|axios|node-fetch/i;

function lerConfiguracao() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !chave) {
    throw new Error('Variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY não configuradas.');
  }
  return { url, chave };
}

// Chaves antigas (JWT, começam com "eyJ") vão também no Authorization. Chaves sb_secret_ vão só no apikey.
function cabecalhosSupabase(chave, extras = {}) {
  const cabecalhos = { apikey: chave, ...extras };
  if (chave.startsWith('eyJ')) cabecalhos.authorization = `Bearer ${chave}`;
  return cabecalhos;
}

function caminhoValido(caminho) {
  return typeof caminho === 'string'
    && caminho.startsWith('/')
    && caminho.length <= TAMANHO_MAXIMO_CAMINHO;
}

function primeiraRegra(texto, regras, padrao) {
  const regra = regras.find(([expressao]) => expressao.test(texto));
  return regra ? regra[1] : padrao;
}

function tipoDispositivo(ua) {
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobi/i.test(ua))) return 'Tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'Celular';
  return 'Computador';
}

function nomeNavegador(ua) {
  return primeiraRegra(ua, [
    [/Edg\//, 'Edge'],
    [/OPR\/|Opera/, 'Opera'],
    [/SamsungBrowser/, 'Samsung Internet'],
    [/Firefox|FxiOS/, 'Firefox'],
    [/Chrome|CriOS/, 'Chrome'],
    [/Safari/, 'Safari'],
  ], 'Outro');
}

function nomeSistema(ua) {
  return primeiraRegra(ua, [
    [/Windows/, 'Windows'],
    [/iPhone|iPad|iPod/, 'iOS'],
    [/Android/, 'Android'],
    [/CrOS/, 'ChromeOS'],
    [/Mac OS X|Macintosh/, 'macOS'],
    [/Linux/, 'Linux'],
  ], 'Outro');
}

// Campanha (utm_source) tem prioridade; senão, só o domínio de quem indicou. Visita interna conta como direta.
function origemDaVisita(referrer, utm, hostAtual) {
  if (typeof utm === 'string' && utm.trim()) return utm.trim().toLowerCase().slice(0, 60);
  if (typeof referrer !== 'string' || !referrer) return null;

  let dominio;
  try {
    dominio = new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  const proprio = (hostAtual || '').split(':')[0].replace(/^www\./, '');
  return dominio && dominio !== proprio ? dominio.slice(0, 100) : null;
}

function codigoVisitante(req, segredo) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ua = req.headers['user-agent'] || '';
  const dia = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return createHmac('sha256', segredo).update(`${dia}|${ip}|${ua}`).digest('hex').slice(0, 32);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const ua = req.headers['user-agent'] || '';
  if (!ua || ROBOS.test(ua)) return res.status(204).end();

  const corpo = req.body || {};
  const tipo = corpo.tipo === 'clique' ? 'clique' : 'visita';
  if (!caminhoValido(corpo.caminho)) {
    return res.status(400).json({ erro: 'Caminho inválido.' });
  }
  if (tipo === 'clique' && !(typeof corpo.nome === 'string' && NOME_EVENTO.test(corpo.nome))) {
    return res.status(400).json({ erro: 'Nome do clique inválido.' });
  }

  let configuracao;
  try {
    configuracao = lerConfiguracao();
  } catch (erro) {
    console.error(erro.message);
    return res.status(500).end();
  }

  const pais = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
  const evento = {
    tipo,
    nome: tipo === 'clique' ? corpo.nome : null,
    caminho: corpo.caminho,
    visitante: codigoVisitante(req, configuracao.chave),
    origem: tipo === 'visita' ? origemDaVisita(corpo.referrer, corpo.utm, req.headers.host) : null,
    pais: /^[A-Z]{2}$/.test(pais) ? pais : null,
    dispositivo: tipoDispositivo(ua),
    navegador: nomeNavegador(ua),
    sistema: nomeSistema(ua),
  };

  try {
    const resposta = await fetch(`${configuracao.url}/rest/v1/site_eventos`, {
      method: 'POST',
      headers: cabecalhosSupabase(configuracao.chave, {
        'content-type': 'application/json',
        prefer: 'return=minimal',
      }),
      body: JSON.stringify(evento),
      signal: AbortSignal.timeout(5000),
    });

    if (!resposta.ok) {
      console.error(`Gravação em site_eventos respondeu ${resposta.status}`);
      return res.status(502).end();
    }
    return res.status(204).end();
  } catch (erro) {
    console.error('Falha ao chamar o Supabase:', erro.message);
    return res.status(502).end();
  }
}
