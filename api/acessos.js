// Lista os acessos por página e dia. Exige o ADMIN_TOKEN no cabeçalho Authorization.
import { timingSafeEqual } from 'node:crypto';

const DIAS_MAXIMOS = 365;

function tokenValido(cabecalho) {
  const esperado = process.env.ADMIN_TOKEN;
  if (!esperado) return false;

  const recebido = Buffer.from((cabecalho || '').replace(/^Bearer /, ''));
  const referencia = Buffer.from(esperado);
  return recebido.length === referencia.length && timingSafeEqual(recebido, referencia);
}

// Chaves antigas (JWT, começam com "eyJ") vão também no Authorization. Chaves sb_secret_ vão só no apikey.
function cabecalhosSupabase(chave) {
  const cabecalhos = { apikey: chave };
  if (chave.startsWith('eyJ')) cabecalhos.authorization = `Bearer ${chave}`;
  return cabecalhos;
}

function diaInicial(dias) {
  return new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  if (!tokenValido(req.headers.authorization)) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }

  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !chave) {
    console.error('Variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY não configuradas.');
    return res.status(500).json({ erro: 'Configuração do servidor incompleta.' });
  }

  const dias = Math.min(Math.max(parseInt(req.query.dias, 10) || 30, 1), DIAS_MAXIMOS);

  try {
    const consulta = new URLSearchParams({
      select: 'dia,caminho,total',
      dia: `gte.${diaInicial(dias)}`,
      order: 'dia.desc,total.desc',
    });
    const resposta = await fetch(`${url}/rest/v1/acessos?${consulta}`, {
      headers: cabecalhosSupabase(chave),
      signal: AbortSignal.timeout(8000),
    });

    if (!resposta.ok) {
      console.error(`Consulta de acessos respondeu ${resposta.status}`);
      return res.status(502).json({ erro: 'Não foi possível ler os acessos.' });
    }

    const linhas = await resposta.json();
    return res.status(200).json(linhas);
  } catch (erro) {
    console.error('Falha ao consultar o Supabase:', erro.message);
    return res.status(502).json({ erro: 'Não foi possível ler os acessos.' });
  }
}
