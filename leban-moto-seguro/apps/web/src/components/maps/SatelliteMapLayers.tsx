import { TileLayer } from 'react-leaflet';

/**
 * Camada de satélite compartilhada por todos os mapas do sistema.
 *
 * maxNativeZoom informa até onde o servidor possui imagens próprias.
 * Acima desse nível, o Leaflet amplia o último mosaico disponível em vez
 * de solicitar blocos inexistentes e deixar o mapa cinza/em branco.
 */
export function SatelliteMapLayers() {
  return (
    <>
      <style>{`
        .leban-satellite-imagery {
          filter: brightness(1.12) contrast(1.08) saturate(1.1);
        }

        .leban-satellite-labels {
          filter: contrast(1.08);
        }
      `}</style>

      <TileLayer
        attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={19}
        maxZoom={22}
        detectRetina
        className="leban-satellite-imagery"
      />

      <TileLayer
        attribution='Labels &copy; Esri'
        url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={19}
        maxZoom={22}
        pane="overlayPane"
        className="leban-satellite-labels"
      />
    </>
  );
}