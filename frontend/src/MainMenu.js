import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './MainMenu.css';

function MainMenu() {
  const { user, logout } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
      {/* כפתור התנתקות בצד ימין למעלה */}
      <button 
        className="logout-button"
        onClick={() => logout()}
      >
        התנתק
      </button>
      
      <div className="menu-container">
        <div className="header-section">
          <h1 className="brand-title">WOLFit</h1>
          <div className="title-line"></div>
          {user && (
            <p className="welcome-message">
              ברוך הבא, {user.userName || user.email}!
            </p>
          )}
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
              <span className="button-text">הזמנת אימון</span>
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
              <span className="button-text">התחל אימון</span>
              <div className="button-line"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;