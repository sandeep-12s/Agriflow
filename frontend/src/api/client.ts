const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// FastAPI's own HTTPException(detail="...") comes back as a plain string,
// but its automatic 422 validation errors come back as an array of
// per-field objects like {loc: ["body", "phone"], msg: "field required"}.
// Without this, the array case rendered as the useless literal text
// "[object Object]" in the UI.
function extractErrorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown })?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : 'field'
      return `${field}: ${item?.msg ?? 'invalid value'}`
    })
    return messages.join('; ')
  }
  return fallback
}

// ---- Health ----

export interface HealthResponse {
  status: string
  service: string
  version: string
  env: string
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) throw new Error(`Health check failed: ${response.status}`)
  return response.json()
}

// ---- Auth ----

export interface RegisterPayload {
  name: string
  phone: string
  email: string
  password: string
  location: string
  language: string
  otp: string
}

export interface OTPResponse {
  message: string
  expires_in: number
  dev_code?: string | null
}

export interface LoginPayload {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

async function handleAuthResponse(response: Response): Promise<TokenResponse> {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(extractErrorMessage(body, `Request failed: ${response.status}`))
  }
  return response.json()
}

export async function requestRegistrationOtp(phone: string): Promise<OTPResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(extractErrorMessage(body, `Request failed: ${response.status}`))
    }
    return response.json()
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Could not connect to the AgriFlow server. Please try again in a moment.')
    }
    throw error
  }
}

export async function registerFarmer(payload: RegisterPayload): Promise<TokenResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return handleAuthResponse(response)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Could not connect to the AgriFlow server. Please try again in a moment.')
    }
    throw error
  }
}

export async function loginFarmer(payload: LoginPayload): Promise<TokenResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return handleAuthResponse(response)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Could not connect to the AgriFlow server. Please try again in a moment.')
    }
    throw error
  }
}

// ---- Generic authenticated request ----
// Every protected endpoint (profile, dashboard, produce, and everything
// added in later steps) goes through this one helper so the 401 →
// force-logout behavior only has to be written once.

async function authRequest<T>(
  path: string,
  token: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(extractErrorMessage(body, `Request failed: ${response.status}`))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json()
}

// ---- Farmer profile ----

export interface FarmerProfile {
  id: number
  name: string
  phone: string
  email: string
  location: string
  language: string
  role: string
  created_at: string
}

export function getMyProfile(token: string) {
  return authRequest<FarmerProfile>('/farmers/me', token)
}

// ---- Dashboard ----

export interface DashboardSummary {
  total_produce_entries: number
  total_quantity: number
  estimated_value: number
  potential_profit: number
  wastage_risk: string
  active_recommendations: number
  available_buyers: number
  next_action: string
}

export function getDashboardSummary(token: string) {
  return authRequest<DashboardSummary>('/dashboard/summary', token)
}

// ---- Markets ----

export interface Market {
  id: number
  name: string
  location: string
  latitude: number
  longitude: number
  distance_km: number
}

export interface CropPriceRow {
  market_id: number
  market_name: string
  distance_km: number
  current_price: number
  previous_price: number | null
  price_change: number | null
  price_change_pct: number | null
  trend: string
  demand: string
}

export function listMarkets(token: string) {
  return authRequest<Market[]>('/markets', token)
}

export function listCrops(token: string) {
  return authRequest<string[]>('/markets/crops', token)
}

export function compareCropPrices(token: string, cropName: string) {
  return authRequest<CropPriceRow[]>(`/markets/compare/${encodeURIComponent(cropName)}`, token)
}

// ---- Recommendations ----

export interface RecommendationOption {
  option: string
  expected_revenue: number
  total_cost: number
  expected_profit: number
  risk_score: number
  risk_label: string
  recommendation_score: number
  reason: string
}

export interface RecommendationResponse {
  produce_id: number
  crop_name: string
  recommended_option: string
  options: RecommendationOption[]
}

export function getRecommendation(token: string, produceId: number) {
  return authRequest<RecommendationResponse>(`/recommendations/${produceId}`, token)
}

// ---- Buyers ----

export interface Buyer {
  id: number
  name: string
  product: string
  required_quantity: number
  offered_price: number
  location: string
  quality_requirement: string
  contact: string
}

export function listBuyers(token: string) {
  return authRequest<Buyer[]>('/buyers', token)
}

export function getBuyer(token: string, id: number) {
  return authRequest<Buyer>(`/buyers/${id}`, token)
}

export function matchingBuyers(token: string, produceId: number) {
  return authRequest<Buyer[]>(`/buyers/matching/${produceId}`, token)
}

// ---- Transactions ----

export interface TransactionPayload {
  buyer_id: number
  produce_id: number
  quantity: number
  price: number
}

export interface Transaction {
  id: number
  farmer_id: number
  buyer_id: number | null
  produce_id: number
  quantity: number
  price: number
  status: string
  created_at: string
}

export function createTransaction(token: string, payload: TransactionPayload) {
  return authRequest<Transaction>('/transactions', token, { method: 'POST', body: payload })
}

export function listTransactions(token: string) {
  return authRequest<Transaction[]>('/transactions', token)
}

// ---- Storage ----

export interface StorageFacility {
  id: number
  name: string
  location: string
  type: string
  distance_km: number
  capacity: number
  available_capacity: number
  cost_per_unit: number
  supported_crops: string
}

export function listStorage(token: string) {
  return authRequest<StorageFacility[]>('/storage', token)
}

export function nearbyStorage(token: string, cropName?: string) {
  const query = cropName ? `?crop_name=${encodeURIComponent(cropName)}` : ''
  return authRequest<StorageFacility[]>(`/storage/nearby${query}`, token)
}

// ---- Processing ----

export interface ProcessingUnit {
  id: number
  name: string
  location: string
  input_product: string
  input_capacity: number
  processing_cost: number
  output_product: string
  estimated_output: number
  distance_km: number
}

export interface ProcessingOpportunity {
  processor_id: number
  processor_name: string
  input_product: string
  output_product: string
  input_quantity: number
  processing_cost: number
  expected_output: number
  estimated_revenue: number
  potential_profit: number
  processing_location: string
  distance_km: number
}

export function listProcessingUnits(token: string) {
  return authRequest<ProcessingUnit[]>('/processing', token)
}

export function processingOpportunities(token: string, produceId: number) {
  return authRequest<ProcessingOpportunity[]>(`/processing/opportunities/${produceId}`, token)
}

// ---- Assistant ----

export interface AssistantChatResponse {
  reply: string
  source: 'ai' | 'fallback'
}

export function sendChatMessage(token: string, message: string, language: string) {
  return authRequest<AssistantChatResponse>('/assistant/chat', token, {
    method: 'POST',
    body: { message, language },
  })
}

// ---- Analytics ----

export interface CropMetric {
  crop_name: string
  value: number
}

export interface PriceTrendPoint {
  crop_name: string
  previous_price: number
  current_price: number
}

export interface TransactionsSummary {
  total_transactions: number
  total_quantity: number
  total_value: number
  by_status: Record<string, number>
}

export interface ProduceStatusCount {
  status: string
  count: number
}

export interface AnalyticsDashboard {
  produce_quantity_by_crop: CropMetric[]
  revenue_by_crop: CropMetric[]
  profit_by_crop: CropMetric[]
  wastage_avoided: number
  price_trends: PriceTrendPoint[]
  transactions_summary: TransactionsSummary
  produce_status_breakdown: ProduceStatusCount[]
}

export function getAnalyticsDashboard(token: string) {
  return authRequest<AnalyticsDashboard>('/analytics/dashboard', token)
}

// ---- Produce ----

export interface Produce {
  id: number
  farmer_id: number
  crop_name: string
  quantity: number
  unit: string
  quality: string
  harvest_date: string
  location: string
  expected_sell_date: string | null
  status: string
  created_at: string
}

export interface ProducePayload {
  crop_name: string
  quantity: number
  unit: string
  quality: string
  harvest_date: string
  location: string
  expected_sell_date?: string | null
}

export function listProduce(token: string) {
  return authRequest<Produce[]>('/produce', token)
}

export function getProduceById(token: string, id: number) {
  return authRequest<Produce>(`/produce/${id}`, token)
}

export function createProduce(token: string, payload: ProducePayload) {
  return authRequest<Produce>('/produce', token, { method: 'POST', body: payload })
}

export function updateProduce(token: string, id: number, payload: Partial<ProducePayload>) {
  return authRequest<Produce>(`/produce/${id}`, token, { method: 'PUT', body: payload })
}

export function deleteProduce(token: string, id: number) {
  return authRequest<void>(`/produce/${id}`, token, { method: 'DELETE' })
}
