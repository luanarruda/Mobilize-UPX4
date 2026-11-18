import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../api';
import { useSessao } from './Sessao';

// RF07 — fonte ampliável e alto contraste, lembrados entre visitas.
// Pensado na persona Helena (68 anos): textos grandes e informação clara.
// Com conta (RF08), as preferências vão junto para qualquer computador em
// que a pessoa entrar — a filha configura uma vez, e a Helena encontra pronto.

export type TamanhoFonte = 'normal' | 'grande' | 'muito-grande';

interface Preferencias {
  fonte: TamanhoFonte;
  altoContraste: boolean;
}

interface ValorContexto extends Preferencias {
  setFonte: (f: TamanhoFonte) => void;
  setAltoContraste: (v: boolean) => void;
}

const CHAVE = 'rotacerta:acessibilidade';
const PADRAO: Preferencias = { fonte: 'normal', altoContraste: false };

// O localStorage pode estar bloqueado (modo privado, políticas da empresa);
// por isso try/catch: a preferência só não é lembrada, mas o site funciona.
function carregar(): Preferencias {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) return { ...PADRAO, ...JSON.parse(salvo) };
  } catch { /* segue com o padrão */ }
  // Respeita a preferência do sistema operacional por mais contraste.
  return { ...PADRAO, altoContraste: matchMedia('(prefers-contrast: more)').matches };
}

const Contexto = createContext<ValorContexto | null>(null);

export function ProvedorAcessibilidade({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferencias>(carregar);
  const { usuario } = useSessao();
  const ultimoUsuario = useRef<number | null>(null);

  // Ao entrar: se a conta já tem preferências, aplica; senão, salva as atuais nela.
  useEffect(() => {
    if (!usuario || usuario.id === ultimoUsuario.current) {
      if (!usuario) ultimoUsuario.current = null;
      return;
    }
    ultimoUsuario.current = usuario.id;
    if (Object.keys(usuario.preferencias).length > 0) setPrefs((p) => ({ ...p, ...usuario.preferencias }));
    else api.salvarPreferencias(prefs).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à troca de usuário
  }, [usuario]);

  const mudar = (parcial: Partial<Preferencias>) => {
    setPrefs((p) => ({ ...p, ...parcial }));
    if (usuario) api.salvarPreferencias(parcial).catch(() => {});
  };

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.fonte = prefs.fonte;
    raiz.dataset.contraste = prefs.altoContraste ? 'alto' : 'normal';
    try {
      localStorage.setItem(CHAVE, JSON.stringify(prefs));
    } catch { /* ignora */ }
  }, [prefs]);

  return (
    <Contexto.Provider
      value={{
        ...prefs,
        setFonte: (fonte) => mudar({ fonte }),
        setAltoContraste: (altoContraste) => mudar({ altoContraste }),
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useAcessibilidade() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAcessibilidade precisa estar dentro de ProvedorAcessibilidade');
  return ctx;
}
