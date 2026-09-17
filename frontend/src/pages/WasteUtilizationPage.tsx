import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { speakText, stopSpeech } from '../services/voice'
import { getWastePageContent } from '../services/wasteTranslations'

export default function WasteUtilizationPage() {
  const { language } = useAuth()
  const data = getWastePageContent(language)

  const [selectedCrop, setSelectedCrop] = useState<string>('tomato')
  const [selectedCondition, setSelectedCondition] = useState<string>('rotten')
  const [quantityQtl, setQuantityQtl] = useState<number>(20)
  const [originalPricePerQtl, setOriginalPricePerQtl] = useState<number>(1200)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Ensure speech synthesis stops if farmer navigates to another page
  useEffect(() => {
    return () => {
      stopSpeech()
    }
  }, [])

  const activeCrop = data.crops.find((c) => c.id === selectedCrop) || data.crops[0]
  const activeCondition = data.conditions.find((c) => c.id === selectedCondition) || data.conditions[0]

  // Recovery calculations
  const totalOriginalValue = quantityQtl * originalPricePerQtl

  // Estimated yields
  // 1 quintal vegetable waste -> ~35 kg vermicompost (sold at ₹10/kg) = ₹350
  const vermicompostKg = Math.round(quantityQtl * 35)
  const vermicompostVal = Math.round(vermicompostKg * 10)

  // 1 quintal silage/cattle feed equivalent -> saves ~40 kg dry feed (worth ~₹18/kg) = ₹720
  const isCattleFeedSafe = selectedCondition !== 'rotten'
  const cattleFeedVal = isCattleFeedSafe ? Math.round(quantityQtl * 650) : 0

  // 1 quintal distillery / industrial bio-mass -> ~₹300 - ₹500/Qtl
  const industrialVal = Math.round(quantityQtl * 450)

  // Best single stream recovery
  const maxRecoverable = Math.max(
    vermicompostVal,
    isCattleFeedSafe ? cattleFeedVal : 0,
    industrialVal
  )
  const recoveryPercentage = totalOriginalValue > 0 ? Math.min(100, Math.round((maxRecoverable / totalOriginalValue) * 100)) : 0

  const handleSpeakPlan = () => {
    if (isSpeaking) {
      stopSpeech()
      setIsSpeaking(false)
      return
    }
    const text = data.speakText(activeCrop.name, activeCondition.label, quantityQtl, maxRecoverable)
    setIsSpeaking(true)
    speakText(
      text,
      language,
      true, // Force speak regardless of tab navigation mute setting
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    )
  }

  const vermiData = data.pathways.vermicompost(vermicompostVal, vermicompostKg)
  const biogasData = data.pathways.biogas(quantityQtl)
  const silageData = data.pathways.silage(isCattleFeedSafe, cattleFeedVal)
  const bioenzymeData = data.pathways.bioenzyme()
  const distilleryData = data.pathways.distillery(industrialVal)

  return (
    <Layout>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-green-800 text-white rounded-2xl p-5 md:p-7 mb-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
              {data.bannerBadge}
            </div>
            <h1 className="text-2xl md:text-3xl font-black">
              {data.bannerTitle}
            </h1>
            <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
              {data.bannerSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeakPlan}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition flex items-center gap-2 ${
                isSpeaking
                  ? 'bg-amber-400 text-amber-950 animate-pulse ring-2 ring-white shadow-lg'
                  : 'bg-white text-emerald-900 hover:bg-emerald-50'
              }`}
            >
              <span>{isSpeaking ? '⏹️' : '🔊'}</span>
              <span>{isSpeaking ? (language === 'hi' ? 'बोलना बंद करें' : 'Stop Audio') : data.listenBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 1: Select Crop */}
      <div className="bg-white rounded-2xl border border-soil/10 p-5 mb-6 shadow-sm">
        <h2 className="text-base md:text-lg font-bold text-soil mb-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-leaf text-white text-xs flex items-center justify-center font-bold">1</span>
          {data.step1Title}
        </h2>
        <p className="text-xs text-soil/60 mb-4">
          {data.step1Subtitle}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {data.crops.map((c) => {
            const isSelected = c.id === selectedCrop
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCrop(c.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center justify-center text-center gap-1.5 ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-soil/15 bg-sand/20 hover:border-leaf/50 hover:bg-white'
                }`}
              >
                <span className="text-3xl">{c.icon}</span>
                <span className="font-bold text-xs text-soil">{c.name}</span>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-full">
                  {c.spoilageRate}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Select Damage / Spoilage Condition */}
      <div className="bg-white rounded-2xl border border-soil/10 p-5 mb-6 shadow-sm">
        <h2 className="text-base md:text-lg font-bold text-soil mb-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-leaf text-white text-xs flex items-center justify-center font-bold">2</span>
          {data.step2Title}
        </h2>
        <p className="text-xs text-soil/60 mb-4">
          {data.step2Subtitle}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.conditions.map((cond) => {
            const isSelected = cond.id === selectedCondition
            return (
              <button
                key={cond.id}
                onClick={() => setSelectedCondition(cond.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-leaf bg-emerald-50/80 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-soil/15 bg-sand/15 hover:border-soil/30 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl">{cond.icon}</span>
                  <span className="font-bold text-sm text-soil">{cond.label}</span>
                </div>
                <p className="text-xs text-soil/70 mt-1.5 leading-relaxed">
                  {cond.desc}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 3: Interactive Loss Recovery Calculator */}
      <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-white rounded-2xl border-2 border-amber-300/60 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h2 className="text-base md:text-lg font-bold text-soil flex items-center gap-2">
              <span className="text-xl">🧮</span>
              {data.calcTitle}
            </h2>
            <p className="text-xs text-soil/60">
              {data.calcSubtitle}
            </p>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-3 py-1 rounded-full">
            {data.calcBadge(recoveryPercentage)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-soil mb-1">
              {data.calcQtyLabel}
            </label>
            <input
              type="number"
              min="1"
              value={quantityQtl}
              onChange={(e) => setQuantityQtl(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-white border border-soil/20 rounded-xl px-3 py-2 text-sm font-bold text-soil focus:outline-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-soil mb-1">
              {data.calcRateLabel}
            </label>
            <input
              type="number"
              min="100"
              step="50"
              value={originalPricePerQtl}
              onChange={(e) => setOriginalPricePerQtl(Math.max(100, Number(e.target.value) || 100))}
              className="w-full bg-white border border-soil/20 rounded-xl px-3 py-2 text-sm font-bold text-soil focus:outline-emerald-600"
            />
          </div>

          <div className="bg-white/90 border border-soil/10 rounded-xl p-3 shadow-xs">
            <p className="text-[11px] font-semibold text-soil/50">
              {data.calcRiskTitle}
            </p>
            <p className="text-xl font-black text-rose-700 mt-1">₹{totalOriginalValue.toLocaleString()}</p>
            <p className="text-[10px] text-soil/50">
              {data.calcRiskSub}
            </p>
          </div>

          <div className="bg-emerald-100/90 border border-emerald-300 rounded-xl p-3 shadow-xs">
            <p className="text-[11px] font-bold text-emerald-900">
              {data.calcRecovTitle}
            </p>
            <p className="text-xl font-black text-emerald-800 mt-1">₹{maxRecoverable.toLocaleString()}</p>
            <p className="text-[10px] font-semibold text-emerald-700">
              {data.calcRecovSub(recoveryPercentage)}
            </p>
          </div>
        </div>
      </div>

      {/* Step 4: Recommended Wealth Utilization Pathways */}
      <div className="space-y-4 mb-6">
        <h2 className="text-lg font-bold text-soil flex items-center gap-2">
          <span>🌿</span>
          {data.pathwaysHeading(activeCrop.name, activeCondition.label)}
        </h2>

        {/* 1. Vermicompost */}
        <div className="bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:border-emerald-500/40 transition">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🪱</span>
              <div>
                <h3 className="font-bold text-base text-soil">
                  {vermiData.title}
                </h3>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {vermiData.badge}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">
                {vermiData.valueLabel}
              </p>
              <p className="text-base font-black text-emerald-800">
                ₹{vermicompostVal.toLocaleString()} ({vermicompostKg} kg)
              </p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-sand/20 p-3.5 rounded-xl">
            {vermiData.bullets.map((b, idx) => (
              <p key={idx}>{b}</p>
            ))}
          </div>
        </div>

        {/* 2. Biogas & CBG Plant */}
        <div className="bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:border-teal-500/40 transition">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">⚡</span>
              <div>
                <h3 className="font-bold text-base text-soil">
                  {biogasData.title}
                </h3>
                <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                  {biogasData.badge}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">
                {biogasData.valueLabel}
              </p>
              <p className="text-base font-black text-teal-800">
                ~{Math.round(quantityQtl * 22)} m³ (₹{Math.round(quantityQtl * 320)})
              </p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-teal-50/30 p-3.5 rounded-xl border border-teal-100">
            {biogasData.bullets.map((b, idx) => (
              <p key={idx}>{b}</p>
            ))}
          </div>
        </div>

        {/* 3. Livestock Feed Silage (Condition-dependent) */}
        <div className={`bg-white rounded-2xl border p-5 shadow-sm transition ${
          isCattleFeedSafe ? 'border-soil/10 hover:border-blue-500/40' : 'border-rose-200 bg-rose-50/30'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">{isCattleFeedSafe ? '🐄' : '⚠️'}</span>
              <div>
                <h3 className="font-bold text-base text-soil">
                  {silageData.title}
                </h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  isCattleFeedSafe ? 'text-blue-800 bg-blue-50' : 'text-rose-800 bg-rose-100'
                }`}>
                  {silageData.badge}
                </span>
              </div>
            </div>
            {isCattleFeedSafe && (
              <div className="text-right">
                <p className="text-xs font-semibold text-soil/50">
                  {silageData.valueLabel}
                </p>
                <p className="text-base font-black text-blue-900">
                  ₹{cattleFeedVal.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-sand/20 p-3.5 rounded-xl">
            {silageData.bullets.map((b, idx) => (
              <p key={idx} className={!isCattleFeedSafe ? 'text-rose-800 font-semibold' : ''}>
                {b}
              </p>
            ))}
          </div>
        </div>

        {/* 4. Bio-Enzyme Tonic Spray */}
        <div className="bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:border-purple-500/40 transition">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🧪</span>
              <div>
                <h3 className="font-bold text-base text-soil">
                  {bioenzymeData.title}
                </h3>
                <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded">
                  {bioenzymeData.badge}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">
                {bioenzymeData.valueLabel}
              </p>
              <p className="text-base font-black text-purple-900">
                ₹300 - ₹500 / L
              </p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-purple-50/30 p-3.5 rounded-xl border border-purple-100">
            {bioenzymeData.bullets.map((b, idx) => (
              <p key={idx}>{b}</p>
            ))}
          </div>
        </div>

        {/* 5. Distillery / Bio-Ethanol Procurement */}
        <div className="bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:border-amber-500/40 transition">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🏭</span>
              <div>
                <h3 className="font-bold text-base text-soil">
                  {distilleryData.title}
                </h3>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                  {distilleryData.badge}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">
                {distilleryData.valueLabel}
              </p>
              <p className="text-base font-black text-amber-900">
                ₹{industrialVal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-amber-50/30 p-3.5 rounded-xl border border-amber-100">
            {distilleryData.bullets.map((b, idx) => (
              <p key={idx}>{b}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Buttons for Farmer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to="/processing"
          className="p-4 rounded-xl bg-white border border-soil/20 hover:border-leaf hover:bg-emerald-50/40 transition-all text-center flex flex-col items-center justify-center shadow-xs"
        >
          <span className="text-2xl mb-1">🏭</span>
          <span className="font-bold text-sm text-soil">
            {data.bottomLinks.processing.title}
          </span>
          <span className="text-xs text-soil/60 mt-0.5">
            {data.bottomLinks.processing.sub}
          </span>
        </Link>

        <Link
          to="/assistant"
          className="p-4 rounded-xl bg-white border border-soil/20 hover:border-leaf hover:bg-emerald-50/40 transition-all text-center flex flex-col items-center justify-center shadow-xs"
        >
          <span className="text-2xl mb-1">🩺</span>
          <span className="font-bold text-sm text-soil">
            {data.bottomLinks.assistant.title}
          </span>
          <span className="text-xs text-soil/60 mt-0.5">
            {data.bottomLinks.assistant.sub}
          </span>
        </Link>

        <Link
          to="/storage"
          className="p-4 rounded-xl bg-white border border-soil/20 hover:border-leaf hover:bg-emerald-50/40 transition-all text-center flex flex-col items-center justify-center shadow-xs"
        >
          <span className="text-2xl mb-1">❄️</span>
          <span className="font-bold text-sm text-soil">
            {data.bottomLinks.storage.title}
          </span>
          <span className="text-xs text-soil/60 mt-0.5">
            {data.bottomLinks.storage.sub}
          </span>
        </Link>
      </div>
    </Layout>
  )
}
