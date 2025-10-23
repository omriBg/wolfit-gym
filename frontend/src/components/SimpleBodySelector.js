import React, { useState } from 'react';

const SimpleBodySelector = ({ selectedAreas = [], onAreasChange }) => {
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

  const toggleBodyArea = (areaId) => {
    const newSelectedAreas = selectedAreas.includes(areaId)
      ? selectedAreas.filter(id => id !== areaId)
      : [...selectedAreas, areaId];
    
    onAreasChange(newSelectedAreas);
  };

  return (
    <div className="body-area-selector">
      <div className="body-area-header">
        <h4>בחר איזה אזור בגוף אתה רוצה לעבוד:</h4>
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
                {BODY_AREAS.find(a => a.id === area)?.name || area}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleBodySelector;
