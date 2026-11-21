import { useEffect } from 'react'
import { TileLayer, useMap } from 'react-leaflet'
import { TILE_URL, TILE_ATTR, TILE_NATIVE } from './mapStyle'

export default function MapTiles() {
  const map = useMap()
  useEffect(() => {
    if (map.attributionControl) map.attributionControl.setPrefix(false)
  }, [map])
  return <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxNativeZoom={TILE_NATIVE} maxZoom={20} />
}
