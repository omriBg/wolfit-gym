import React, { useState, useEffect } from 'react';
import './CreateWorkout.css';

function CreateWorkout({ currentUser, onBackClick, selectedDate, selectedStartTime, selectedEndTime }) {
  // States
  const [isLoading, setIsLoading] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [alternativeOptions, setAlternativeOptions] = useState([]);
  const [error, setError] = useState('');

  // קבועים
  const SPORTS_TYPES = [
    { id: 0, name: 'כדורגל', icon: '⚽' },
    { id: 1, name: 'כדורסל', icon: '🏀' },
    { id: 2, name: 'טניס', icon: '🎾' },
    { id: 3, name: 'שחייה', icon: '🏊' },
    { id: 4, name: 'ריצה', icon: '🏃' },
    { id: 5, name: 'יוגה', icon: '🧘' },
    { id: 6, name: 'אימון כוח', icon: '🏋️' },
    { id: 7, name: 'רכיבה', icon: '🚴' },
    { id: 8, name: 'פילאטיס', icon: '🤸' }
  ];

  // פונקציה לקבלת העדפות המשתמש
  const getUserPreferences = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/user-preferences/${userId}`);
      const data = await response.json();
      
      // יצירת מערך דירוג [0,1,2,3,4,5,6,7,8]
      const preferences = new Array(9).fill(-1); // -1 = לא נבחר
      
      // מילוי העדפות שנבחרו
      data.forEach(pref => {
        preferences[pref.sportType - 1] = pref.preferenceRank;
      });
      
      // מילוי ספורט שלא נבחרו בסוף המערך
      let nextRank = data.length; // מתחיל מהדירוג הבא
      
      for (let i = 0; i < preferences.length; i++) {
        if (preferences[i] === -1) {
          preferences[i] = nextRank;
          nextRank++;
        }
      }
      
      return preferences;
    } catch (error) {
      console.error('שגיאה בקבלת העדפות:', error);
      // ברירת מחדל - כל הספורט בסוף המערך
      return [0, 1, 2, 3, 4, 5, 6, 7, 8];
    }
  };

  // פונקציה לקבלת זמינות מגרשים
  const getCourtAvailability = async (date, startTime, endTime) => {
    try {
      const response = await fetch(`http://localhost:3001/api/court-availability?date=${date}&startTime=${startTime}&endTime=${endTime}`);
      const data = await response.json();
      
      // המרה למבנה נוח לעבודה
      const availability = {};
      
      data.forEach(court => {
        if (!availability[court.startTime]) {
          availability[court.startTime] = [];
        }
        availability[court.startTime].push({
          fieldId: court.idField,
          sportType: court.sportType - 1, // המרה ל-0-8
          fieldName: court.fieldName
        });
      });
      
      return availability;
    } catch (error) {
      console.error('שגיאה בקבלת זמינות:', error);
      return {};
    }
  };

  // פונקציה לחישוב משקל מסלול
  const calculatePathWeight = (path, userPreferences) => {
    let weight = 0;
    const usedSports = new Set();
    
    path.forEach(sport => {
      weight += userPreferences[sport] * 10;
      
      if (usedSports.has(sport)) {
        weight += 1000; // קנס כפילות
      }
      usedSports.add(sport);
    });
    
    return weight;
  };

  // פונקציה ליצירת מסלולים אפשריים
  const generatePossiblePaths = (availability, startTime, endTime) => {
    const paths = [];
    const timeSlots = getTimeSlots(startTime, endTime);
    
    // יצירת כל המסלולים האפשריים עם אילוץ גיוון
    const generatePathsRecursive = (currentPath, currentTimeIndex, usedSports) => {
      if (currentTimeIndex >= timeSlots.length) {
        paths.push([...currentPath]);
        return;
      }
      
      const currentTime = timeSlots[currentTimeIndex];
      const availableSports = availability[currentTime] || [];
      
      for (const sport of availableSports) {
        if (!usedSports.has(sport.sportType)) {
          usedSports.add(sport.sportType);
          currentPath.push(sport.sportType);
          
          generatePathsRecursive(currentPath, currentTimeIndex + 1, usedSports);
          
          usedSports.delete(sport.sportType);
          currentPath.pop();
        }
      }
    };
    
    generatePathsRecursive([], 0, new Set());
    return paths;
  };

  // פונקציה ליצירת רשימת זמנים
  const getTimeSlots = (startTime, endTime) => {
    const slots = [];
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    while (start < end) {
      slots.push(start.toTimeString().slice(0, 5));
      start.setMinutes(start.getMinutes() + 15);
    }
    
    return slots;
  };

  // פונקציה למציאת הפתרון הטוב ביותר
  const findBestWorkout = async (date, startTime, endTime, userPreferences) => {
    try {
      const availability = await getCourtAvailability(date, startTime, endTime);
      const possiblePaths = generatePossiblePaths(availability, startTime, endTime);
      
      if (possiblePaths.length === 0) {
        return null;
      }
      
      const pathsWithWeights = possiblePaths.map(path => ({
        path: path,
        weight: calculatePathWeight(path, userPreferences)
      }));
      
      const bestPath = pathsWithWeights.reduce((best, current) => 
        current.weight < best.weight ? current : best
      );
      
      return bestPath;
    } catch (error) {
      console.error('שגיאה במציאת אימון:', error);
      return null;
    }
  };

  // פונקציה למציאת אופציות חלופיות
  const findAlternativeOptions = async (date, startTime, endTime, userPreferences) => {
    const alternatives = [];
    
    // נסה קיצור אימון
    const shorterEndTime = new Date(`2000-01-01T${endTime}`);
    shorterEndTime.setMinutes(shorterEndTime.getMinutes() - 30);
    const shorterWorkout = await findBestWorkout(date, startTime, shorterEndTime.toTimeString().slice(0, 5), userPreferences);
    if (shorterWorkout) {
      alternatives.push({ type: 'קיצור אימון', workout: shorterWorkout });
    }
    
    // נסה הזזת זמן מוקדמת
    const earlierStartTime = new Date(`2000-01-01T${startTime}`);
    earlierStartTime.setMinutes(earlierStartTime.getMinutes() - 30);
    const earlierWorkout = await findBestWorkout(date, earlierStartTime.toTimeString().slice(0, 5), endTime, userPreferences);
    if (earlierWorkout) {
      alternatives.push({ type: 'הזזה מוקדמת', workout: earlierWorkout });
    }
    
    // נסה הזזת זמן מאוחרת
    const laterStartTime = new Date(`2000-01-01T${startTime}`);
    laterStartTime.setMinutes(laterStartTime.getMinutes() + 30);
    const laterWorkout = await findBestWorkout(date, laterStartTime.toTimeString().slice(0, 5), endTime, userPreferences);
    if (laterWorkout) {
      alternatives.push({ type: 'הזזה מאוחרת', workout: laterWorkout });
    }
    
    return alternatives;
  };

  // פונקציה ליצירת אימון
  const createWorkout = async () => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      setError('לא נבחר תאריך וזמן');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userPreferences = await getUserPreferences(currentUser.id);
      const bestWorkout = await findBestWorkout(selectedDate, selectedStartTime, selectedEndTime, userPreferences);

      if (bestWorkout && bestWorkout.weight < 1000) {
        setWorkoutPlan(bestWorkout);
        setAlternativeOptions([]);
      } else {
        const alternatives = await findAlternativeOptions(selectedDate, selectedStartTime, selectedEndTime, userPreferences);
        setAlternativeOptions(alternatives);
        setWorkoutPlan(null);
      }

    } catch (error) {
      setError('שגיאה ביצירת האימון');
    } finally {
      setIsLoading(false);
    }
  };

  // יצירת אימון אוטומטית כשהקומפוננטה נטענת
  useEffect(() => {
    if (selectedDate && selectedStartTime && selectedEndTime) {
      createWorkout();
    }
  }, [selectedDate, selectedStartTime, selectedEndTime]);

  return (
    <div className="create-workout-container">
      <div className="background-logo"></div>
      <button className="back-button" onClick={onBackClick}>← חזרה</button>

      <div className="content">
        <h1>יצירת אימון</h1>
        
        <div className="selected-details">
          <p>תאריך: {selectedDate}</p>
          <p>זמן התחלה: {selectedStartTime}</p>
          <p>זמן סיום: {selectedEndTime}</p>
        </div>

        {isLoading && <div className="loading">יוצר אימון...</div>}

        {error && <div className="error-message">{error}</div>}

        {workoutPlan && (
          <div className="workout-plan">
            <h2>תוכנית האימון שלך:</h2>
            <div className="workout-slots">
              {workoutPlan.path.map((sportId, index) => (
                <div key={index} className="workout-slot">
                  <span className="sport-icon">{SPORTS_TYPES[sportId].icon}</span>
                  <span className="sport-name">{SPORTS_TYPES[sportId].name}</span>
                  <span className="time-slot">רבע שעה {index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {alternativeOptions.length > 0 && (
          <div className="alternative-options">
            <h2>אופציות חלופיות:</h2>
            {alternativeOptions.map((option, index) => (
              <div key={index} className="alternative-option">
                <h3>{option.type}</h3>
                <div className="workout-slots">
                  {option.workout.path.map((sportId, slotIndex) => (
                    <div key={slotIndex} className="workout-slot">
                      <span className="sport-icon">{SPORTS_TYPES[sportId].icon}</span>
                      <span className="sport-name">{SPORTS_TYPES[sportId].name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateWorkout;