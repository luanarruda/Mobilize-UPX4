// RF05 — Exibição dos avisos e notificações do navegador.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Aviso, TipoAviso } from '../api';
import { useTempoReal } from '../contexto/TempoReal';
import { useFavoritos } from '../contexto/Favoritos';

export const ROTULO_TIPO: Record<TipoAviso, string> = {
  atraso: 'Atraso',
  desvio: 'Desvio',
  interrupcao: 'Interrupção',
};

/** Lista de avisos (usada na página da linha, do ponto e nos favoritos). */
export function ListaAvisos({ avisos, mostrarLinha = true }: { avisos: Aviso[]; mostrarLinha?: boolean }) {
  if (avisos.length === 0) return null;
  return (
    <ul className="lista-avisos">
      {avisos.map((a) => (
        <li key={a.id} className={`aviso aviso-${a.tipo}`}>
          <p className="aviso-titulo">
            <span className="aviso-tipo">{ROTULO_TIPO[a.tipo]}</span>
            {mostrarLinha && (
              <Link to={`/linhas/${a.linhaId}`} className="codigo-linha mini" style={{ background: a.cor }}>
                {a.codigo}
              </Link>
            )}
            <strong>{a.titulo}</strong>
          </p>
          <p>{a.mensagem}</p>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Notificações do navegador (Notification API).
// * A permissão só é pedida quando a pessoa clica em "Receber avisos" — pedir
//   ao abrir o site é considerado má prática e os navegadores penalizam.
// * Só funciona em https ou em localhost.
// * Cada aviso notifica uma vez só (guardamos os ids já mostrados).
// ---------------------------------------------------------------------------
const CHAVE_OPTIN = 'rotacerta:notificacoes';

export function notificacoesSuportadas() {
  return typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext;
}

/** Lido na hora de notificar, para valer mesmo se a pessoa ativou em outra página. */
function notificacoesAtivas() {
  try {
    return localStorage.getItem(CHAVE_OPTIN) === '1' && notificacoesSuportadas() && Notification.permission === 'granted';
  } catch {
    return false;
  }
}

export function useOptInNotificacoes() {
  const [ativo, setAtivo] = useState(notificacoesAtivas);

  const ativar = async () => {
    if (!notificacoesSuportadas()) return 'nao-suportado' as const;
    const permissao = await Notification.requestPermission();
    const ok = permissao === 'granted';
    try { localStorage.setItem(CHAVE_OPTIN, ok ? '1' : '0'); } catch { /* ignora */ }
    setAtivo(ok);
    return ok ? ('ativado' as const) : ('negado' as const);
  };

  const desativar = () => {
    try { localStorage.setItem(CHAVE_OPTIN, '0'); } catch { /* ignora */ }
    setAtivo(false);
  };

  return { ativo, ativar, desativar };
}

/**
 * Faixa abaixo do cabeçalho com os avisos das linhas que a pessoa acompanha,
 * e disparo das notificações do navegador quando chega um aviso novo.
 * Fica no Layout, então funciona em qualquer página.
 */
export function FaixaAvisos() {
  const { avisos } = useTempoReal();
  const { linhasSeguidas } = useFavoritos();
  const [aberta, setAberta] = useState(false);
  const { pathname } = useLocation();
  const jaNotificados = useRef<Set<string> | null>(null);

  const meus = useMemo(() => avisos.filter((a) => linhasSeguidas.has(a.linhaId)), [avisos, linhasSeguidas]);

  useEffect(() => {
    // Primeira lista recebida: marca tudo como "já visto", para não disparar
    // uma enxurrada de notificações de avisos antigos ao abrir o site.
    if (jaNotificados.current === null) {
      if (avisos.length > 0 && linhasSeguidas.size > 0) jaNotificados.current = new Set(meus.map((a) => a.id));
      return;
    }
    for (const a of meus) {
      if (jaNotificados.current.has(a.id)) continue;
      jaNotificados.current.add(a.id);
      if (notificacoesAtivas() && document.visibilityState === 'hidden') {
        // Com o site aberto em primeiro plano, a faixa já mostra o aviso.
        new Notification(`${ROTULO_TIPO[a.tipo]} — linha ${a.codigo}`, { body: a.mensagem, tag: a.id, lang: 'pt-BR' });
      }
    }
  }, [meus, avisos.length, linhasSeguidas.size]);

  // Na página de favoritos os avisos já aparecem no conteúdo; a faixa repetiria.
  if (meus.length === 0 || pathname === '/favoritos') return null;

  return (
    // role="region" + aria-live: leitores de tela anunciam quando surge um aviso novo.
    <section className="faixa-avisos" aria-label="Avisos das suas linhas" aria-live="polite">
      <button type="button" aria-expanded={aberta} onClick={() => setAberta(!aberta)}>
        <span aria-hidden="true">⚠ </span>
        {meus.length === 1 ? `1 aviso nas suas linhas: ${meus[0].titulo}` : `${meus.length} avisos nas suas linhas`}
        <span className="faixa-acao">{aberta ? 'Fechar' : 'Ver'}</span>
      </button>
      {aberta && <ListaAvisos avisos={meus} />}
    </section>
  );
}
