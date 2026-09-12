import { NextCropPrediction } from '../api/client'

interface NextCropPredictionCardProps {
  prediction: NextCropPrediction
  harvestedCrop?: string
}

export default function NextCropPredictionCard({
  prediction,
  harvestedCrop,
}: NextCropPredictionCardProps) {
  const getWaterBadgeColor = (need: string) => {
    switch (need.toLowerCase()) {
      case 'low':
        return 'bg-emerald-100 text-emerald-800'
      case 'medium':
        return 'bg-amber-100 text-amber-800'
      case 'high':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-soil/10 text-soil'
    }
  }

  const getRoiBadgeColor = (roi: string) => {
    switch (roi.toLowerCase()) {
      case 'very high':
        return 'bg-leaf/20 text-leaf font-bold'
      case 'high':
        return 'bg-emerald-100 text-emerald-800 font-semibold'
      default:
        return 'bg-soil/10 text-soil'
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-leaf/30 shadow-sm overflow-hidden p-5 md:p-6 mb-6 relative">
      {/* Top Banner Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-leaf text-white shadow-xs">
            🌱 Next Crop Prediction
          </span>
          {harvestedCrop && (
            <span className="text-xs text-soil/60">
              Optimal follow-up after {harvestedCrop}
            </span>
          )}
        </div>
        <span className="text-xs text-soil/50 bg-soil/5 px-2.5 py-1 rounded-lg">
          Benchmark: {prediction.benchmark_mandi}
        </span>
      </div>

      {/* Main Title & Key Numbers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-soil/10">
        <div>
          <h3 className="text-2xl font-bold text-soil">{prediction.crop_name}</h3>
          <p className="text-sm text-leaf font-medium">Variety: {prediction.variety} · Season: {prediction.season}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-leaf/10 rounded-xl p-3 text-right">
            <span className="text-[11px] uppercase tracking-wider text-soil/60 block">Est. Profit / Acre</span>
            <span className="text-xl font-bold text-leaf">₹{prediction.estimated_profit_per_acre.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-soil/5 rounded-xl p-3 text-right">
            <span className="text-[11px] uppercase tracking-wider text-soil/60 block">Mandi Rate</span>
            <span className="text-lg font-semibold text-soil">₹{prediction.estimated_modal_price.toLocaleString('en-IN')}/qtl</span>
          </div>
        </div>
      </div>

      {/* Badges & Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4 border-b border-soil/10 text-xs">
        <div className="p-2.5 rounded-xl bg-soil/5">
          <span className="text-soil/50 block mb-0.5">Water Requirement</span>
          <span className={`inline-block px-2 py-0.5 rounded font-semibold ${getWaterBadgeColor(prediction.water_need)}`}>
            {prediction.water_need} Water
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-soil/5">
          <span className="text-soil/50 block mb-0.5">ROI Potential</span>
          <span className={`inline-block px-2 py-0.5 rounded ${getRoiBadgeColor(prediction.roi_potential)}`}>
            {prediction.roi_potential} ROI
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-soil/5">
          <span className="text-soil/50 block mb-0.5">Expected Yield</span>
          <span className="font-semibold text-soil block">{prediction.expected_yield_per_acre}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-soil/5">
          <span className="text-soil/50 block mb-0.5">Est. Cost / Acre</span>
          <span className="font-semibold text-soil block">₹{prediction.estimated_cost_per_acre.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Rotation Benefit & AI Advisory */}
      <div className="mt-4 space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-soil/70 mb-1">
            🌿 Soil & Agronomic Crop Rotation Benefit
          </h4>
          <p className="text-sm text-soil/80 leading-relaxed bg-soil/5 p-3 rounded-xl">
            {prediction.rotation_benefit}
          </p>
        </div>

        {prediction.ai_advisory && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-leaf mb-1 flex items-center gap-1.5">
              <span>🤖 AI Agronomist Advisory</span>
            </h4>
            <p className="text-sm text-soil/90 leading-relaxed bg-leaf/10 p-3 rounded-xl border border-leaf/20 font-medium">
              "{prediction.ai_advisory}"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
