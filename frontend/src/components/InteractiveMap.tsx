import { useState } from 'react'

export interface MapMarkerItem {
  id: string | number
  title: string
  subtitle?: string
  latitude?: number | null
  longitude?: number | null
  address: string
  category: 'storage' | 'buyer' | 'market' | 'farmer' | 'processing'
  badge?: string
  details?: { label: string; value: string }[]
}

interface InteractiveMapProps {
  items: MapMarkerItem[]
  selectedId?: string | number
  onSelectItem?: (item: MapMarkerItem) => void
  centerLatitude?: number
  centerLongitude?: number
  title?: string
}

export default function InteractiveMap({
  items,
  selectedId,
  onSelectItem,
  centerLatitude = 28.367,
  centerLongitude = 79.430,
  title = 'Locations Map View',
}: InteractiveMapProps) {
  // Find currently selected marker or default to first valid marker
  const validItems = items.filter((i) => i.latitude && i.longitude)
  const initialActive = validItems.find((i) => i.id === selectedId) || validItems[0]
  const [activeItem, setActiveItem] = useState<MapMarkerItem | undefined>(initialActive)

  const handleSelect = (item: MapMarkerItem) => {
    setActiveItem(item)
    if (onSelectItem) onSelectItem(item)
  }

  // Generate direct Google Maps directions / search link
  const getGoogleMapsUrl = (item: MapMarkerItem) => {
    if (item.latitude && item.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.title}, ${item.address}`)}`
  }

  const currentCenterLat = activeItem?.latitude || centerLatitude
  const currentCenterLng = activeItem?.longitude || centerLongitude

  // Embedded OpenStreetMap view that renders without any API key restrictions
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${currentCenterLng - 0.25}%2C${currentCenterLat - 0.20}%2C${currentCenterLng + 0.25}%2C${currentCenterLat + 0.20}&layer=mapnik&marker=${currentCenterLat}%2C${currentCenterLng}`

  return (
    <div className="bg-white rounded-2xl border border-soil/10 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-soil/10 flex flex-wrap items-center justify-between gap-3 bg-soil/5">
        <div>
          <h3 className="font-semibold text-soil text-base">{title}</h3>
          <p className="text-xs text-soil/60">
            {validItems.length} locations mapped · Click any pin or card to navigate
          </p>
        </div>
        {activeItem && (
          <a
            href={getGoogleMapsUrl(activeItem)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-leaf text-white text-xs font-medium hover:bg-leaf/90 transition shadow-sm"
          >
            <span>Open in Google Maps ↗</span>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[420px]">
        {/* Map visual viewport */}
        <div className="lg:col-span-2 relative bg-soil/10 min-h-[320px] lg:min-h-[420px]">
          <iframe
            title="Interactive Location Map"
            src={osmEmbedUrl}
            className="w-full h-full min-h-[320px] lg:min-h-[420px] border-0"
            loading="lazy"
          />

          {/* Quick overlay badges on the map */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md border border-soil/10 text-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-leaf animate-pulse" />
            <span className="font-semibold text-soil">{activeItem ? activeItem.title : 'Live Map'}</span>
            {activeItem?.badge && (
              <span className="text-[10px] bg-leaf/15 text-leaf font-bold px-1.5 py-0.5 rounded">
                {activeItem.badge}
              </span>
            )}
          </div>
        </div>

        {/* Location list & selected details */}
        <div className="border-t lg:border-t-0 lg:border-l border-soil/10 p-4 flex flex-col justify-between max-h-[420px] overflow-y-auto">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-soil/50 mb-2">Available Places</p>
            {items.map((item) => {
              const isSelected = activeItem?.id === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`p-3 rounded-xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'border-leaf bg-leaf/5 shadow-xs'
                      : 'border-soil/10 hover:border-soil/30 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-soil leading-snug">{item.title}</p>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-soil/10 text-soil whitespace-nowrap">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-soil/60 mt-0.5">{item.address}</p>

                  {item.details && isSelected && (
                    <div className="mt-2 pt-2 border-t border-soil/10 grid grid-cols-2 gap-1 text-xs">
                      {item.details.map((d, idx) => (
                        <div key={idx}>
                          <span className="text-soil/50 text-[10px] block">{d.label}</span>
                          <span className="font-medium text-soil">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {activeItem && (
            <div className="mt-4 pt-3 border-t border-soil/10">
              <a
                href={getGoogleMapsUrl(activeItem)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-soil text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-soil/90 transition shadow-sm"
              >
                <span>📍 Get Directions in Google Maps</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
