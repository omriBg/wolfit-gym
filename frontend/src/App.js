import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SignUpScreen from './SignUpScreen.js';
import SignUpPreferences from './SignUpPreferences.js';
import EditUser from './EditUser';
import OrderTrain from './OrderTrain';
import StartWorkout from './StartWorkout';
import MainMenu from './MainMenu';
import './App.css';
import './mobile-fix.css';
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* מסכים ציבוריים */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpScreen />} />
            <Route path="/signup-preferences" element={<SignUpPreferences />} />
            
            {/* מסכים מוגנים */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/main-menu" element={
              <ProtectedRoute>
                <MainMenu />
              </ProtectedRoute>
            } />
            <Route path="/edit-user" element={
              <ProtectedRoute>
                <EditUser />
              </ProtectedRoute>
            } />
            <Route path="/workout-booking" element={
              <ProtectedRoute>
                <OrderTrain />
              </ProtectedRoute>
            } />
            <Route path="/start-workout" element={
              <ProtectedRoute>
                <StartWorkout />
              </ProtectedRoute>
            } />
            
            {/* ברירת מחדל */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;