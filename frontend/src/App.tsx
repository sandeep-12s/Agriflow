import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProduceListPage = lazy(() => import('./pages/ProduceListPage'))
const ProduceFormPage = lazy(() => import('./pages/ProduceFormPage'))
const MarketPage = lazy(() => import('./pages/MarketPage'))
const RecommendationPage = lazy(() => import('./pages/RecommendationPage'))
const BuyersPage = lazy(() => import('./pages/BuyersPage'))
const BuyerDetailPage = lazy(() => import('./pages/BuyerDetailPage'))
const ProduceMatchingBuyersPage = lazy(() => import('./pages/ProduceMatchingBuyersPage'))
const StoragePage = lazy(() => import('./pages/StoragePage'))
const ProcessingPage = lazy(() => import('./pages/ProcessingPage'))
const ProduceProcessingPage = lazy(() => import('./pages/ProduceProcessingPage'))
const AssistantPage = lazy(() => import('./pages/AssistantPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const BuyerPortalPage = lazy(() => import('./pages/BuyerPortalPage'))

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner label="Loading AgriFlow…" />}>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/produce"
            element={
              <ProtectedRoute>
                <ProduceListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/produce/new"
            element={
              <ProtectedRoute>
                <ProduceFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/produce/:id"
            element={
              <ProtectedRoute>
                <ProduceFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/produce/:id/recommendation"
            element={
              <ProtectedRoute>
                <RecommendationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/produce/:id/buyers"
            element={
              <ProtectedRoute>
                <ProduceMatchingBuyersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/produce/:id/processing"
            element={
              <ProtectedRoute>
                <ProduceProcessingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/market"
            element={
              <ProtectedRoute>
                <MarketPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyers"
            element={
              <ProtectedRoute>
                <BuyersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyers/:id"
            element={
              <ProtectedRoute>
                <BuyerDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/portal"
            element={
              <ProtectedRoute>
                <BuyerPortalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/storage"
            element={
              <ProtectedRoute>
                <StoragePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/processing"
            element={
              <ProtectedRoute>
                <ProcessingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <AssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
