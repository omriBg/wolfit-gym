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
    // מצא איזה אזור גוף שייך לשריר הזה
    let areaToToggle = null;
    for (const [area, muscles] of Object.entries(bodyAreaMapping)) {
      if (muscles.includes(muscle)) {
        areaToToggle = area;
        break;
      }
    }
    
    if (areaToToggle) {
      const newSelectedAreas = selectedAreas.includes(areaToToggle)
        ? selectedAreas.filter(area => area !== areaToToggle)
        : [...selectedAreas, areaToToggle];
      
      onAreasChange(newSelectedAreas);
    }
  };

  return (
    <div className="interactive-body-selector">
      <div className="body-selector-header">
        <h4>בחר איזה אזור בגוף אתה רוצה לעבוד:</h4>
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
        <Model
          type={currentSide}
          muscles={getSelectedMuscles()}
          onMuscleClick={handleMuscleClick}
          colors={['#8b5cf6', '#b38ed8', '#8762ab', '#6d4c7a']}
          style={{ width: '300px', height: '400px' }}
        />
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
