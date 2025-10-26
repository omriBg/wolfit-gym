import React, { useState } from 'react';
import Model, { ModelType, MuscleType } from 'react-body-highlighter';
import './InteractiveBodySelector.css';

const InteractiveBodySelector = ({ selectedAreas = [], onAreasChange, selectedFitnessComponents = [], onFitnessComponentsChange }) => {
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

  // רשימת מרכיבי כשירות
  const fitnessComponents = [
    { id: 'strength', name: 'כוח', color: '#8b5cf6' },
    { id: 'speed', name: 'מהירות', color: '#b38ed8' },
    { id: 'power', name: 'כוח מתפרץ', color: '#8762ab' },
    { id: 'muscular_endurance', name: 'סיבולת שריר', color: '#6d4c7a' },
    { id: 'cardio_endurance', name: 'סיבולת לב ריאה', color: '#8b5cf6' },
    { id: 'flexibility', name: 'גמישות', color: '#b38ed8' },
    { id: 'coordination', name: 'קואורדינציה', color: '#8762ab' },
    { id: 'balance', name: 'שיווי משקל', color: '#6d4c7a' },
    { id: 'agility', name: 'אגיליטי', color: '#8b5cf6' },
    { id: 'motor_accuracy', name: 'דיוק מוטורי', color: '#b38ed8' }
  ];

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

  // טיפול בלחיצה על מרכיב כשירות
  const handleFitnessComponentClick = (componentId) => {
    console.log('לחצו על מרכיב כשירות:', componentId);
    const newSelectedComponents = selectedFitnessComponents.includes(componentId)
      ? selectedFitnessComponents.filter(component => component !== componentId)
      : [...selectedFitnessComponents, componentId];
    
    console.log('מרכיבי כשירות חדשים:', newSelectedComponents);
    onFitnessComponentsChange(newSelectedComponents);
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
        <div style={{ position: 'relative', minHeight: '500px' }}>
          <Model
            type={currentSide}
            muscles={getSelectedMuscles()}
            onMuscleClick={handleMuscleClick}
            colors={['#8b5cf6', '#b38ed8', '#8762ab', '#6d4c7a']}
            style={{ width: '400px', height: '500px', cursor: 'pointer' }}
          />
          
          {/* שכבה שקופה מעל המודל לטיפול בלחיצות */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '400px',
              height: '500px',
              background: 'transparent',
              cursor: 'pointer',
              zIndex: 10
            }}
            onClick={(e) => {
              // קבל את המיקום של הלחיצה
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              
              console.log('לחצו על המודל במיקום:', x, y);
              
              // מיפוי מיקומים לאזורי גוף (פשוט)
              let clickedArea = null;
              
              // חזה (מרכז העליון - רק בחזית)
              if (currentSide === ModelType.ANTERIOR && x >= 150 && x <= 250 && y >= 100 && y <= 200) {
                clickedArea = 'chest';
              }
              // גב (מרכז העליון - רק בצד האחורי)
              else if (currentSide === ModelType.POSTERIOR && x >= 150 && x <= 250 && y >= 100 && y <= 200) {
                clickedArea = 'back';
              }
              // בטן/ליבה (מרכז)
              else if (x >= 160 && x <= 240 && y >= 200 && y <= 280) {
                clickedArea = 'core';
              }
              // כתפיים (צדדים עליונים)
              else if ((x >= 120 && x <= 180 && y >= 80 && y <= 140) || 
                       (x >= 220 && x <= 280 && y >= 80 && y <= 140)) {
                clickedArea = 'shoulders';
              }
              // ידיים (צדדים)
              else if ((x >= 80 && x <= 140 && y >= 120 && y <= 300) || 
                       (x >= 260 && x <= 320 && y >= 120 && y <= 300)) {
                clickedArea = 'arms';
              }
              // רגליים (תחתון)
              else if ((x >= 150 && x <= 200 && y >= 300 && y <= 450) || 
                       (x >= 200 && x <= 250 && y >= 300 && y <= 450)) {
                clickedArea = 'legs';
              }
              
              if (clickedArea) {
                console.log('נבחר אזור:', clickedArea);
                const newSelectedAreas = selectedAreas.includes(clickedArea)
                  ? selectedAreas.filter(area => area !== clickedArea)
                  : [...selectedAreas, clickedArea];
                
                console.log('אזורים חדשים:', newSelectedAreas);
                onAreasChange(newSelectedAreas);
              }
            }}
          />
          
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

      {/* בחירת מרכיבי כשירות */}
      <div className="fitness-components-section">
        <h4>בחר מרכיבי כשירות שאתה רוצה לעבוד עליהם:</h4>
        <div className="fitness-components-grid">
          {fitnessComponents.map(component => (
            <button
              key={component.id}
              onClick={() => handleFitnessComponentClick(component.id)}
              className={`fitness-component-btn ${selectedFitnessComponents.includes(component.id) ? 'selected' : ''}`}
              style={{
                background: selectedFitnessComponents.includes(component.id)
                  ? `linear-gradient(45deg, ${component.color}, ${component.color}dd)`
                  : 'rgba(255,255,255,0.1)',
                border: selectedFitnessComponents.includes(component.id)
                  ? `2px solid ${component.color}`
                  : '2px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '12px 16px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                minWidth: '120px',
                boxShadow: selectedFitnessComponents.includes(component.id)
                  ? `0 0 15px ${component.color}40`
                  : 'none'
              }}
              onMouseEnter={(e) => {
                if (!selectedFitnessComponents.includes(component.id)) {
                  e.target.style.background = 'rgba(255,255,255,0.2)';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!selectedFitnessComponents.includes(component.id)) {
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {component.name}
            </button>
          ))}
        </div>
      </div>

      <div className="selected-fitness-components-display">
        <h5>מרכיבי כשירות נבחרים:</h5>
        <div className="selected-fitness-components-list">
          {selectedFitnessComponents.length === 0 ? (
            <p>לא נבחרו מרכיבי כשירות</p>
          ) : (
            selectedFitnessComponents.map(componentId => {
              const component = fitnessComponents.find(c => c.id === componentId);
              return (
                <span key={componentId} className="selected-fitness-component-tag">
                  {component?.name}
                </span>
              );
            })
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
