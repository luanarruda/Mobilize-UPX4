// RF11 — Quadro de horários pronto para imprimir ou salvar em PDF.
//
// Usamos a impressão do próprio navegador: na janela de impressão, a opção
// "Salvar como PDF" gera o arquivo. Não precisa de biblioteca de PDF, o texto
// continua selecionável e pesquisável no PDF (diferente de uma "foto" da tela),
// e o resultado respeita o tamanho de papel da impressora da pessoa.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type HorariosLinha, type LinhaDetalhe, type TipoDia } from '../api';
import { NOME_TIPO_DIA } from '../util';

export function PaginaImprimir() {
  const id = Number(useParams().id);
  const [linha, setLinha] = useState<LinhaDetalhe | null>(null);
  const [horarios, setHorarios] = useState<HorariosLinha | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    Promise.all([api.linha(id), api.horarios(id)])
      .then(([l, h]) => {
        setLinha(l);
        setHorarios(h);
        // O título vira o nome sugerido do arquivo ao "Salvar como PDF".
        document.title = `Horários linha ${l.codigo} - RotaCerta`;
      })
      .catch(() => setErro(true));
  }, [id]);

  if (erro) return <main className="impressao"><p>Linha não encontrada. <Link to="/linhas">Ver linhas</Link></p></main>;
  if (!linha || !horarios) return <main className="impressao"><p>Carregando…</p></main>;

  const terminal = linha.pontos[0].nome;
  const hoje = new Date().toLocaleDateString('pt-BR');

  return (
    <main className="impressao">
      {/* Barra de ações: aparece na tela, some no papel (ver @media print). */}
      <div className="barra-impressao nao-imprimir">
        <Link to={`/linhas/${linha.id}`} className="botao-secundario como-botao">← Voltar</Link>
        <button type="button" className="botao-primario" onClick={() => window.print()} autoFocus>
          Imprimir ou salvar em PDF
        </button>
        <p className="passo-sub">Para PDF, escolha "Salvar como PDF" no campo "Destino" da janela de impressão.</p>
      </div>

      <header className="impressao-topo">
        <p className="impressao-marca">RotaCerta</p>
        <h1>
          <span className="codigo-linha" style={{ background: linha.cor }}>{linha.codigo}</span> {linha.nome}
        </h1>
        <p>{linha.empresa} · Horários de saída do <strong>{terminal}</strong></p>
      </header>

      <section className="impressao-bloco">
        <h2>Itinerário</h2>
        <div className="impressao-colunas">
          {(['ida', 'volta'] as const).map((sentido) => (
            <div key={sentido}>
              <h3>Sentido {linha.destinos[sentido]}</h3>
              <ol>
                {linha.pontos
                  .filter((p) => p.sentido === sentido)
                  .concat(sentido === 'volta' ? [linha.pontos[0]] : [])
                  .map((p, i) => <li key={`${p.id}-${i}`}>{p.nome}{p.acessivel ? ' ♿' : ''}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {(Object.keys(NOME_TIPO_DIA) as TipoDia[]).map((tipo) => {
        const lista = horarios.horarios[tipo];
        // Agrupa por hora: "05 | 00 15 30 45" — formato dos quadros de horário de terminal.
        const porHora = new Map<string, string[]>();
        for (const h of lista) porHora.set(h.slice(0, 2), [...(porHora.get(h.slice(0, 2)) ?? []), h.slice(3)]);
        return (
          <section key={tipo} className="impressao-bloco">
            <h2>{NOME_TIPO_DIA[tipo]} <span className="impressao-qtd">({lista.length} saídas)</span></h2>
            <table className="quadro-horas">
              <thead>
                <tr><th scope="col">Hora</th><th scope="col">Minutos</th></tr>
              </thead>
              <tbody>
                {[...porHora].map(([hora, mins]) => (
                  <tr key={hora}><th scope="row">{hora}h</th><td>{mins.join('  ')}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <footer className="impressao-rodape">
        Gerado em {hoje} pelo RotaCerta. ♿ = ponto acessível. Horários programados, sujeitos a alteração;
        consulte a previsão em tempo real no site.
      </footer>
    </main>
  );
}
