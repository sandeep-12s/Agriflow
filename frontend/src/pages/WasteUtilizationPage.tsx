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
  primaryStreams: string[]
}

const CROPS: CropOption[] = [
  {
    id: 'tomato',
    name: 'Tomato',
    nameHi: 'टमाटर',
    icon: '🍅',
    spoilageRate: '25-35%',
    primaryStreams: ['vermicompost', 'bioenzyme', 'biogas'],
  },
  {
    id: 'potato',
    name: 'Potato',
    nameHi: 'आलू',
    icon: '🥔',
    spoilageRate: '15-20%',
    primaryStreams: ['distillery', 'cattlefeed', 'biogas', 'vermicompost'],
  },
  {
    id: 'onion',
    name: 'Onion & Garlic',
    nameHi: 'प्याज और लहसुन',
    icon: '🧅',
    spoilageRate: '20-30%',
    primaryStreams: ['vermicompost', 'bioenzyme'],
  },
  {
    id: 'fruits',
    name: 'Mango & Citrus Fruits',
    nameHi: 'आम, संतरा व फल',
    icon: '🥭',
    spoilageRate: '25-40%',
    primaryStreams: ['bioenzyme', 'cattlefeed', 'vermicompost', 'biogas'],
  },
  {
    id: 'greens',
    name: 'Cabbage & Leafy Greens',
    nameHi: 'पत्तागोभी व हरी सब्जियां',
    icon: '🥬',
    spoilageRate: '30-45%',
    primaryStreams: ['cattlefeed', 'vermicompost', 'biogas'],
  },
  {
    id: 'maize',
    name: 'Maize & Coarse Grains',
    nameHi: 'मक्का और मोटा अनाज',
    icon: '🌽',
    spoilageRate: '10-15%',
    primaryStreams: ['distillery', 'cattlefeed', 'biogas'],
  },
  {
    id: 'stubble',
    name: 'Paddy & Wheat Stubble',
    nameHi: 'पराली, डंठल व भूसा',
    icon: '🌾',
    spoilageRate: 'Harvest Waste',
    primaryStreams: ['vermicompost', 'biogas', 'biochar'],
  },
]

interface ConditionOption {
  id: string
  label: string
  labelHi: string
  icon: string
  desc: string
}

const CONDITIONS: ConditionOption[] = [
  {
    id: 'rotten',
    label: 'Rotten / Fungal Spoilage',
    labelHi: 'सड़ी या फफूंद लगी फसल',
    icon: '🟤',
    desc: 'फंगल सड़ांध या बदबूदार सड़न (Do NOT feed to cattle; ideal for vermicompost & biogas).',
  },
  {
    id: 'unsold',
    label: 'Overripe / Unsold Glut',
    labelHi: 'ज्यादा पकी या मंडी में बिना बिकी',
    icon: '🟡',
    desc: 'ताजी लेकिन अधिक पकी या भाव न मिलने के कारण बची फसल (Ideal for silage, processing & pulp).',
  },
  {
    id: 'damaged',
    label: 'Hailstorm / Pest Damaged',
    labelHi: 'ओलावृष्टि या कीट से दागदार',
    icon: '🟠',
    desc: 'दिखने में कटी-फटी या दागदार लेकिन आंतरिक रूप से सुरक्षित उपज (Excellent for processing & animal feed).',
  },
  {
    id: 'residue',
    label: 'Crop Residue / Peels / Pomace',
    labelHi: 'छिलके, डंठल व प्रसंस्करण अपशिष्ट',
    icon: '🟢',
    desc: 'फसल कटाई या ग्रेडिंग के बाद बचा जैविक कचरा (Ideal for composting & enzyme sprays).',
  },
]

export default function WasteUtilizationPage() {
  const { language } = useAuth()
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
    const text =
      language === 'hi'
        ? `${activeCrop.nameHi} की ${activeCondition.labelHi} के लिए सर्वोत्तम विकल्प केंचुआ खाद और बायोगैस उत्पादन है। आपके ${quantityQtl} क्विंटल से लगभग ${vermicompostVal} रुपये मूल्य की केंचुआ खाद या पशु आहार बचत प्राप्त हो सकती है।`
        : `For ${activeCrop.name} with ${activeCondition.label}, recommended solutions are vermicomposting and biogas. From your ${quantityQtl} quintals, you can recover around ${maxRecoverable} rupees value instead of total loss.`
    speakText(text, language)
  }

  return (
    <Layout>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-green-800 text-white rounded-2xl p-5 md:p-7 mb-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>♻️</span> वेस्ट टू वेल्थ | Waste to Wealth
            </div>
            <h1 className="text-2xl md:text-3xl font-black">
              फसल अपशिष्ट व खराबी समाधान
            </h1>
            <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
              सड़ी, दागदार या बिना बिकी फसल को सड़क पर फेंकने की जरूरत नहीं है। इसे जैविक खाद, बायोगैस, पशु आहार या बायो-एंजाइम में बदलकर नुकसान को कमाई में बदलें।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeakPlan}
              className="bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition flex items-center gap-2"
            >
              <span>🔊</span>
              <span>समाधान सुनें</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 1: Select Crop */}
      <div className="bg-white rounded-2xl border border-soil/10 p-5 mb-6 shadow-sm">
        <h2 className="text-base md:text-lg font-bold text-soil mb-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-leaf text-white text-xs flex items-center justify-center font-bold">1</span>
          आपकी कौन सी फसल खराब या अवशेष के रूप में है? (Select Crop)
        </h2>
        <p className="text-xs text-soil/60 mb-4">
          प्रत्येक फसल की रासायनिक संरचना (शर्करा, स्टार्च, नमी) के अनुसार उपयोग विधि अलग होती है।
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
                <span className="font-bold text-xs text-soil">{c.nameHi}</span>
                <span className="text-[10px] text-soil/50">{c.name}</span>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded-full">
                  खराबी: {c.spoilageRate}
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
          फसल की वर्तमान स्थिति क्या है? (Select Damage Condition)
        </h2>
        <p className="text-xs text-soil/60 mb-4">
          फफूंद लगी फसल को पशुओं को नहीं खिलाया जा सकता, लेकिन खाद और बायोगैस में इस्तेमाल हो सकती है।
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
                  <span className="font-bold text-sm text-soil">{cond.labelHi}</span>
                </div>
                <p className="text-[11px] text-soil/50 font-medium">{cond.label}</p>
                <p className="text-xs text-soil/70 mt-1.5 leading-relaxed">{cond.desc}</p>
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
              नुकसान वसूली कैलकुलेटर (Loss Recovery Calculator)
            </h2>
            <p className="text-xs text-soil/60">
              अपनी खराब/बची फसल की मात्रा दर्ज करें और देखें कि अपशिष्ट प्रबंधन से कितनी राशि वापस मिल सकती है।
            </p>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-3 py-1 rounded-full">
            💡 0% शून्य नुकसान के बदले {recoveryPercentage}% तक वसूली
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-soil mb-1">
              मात्रा (क्विंटल में) / Quantity
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
              अनुमानित मंडी भाव (₹ / क्विंटल)
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
            <p className="text-[11px] font-semibold text-soil/50">फसल का कुल मूल्य (Total at Risk)</p>
            <p className="text-xl font-black text-rose-700 mt-1">₹{totalOriginalValue.toLocaleString()}</p>
            <p className="text-[10px] text-soil/50">फेंकने पर यह 100% शून्य नुकसान होता</p>
          </div>

          <div className="bg-emerald-100/90 border border-emerald-300 rounded-xl p-3 shadow-xs">
            <p className="text-[11px] font-bold text-emerald-900">वसूली योग्य मूल्य (Recoverable Value)</p>
            <p className="text-xl font-black text-emerald-800 mt-1">₹{maxRecoverable.toLocaleString()}</p>
            <p className="text-[10px] font-semibold text-emerald-700">
              लगभग {recoveryPercentage}% आर्थिक मूल्य वापस मिला
            </p>
          </div>
        </div>
      </div>

      {/* Step 4: Recommended Wealth Utilization Pathways */}
      <div className="space-y-4 mb-6">
        <h2 className="text-lg font-bold text-soil flex items-center gap-2">
          <span>🌿</span>
          {activeCrop.nameHi} ({activeCondition.labelHi}) के लिए 5 उपयोगी रास्ते:
        </h2>

        {/* 1. Vermicompost */}
        <div className="bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:border-emerald-500/40 transition">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🪱</span>
              <div>
                <h3 className="font-bold text-base text-soil">
                  1. केंचुआ खाद और जैविक कम्पोस्ट (Vermicompost & Bio-Fertilizer)
                </h3>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  सर्वश्रेष्ठ जैविक मूल्य • 45-60 दिन में तैयार
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">संभावित आय / बचत:</p>
              <p className="text-base font-black text-emerald-800">
                ₹{vermicompostVal.toLocaleString()} ({vermicompostKg} किग्रा खाद)
              </p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-sand/20 p-3.5 rounded-xl">
            <p>
              <strong>विधि:</strong> खराब फसल को 2-3 इंच काटकर सूखे पत्तों या धान/गेहूं के भूसे (कार्बन) के साथ मिलाएं। इसमें 20% पुराना गोबर का घोल छिड़कें ताकि दुर्गंध खत्म हो।
            </p>
            <p>
              <strong>केंचुआ मिलाना:</strong> 10-12 दिन बाद जब प्रारंभिक तापमान सामान्य हो जाए, तो प्रति वर्ग मीटर 1 किग्रा <em>Eisenia foetida</em> केंचुए डालें।
            </p>
            <p>
              <strong>लाभ:</strong> ₹8-₹12 प्रति किग्रा बाजार में बिकता है, अथवा अपने खेत में डालकर रासायनिक खाद (DAP/यूरिया) पर प्रति एकड़ ₹4,000-₹6,000 की बचत करें।
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
                  2. ग्रामीण बायोगैस व कंप्रेस्ड बायो-गैस (Biogas & SATAT Scheme)
                </h3>
                <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                  रसोई गैस + तरल जैविक खाद (Slurry)
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">बायोमीथेन क्षमता:</p>
              <p className="text-base font-black text-teal-800">
                ~{Math.round(quantityQtl * 22)} m³ गैस (₹{Math.round(quantityQtl * 320)} मूल्य)
              </p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-teal-50/30 p-3.5 rounded-xl border border-teal-100">
            <p>
              <strong>उपयोगिता:</strong> सड़े हुए आलू, टमाटर, गन्ने की खोई और अधिक पके फलों में उच्च शर्करा होती है, जो बायोगैस संयंत्र में तेजी से मिथेन गैस बनाती है।
            </p>
            <p>
              <strong>सरकारी योजना:</strong> 'गोवर्धन' (GOBAR-DHAN) योजना के तहत बायोगैस डाइजेस्टर लगाने पर 50,000 रुपये तक की सरकारी सहायता मिलती है।
            </p>
            <p>
              <strong>स्लरी का उपयोग:</strong> बायोगैस से निकलने वाली तरल स्लरी नाइट्रोजन और फास्फोरस से भरपूर होती है; इसे सीधे ड्रिप या खुले पानी के साथ खेत में दें।
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
                  3. पशु आहार व साइलेज (Livestock Feed Silage)
                </h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  isCattleFeedSafe ? 'text-blue-800 bg-blue-50' : 'text-rose-800 bg-rose-100'
                }`}>
                  {isCattleFeedSafe ? 'दुधारू पशुओं के लिए पौष्टिक' : '⛔ फफूंद वाली फसल पशुओं को न दें'}
                </span>
              </div>
            </div>
            {isCattleFeedSafe && (
              <div className="text-right">
                <p className="text-xs font-semibold text-soil/50">पशु आहार बचत:</p>
                <p className="text-base font-black text-blue-900">
                  ₹{cattleFeedVal.toLocaleString()} (व्यावसायिक चारे पर बचत)
                </p>
              </div>
            )}
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-sand/20 p-3.5 rounded-xl">
            {isCattleFeedSafe ? (
              <>
                <p>
                  <strong>उपयुक्तता:</strong> अतिरिक्त पके टमाटर, आलू, गाजर, पत्तागोभी या बिना बिके मीठे फल।
                </p>
                <p>
                  <strong>साइलेज प्रक्रिया:</strong> टुकड़ों को 1-2 दिन धूप में सुखाकर नमी 60% पर लाएं। 1% गुड़ का पानी और 0.5% नमक मिलाकर प्लास्टिक साइलेज बैग या गड्ढे में हवा बंद करके 30 दिन रखें।
                </p>
                <p>
                  <strong>लाभ:</strong> दूध उत्पादन बढ़ाता है और बाजार से महंगे दाने/खली की लागत 30-40% घटाता है।
                </p>
              </>
            ) : (
              <p className="text-rose-800 font-semibold">
                चेतावनी: फफूंद (Fungus/Mold) लगी सड़ी फसल में एफ़्लाटॉक्सिन (Aflatoxin) विषैला तत्व हो सकता है। इसे गाय/भैंस को कभी न खिलाएं (थनैला रोग या गर्भपात का खतरा)। इसे केंचुआ खाद या बायोगैस में ही डालें।
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
                  4. बायो-एंजाइम व प्राकृतिक टॉनिक स्प्रे (Bio-Enzyme & Foliar Booster)
                </h3>
                <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded">
                  प्राकृतिक कीटनाशक व विकास प्रमोटर
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">बाजार मूल्य:</p>
              <p className="text-base font-black text-purple-900">₹300 - ₹500 / लीटर टॉनिक</p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-purple-50/30 p-3.5 rounded-xl border border-purple-100">
            <p>
              <strong>1 : 3 : 10 फॉर्मूला:</strong> 1 भाग गुड़ + 3 भाग फलों के छिलके/टमाटर + 10 भाग पानी।
            </p>
            <p>
              <strong>प्रक्रिया:</strong> प्लास्टिक की बोतल या ड्रम में भरकर छाया में रखें। पहले 30 दिन हफ्ते में एक बार ढक्कन खोलकर गैस निकालें। 90 दिन में खट्टा-मीठा महकदार बायो-एंजाइम तैयार हो जाता है।
            </p>
            <p>
              <strong>छिड़काव:</strong> 5 से 10 मिली प्रति लीटर पानी में मिलाकर फसलों पर स्प्रे करें। यह फफूंद, एफिड्स और कीटों से सुरक्षा देता है और मिट्टी में लाभकारी जीवाणु बढ़ाता है।
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
                  5. बायो-एथेनॉल डिस्टिलरी व औद्योगिक आपूर्ति (Bio-Ethanol / Industrial Supply)
                </h3>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                  राष्ट्रीय जैव ईंधन नीति 2018 के तहत
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-soil/50">औद्योगिक खरीद दर:</p>
              <p className="text-base font-black text-amber-900">
                ₹{industrialVal.toLocaleString()} (₹2,200/Qtl समतुल्य स्टार्च)
              </p>
            </div>
          </div>

          <div className="text-xs text-soil/80 space-y-1.5 mt-3 bg-amber-50/30 p-3.5 rounded-xl border border-amber-100">
            <p>
              <strong>सरकार की एथेनॉल ब्लेंडिंग नीति:</strong> पेट्रोल में 20% एथेनॉल मिलाने के लक्ष्य के लिए सरकार क्षतिग्रस्त खाद्यान्न (Damaged Food Grain), खराब आलू, और अधिशेष मक्का को डिस्टिलरी में खरीदने की अनुमति देती है।
            </p>
            <p>
              <strong>बिक्री का तरीका:</strong> स्थानीय कृषि प्रसंस्करण इकाइयों या सहकारी चीनी मिल/आसवन इकाइयों से संपर्क कर थोक लॉट बेच सकते हैं।
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
          <span className="font-bold text-sm text-soil">प्रसंस्करण इकाइयां देखें</span>
          <span className="text-xs text-soil/60 mt-0.5">Find Nearby Agro-Processing Units</span>
        </Link>

        <Link
          to="/assistant"
          className="p-4 rounded-xl bg-white border border-soil/20 hover:border-leaf hover:bg-emerald-50/40 transition-all text-center flex flex-col items-center justify-center shadow-xs"
        >
          <span className="text-2xl mb-1">🩺</span>
          <span className="font-bold text-sm text-soil">किसान डॉक्टर से पूछें</span>
          <span className="text-xs text-soil/60 mt-0.5">Diagnose Disease or Crop Damage</span>
        </Link>

        <Link
          to="/storage"
          className="p-4 rounded-xl bg-white border border-soil/20 hover:border-leaf hover:bg-emerald-50/40 transition-all text-center flex flex-col items-center justify-center shadow-xs"
        >
          <span className="text-2xl mb-1">❄️</span>
          <span className="font-bold text-sm text-soil">कोल्ड स्टोरेज खोजें</span>
          <span className="text-xs text-soil/60 mt-0.5">Prevent Spoilage Before it Starts</span>
        </Link>
      </div>
    </Layout>
  )
}
