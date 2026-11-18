import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LinhaDetalhe, Ponto, PosicaoVeiculo } from '../api';

const CENTRO_SOROCABA: [number, number] = [-23.497, -47.458];

interface Props {
  linhas: LinhaDetalhe[];
  pontos: Ponto[];
  veiculos: PosicaoVeiculo[];
  visiveis: Set<number>;
  selecionada: number | null;
  /** Enquadra o mapa nas linhas visíveis (usado na página de uma linha). */
  enquadrar?: boolean;
  className?: string;
}

function Enquadrar({ coords }: { coords: [number, number][] }) {
  const mapa = useMap();
  useEffect(() => {
    // Sem animação: se a pessoa sair da página no meio da animação, o Leaflet
    // tenta mexer num mapa que já não existe (erro "_leaflet_pos").
    if (coords.length > 1) mapa.fitBounds(coords, { padding: [30, 30], animate: false });
  }, [mapa, coords]);
  return null;
}

// Cache de ícones: recriar o ícone a cada atualização (2 s) faria o marcador piscar.
const cacheIcones = new Map<string, L.DivIcon>();
function iconeOnibus(codigo: string, cor: string, acessivel: boolean) {
  const chave = `${codigo}|${cor}|${acessivel}`;
  let icone = cacheIcones.get(chave);
  if (!icone) {
    icone = L.divIcon({
      className: 'marcador-onibus',
      html: `<span class="placa" style="--cor:${cor}">${codigo}${
        acessivel ? '<span class="selo-acessivel" aria-hidden="true">♿</span>' : ''
      }</span>`,
      iconSize: [48, 26],
      iconAnchor: [24, 13],
    });
    cacheIcones.set(chave, icone);
  }
  return icone;
}

export function MapaFrota({ linhas, pontos, veiculos, visiveis, selecionada, enquadrar, className }: Props) {
  const porId = useMemo(() => new Map(linhas.map((l) => [l.id, l])), [linhas]);
  const coordsVisiveis = useMemo(
    () => linhas.filter((l) => visiveis.has(l.id)).flatMap((l) => l.trajeto),
    [linhas, visiveis],
  );

  return (
    <MapContainer
      center={CENTRO_SOROCABA}
      zoom={13}
      className={className ?? 'mapa'}
      // O mapa sozinho não é acessível a leitores de tela; a tabela ao lado
      // traz as mesmas informações em texto (ver PaginaMapa).
      aria-label="Mapa com a posição dos ônibus. As mesmas informações estão na lista ao lado."
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {enquadrar && <Enquadrar coords={coordsVisiveis} />}

      {linhas.filter((l) => visiveis.has(l.id)).map((l) => {
        const destaque = selecionada === null || selecionada === l.id;
        return (
          <Polyline
            key={l.id}
            positions={l.trajeto}
            pathOptions={{ color: l.cor, weight: destaque ? 6 : 3, opacity: destaque ? 0.85 : 0.3 }}
          />
        );
      })}

      {pontos.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={p.acessivel ? 8 : 6}
          pathOptions={{
            color: '#1f2937',
            weight: 2,
            fillColor: p.acessivel ? '#0b5cad' : '#ffffff',
            fillOpacity: 1,
          }}
        >
          <Popup>
            <strong>{p.nome}</strong>
            <br />
            Linhas: {p.linhas.join(', ')}
            <br />
            {p.acessivel ? '♿ Ponto acessível' : 'Ponto sem acessibilidade informada'}
            {p.coberto && <><br />Ponto coberto</>}
            <br />
            <Link to={`/pontos/${p.id}`}>Ver previsão de chegada</Link>
          </Popup>
        </CircleMarker>
      ))}

      {veiculos.filter((v) => visiveis.has(v.linhaId)).map((v) => {
        const linha = porId.get(v.linhaId);
        if (!linha) return null;
        return (
          <Marker
            key={v.veiculoId}
            position={[v.lat, v.lng]}
            icon={iconeOnibus(linha.codigo, linha.cor, v.acessivel)}
            title={`Ônibus ${v.prefixo}, linha ${linha.codigo}`}
            zIndexOffset={selecionada === v.linhaId ? 1000 : 0}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              Linha {linha.codigo} · ônibus {v.prefixo}
              {v.acessivel ? ' · acessível' : ''} · {v.velocidadeKmh} km/h
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
