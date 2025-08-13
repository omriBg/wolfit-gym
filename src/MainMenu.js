import React, { useState, useEffect } from 'react';
import EditUser from './EditUser';
import OrderTrain from './OrderTrain';
import './MainMenu.css';

function MainMenu({ user }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [currentView, setCurrentView] = useState('menu');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleButtonClick = (action) => {
    console.log(`Clicked: ${action}`);
    
    switch(action) {
      case 'user-edit':
        setCurrentView('editUser');
        break;
      case 'workout-booking':
        setCurrentView('workoutBooking');
        break;
      default:
        setCurrentView('menu');
    }
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  if (currentView === 'editUser') {
    return <EditUser onBackClick={handleBackToMenu} currentUser={user} />; 
  }

  if (currentView === 'workoutBooking') {
    return <OrderTrain onBackClick={handleBackToMenu} user={user} />;
  }

  return (
    <div className={`main-menu ${isLoaded ? 'loaded' : ''}`}>
      <div className="menu-container">
        <div className="header-section">
          <h1 className="brand-title">WOLFit</h1>
          <div className="title-line"></div>
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
        </div>
      </div>
    </div>
  );
}

export default MainMenu;