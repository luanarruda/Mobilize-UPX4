// Dados de DEMONSTRAÇÃO baseados em locais conhecidos de Sorocaba-SP.
//
// ATENÇÃO: as coordenadas são aproximadas e as linhas NÃO correspondem às
// linhas oficiais da Urbes. Os trajetos ligam os pontos em linha reta.
// Servem para a demonstração até termos dados oficiais da Urbes ou das
// operadoras (Fase 1 do plano de aplicação, seção 8 da documentação).

export interface PontoSeed {
  nome: string;
  lat: number;
  lng: number;
  acessivel: boolean;
  coberto: boolean;
}

export const PONTOS = {
  tSantoAntonio: { nome: 'Terminal Santo Antônio', lat: -23.479, lng: -47.47, acessivel: true, coberto: true },
  tSaoPaulo: { nome: 'Terminal São Paulo', lat: -23.5005, lng: -47.451, acessivel: true, coberto: true },
  centro: { nome: 'Praça Cel. Fernando Prestes (Centro)', lat: -23.5017, lng: -47.4578, acessivel: true, coberto: false },
  mercadao: { nome: 'Mercado Municipal', lat: -23.4985, lng: -47.453, acessivel: true, coberto: true },
  rodoviaria: { nome: 'Rodoviária', lat: -23.493, lng: -47.456, acessivel: true, coberto: true },
  sorocabaShopping: { nome: 'Sorocaba Shopping', lat: -23.4985, lng: -47.44, acessivel: true, coberto: true },
  altoBoaVista: { nome: 'Paço Municipal (Alto da Boa Vista)', lat: -23.48, lng: -47.435, acessivel: false, coberto: false },
  facens: { nome: 'Facens', lat: -23.4715, lng: -47.4295, acessivel: true, coberto: true },
  eden: { nome: 'Éden', lat: -23.425, lng: -47.42, acessivel: false, coberto: false },
  hospitalRegional: { nome: 'Hospital Regional', lat: -23.516, lng: -47.474, acessivel: true, coberto: true },
  campolim: { nome: 'Parque Campolim', lat: -23.529, lng: -47.469, acessivel: true, coberto: false },
  iguatemi: { nome: 'Shopping Iguatemi Esplanada', lat: -23.539, lng: -47.464, acessivel: true, coberto: true },
  tVitoriaRegia: { nome: 'Terminal Vitória Régia', lat: -23.515, lng: -47.43, acessivel: true, coberto: true },
  wanel: { nome: 'Wanel Ville', lat: -23.52, lng: -47.495, acessivel: false, coberto: false },
  avIpanema: { nome: 'Av. Ipanema', lat: -23.47, lng: -47.485, acessivel: true, coberto: false },
  itavuvu: { nome: 'Itavuvu', lat: -23.46, lng: -47.49, acessivel: false, coberto: false },
} satisfies Record<string, PontoSeed>;

export type ChavePonto = keyof typeof PONTOS;

export interface LinhaSeed {
  codigo: string;
  nome: string;
  cor: string;
  empresa: string;
  /** Pontos no sentido ida; a volta percorre os mesmos pontos ao contrário. */
  paradas: ChavePonto[];
  /** Intervalo entre saídas em minutos: [dia útil, sábado, domingo]. */
  intervalos: [number, number, number];
  veiculos: number;
}

export const LINHAS: LinhaSeed[] = [
  {
    codigo: '100', nome: 'Expresso Santo Antônio – São Paulo', cor: '#c2410c', empresa: 'Demo Transportes',
    paradas: ['tSantoAntonio', 'rodoviaria', 'mercadao', 'tSaoPaulo'],
    intervalos: [10, 15, 20], veiculos: 4,
  },
  {
    codigo: '201', nome: 'Centro – Facens', cor: '#1d4ed8', empresa: 'Demo Transportes',
    paradas: ['centro', 'mercadao', 'sorocabaShopping', 'altoBoaVista', 'facens'],
    intervalos: [15, 20, 30], veiculos: 3,
  },
  {
    codigo: '302', nome: 'São Paulo – Iguatemi (via Campolim)', cor: '#15803d', empresa: 'Demo Urbano',
    paradas: ['tSaoPaulo', 'centro', 'hospitalRegional', 'campolim', 'iguatemi'],
    intervalos: [12, 20, 30], veiculos: 3,
  },
  {
    codigo: '405', nome: 'Centro – Itavuvu', cor: '#7e22ce', empresa: 'Demo Urbano',
    paradas: ['centro', 'rodoviaria', 'avIpanema', 'itavuvu'],
    intervalos: [20, 30, 40], veiculos: 2,
  },
  {
    codigo: '510', nome: 'Santo Antônio – Éden (via Facens)', cor: '#b91c1c', empresa: 'Demo Transportes',
    paradas: ['tSantoAntonio', 'altoBoaVista', 'facens', 'eden'],
    intervalos: [20, 30, 45], veiculos: 2,
  },
  {
    codigo: 'BRT1', nome: 'BRT Vitória Régia – Wanel Ville', cor: '#0e7490', empresa: 'Demo BRT',
    paradas: ['tVitoriaRegia', 'tSaoPaulo', 'centro', 'hospitalRegional', 'wanel'],
    intervalos: [8, 12, 15], veiculos: 4,
  },
];
