// RF06 — Favoritos. Funcionam SEM conta (guardados no navegador). Com conta,
// ficam no servidor; ao entrar, os favoritos do navegador são levados para a conta.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, type Favorito, type LinhaResumo, type Ponto } from '../api';
import { useSessao } from './Sessao';

const CHAVE = 'rotacerta:favoritos';

function lerLocal(): Favorito[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
  } catch {
    return [];
  }
}
function gravarLocal(itens: Favorito[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch { /* navegador bloqueou o armazenamento: segue só em memória */ }
}

interface ValorFavoritos {
  itens: Favorito[];
  ehFavorito: (f: Favorito) => boolean;
  alternar: (f: Favorito) => Promise<void>;
  linhas: LinhaResumo[];
  pontos: Ponto[];
  erro: string | null;
}

const Contexto = createContext<ValorFavoritos | null>(null);
const igual = (a: Favorito, b: Favorito) => a.tipo === b.tipo && a.id === b.id;

export function ProvedorFavoritos({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useSessao();
  const [itens, setItens] = useState<Favorito[]>(lerLocal);
  const [linhas, setLinhas] = useState<LinhaResumo[]>([]);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const usuarioAnterior = useRef<number | null>(null);

  useEffect(() => {
    Promise.all([api.linhas(), api.pontos()]).then(([l, p]) => {
      setLinhas(l);
      setPontos(p);
    }).catch(() => {});
  }, []);

  // Sempre que a pessoa entra ou sai da conta, troca a origem dos favoritos.
  useEffect(() => {
    if (carregando) return;
    const id = usuario?.id ?? null;
    if (id === usuarioAnterior.current) return;
    usuarioAnterior.current = id;

    if (!usuario) {
      setItens(lerLocal());
      return;
    }
    const locais = lerLocal();
    const pedido = locais.length > 0 ? api.importarFavoritos(locais) : api.favoritos();
    pedido
      .then((lista) => {
        setItens(lista);
        gravarLocal([]); // agora estão na conta
      })
      .catch(() => setErro('Não foi possível carregar seus favoritos.'));
  }, [usuario, carregando]);

  const alternar = useCallback(
    async (f: Favorito) => {
      const jaEra = itens.some((i) => igual(i, f));
      const nova = jaEra ? itens.filter((i) => !igual(i, f)) : [...itens, f];
      setItens(nova); // atualização otimista: a estrela muda na hora
      setErro(null);
      if (!usuario) return gravarLocal(nova);
      try {
        setItens(await (jaEra ? api.desfavoritar(f) : api.favoritar(f)));
      } catch {
        setItens(itens); // desfaz se o servidor recusar
        setErro('Não foi possível salvar o favorito. Tente de novo.');
      }
    },
    [itens, usuario],
  );

  const ehFavorito = useCallback((f: Favorito) => itens.some((i) => igual(i, f)), [itens]);

  return (
    <Contexto.Provider value={{ itens, ehFavorito, alternar, linhas, pontos, erro }}>
      {children}
    </Contexto.Provider>
  );
}

export function useFavoritos() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useFavoritos precisa estar dentro de ProvedorFavoritos');
  return ctx;
}
