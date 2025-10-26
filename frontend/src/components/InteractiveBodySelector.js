import React, { useState } from 'react';
import Model, { ModelType, MuscleType } from 'react-body-highlighter';
import './InteractiveBodySelector.css';

const InteractiveBodySelector = ({ selectedAreas = [], onAreasChange }) => {
  const [currentSide, setCurrentSide] = useState(ModelType.ANTERIOR);
  
  // מיפוי אזורי גוף שלנו לחלקי שריר בחבילה
  const bodyAreaMapping = {
    'back': [MuscleType.UPPER_BACK, MuscleType.LOWER_BACK, MuscleType.TRAPEZIUS],
    'shoulders': [MuscleType.FRONT_DELTOIDS, MuscleType.BACK_DELTOIDS],
    'arms': [MuscleType.BICEPS, MuscleType.TRICEPS, MuscleType.FOREARM],
    'chest': [MuscleType.CHEST],
    'core': [MuscleType.ABS, MuscleType.OBLIQUES],
    'legs': [MuscleType.QUADRICEPS, MuscleType.HAMSTRING, MuscleType.GLUTEAL, MuscleType.CALVES]
  };

  // המרת אזורי גוף נבחרים לחלקי שריר
  const getSelectedMuscles = () => {
    const selectedMuscles = [];
    selectedAreas.forEach(area => {
      if (bodyAreaMapping[area]) {
        bodyAreaMapping[area].forEach(muscle => {
          selectedMuscles.push(muscle);
        });
      }
    });
    return selectedMuscles;
  };

  // טיפול בלחיצה על שריר
  const handleMuscleClick = (muscle) => {
    console.log('לחצו על שריר:', muscle);
    
    // מצא איזה אזור גוף שייך לשריר הזה
    let areaToToggle = null;
    for (const [area, muscles] of Object.entries(bodyAreaMapping)) {
      if (muscles.includes(muscle)) {
        areaToToggle = area;
        break;
      }
    }
    
    console.log('אזור גוף שנמצא:', areaToToggle);
    
    if (areaToToggle) {
      const newSelectedAreas = selectedAreas.includes(areaToToggle)
        ? selectedAreas.filter(area => area !== areaToToggle)
        : [...selectedAreas, areaToToggle];
      
      console.log('אזורים חדשים:', newSelectedAreas);
      onAreasChange(newSelectedAreas);
    } else {
      console.log('לא נמצא אזור גוף מתאים לשריר:', muscle);
    }
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
          <div style={{ fontSize: '12px', color: '#b38ed8', marginBottom: '10px' }}>
            Debug: לחץ על אזור ברשימה או על המודל למטה
          </div>
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
            className={currentSide === ModelType.ANTERIOR ? 'active' : ''}
            onClick={() => setCurrentSide(ModelType.ANTERIOR)}
            
          >
            חזית
          </button>
          <button 
            className={currentSide === ModelType.POSTERIOR ? 'active' : ''}
            onClick={() => setCurrentSide(ModelType.POSTERIOR)}
          >
            גב
          </button>
        </div>
      </div>
      
      <div className="body-model-container">
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '10px', 
          background: 'rgba(0,0,0,0.7)', 
          color: 'white', 
          padding: '5px', 
          fontSize: '12px',
          borderRadius: '3px',
          zIndex: 10
        }}>
          Debug: לחץ על המודל או על הרשימה למעלה
        </div>
        <Model
          type={currentSide}
          muscles={getSelectedMuscles()}
          onMuscleClick={handleMuscleClick}
          colors={['#8b5cf6', '#b38ed8', '#8762ab', '#6d4c7a']}
          style={{ width: '400px', height: '500px', cursor: 'pointer' }}
        />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.1)',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center',
          color: 'white',
          fontSize: '14px',
          zIndex: 5
        }}>
          <div>אם אתה רואה את זה, המודל לא נטען</div>
          <div>נסה ללחוץ על הרשימה למעלה</div>
        </div>
        <div style={{ 
          position: 'absolute', 
          bottom: '10px', 
          left: '10px', 
          background: 'rgba(0,0,0,0.7)', 
          color: 'white', 
          padding: '5px', 
          fontSize: '12px',
          borderRadius: '3px',
          zIndex: 10
        }}>
          אזורים נבחרים: {selectedAreas.length}
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
