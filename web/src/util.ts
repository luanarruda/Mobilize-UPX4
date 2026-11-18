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

/** Distância aproximada em metros (Haversine), para achar o ponto mais próximo. */
export function distanciaM(a: [number, number], b: [number, number]) {
  const rad = (g: number) => (g * Math.PI) / 180;
  const h =
    Math.sin(rad(b[0] - a[0]) / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** "7 min", "1 h 05 min". */
export function duracao(segundos: number) {
  const min = Math.max(0, Math.round(segundos / 60));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

/** Horário de relógio a partir de uma base ISO + segundos. */
export function relogio(baseIso: string, segundos: number) {
  return new Date(new Date(baseIso).getTime() + segundos * 1000)
    .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
