import React, { useState, useEffect } from 'react';

function CreateWorkout({ currentUser, onBackClick, selectedDate, selectedStartTime, selectedEndTime }) {
  // States
  const [isLoading, setIsLoading] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [alternativeOptions, setAlternativeOptions] = useState([]);
  const [error, setError] = useState('');

  // קבועים
  const SPORTS_TYPES = [
    { id: 1, name: 'כדורגל', icon: '⚽' },        // Soccer
    { id: 2, name: 'כדורסל', icon: '🏀' },       // Basketball  
    { id: 3, name: 'טיפוס', icon: '🧗' },         // Climbing
    { id: 4, name: 'חדר כושר', icon: '🏋️' },     // Strength Training
    { id: 5, name: 'קורדינציה', icon: '🎯' },    // Coordination
    { id: 6, name: 'טניס', icon: '🎾' },         // Tennis
    { id: 7, name: 'פינגפונג', icon: '🏓' },     // Ping Pong
    { id: 8, name: 'ריקוד', icon: '💃' },        // Dance
    { id: 9, name: 'אופניים', icon: '🚴' }       // Cycling
  ];

  // פונקציה לקבלת העדפות המשתמש
  const getUserPreferences = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/user-preferences/${userId}`);
      const data = await response.json();
      
      // יצירת מערך לפי סדר העדיפות
      const preferences = [];
      
      // מילוי העדפות שנבחרו לפי סדר הדירוג
      data.forEach(pref => {
        preferences.push(pref.sportType); // הוספת ID של סוג הספורט
      });
      
      // מילוי שאר הספורט שלא נבחרו
      for (let i = 1; i <= 9; i++) {
        if (!preferences.includes(i)) {
          preferences.push(i);
        }
      }
      
      return preferences;
    } catch (error) {
      console.error('שגיאה בקבלת העדפות:', error);
      // ברירת מחדל - כל הספורט בסדר
      return [1, 2, 3, 4, 5, 6, 7, 8, 9];
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
          sportType: court.sportType, // לא מחסירים 1 כי זה כבר ה-ID הנכון
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
      // משקל לפי מיקום במערך העדפות (אינדקס נמוך = אהוב יותר)
      weight += userPreferences.indexOf(sport) * 10;
      
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

  // פונקציה למציאת שם הספורט לפי ID
  const getSportName = (sportId) => {
    const sport = SPORTS_TYPES.find(s => s.id === sportId);
    return sport ? sport.name : 'לא ידוע';
  };

  // פונקציה למציאת אייקון הספורט לפי ID
  const getSportIcon = (sportId) => {
    const sport = SPORTS_TYPES.find(s => s.id === sportId);
    return sport ? sport.icon : '❓';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflowY: 'auto',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '300px',
        height: '300px',
        backgroundImage: 'url(/logo1.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        opacity: 0.1,
        filter: 'blur(3px)',
        zIndex: 0
      }}></div>
      
      <button 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.2)',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '25px',
          cursor: 'pointer',
          fontSize: '16px',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          zIndex: 1000
        }}
        onClick={onBackClick}
      >
        ← חזרה
      </button>

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '800px',
        margin: '0 auto',
        padding: '100px 20px 50px',
        color: 'white'
      }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '2.5rem',
          marginBottom: '30px',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          יצירת אימון
        </h1>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <p style={{ margin: '10px 0', fontSize: '18px' }}>תאריך: {selectedDate}</p>
          <p style={{ margin: '10px 0', fontSize: '18px' }}>זמן התחלה: {selectedStartTime}</p>
          <p style={{ margin: '10px 0', fontSize: '18px' }}>זמן סיום: {selectedEndTime}</p>
        </div>

        {isLoading && (
          <div style={{
            textAlign: 'center',
            fontSize: '20px',
            margin: '30px 0'
          }}>
            יוצר אימון...
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.2)',
            color: '#ff6b6b',
            padding: '15px',
            borderRadius: '10px',
            textAlign: 'center',
            margin: '20px 0',
            border: '1px solid rgba(255, 107, 107, 0.3)'
          }}>
            {error}
          </div>
        )}

        {workoutPlan && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '15px',
            padding: '30px',
            margin: '30px 0'
          }}>
            <h2 style={{
              textAlign: 'center',
              marginBottom: '25px',
              fontSize: '1.8rem'
            }}>
              תוכנית האימון שלך:
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              {workoutPlan.path.map((sportId, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <span style={{
                    fontSize: '2rem',
                    display: 'block',
                    marginBottom: '10px'
                  }}>
                    {getSportIcon(sportId)}
                  </span>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '5px'
                  }}>
                    {getSportName(sportId)}
                  </span>
                  <span style={{
                    fontSize: '14px',
                    opacity: 0.8
                  }}>
                    רבע שעה {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {alternativeOptions.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '15px',
            padding: '30px',
            margin: '30px 0'
          }}>
            <h2 style={{
              textAlign: 'center',
              marginBottom: '25px',
              fontSize: '1.8rem'
            }}>
              אופציות חלופיות:
            </h2>
            {alternativeOptions.map((option, index) => (
              <div key={index} style={{
                marginBottom: '30px',
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{
                  textAlign: 'center',
                  marginBottom: '20px',
                  color: '#b38ed8',
                  fontSize: '1.3rem'
                }}>
                  {option.type}
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px'
                }}>
                  {option.workout.path.map((sportId, slotIndex) => (
                    <div key={slotIndex} style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '20px',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <span style={{
                        fontSize: '2rem',
                        display: 'block',
                        marginBottom: '10px'
                      }}>
                        {getSportIcon(sportId)}
                      </span>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'block',
                        marginBottom: '5px'
                      }}>
                        {getSportName(sportId)}
                      </span>
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