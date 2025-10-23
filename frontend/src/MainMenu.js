import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { API_BASE_URL } from './config';
import './MainMenu.css';

function MainMenu() {
  const { user, logout } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [availableHours, setAvailableHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    loadUserHours();
    return () => clearTimeout(timer);
  }, []);

  const loadUserHours = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/user-hours/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setAvailableHours(data.availableHours);
      }
    } catch (err) {
      console.error('שגיאה בטעינת שעות:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (action) => {
    console.log(`Clicked: ${action}`);
    
    switch(action) {
      case 'user-edit':
        navigate('/edit-user');
        break;
      case 'workout-booking':
        navigate('/workout-booking');
        break;
      case 'start-workout':
        navigate('/start-workout');
        break;
      default:
        break;
    }
  };

  return (
    <div className={`main-menu ${isLoaded ? 'loaded' : ''}`}>
      {/* כפתור התנתקות */}
      <button 
        className="logout-btn"
        onClick={() => logout()}
      >
        התנתק
      </button>
      
      <div className="menu-container">
        <div className="header-section">
          <h1 className="brand-title">WOLFit</h1>
          <div className="title-line"></div>
          <div className="available-hours">
            {loading ? (
              <span>טוען שעות זמינות...</span>
            ) : (
              <span>שעות זמינות: {availableHours} לבנות אימון</span>
            )}
          </div>
        </div>
        
        <div className="buttons-section">
          <div 
            className={`button-wrapper ${hoveredButton === 'user' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredButton('user')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <button 
              className="menu-button user-edit"
              onClick={() => handleButtonClick('user-edit')}
            >
              <span className="button-text">עריכת משתמש</span>
              <div className="button-line"></div>
            </button>
          </div>
          
          <div 
            className={`button-wrapper ${hoveredButton === 'workout' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredButton('workout')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <button 
              className="menu-button workout-booking"
              onClick={() => handleButtonClick('workout-booking')}
            >
              <span className="button-text">הזמנת אימוןן</span>
              <div className="button-line"></div>
            </button>
          </div>
          
          <div 
            className={`button-wrapper ${hoveredButton === 'start-workout' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredButton('start-workout')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <button 
              className="menu-button start-workout"
              onClick={() => handleButtonClick('start-workout')}
            >
              <span className="button-text">האימונים שלי</span>
              <div className="button-line"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;