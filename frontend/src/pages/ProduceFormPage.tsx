import { useEffect, useState, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { useAuth } from '../context/AuthContext'
import {
  createProduce,
  updateProduce,
  getProduceById,
  deleteProduce,
  listCrops,
  ProducePayload,
} from '../api/client'

const DEFAULT_CROP = 'Tomato'
const UNITS = ['Quintal', 'Kg', 'Litre', 'Tonne']
const QUALITIES = ['Grade A', 'Grade B', 'Grade C']

const emptyForm: ProducePayload = {
  crop_name: DEFAULT_CROP,
  quantity: 0,
  unit: 'Quintal',
  quality: 'Grade A',
  harvest_date: new Date().toISOString().slice(0, 10),
  location: '',
  expected_sell_date: '',
}

function ProduceFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { token, logout, t } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<ProducePayload>(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [crops, setCrops] = useState<string[]>([DEFAULT_CROP])

  useEffect(() => {
    if (!token) return
    listCrops(token).then(setCrops).catch(() => setError('Could not load the crop catalog.'))
  }, [token])

  useEffect(() => {
    if (!isEdit || !token) return
    getProduceById(token, Number(id))
      .then((item) =>
        setForm({
          crop_name: item.crop_name,
          quantity: item.quantity,
          unit: item.unit,
          quality: item.quality,
          harvest_date: item.harvest_date,
          location: item.location,
          expected_sell_date: item.expected_sell_date || '',
        }),
      )
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError('Could not load this produce entry.')
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    const payload: ProducePayload = {
      ...form,
      expected_sell_date: form.expected_sell_date || null,
    }
    try {
      if (isEdit) {
        await updateProduce(token, Number(id), payload)
      } else {
        await createProduce(token, payload)
      }
      navigate('/produce')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this entry.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!token || !id) return
    if (!confirm(t('deleteConfirm'))) return
    try {
      await deleteProduce(token, Number(id))
      navigate('/produce')
    } catch {
      setError('Could not delete this entry.')
    }
  }

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner label={t('loading')} />
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 className="text-xl font-bold text-soil mb-4">
        {isEdit ? t('editProduce') : t('addProduceTitle')}
      </h1>

      <ErrorBanner message={error} />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-soil/10 p-4 max-w-md space-y-4"
      >
        <div>
          <label htmlFor="crop_name" className="block text-sm font-medium text-soil mb-1">
            {t('crop')}
          </label>
          <select
            id="crop_name"
            value={form.crop_name}
            onChange={(e) => setForm((f) => ({ ...f, crop_name: e.target.value }))}
            className="w-full border border-soil/20 rounded-lg px-3 py-2"
          >
            {crops.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-soil mb-1">
              {t('quantity')}
            </label>
            <input
              id="quantity"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              className="w-full border border-soil/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-leaf/40"
            />
          </div>
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-soil mb-1">
              {t('unit')}
            </label>
            <select
              id="unit"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className="w-full border border-soil/20 rounded-lg px-3 py-2"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="quality" className="block text-sm font-medium text-soil mb-1">
            {t('quality')}
          </label>
          <select
            id="quality"
            value={form.quality}
            onChange={(e) => setForm((f) => ({ ...f, quality: e.target.value }))}
            className="w-full border border-soil/20 rounded-lg px-3 py-2"
          >
            {QUALITIES.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="harvest_date" className="block text-sm font-medium text-soil mb-1">
            {t('harvestDate')}
          </label>
          <input
            id="harvest_date"
            type="date"
            required
            value={form.harvest_date}
            onChange={(e) => setForm((f) => ({ ...f, harvest_date: e.target.value }))}
            className="w-full border border-soil/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-leaf/40"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-soil mb-1">
            {t('location')}
          </label>
          <input
            id="location"
            type="text"
            required
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="w-full border border-soil/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-leaf/40"
          />
        </div>

        <div>
          <label
            htmlFor="expected_sell_date"
            className="block text-sm font-medium text-soil mb-1"
          >
            {t('expectedSellDate')} <span className="text-soil/40">({t('optional')})</span>
          </label>
          <input
            id="expected_sell_date"
            type="date"
            value={form.expected_sell_date || ''}
            onChange={(e) => setForm((f) => ({ ...f, expected_sell_date: e.target.value }))}
            className="w-full border border-soil/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-leaf/40"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-leaf text-white font-medium py-2 rounded-lg hover:bg-leaf/90 transition disabled:opacity-60"
          >
            {saving ? t('saving') : isEdit ? t('saveChanges') : t('addProduce')}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 transition"
            >
              {t('delete')}
            </button>
          )}
        </div>
      </form>
    </Layout>
  )
}

export default ProduceFormPage
