import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { speakText } from '../services/voice'

interface CropOption {
  id: string
  name: string
  nameHi: string
  icon: string
  spoilageRate: string
  spoilageRateHi: string
  primaryStreams: string[]
}

const CROPS: CropOption[] = [
  {
    id: 'tomato',
    name: 'Tomato',
    nameHi: 'टमाटर',
    icon: '🍅',
    spoilageRate: '25-35%',
    spoilageRateHi: '25-35%',
    primaryStreams: ['vermicompost', 'bioenzyme', 'biogas'],
  },
  {
    id: 'potato',
    name: 'Potato',
    nameHi: 'आलू',
    icon: '🥔',
    spoilageRate: '15-20%',
    spoilageRateHi: '15-20%',
    primaryStreams: ['distillery', 'cattlefeed', 'biogas', 'vermicompost'],
  },
  {
    id: 'onion',
    name: 'Onion & Garlic',
    nameHi: 'प्याज और लहसुन',
    icon: '🧅',
    spoilageRate: '20-30%',
    spoilageRateHi: '20-30%',
    primaryStreams: ['vermicompost', 'bioenzyme'],
  },
  {
    id: 'fruits',
    name: 'Mango & Citrus Fruits',
    nameHi: 'आम, संतरा व फल',
    icon: '🥭',
    spoilageRate: '25-40%',
    spoilageRateHi: '25-40%',
    primaryStreams: ['bioenzyme', 'cattlefeed', 'vermicompost', 'biogas'],
  },
  {
    id: 'greens',
    name: 'Cabbage & Leafy Greens',
    nameHi: 'पत्तागोभी व हरी सब्जियां',
    icon: '🥬',
    spoilageRate: '30-45%',
    spoilageRateHi: '30-45%',
    primaryStreams: ['cattlefeed', 'vermicompost', 'biogas'],
  },
  {
    id: 'maize',
    name: 'Maize & Coarse Grains',
    nameHi: 'मक्का और मोटा अनाज',
    icon: '🌽',
    spoilageRate: '10-15%',
    spoilageRateHi: '10-15%',
    primaryStreams: ['distillery', 'cattlefeed', 'biogas'],
  },
  {
    id: 'stubble',
    name: 'Paddy & Wheat Stubble',
    nameHi: 'पराली, डंठल व भूसा',
    icon: '🌾',
    spoilageRate: 'Harvest Waste',
    spoilageRateHi: 'फसल अपशिष्ट',
    primaryStreams: ['vermicompost', 'biogas', 'biochar'],
  },
]

interface ConditionOption {
  id: string
  label: string
  labelHi: string
  icon: string
  descEn: string
  descHi: string
}

const CONDITIONS: ConditionOption[] = [
  {
    id: 'rotten',
    label: 'Rotten / Fungal Spoilage',
    labelHi: 'सड़ी या फफूंद लगी फसल',
    icon: '🟤',
    descEn: 'Fungal rot or foul odor. Do NOT feed to livestock; ideal for vermicomposting & biogas.',
    descHi: 'फंगल सड़ांध या बदबूदार सड़न (पशुओं को न खिलाएं; केंचुआ खाद और बायोगैस के लिए उत्तम)।',
  },
  {
    id: 'unsold',
    label: 'Overripe / Unsold Glut',
    labelHi: 'ज्यादा पकी या मंडी में बिना बिकी',
    icon: '🟡',
    descEn: 'Fresh produce overripe or unsold due to market price drop. Ideal for silage, processing, pulp, or drying.',
    descHi: 'ताजी लेकिन अधिक पकी या भाव न मिलने के कारण बची फसल (साइलेज, पल्प व प्रसंस्करण के लिए उत्तम)।',
  },
  {
    id: 'damaged',
    label: 'Hailstorm / Pest Damaged',
    labelHi: 'ओलावृष्टि या कीट से दागदार',
    icon: '🟠',
    descEn: 'Cosmetically bruised or marked but internally safe. Excellent for agro-processing and livestock feed.',
    descHi: 'दिखने में कटी-फटी या दागदार लेकिन आंतरिक रूप से सुरक्षित उपज (प्रसंस्करण व पशु आहार के लिए उपयुक्त)।',
  },
  {
    id: 'residue',
    label: 'Crop Residue / Peels / Pomace',
    labelHi: 'छिलके, डंठल व प्रसंस्करण अपशिष्ट',
    icon: '🟢',
    descEn: 'Organic residue left after harvesting or grading. Ideal for composting and bio-enzyme tonics.',
    descHi: 'फसल कटाई या ग्रेडिंग के बाद बचा जैविक कचरा (खाद और बायो-एंजाइम स्प्रे के लिए उपयुक्त)।',
  },
]

export default function WasteUtilizationPage() {
  const { language } = useAuth()
  const isEn = language === 'en'

  const [selectedCrop, setSelectedCrop] = useState<string>('tomato')
  const [selectedCondition, setSelectedCondition] = useState<string>('rotten')
  const [quantityQtl, setQuantityQtl] = useState<number>(20)
  const [originalPricePerQtl, setOriginalPricePerQtl] = useState<number>(1200)

  const activeCrop = CROPS.find((c) => c.id === selectedCrop) || CROPS[0]
  const activeCondition = CONDITIONS.find((c) => c.id === selectedCondition) || CONDITIONS[0]

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
    const text = isEn
      ? `For ${activeCrop.name} with ${activeCondition.label}, recommended solutions are vermicomposting and biogas. From your ${quantityQtl} quintals, you can recover around ${maxRecoverable} rupees value instead of total loss.`
      : `${activeCrop.nameHi} की ${activeCondition.labelHi} के लिए सर्वोत्तम विकल्प केंचुआ खाद और बायोगैस उत्पादन है। आपके ${quantityQtl} क्विंटल से लगभग ${vermicompostVal} रुपये मूल्य की केंचुआ खाद या पशु आहार बचत प्राप्त हो सकती है।`
    speakText(text, language)
  }

  return (
    <Layout>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-green-800 text-white rounded-2xl p-5 md:p-7 mb-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>♻️</span> {isEn ? 'Waste to Wealth Solutions' : 'वेस्ट टू वेल्थ | Waste to Wealth'}
            </div>
            <h1 className="text-2xl md:text-3xl font-black">
              {isEn ? 'Crop Residue & Spoilage Solutions' : 'फसल अपशिष्ट व खराबी समाधान'}
            </h1>
            <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
              {isEn
                ? 'Never dump spoiled, damaged, or unsold harvest on roads. Turn losses into revenue through vermicompost, biogas, livestock silage, or bio-enzymes.'
                : 'सड़ी, दागदार या बिना बिकी फसल को सड़क पर फेंकने की जरूरत नहीं है। इसे जैविक खाद, बायोगैस, पशु आहार या बायो-एंजाइम में बदलकर नुकसान को कमाई में बदलें।'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeakPlan}
              className="bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition flex items-center gap-2"
            >
              <span>🔊</span>
              <span>{isEn ? 'Listen Solution' : 'समाधान सुनें'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 1: Select Crop */}
      <div className="bg-white rounded-2xl border border-soil/10 p-5 mb-6 shadow-sm">
        <h2 className="text-base md:text-lg font-bold text-soil mb-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-leaf text-white text-xs flex items-center justify-center font-bold">1</span>
          {isEn ? 'Which crop is spoiled or left as residue?' : 'आपकी कौन सी फसल खराब या अवशेष के रूप में है?'}
        </h2>
        <p className="text-xs text-soil/60 mb-4">
          {isEn
            ? 'Each crop has distinct chemical characteristics (sugar, starch, moisture) that determine its optimal recovery method.'
            : 'प्रत्येक फसल की रासायनिक संरचना (शर्करा, स्टार्च, नमी) के अनुसार उपयोग विधि अलग होती है।'}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {CROPS.map((c) => {
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
                <span className="font-bold text-xs text-soil">{isEn ? c.name : c.nameHi}</span>
                {!isEn && <span className="text-[10px] text-soil/50">{c.name}</span>}
                <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded-full">
                  {isEn ? `Loss: ${c.spoilageRate}` : `खराबी: ${c.spoilageRateHi}`}
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
          {isEn ? 'What is the current damage condition?' : 'फसल की वर्तमान स्थिति क्या है?'}
        </h2>
        <p className="text-xs text-soil/60 mb-4">
          {isEn
            ? 'Mold-infected crops cannot be fed to livestock, but can be safely converted into organic compost and biogas.'
            : 'फफूंद लगी फसल को पशुओं को नहीं खिलाया जा सकता, लेकिन खाद और बायोगैस में इस्तेमाल हो सकती है।'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CONDITIONS.map((cond) => {
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
                  <span className="font-bold text-sm text-soil">{isEn ? cond.label : cond.labelHi}</span>
                </div>
                {!isEn && <p className="text-[11px] text-soil/50 font-medium">{cond.label}</p>}
                <p className="text-xs text-soil/70 mt-1.5 leading-relaxed">
                  {isEn ? cond.descEn : cond.descHi}
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
              {isEn ? 'Loss Recovery Calculator' : 'नुकसान वसूली कैलकुलेटर (Loss Recovery Calculator)'}
            </h2>
            <p className="text-xs text-soil/60">
              {isEn
                ? 'Enter your spoiled crop quantity and normal market rate to see how much monetary value can be salvaged.'
                : 'अपनी खराब/बची फसल की मात्रा दर्ज करें और देखें कि अपशिष्ट प्रबंधन से कितनी राशि वापस मिल सकती है।'}
            </p>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-3 py-1 rounded-full">
            {isEn
              ? `💡 Recover up to ${recoveryPercentage}% instead of 100% loss`
              : `💡 0% शून्य नुकसान के बदले ${recoveryPercentage}% तक वसूली`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-soil mb-1">
              {isEn ? 'Quantity (in Quintals)' : 'मात्रा (क्विंटल में)'}
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
              {isEn ? 'Normal Mandi Rate (₹ / Qtl)' : 'अनुमानित मंडी भाव (₹ / क्विंटल)'}
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
              {isEn ? 'Total Value at Risk' : 'फसल का कुल मूल्य (Total at Risk)'}
            </p>
            <p className="text-xl font-black text-rose-700 mt-1">₹{totalOriginalValue.toLocaleString()}</p>
            <p className="text-[10px] text-soil/50">
              {isEn ? '100% loss if dumped on roads' : 'फेंकने पर यह 100% शून्य नुकसान होता'}
            </p>
          </div>

          <div className="bg-emerald-100/90 border border-emerald-300 rounded-xl p-3 shadow-xs">
            <p className="text-[11px] font-bold text-emerald-900">
              {isEn ? 'Recoverable Economic Value' : 'वसूली योग्य मूल्य (Recoverable Value)'}
            </p>
            <p className="text-xl font-black text-emerald-800 mt-1">₹{maxRecoverable.toLocaleString()}</p>
            <p className="text-[10px] font-semibold text-emerald-700">
              {isEn
                ? `~${recoveryPercentage}% economic value salvaged`
                : `लगभग ${recoveryPercentage}% आर्थिक मूल्य वापस मिला`}
            </p>
          </div>
        </div>
      </div>

      {/* Step 4: Recommended Wealth Utilization Pathways */}
      <div className="space-y-4 mb-6">
        <h2 className="text-lg font-bold text-soil flex items-center gap-2">
          <span>🌿</span>
          {isEn
            ? `5 Recovery Pathways for ${activeCrop.name} (${activeCondition.label}):`
            : `${activeCrop.nameHi} (${activeCondition.labelHi}) के लिए 5 उपयोगी रास्ते:`}
        </h2>

        {/* 1. Vermicompost */}
        <div className="bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:border-emerald-500/40 transition">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🪱</span>
              <div>
                <h3 className="font-bold text-base text-soil">
                  {isEn
                    ? '1. Vermicompost & Organic Fertilizer'
                    : '1. केंचुआ खाद और जैविक कम्पोस्ट (Vermicompost & Bio-Fertilizer)'}
                </h3>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {isEn ? 'Highest Organic Value • Ready in 45-60 Days' : 'सर्वश्रेष्ठ जैविक मूल्य • 45-60 दिन में तैयार'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">
                {isEn ? 'Estimated Income / Savings:' : 'संभावित आय / बचत:'}
              </p>
              <p className="text-base font-black text-emerald-800">
                {isEn
                  ? `₹${vermicompostVal.toLocaleString()} (${vermicompostKg} kg compost)`
                  : `₹${vermicompostVal.toLocaleString()} (${vermicompostKg} किग्रा खाद)`}
              </p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-sand/20 p-3.5 rounded-xl">
            <p>
              <strong>{isEn ? 'Method: ' : 'विधि: '}</strong>
              {isEn
                ? 'Chop spoiled crop to 2-3 inches and mix with dry leaves or paddy/wheat straw (carbon ratio). Spray with 20% cow dung slurry to neutralize odor and accelerate aerobic breakdown.'
                : 'खराब फसल को 2-3 इंच काटकर सूखे पत्तों या धान/गेहूं के भूसे (कार्बन) के साथ मिलाएं। इसमें 20% पुराना गोबर का घोल छिड़कें ताकि दुर्गंध खत्म हो।'}
            </p>
            <p>
              <strong>{isEn ? 'Earthworms: ' : 'केंचुआ मिलाना: '}</strong>
              {isEn
                ? 'After 10-12 days when thermophilic heat subsides, introduce 1 kg Eisenia foetida earthworms per square meter bed.'
                : '10-12 दिन बाद जब प्रारंभिक तापमान सामान्य हो जाए, तो प्रति वर्ग मीटर 1 किग्रा Eisenia foetida केंचुए डालें।'}
            </p>
            <p>
              <strong>{isEn ? 'Economic Benefit: ' : 'लाभ: '}</strong>
              {isEn
                ? 'Sells at ₹8-₹12 per kg to local nurseries, or use on your own farm to replace chemical fertilizer (DAP/Urea), saving ₹4,000-₹6,000 per acre.'
                : '₹8-₹12 प्रति किग्रा बाजार में बिकता है, अथवा अपने खेत में डालकर रासायनिक खाद (DAP/यूरिया) पर प्रति एकड़ ₹4,000-₹6,000 की बचत करें।'}
            </p>
          </div>
        </div>

        {/* 2. Biogas & CBG Plant */}
        <div className="bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:border-teal-500/40 transition">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">⚡</span>
              <div>
                <h3 className="font-bold text-base text-soil">
                  {isEn
                    ? '2. Rural Biogas & Compressed Bio-Gas (SATAT Scheme)'
                    : '2. ग्रामीण बायोगैस व कंप्रेस्ड बायो-गैस (Biogas & SATAT Scheme)'}
                </h3>
                <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                  {isEn ? 'Cooking Fuel + Liquid Bio-Fertilizer (Slurry)' : 'रसोई गैस + तरल जैविक खाद (Slurry)'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">
                {isEn ? 'Biomethane Potential:' : 'बायोमीथेन क्षमता:'}
              </p>
              <p className="text-base font-black text-teal-800">
                {isEn
                  ? `~${Math.round(quantityQtl * 22)} m³ gas (₹${Math.round(quantityQtl * 320)} value)`
                  : `~${Math.round(quantityQtl * 22)} m³ गैस (₹${Math.round(quantityQtl * 320)} मूल्य)`}
              </p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-teal-50/30 p-3.5 rounded-xl border border-teal-100">
            <p>
              <strong>{isEn ? 'Suitability: ' : 'उपयोगिता: '}</strong>
              {isEn
                ? 'Rotten potatoes, tomatoes, bagasse, and overripe fruits contain high soluble sugars that digest quickly to produce rich methane fuel.'
                : 'सड़े हुए आलू, टमाटर, गन्ने की खोई और अधिक पके फलों में उच्च शर्करा होती है, जो बायोगैस संयंत्र में तेजी से मिथेन गैस बनाती है।'}
            </p>
            <p>
              <strong>{isEn ? 'Government Scheme: ' : 'सरकारी योजना: '}</strong>
              {isEn
                ? 'Under the GOBAR-DHAN scheme, farmers and village clusters can get financial assistance up to ₹50,000 for setting up biogas digesters.'
                : "'गोवर्धन' (GOBAR-DHAN) योजना के तहत बायोगैस डाइजेस्टर लगाने पर 50,000 रुपये तक की सरकारी सहायता मिलती है।"}
            </p>
            <p>
              <strong>{isEn ? 'Slurry Utilization: ' : 'स्लरी का उपयोग: '}</strong>
              {isEn
                ? 'Digestate effluent slurry is packed with readily available nitrogen and phosphorus. Feed directly into drip lines or flood channels.'
                : 'बायोगैस से निकलने वाली तरल स्लरी नाइट्रोजन और फास्फोरस से भरपूर होती है; इसे सीधे ड्रिप या खुले पानी के साथ खेत में दें।'}
            </p>
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
                  {isEn ? '3. Livestock Feed & Fermented Silage' : '3. पशु आहार व साइलेज (Livestock Feed Silage)'}
                </h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  isCattleFeedSafe ? 'text-blue-800 bg-blue-50' : 'text-rose-800 bg-rose-100'
                }`}>
                  {isCattleFeedSafe
                    ? (isEn ? 'Nutritious for Dairy Cattle' : 'दुधारू पशुओं के लिए पौष्टिक')
                    : (isEn ? '⛔ Do NOT Feed Mold-Infected Crops to Cattle' : '⛔ फफूंद वाली फसल पशुओं को न दें')}
                </span>
              </div>
            </div>
            {isCattleFeedSafe && (
              <div className="text-right">
                <p className="text-xs font-semibold text-soil/50">
                  {isEn ? 'Feed Cost Savings:' : 'पशु आहार बचत:'}
                </p>
                <p className="text-base font-black text-blue-900">
                  {isEn
                    ? `₹${cattleFeedVal.toLocaleString()} (Saved on commercial feed)`
                    : `₹${cattleFeedVal.toLocaleString()} (व्यावसायिक चारे पर बचत)`}
                </p>
              </div>
            )}
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-sand/20 p-3.5 rounded-xl">
            {isCattleFeedSafe ? (
              <>
                <p>
                  <strong>{isEn ? 'Suitability: ' : 'उपयुक्तता: '}</strong>
                  {isEn
                    ? 'Overripe tomatoes, potatoes, cabbage, greens, and unsold sweet seasonal fruits.'
                    : 'अतिरिक्त पके टमाटर, आलू, गाजर, पत्तागोभी या बिना बिके मीठे फल।'}
                </p>
                <p>
                  <strong>{isEn ? 'Silage Process: ' : 'साइलेज प्रक्रिया: '}</strong>
                  {isEn
                    ? 'Sun-dry sliced crop pieces for 1-2 days to bring moisture down to 60%. Mix with 1% jaggery solution and 0.5% salt, then pack airtight in plastic silage bags or trench pits for 30 days.'
                    : 'टुकड़ों को 1-2 दिन धूप में सुखाकर नमी 60% पर लाएं। 1% गुड़ का पानी और 0.5% नमक मिलाकर प्लास्टिक साइलेज बैग या गड्ढे में हवा बंद करके 30 दिन रखें।'}
                </p>
                <p>
                  <strong>{isEn ? 'Benefits: ' : 'लाभ: '}</strong>
                  {isEn
                    ? 'Increases dairy milk yield and cuts commercial cattle feed purchases by 30-40%.'
                    : 'दूध उत्पादन बढ़ाता है और बाजार से महंगे दाने/खली की लागत 30-40% घटाता है।'}
                </p>
              </>
            ) : (
              <p className="text-rose-800 font-semibold">
                {isEn
                  ? 'CRITICAL WARNING: Rotten crops infected with fungi/mold contain toxic aflatoxins. NEVER feed them to dairy cows or buffaloes (causes mastitis, toxic milk, and abortion risks). Divert strictly to vermicomposting or biogas.'
                  : 'चेतावनी: फफूंद (Fungus/Mold) लगी सड़ी फसल में एफ़्लाटॉक्सिन (Aflatoxin) विषैला तत्व हो सकता है। इसे गाय/भैंस को कभी न खिलाएं (थनैला रोग या गर्भपात का खतरा)। इसे केंचुआ खाद या बायोगैस में ही डालें।'}
              </p>
            )}
          </div>
        </div>

        {/* 4. Bio-Enzyme Tonic Spray */}
        <div className="bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:border-purple-500/40 transition">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🧪</span>
              <div>
                <h3 className="font-bold text-base text-soil">
                  {isEn
                    ? '4. Bio-Enzyme & Foliar Growth Booster'
                    : '4. बायो-एंजाइम व प्राकृतिक टॉनिक स्प्रे (Bio-Enzyme & Foliar Booster)'}
                </h3>
                <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded">
                  {isEn ? 'Natural Pest Repellent & Growth Promoter' : 'प्राकृतिक कीटनाशक व विकास प्रमोटर'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">
                {isEn ? 'Market Value:' : 'बाजार मूल्य:'}
              </p>
              <p className="text-base font-black text-purple-900">
                {isEn ? '₹300 - ₹500 / Liter Tonic' : '₹300 - ₹500 / लीटर टॉनिक'}
              </p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-purple-50/30 p-3.5 rounded-xl border border-purple-100">
            <p>
              <strong>{isEn ? '1 : 3 : 10 Formula: ' : '1 : 3 : 10 फॉर्मूला: '}</strong>
              {isEn
                ? '1 part jaggery + 3 parts fruit peels/culled tomatoes + 10 parts water.'
                : '1 भाग गुड़ + 3 भाग फलों के छिलके/टमाटर + 10 भाग पानी।'}
            </p>
            <p>
              <strong>{isEn ? 'Fermentation: ' : 'प्रक्रिया: '}</strong>
              {isEn
                ? 'Fill in a plastic bottle or drum and store in shade. Open the cap once a week for the first 30 days to release fermentation gas. In 90 days, a pleasant sweet-sour bio-enzyme is ready.'
                : 'प्लास्टिक की बोतल या ड्रम में भरकर छाया में रखें। पहले 30 दिन हफ्ते में एक बार ढक्कन खोलकर गैस निकालें। 90 दिन में खट्टा-मीठा महकदार बायो-एंजाइम तैयार हो जाता है।'}
            </p>
            <p>
              <strong>{isEn ? 'Application: ' : 'छिड़काव: '}</strong>
              {isEn
                ? 'Dilute 5 to 10 ml per liter of water and spray on crops. Protects against fungal blights, aphids, and pests while multiplying soil micro-flora.'
                : '5 से 10 मिली प्रति लीटर पानी में मिलाकर फसलों पर स्प्रे करें। यह फफूंद, एफिड्स और कीटों से सुरक्षा देता है और मिट्टी में लाभकारी जीवाणु बढ़ाता है।'}
            </p>
          </div>
        </div>

        {/* 5. Distillery / Bio-Ethanol Procurement */}
        <div className="bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:border-amber-500/40 transition">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🏭</span>
              <div>
                <h3 className="font-bold text-base text-soil">
                  {isEn
                    ? '5. Bio-Ethanol Distillery & Industrial Supply'
                    : '5. बायो-एथेनॉल डिस्टिलरी व औद्योगिक आपूर्ति (Bio-Ethanol / Industrial Supply)'}
                </h3>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                  {isEn ? 'Under National Biofuel Policy 2018' : 'राष्ट्रीय जैव ईंधन नीति 2018 के तहत'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">
                {isEn ? 'Industrial Purchase Rate:' : 'औद्योगिक खरीद दर:'}
              </p>
              <p className="text-base font-black text-amber-900">
                {isEn
                  ? `₹${industrialVal.toLocaleString()} (₹2,200/Qtl starch equivalent)`
                  : `₹${industrialVal.toLocaleString()} (₹2,200/Qtl समतुल्य स्टार्च)`}
              </p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-amber-50/30 p-3.5 rounded-xl border border-amber-100">
            <p>
              <strong>{isEn ? 'Ethanol Blending Target: ' : 'सरकार की एथेनॉल ब्लेंडिंग नीति: '}</strong>
              {isEn
                ? 'To achieve 20% ethanol blending in petrol (E20), the government allows distilleries to procure Damaged Food Grains (DFG), culled potatoes, and surplus starch crops directly.'
                : 'पेट्रोल में 20% एथेनॉल मिलाने के लक्ष्य के लिए सरकार क्षतिग्रस्त खाद्यान्न (Damaged Food Grain), खराब आलू, और अधिशेष मक्का को डिस्टिलरी में खरीदने की अनुमति देती है।'}
            </p>
            <p>
              <strong>{isEn ? 'How to Sell: ' : 'बिक्री का तरीका: '}</strong>
              {isEn
                ? 'Connect with nearby agro-processing hubs, grain distilleries, or sugar mills to supply truckload batches at bulk procurement rates.'
                : 'स्थानीय कृषि प्रसंस्करण इकाइयों या सहकारी चीनी मिल/आसवन इकाइयों से संपर्क कर थोक लॉट बेच सकते हैं।'}
            </p>
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
            {isEn ? 'View Processing Units' : 'प्रसंस्करण इकाइयां देखें'}
          </span>
          <span className="text-xs text-soil/60 mt-0.5">
            {isEn ? 'Find Nearby Agro-Processing Units' : 'नजदीकी खाद्य प्रसंस्करण इकाइयां खोजें'}
          </span>
        </Link>

        <Link
          to="/assistant"
          className="p-4 rounded-xl bg-white border border-soil/20 hover:border-leaf hover:bg-emerald-50/40 transition-all text-center flex flex-col items-center justify-center shadow-xs"
        >
          <span className="text-2xl mb-1">🩺</span>
          <span className="font-bold text-sm text-soil">
            {isEn ? 'Ask Crop Doctor AI' : 'किसान डॉक्टर से पूछें'}
          </span>
          <span className="text-xs text-soil/60 mt-0.5">
            {isEn ? 'Diagnose Disease or Crop Damage' : 'रोग, कीट व क्षति लक्षण विश्लेषण'}
          </span>
        </Link>

        <Link
          to="/storage"
          className="p-4 rounded-xl bg-white border border-soil/20 hover:border-leaf hover:bg-emerald-50/40 transition-all text-center flex flex-col items-center justify-center shadow-xs"
        >
          <span className="text-2xl mb-1">❄️</span>
          <span className="font-bold text-sm text-soil">
            {isEn ? 'Find Cold Storage' : 'कोल्ड स्टोरेज खोजें'}
          </span>
          <span className="text-xs text-soil/60 mt-0.5">
            {isEn ? 'Prevent Spoilage Before it Starts' : 'उपज को खराब होने से पहले सुरक्षित रखें'}
          </span>
        </Link>
      </div>
    </Layout>
  )
}
