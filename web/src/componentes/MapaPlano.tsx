import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coord, Itinerario, Ponto } from '../api';

const CENTRO_SOROCABA: Coord = [-23.497, -47.458];

function Enquadrar({ coords }: { coords: Coord[] }) {
  const mapa = useMap();
  useEffect(() => {
    // Sem animação: evita o erro "_leaflet_pos" ao sair da página no meio dela.
    if (coords.length > 1) mapa.fitBounds(coords, { padding: [40, 40], animate: false });
    else if (coords.length === 1) mapa.setView(coords[0], 15, { animate: false });
  }, [mapa, coords]);
  return null;
}

interface Props {
  origem?: Ponto;
  destino?: Ponto;
  itinerario?: Itinerario;
}

/** Mapa do trajeto escolhido: trechos de ônibus na cor da linha, caminhada tracejada. */
export function MapaPlano({ origem, destino, itinerario }: Props) {
  const coords = useMemo<Coord[]>(() => {
    if (itinerario) return itinerario.trechos.flatMap((t) => t.caminho);
    return [origem, destino].filter((p): p is Ponto => !!p).map((p) => [p.lat, p.lng]);
  }, [itinerario, origem, destino]);

  // Pontos onde a pessoa troca de ônibus (fim de cada trecho, exceto o último).
  const trocas = itinerario?.trechos.slice(0, -1).map((t) => t.caminho.at(-1)!) ?? [];

  return (
    <MapContainer
      center={CENTRO_SOROCABA}
      zoom={13}
      className="mapa"
      aria-label="Mapa do trajeto. O passo a passo em texto está ao lado."
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Enquadrar coords={coords} />

      {itinerario?.trechos.map((t, i) =>
        t.tipo === 'onibus' ? (
          <Polyline key={i} positions={t.caminho} pathOptions={{ color: t.cor, weight: 7, opacity: 0.9 }} />
        ) : (
          <Polyline key={i} positions={t.caminho} pathOptions={{ color: '#374151', weight: 4, dashArray: '6 8' }} />
        ),
      )}

      {trocas.map((c, i) => (
        <CircleMarker key={i} center={c} radius={7} pathOptions={{ color: '#111827', weight: 3, fillColor: '#fff', fillOpacity: 1 }}>
          <Tooltip>Baldeação</Tooltip>
        </CircleMarker>
      ))}
      {origem && (
        <CircleMarker center={[origem.lat, origem.lng]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#15803d', fillOpacity: 1 }}>
          <Tooltip permanent direction="top" offset={[0, -8]}>Origem</Tooltip>
        </CircleMarker>
      )}
      {destino && (
        <CircleMarker center={[destino.lat, destino.lng]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#b91c1c', fillOpacity: 1 }}>
          <Tooltip permanent direction="top" offset={[0, -8]}>Destino</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
