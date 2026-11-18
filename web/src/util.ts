// Funções pequenas de apoio à interface.

/** Busca sem diferenciar maiúsculas e acentos: "eden" encontra "Éden". */
export const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Horário de chegada em relógio, ex.: daqui a 7 min → "21:42". */
export function horarioDaqui(minutos: number, base = new Date()) {
  const d = new Date(base.getTime() + minutos * 60_000);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export const NOME_TIPO_DIA = { util: 'Dias úteis', sabado: 'Sábados', domingo: 'Domingos e feriados' } as const;
