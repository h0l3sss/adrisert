// Registra uma visita por página e dia. Não guarda IP, cookie nem identificador de visitante.

const TAMANHO_MAXIMO_CAMINHO = 200;

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const caminho = req.body?.caminho;
  if (!caminhoValido(caminho)) {
    return res.status(400).json({ erro: 'Caminho inválido.' });
  }

  let configuracao;
  try {
    configuracao = lerConfiguracao();
  } catch (erro) {
    console.error(erro.message);
    return res.status(500).end();
  }

  try {
    const resposta = await fetch(`${configuracao.url}/rest/v1/rpc/registrar_acesso`, {
      method: 'POST',
      headers: cabecalhosSupabase(configuracao.chave, { 'content-type': 'application/json' }),
      body: JSON.stringify({ p_caminho: caminho }),
      signal: AbortSignal.timeout(5000),
    });

    if (!resposta.ok) {
      console.error(`registrar_acesso respondeu ${resposta.status}`);
      return res.status(502).end();
    }
    return res.status(204).end();
  } catch (erro) {
    console.error('Falha ao chamar o Supabase:', erro.message);
    return res.status(502).end();
  }
}
