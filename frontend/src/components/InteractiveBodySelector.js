import React, { useState } from 'react';
import './InteractiveBodySelector.css';

const InteractiveBodySelector = ({ selectedAreas = [], onAreasChange }) => {
  const [currentSide, setCurrentSide] = useState('front');
  
  // רשימת אזורי גוף
  const BODY_AREAS = [
    { id: 'back', name: 'גב', icon: '🦴' },
    { id: 'shoulders', name: 'כתפיים', icon: '💪' },
    { id: 'arms', name: 'ידיים', icon: '🦾' },
    { id: 'chest', name: 'חזה', icon: '🫁' },
    { id: 'core', name: 'ליבה/בטן', icon: '🎯' },
    { id: 'legs', name: 'רגליים', icon: '🦵' }
  ];

  // טיפול בלחיצה על אזור גוף
  const toggleBodyArea = (areaId) => {
    console.log('לחצו על אזור:', areaId);
    
    const newSelectedAreas = selectedAreas.includes(areaId)
      ? selectedAreas.filter(area => area !== areaId)
      : [...selectedAreas, areaId];
    
    console.log('אזורים חדשים:', newSelectedAreas);
    onAreasChange(newSelectedAreas);
  };

  return (
    <div className="interactive-body-selector">
      <div className="body-selector-header">
        <h4>בחר איזה אזור בגוף אתה רוצה לעבוד:</h4>
        
        {/* רשימת אופציות למעלה */}
        <div className="body-areas-options">
          <h5>אפשרויות לבחירה:</h5>
          <div className="areas-list">
            <span className="area-option">🦴 גב</span>
            <span className="area-option">💪 כתפיים</span>
            <span className="area-option">🦾 ידיים</span>
            <span className="area-option">🫁 חזה</span>
            <span className="area-option">🎯 ליבה/בטן</span>
            <span className="area-option">🦵 רגליים</span>
          </div>
        </div>
        
        <div className="body-side-toggle">
          <button 
            className={currentSide === 'front' ? 'active' : ''}
            onClick={() => setCurrentSide('front')}
          >
            חזית
          </button>
          <button 
            className={currentSide === 'back' ? 'active' : ''}
            onClick={() => setCurrentSide('back')}
          >
            גב
          </button>
        </div>
      </div>
      
      <div className="body-areas-grid">
        {BODY_AREAS.map((area) => (
          <button
            key={area.id}
            className={`body-area-btn ${selectedAreas.includes(area.id) ? 'selected' : ''}`}
            onClick={() => toggleBodyArea(area.id)}
          >
            <span className="body-area-icon">{area.icon}</span>
            <span className="body-area-name">{area.name}</span>
          </button>
        ))}
      </div>
      
      <div className="selected-areas-display">
        <h5>אזורים נבחרים:</h5>
        <div className="selected-areas-list">
          {selectedAreas.length === 0 ? (
            <p>לא נבחרו אזורים</p>
          ) : (
            selectedAreas.map(area => (
              <span key={area} className="selected-area-tag">
                {getAreaDisplayName(area)}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// פונקציה להצגת שם אזור בעברית
const getAreaDisplayName = (area) => {
  const displayNames = {
    'back': 'גב',
    'shoulders': 'כתפיים',
    'arms': 'ידיים',
    'chest': 'חזה',
    'core': 'ליבה/בטן',
    'legs': 'רגליים'
  };
  return displayNames[area] || area;
};

export default InteractiveBodySelector;
