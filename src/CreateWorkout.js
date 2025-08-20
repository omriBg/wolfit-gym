import React, { useState, useEffect } from 'react';
import './CreateWorkout.css';

// מיפוי מספרי הספורט לשמות עבריים (תואם לשרת)
const SPORT_MAPPING = {
  1: 'כדורגל',      // Soccer
  2: 'כדורסל',      // Basketball  
  3: 'טיפוס',       // Climbing
  4: 'חדר כושר',    // Strength Training
  5: 'קורדינציה',   // Coordination
  6: 'טניס',        // Tennis
  7: 'פינגפונג',    // Ping Pong
  8: 'ריקוד',       // Dance
  9: 'אופניים'      // Cycling
};

// Hungarian Algorithm Implementation
class HungarianAlgorithm {
  constructor(costMatrix) {
    this.matrix = costMatrix.map(row => [...row]); // deep copy
    this.n = this.matrix.length;
    this.assignment = new Array(this.n).fill(-1);
  }

  solve() {
    // Step 1: Subtract row minimums
    this.subtractRowMinimums();
    
    // Step 2: Subtract column minimums
    this.subtractColumnMinimums();
    
    // Step 3: Find optimal assignment
    let iteration = 0;
    while (!this.findOptimalAssignment() && iteration < 100) {
      this.improveAssignment();
      iteration++;
    }
    
    return this.assignment;
  }

  subtractRowMinimums() {
    for (let i = 0; i < this.n; i++) {
      const minVal = Math.min(...this.matrix[i].filter(val => val !== Infinity));
      if (minVal !== Infinity && minVal > 0) {
        for (let j = 0; j < this.n; j++) {
          if (this.matrix[i][j] !== Infinity) {
            this.matrix[i][j] -= minVal;
          }
        }
      }
    }
  }

  subtractColumnMinimums() {
    for (let j = 0; j < this.n; j++) {
      const column = [];
      for (let i = 0; i < this.n; i++) {
        if (this.matrix[i][j] !== Infinity) {
          column.push(this.matrix[i][j]);
        }
      }
      const minVal = column.length > 0 ? Math.min(...column) : 0;
      
      if (minVal > 0) {
        for (let i = 0; i < this.n; i++) {
          if (this.matrix[i][j] !== Infinity) {
            this.matrix[i][j] -= minVal;
          }
        }
      }
    }
  }

  findOptimalAssignment() {
    const assignment = new Array(this.n).fill(-1);
    const rowCovered = new Array(this.n).fill(false);
    const colCovered = new Array(this.n).fill(false);

    // Try to find assignment using zeros
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.matrix[i][j] === 0 && !rowCovered[i] && !colCovered[j]) {
          assignment[i] = j;
          rowCovered[i] = true;
          colCovered[j] = true;
        }
      }
    }

    // Check if we have a complete assignment
    const assignedCount = assignment.filter(val => val !== -1).length;
    if (assignedCount === this.n) {
      this.assignment = assignment;
      return true;
    }

    return false;
  }

  improveAssignment() {
    const rowCovered = new Array(this.n).fill(false);
    const colCovered = new Array(this.n).fill(false);

    // Mark rows and columns with zeros
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.matrix[i][j] === 0) {
          rowCovered[i] = true;
          colCovered[j] = true;
        }
      }
    }

    // Find minimum uncovered value
    let minUncovered = Infinity;
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (!rowCovered[i] && !colCovered[j] && this.matrix[i][j] !== Infinity) {
          minUncovered = Math.min(minUncovered, this.matrix[i][j]);
        }
      }
    }

    if (minUncovered !== Infinity && minUncovered > 0) {
      // Subtract from uncovered elements, add to double-covered
      for (let i = 0; i < this.n; i++) {
        for (let j = 0; j < this.n; j++) {
          if (!rowCovered[i] && !colCovered[j]) {
            this.matrix[i][j] -= minUncovered;
          } else if (rowCovered[i] && colCovered[j]) {
            this.matrix[i][j] += minUncovered;
          }
        }
      }
    }
  }
}

// Workout Scheduler Class with Sport-Based Grouping
class WorkoutScheduler {
  constructor(timeSlots, fieldsByTime, userPreferences) {
    this.timeSlots = timeSlots;
    this.fieldsByTime = fieldsByTime;
    this.userPreferences = userPreferences;
    this.sportSlots = this.createSportSlots();
  }

  createSportSlots() {
    const sportSlots = [];
    
    // יצירת רשימת ספורטים ייחודיים
    const uniqueSports = new Set();
    Object.values(this.fieldsByTime).forEach(fields => {
      fields.forEach(field => {
        uniqueSports.add(field.sportTypeId);
      });
    });
    
    // לכל ספורט, יצירת 2 "slotים" (שימוש ראשון ושני)
    Array.from(uniqueSports).forEach(sportTypeId => {
      // שימוש ראשון
      sportSlots.push({
        sportTypeId: sportTypeId,
        sportName: SPORT_MAPPING[sportTypeId] || `ספורט ${sportTypeId}`,
        usage: 1,
        slotId: `${sportTypeId}_1`
      });
      
      // שימוש שני
      sportSlots.push({
        sportTypeId: sportTypeId,
        sportName: SPORT_MAPPING[sportTypeId] || `ספורט ${sportTypeId}`,
        usage: 2,
        slotId: `${sportTypeId}_2`
      });
    });
    
    return sportSlots;
  }

  calculateWeight(timeSlot, sportSlot) {
    // בדיקה אם יש מגרש מהסוג הזה זמין באותו זמן
    const availableFields = this.fieldsByTime[timeSlot] || [];
    const hasAvailableField = availableFields.some(field => 
      field.sportTypeId === sportSlot.sportTypeId
    );
    
    if (!hasAvailableField) {
      return Infinity; // אין מגרש מהסוג הזה זמין
    }

    // חישוב משקל לפי העדיפות
    const preferenceIndex = this.userPreferences.indexOf(sportSlot.sportTypeId);
    let weight;
    
    if (preferenceIndex !== -1) {
      // מצא בהעדיפות
      weight = preferenceIndex + 1; // עדיפות ראשונה = 1, שנייה = 2, וכו'
    } else {
      // לא בהעדיפות
      weight = 9;
    }

    // הוספת עונש כפילות
    if (sportSlot.usage === 2) {
      weight += 10;
    }

    return weight;
  }

  createCostMatrix() {
    const numTimeSlots = this.timeSlots.length;
    const numSportSlots = this.sportSlots.length;
    const matrixSize = Math.max(numTimeSlots, numSportSlots);
    
    // יצירת מטריצה ריבועית
    const matrix = Array(matrixSize).fill().map(() => Array(matrixSize).fill(0));

    // מילוי המטריצה
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        if (i < numTimeSlots && j < numSportSlots) {
          // זמן אמיתי -> ספורט slot
          matrix[i][j] = this.calculateWeight(this.timeSlots[i], this.sportSlots[j]);
        } else if (i < numTimeSlots && j >= numSportSlots) {
          // זמן אמיתי -> זמן דמה
          matrix[i][j] = Infinity;
        } else {
          // זמן דמה -> כל דבר
          matrix[i][j] = 0;
        }
      }
    }

    return matrix;
  }

  solve() {
    console.log('מתחיל אלגוריתם Hungarian עם קיבוץ ספורטים...');
    console.log(`זמנים: ${this.timeSlots.length}, ספורט slots: ${this.sportSlots.length}`);
    
    const costMatrix = this.createCostMatrix();
    console.log('מטריצת עלויות נוצרה:', costMatrix.length + 'x' + costMatrix[0].length);
    
    const hungarian = new HungarianAlgorithm(costMatrix);
    const assignment = hungarian.solve();
    
    return this.parseAssignment(assignment);
  }

  findBestFieldForSport(timeSlot, sportTypeId) {
    const availableFields = this.fieldsByTime[timeSlot] || [];
    const suitableFields = availableFields.filter(field => 
      field.sportTypeId === sportTypeId
    );
    
    // אם יש מגרשים מתאימים, בחר את הראשון (אפשר להוסיף לוגיקה נוספת)
    return suitableFields.length > 0 ? suitableFields[0] : null;
  }

  parseAssignment(assignment) {
    const result = [];
    const usedSports = new Map(); // ספירת שימושים לכל ספורט
    
    for (let i = 0; i < this.timeSlots.length; i++) {
      const timeSlot = this.timeSlots[i];
      const assignedSlotIndex = assignment[i];
      
      if (assignedSlotIndex !== -1 && assignedSlotIndex < this.sportSlots.length) {
        const sportSlot = this.sportSlots[assignedSlotIndex];
        
        // מציאת מגרש ספציפי לספורט הזה
        const selectedField = this.findBestFieldForSport(timeSlot, sportSlot.sportTypeId);
        
        if (selectedField) {
          // עדכון ספירת השימושים
          const currentUsage = usedSports.get(sportSlot.sportTypeId) || 0;
          usedSports.set(sportSlot.sportTypeId, currentUsage + 1);
          
          result.push({
            time: timeSlot,
            field: selectedField,
            sportType: sportSlot.sportName,
            usage: currentUsage + 1,
            weight: this.calculateWeight(timeSlot, sportSlot)
          });
        } else {
          result.push({
            time: timeSlot,
            field: null,
            reason: 'לא נמצא מגרש מתאים'
          });
        }
      } else {
        result.push({
          time: timeSlot,
          field: null,
          reason: 'לא נמצא שיבוץ אופטימלי'
        });
      }
    }
    
    return {
      slots: result,
      totalSlots: result.length,
      successfulSlots: result.filter(slot => slot.field !== null).length,
      totalCost: result.reduce((sum, slot) => sum + (slot.weight || 0), 0),
      sportsUsage: Object.fromEntries(usedSports)
    };
  }
}

function CreateWorkout({ user, selectedDate, startTime, endTime, onBackClick }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [userPreferences, setUserPreferences] = useState([]);
  const [fieldsByTime, setFieldsByTime] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    console.log('CreateWorkout נטען עם:', {
      user: user?.userName,
      selectedDate,
      startTime,
      endTime
    });
    
    initializeWorkoutData();
  }, []);

  const initializeWorkoutData = async () => {
    try {
      setLoading(true);
      setError('');
      
      await loadUserPreferences();
      const slots = createTimeSlots();
      setTimeSlots(slots);
      await loadAvailableFields(slots);
      
      console.log('טעינת נתונים הושלמה');
      
    } catch (err) {
      console.error('שגיאה בטעינת נתונים:', err);
      setError('שגיאה בטעינת נתונים. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      if (!user || !user.id) {
        throw new Error('משתמש לא מוגדר');
      }
      
      const url = `https://wolfit-gym-backend-ijvq.onrender.com/api/user-preferences/${user.id}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setUserPreferences(data.data.selectedSports || []);
      } else {
        setUserPreferences([]);
      }
    } catch (error) {
      console.error('שגיאה בטעינת העדפות:', error);
      setUserPreferences([]);
      throw error;
    }
  };

  const createTimeSlots = () => {
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += 15) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
    
    return slots;
  };

  const loadAvailableFields = async (timeSlots) => {
    try {
      console.log('טוען מגרשים זמינים...');
      
      const response = await fetch('https://wolfit-gym-backend-ijvq.onrender.com/api/available-fields-for-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate,
          timeSlots: timeSlots
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setFieldsByTime(data.fieldsByTime);
          console.log('מגרשים נטענו בהצלחה');
          return;
        } else {
          throw new Error(data.message);
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('שגיאה בטעינת מגרשים:', error);
      throw error;
    }
  };

  const generateOptimalWorkout = () => {
    console.log('מתחיל אלגוריתם אופטימלי עם קיבוץ ספורטים...');
    
    if (timeSlots.length === 0 || Object.keys(fieldsByTime).length === 0) {
      console.log('אין נתונים זמינים');
      return null;
    }

    const scheduler = new WorkoutScheduler(timeSlots, fieldsByTime, userPreferences);
    const result = scheduler.solve();
    
    console.log('תוצאות האלגוריתם:', result);
    return result;
  };

  const generateWorkout = async () => {
    if (timeSlots.length === 0 || Object.keys(fieldsByTime).length === 0) {
      setError('לא נטענו נתונים. אנא רענן את הדף.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      console.log('מתחיל ליצור תוכנית אימון אופטימלית...');
      
      // הוספת השהיה קלה לUX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const optimalWorkout = generateOptimalWorkout();
      
      if (optimalWorkout && optimalWorkout.successfulSlots > 0) {
        setWorkoutPlan(optimalWorkout);
        console.log('תוכנית אימון אופטימלית נוצרה בהצלחה');
      } else {
        setError('לא הצליח ליצור תוכנית אימון מתאימה');
      }
      
    } catch (error) {
      console.error('שגיאה ביצירת אימון:', error);
      setError('שגיאה ביצירת האימון. אנא נסה שוב.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveWorkoutToDatabase = async () => {
    if (!workoutPlan || !user || !user.id) {
      setError('אין תוכנית אימון או משתמש לא מוגדר');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const bookings = workoutPlan.slots
        .filter(slot => slot.field !== null)
        .map(slot => ({
          idField: slot.field.id,
          bookingDate: selectedDate,
          startTime: slot.time,
          idUser: user.id
        }));

      if (bookings.length === 0) {
        setError('אין מגרשים לשמירה');
        setIsSaving(false);
        return;
      }

      const requestBody = {
        bookings: bookings,
        userId: user.id,
        date: selectedDate
      };

      const response = await fetch('https://wolfit-gym-backend-ijvq.onrender.com/api/book-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          if (onBackClick) {
            onBackClick();
          }
        }, 2000);
      } else {
        setError(`שגיאה בשמירת האימון: ${data.message}`);
      }

    } catch (error) {
      console.error('שגיאה בשמירת האימון:', error);
      setError(`שגיאה בשמירת האימון: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const canCreateWorkout = () => {
    return !loading && timeSlots.length > 0 && Object.keys(fieldsByTime).length > 0;
  };

  if (loading) {
    return (
      <div className="create-workout-container">
        <button className="back-button" onClick={onBackClick}>חזרה</button>
        <div className="content">
          <h1>טוען נתונים...</h1>
          <p>אנא המתן בזמן שאנו טוענים את המידע הדרוש ליצירת האימון</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-workout-container">
      <button className="back-button" onClick={onBackClick}>
        חזרה
      </button>
      
      <div className="content">
        <h1>יוצר אימון מותאם אישית (אלגוריתם אופטימלי עם קיבוץ ספורטים)</h1>
        
        <div className="workout-info">
          <div className="info-card">
            <h3>פרטי האימון</h3>
            <p><strong>תאריך:</strong> {selectedDate}</p>
            <p><strong>שעה:</strong> {startTime} - {endTime}</p>
            <p><strong>משתמש:</strong> {user.userName}</p>
            <p><strong>רבעי שעה:</strong> {timeSlots.length}</p>
          </div>
          
          <div className="info-card">
            <h3>העדפות המשתמש</h3>
            {userPreferences.length > 0 ? (
              <p>ספורטים מועדפים: {userPreferences.map((sportId, index) => 
                `${index + 1}. ${SPORT_MAPPING[sportId] || sportId}`
              ).join(', ')}</p>
            ) : (
              <p>אין העדפות שמורות</p>
            )}
          </div>
          
          <div className="info-card">
            <h3>מגרשים זמינים</h3>
            <p>נמצאו מגרשים ל-{Object.keys(fieldsByTime).length} רבעי שעה</p>
            {Object.entries(fieldsByTime).slice(0, 3).map(([time, fields]) => (
              <div key={time} className="time-fields">
                <strong>{time}:</strong> {fields.length} מגרשים
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ 
            color: '#ff6b6b', 
            textAlign: 'center', 
            margin: '20px 0',
            padding: '15px',
            background: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 107, 107, 0.3)'
          }}>
            {error}
          </div>
        )}

        <div className="action-buttons">
          <button
            className="generate-button"
            onClick={generateWorkout}
            disabled={isGenerating || !canCreateWorkout()}
          >
            {isGenerating ? 'יוצר אימון אופטימלי...' : 'צור תוכנית אימון אופטימלית (ללא כפילות ספורט)'}
          </button>
        </div>

        {workoutPlan && (
          <div className="workout-result">
            <h2>תוכנית האימון האופטימלית שלך</h2>
            
            <div className="total-weight">
              הצלחנו ליצור {workoutPlan.successfulSlots} מתוך {workoutPlan.totalSlots} רבעי שעה
              <br />
              ניקוד כולל: {workoutPlan.totalCost} (ככל שקטן יותר - כך טוב יותר)
            </div>

            {workoutPlan.sportsUsage && (
              <div className="sports-summary">
                <h3>סיכום שימוש בספורטים:</h3>
                {Object.entries(workoutPlan.sportsUsage).map(([sportId, count]) => (
                  <div key={sportId}>
                    {SPORT_MAPPING[sportId] || `ספורט ${sportId}`}: {count} פעמים
                  </div>
                ))}
              </div>
            )}
            
            <div className="workout-timeline">
              {workoutPlan.slots.map((slot, index) => (
                <div key={index} className="time-slot">
                  <div className="time">{slot.time}</div>
                  <div className="field-info">
                    {slot.field ? (
                      <>
                        <strong>{slot.field.name}</strong>
                        <span>ספורט: {slot.sportType}</span>
                        <span>שימוש: {slot.usage}/2</span>
                        {slot.weight !== undefined && (
                          <span style={{fontSize: '0.8rem', opacity: 0.7}}>
                            ניקוד: {slot.weight}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <strong style={{color: '#ff6b6b'}}>לא זמין</strong>
                        <span>{slot.reason || 'לא נמצא מגרש'}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {saveSuccess ? (
              <div style={{ 
                color: '#51cf66', 
                textAlign: 'center', 
                margin: '20px 0',
                padding: '15px',
                background: 'rgba(81, 207, 102, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(81, 207, 102, 0.3)'
              }}>
                האימון נשמר בהצלחה! מעביר אותך לתפריט הראשי...
              </div>
            ) : (
              <div className="action-buttons" style={{ marginTop: '20px' }}>
                <button
                  className="generate-button"
                  onClick={saveWorkoutToDatabase}
                  disabled={isSaving}
                  style={{ 
                    backgroundColor: '#51cf66',
                    borderColor: '#51cf66'
                  }}
                >
                  {isSaving ? 'שומר אימון...' : 'אישור ושמירת האימון'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateWorkout;