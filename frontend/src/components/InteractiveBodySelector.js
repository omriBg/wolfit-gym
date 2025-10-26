import React, { useState } from 'react';
import './InteractiveBodySelector.css';

const InteractiveBodySelector = ({ selectedAreas = [], onAreasChange }) => {
  const [currentSide, setCurrentSide] = useState('anterior');
  
  // מיפוי אזורי גוף
  const bodyAreas = {
    'back': { name: 'גב', color: '#8b5cf6' },
    'shoulders': { name: 'כתפיים', color: '#b38ed8' },
    'arms': { name: 'ידיים', color: '#8762ab' },
    'chest': { name: 'חזה', color: '#6d4c7a' },
    'core': { name: 'ליבה/בטן', color: '#8b5cf6' },
    'legs': { name: 'רגליים', color: '#b38ed8' }
  };

  // טיפול בלחיצה על אזור גוף
  const handleBodyAreaClick = (area) => {
    console.log('לחצו על אזור:', area);
    const newSelectedAreas = selectedAreas.includes(area)
      ? selectedAreas.filter(selectedArea => selectedArea !== area)
      : [...selectedAreas, area];
    
    console.log('אזורים חדשים:', newSelectedAreas);
    onAreasChange(newSelectedAreas);
  };

  // טיפול בלחיצה על אזור ברשימה
  const handleAreaClick = (area) => {
    console.log('לחצו על אזור:', area);
    const newSelectedAreas = selectedAreas.includes(area)
      ? selectedAreas.filter(selectedArea => selectedArea !== area)
      : [...selectedAreas, area];
    
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
            <span 
              className={`area-option ${selectedAreas.includes('back') ? 'selected' : ''}`}
              onClick={() => handleAreaClick('back')}
            >
              גב
            </span>
            <span 
              className={`area-option ${selectedAreas.includes('shoulders') ? 'selected' : ''}`}
              onClick={() => handleAreaClick('shoulders')}
            >
              כתפיים
            </span>
            <span 
              className={`area-option ${selectedAreas.includes('arms') ? 'selected' : ''}`}
              onClick={() => handleAreaClick('arms')}
            >
              ידיים
            </span>
            <span 
              className={`area-option ${selectedAreas.includes('chest') ? 'selected' : ''}`}
              onClick={() => handleAreaClick('chest')}
            >
              חזה
            </span>
            <span 
              className={`area-option ${selectedAreas.includes('core') ? 'selected' : ''}`}
              onClick={() => handleAreaClick('core')}
            >
              ליבה/בטן
            </span>
            <span 
              className={`area-option ${selectedAreas.includes('legs') ? 'selected' : ''}`}
              onClick={() => handleAreaClick('legs')}
            >
              רגליים
            </span>
          </div>
        </div>
        
        <div className="body-side-toggle">
          <button 
            className={currentSide === 'anterior' ? 'active' : ''}
            onClick={() => setCurrentSide('anterior')}
          >
            חזית
          </button>
          <button 
            className={currentSide === 'posterior' ? 'active' : ''}
            onClick={() => setCurrentSide('posterior')}
          >
            גב
          </button>
        </div>
      </div>
      
      <div className="body-model-container">
        <div style={{ position: 'relative', minHeight: '500px' }}>
          <svg
            width="400"
            height="500"
            viewBox="0 0 400 500"
            style={{ cursor: 'pointer' }}
          >
            {/* ראש */}
            <circle
              cx="200"
              cy="50"
              r="30"
              fill={selectedAreas.includes('head') ? '#8b5cf6' : '#e0e0e0'}
              stroke="#333"
              strokeWidth="2"
              onClick={() => handleBodyAreaClick('head')}
              style={{ cursor: 'pointer' }}
            />
            
            {/* צוואר */}
            <rect
              x="185"
              y="80"
              width="30"
              height="20"
              fill={selectedAreas.includes('neck') ? '#8b5cf6' : '#e0e0e0'}
              stroke="#333"
              strokeWidth="2"
              onClick={() => handleBodyAreaClick('neck')}
              style={{ cursor: 'pointer' }}
            />
            
            {/* חזה */}
            <ellipse
              cx="200"
              cy="150"
              rx="60"
              ry="40"
              fill={selectedAreas.includes('chest') ? '#8b5cf6' : '#e0e0e0'}
              stroke="#333"
              strokeWidth="2"
              onClick={() => handleBodyAreaClick('chest')}
              style={{ cursor: 'pointer' }}
            />
            
            {/* בטן/ליבה */}
            <ellipse
              cx="200"
              cy="220"
              rx="50"
              ry="30"
              fill={selectedAreas.includes('core') ? '#8b5cf6' : '#e0e0e0'}
              stroke="#333"
              strokeWidth="2"
              onClick={() => handleBodyAreaClick('core')}
              style={{ cursor: 'pointer' }}
            />
            
            {/* כתפיים */}
            <ellipse
              cx="140"
              cy="130"
              rx="25"
              ry="20"
              fill={selectedAreas.includes('shoulders') ? '#8b5cf6' : '#e0e0e0'}
              stroke="#333"
              strokeWidth="2"
              onClick={() => handleBodyAreaClick('shoulders')}
              style={{ cursor: 'pointer' }}
            />
            <ellipse
              cx="260"
              cy="130"
              rx="25"
              ry="20"
              fill={selectedAreas.includes('shoulders') ? '#8b5cf6' : '#e0e0e0'}
              stroke="#333"
              strokeWidth="2"
              onClick={() => handleBodyAreaClick('shoulders')}
              style={{ cursor: 'pointer' }}
            />
            
            {/* ידיים */}
            <ellipse
              cx="100"
              cy="180"
              rx="20"
              ry="60"
              fill={selectedAreas.includes('arms') ? '#8b5cf6' : '#e0e0e0'}
              stroke="#333"
              strokeWidth="2"
              onClick={() => handleBodyAreaClick('arms')}
              style={{ cursor: 'pointer' }}
            />
            <ellipse
              cx="300"
              cy="180"
              rx="20"
              ry="60"
              fill={selectedAreas.includes('arms') ? '#8b5cf6' : '#e0e0e0'}
              stroke="#333"
              strokeWidth="2"
              onClick={() => handleBodyAreaClick('arms')}
              style={{ cursor: 'pointer' }}
            />
            
            {/* רגליים */}
            <ellipse
              cx="170"
              cy="350"
              rx="25"
              ry="80"
              fill={selectedAreas.includes('legs') ? '#8b5cf6' : '#e0e0e0'}
              stroke="#333"
              strokeWidth="2"
              onClick={() => handleBodyAreaClick('legs')}
              style={{ cursor: 'pointer' }}
            />
            <ellipse
              cx="230"
              cy="350"
              rx="25"
              ry="80"
              fill={selectedAreas.includes('legs') ? '#8b5cf6' : '#e0e0e0'}
              stroke="#333"
              strokeWidth="2"
              onClick={() => handleBodyAreaClick('legs')}
              style={{ cursor: 'pointer' }}
            />
            
            {/* גב (רק בצד האחורי) */}
            {currentSide === 'posterior' && (
              <ellipse
                cx="200"
                cy="150"
                rx="60"
                ry="40"
                fill={selectedAreas.includes('back') ? '#8b5cf6' : '#e0e0e0'}
                stroke="#333"
                strokeWidth="2"
                onClick={() => handleBodyAreaClick('back')}
                style={{ cursor: 'pointer' }}
              />
            )}
          </svg>
          
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 1000,
            pointerEvents: 'none'
          }}>
            לחץ על חלקי הגוף לבחירה
          </div>
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 1000,
            pointerEvents: 'none'
          }}>
            נבחרו: {selectedAreas.length} אזורים
          </div>
        </div>
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
