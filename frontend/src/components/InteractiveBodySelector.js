import React, { useState } from 'react';
import { Body } from 'react-body-map';
import './InteractiveBodySelector.css';

const InteractiveBodySelector = ({ selectedAreas = [], onAreasChange }) => {
  const [currentSide, setCurrentSide] = useState('front');
  
  // מיפוי אזורי גוף שלנו לחלקי גוף בחבילה
  const bodyAreaMapping = {
    'back': ['upper-back-left', 'upper-back-right', 'lower-back-left', 'lower-back-right'],
    'shoulders': ['deltoids-left-front', 'deltoids-right-front', 'deltoids-left-back', 'deltoids-right-back'],
    'arms': ['biceps-left', 'biceps-right', 'triceps-left-front', 'triceps-right-front', 'triceps-left-back', 'triceps-right-back'],
    'chest': ['chest-left', 'chest-right'],
    'core': ['abs-upper', 'abs-lower', 'obliques-left', 'obliques-right'],
    'legs': ['quadriceps-left', 'quadriceps-right', 'adductors-left-front', 'adductors-right-front', 'adductors-left-back', 'adductors-right-back', 'gluteal-left', 'gluteal-right']
  };

  // המרת אזורי גוף נבחרים לחלקי גוף
  const getSelectedBodyParts = () => {
    const selectedParts = [];
    selectedAreas.forEach(area => {
      if (bodyAreaMapping[area]) {
        bodyAreaMapping[area].forEach(part => {
          selectedParts.push({ slug: part, intensity: 1 });
        });
      }
    });
    return selectedParts;
  };

  // טיפול בלחיצה על חלק גוף
  const handleBodyPartClick = (bodyPart) => {
    console.log('לחצו על חלק גוף:', bodyPart);
    
    const { slug } = bodyPart;
    
    // מצא איזה אזור גוף שייך לחלק הזה
    let areaToToggle = null;
    for (const [area, parts] of Object.entries(bodyAreaMapping)) {
      if (parts.includes(slug)) {
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
    }
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
      
      <div className="body-model-container">
        <Body
          data={getSelectedBodyParts()}
          side={currentSide}
          scale={1.0}
          onBodyPartPress={handleBodyPartClick}
          colors={['#8b5cf6', '#b38ed8', '#8762ab', '#6d4c7a']}
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
