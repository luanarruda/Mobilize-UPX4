import { useAcessibilidade, type TamanhoFonte } from '../contexto/Acessibilidade';

const OPCOES: { valor: TamanhoFonte; rotulo: string; nome: string }[] = [
  { valor: 'normal', rotulo: 'A', nome: 'Texto normal' },
  { valor: 'grande', rotulo: 'A+', nome: 'Texto grande' },
  { valor: 'muito-grande', rotulo: 'A++', nome: 'Texto muito grande' },
];

export function BarraAcessibilidade() {
  const { fonte, setFonte, altoContraste, setAltoContraste } = useAcessibilidade();

  return (
    <div className="barra-acessibilidade" role="group" aria-label="Opções de acessibilidade">
      <div className="grupo-fonte" role="group" aria-label="Tamanho do texto">
        {OPCOES.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={fonte === o.valor}
            aria-label={o.nome}
            title={o.nome}
            onClick={() => setFonte(o.valor)}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={altoContraste}
        onClick={() => setAltoContraste(!altoContraste)}
      >
        Alto contraste
      </button>
    </div>
  );
}
