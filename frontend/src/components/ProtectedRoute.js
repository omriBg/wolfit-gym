import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  // עדיין טוען
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#8b5cf6'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #b38ed8',
          borderTop: '4px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginLeft: '10px'
        }}></div>
        בודק הרשאות...
      </div>
    );
  }

  // לא מחובר - מעבר למסך התחברות
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // מחובר - הצגת התוכן המוגן
  return children;
}

export default ProtectedRoute;
