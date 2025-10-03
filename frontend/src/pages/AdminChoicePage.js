import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AdminChoicePage.css';

function AdminChoicePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleChoice = (choice) => {
    if (choice === 'admin') {
      navigate('/admin-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="admin-choice-page">
      <div className="choice-container">
        <h2>ברוך הבא, {user?.username}!</h2>
        <p>איך תרצה להיכנס?</p>
        
        <div className="choice-buttons">
          <button 
            className="choice-button admin"
            onClick={() => handleChoice('admin')}
          >
            ניהול עסק
          </button>
          
          <button 
            className="choice-button user"
            onClick={() => handleChoice('user')}
          >
            כניסה רגילה
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminChoicePage;

