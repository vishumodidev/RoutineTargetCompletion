import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HabitProvider } from './context/HabitContext'
import { DashboardProvider } from './context/DashboardContext'
import { AchievementProvider } from './context/AchievementContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import { Toaster } from 'react-hot-toast'

// Lazy-loaded Pages
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Habits = lazy(() => import('./pages/Habits'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Profile = lazy(() => import('./pages/Profile'))

// Center fallback loader for dynamic route chunks
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-primary"></div>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <HabitProvider>
        <DashboardProvider>
          <AchievementProvider>
            <Toaster 
              position="top-right" 
              toastOptions={{ 
                style: { 
                  background: '#151b2c', 
                  color: '#f3f4f6', 
                  border: '1px solid #1e293b' 
                } 
              }} 
            />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <MainLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="habits" element={<Habits />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="calendar" element={<Calendar />} />
                    <Route path="achievements" element={<Achievements />} />
                    <Route path="profile" element={<Profile />} />
                  </Route>

                  {/* Redirect all unmatched routes */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AchievementProvider>
        </DashboardProvider>
      </HabitProvider>
    </AuthProvider>
  )
}

export default App
