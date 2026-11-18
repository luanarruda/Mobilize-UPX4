import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// RF07 — fonte ampliável e alto contraste, lembrados entre visitas.
// Pensado na persona Helena (68 anos): textos grandes e informação clara.

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
        setFonte: (fonte) => setPrefs((p) => ({ ...p, fonte })),
        setAltoContraste: (altoContraste) => setPrefs((p) => ({ ...p, altoContraste })),
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
