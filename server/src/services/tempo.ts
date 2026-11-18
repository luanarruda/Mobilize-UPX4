// Data e hora sempre no fuso de Sorocaba, independentemente de onde o
// servidor esteja hospedado (servidores em nuvem costumam usar UTC).

export type TipoDia = 'util' | 'sabado' | 'domingo';

const FUSO = 'America/Sao_Paulo';

export function agoraLocal(data = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: FUSO,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(data)
      .map((p) => [p.type, p.value]),
  );
  const minutosDoDia = Number(partes.hour) * 60 + Number(partes.minute);
  // TODO (Etapa 6): tratar feriados como domingo, conforme tabela da Urbes.
  const tipoDia: TipoDia = partes.weekday === 'Sat' ? 'sabado' : partes.weekday === 'Sun' ? 'domingo' : 'util';
  return { tipoDia, minutosDoDia };
}

export const hhmmParaMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
