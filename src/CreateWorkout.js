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

function CreateWorkout({ user, selectedDate, startTime, endTime, onBackClick }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [userPreferences, setUserPreferences] = useState([]);
  const [fieldsByTime, setFieldsByTime] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('🚀 CreateWorkout נטען עם:', {
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
      
      console.log('✅ טעינת נתונים הושלמה');
      
    } catch (err) {
      console.error('❌ שגיאה בטעינת נתונים:', err);
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
      
      const url = `http://localhost:3001/api/user-preferences/${user.id}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setUserPreferences(data.data.selectedSports || []);
      } else {
        setUserPreferences([]);
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת העדפות:', error);
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

  const createTimeSlotsForRange = (start, end) => {
    const slots = [];
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
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
      const response = await fetch('http://localhost:3001/api/available-fields-for-workout', {
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
          return;
        }
      }
      
      const mockFieldsByTime = {};
      timeSlots.forEach(time => {
        mockFieldsByTime[time] = [
          { id: 1, name: 'מגרש כדורגל 1', sportType: 'כדורגל' },
          { id: 2, name: 'מגרש כדורסל 1', sportType: 'כדורסל' },
          { id: 3, name: 'חדר כושר 1', sportType: 'חדר כושר' },
          { id: 4, name: 'מגרש טניס 1', sportType: 'טניס' },
          { id: 5, name: 'אולם ריקוד', sportType: 'ריקוד' }
        ];
      });
      
      setFieldsByTime(mockFieldsByTime);
      
    } catch (error) {
      console.error('❌ שגיאה בטעינת מגרשים:', error);
      throw error;
    }
  };

  const loadFieldsForTimeSlots = async (timeSlots, date) => {
    try {
      const response = await fetch('http://localhost:3001/api/available-fields-for-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date,
          timeSlots: timeSlots
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data.fieldsByTime;
        }
      }
      
      const mockFieldsByTime = {};
      timeSlots.forEach(time => {
        mockFieldsByTime[time] = [
          { id: 1, name: 'מגרש כדורגל 1', sportType: 'כדורגל' },
          { id: 2, name: 'מגרש כדורסל 1', sportType: 'כדורסל' },
          { id: 3, name: 'חדר כושר 1', sportType: 'חדר כושר' },
          { id: 4, name: 'מגרש טניס 1', sportType: 'טניס' },
          { id: 5, name: 'אולם ריקוד', sportType: 'ריקוד' }
        ];
      });
      
      return mockFieldsByTime;
      
    } catch (error) {
      console.error('❌ שגיאה בטעינת מגרשים:', error);
      return {};
    }
  };

  const calculateScore = (field, userPreferences, usedSports, selectedWorkout) => {
    let score = 100; // ניקוד בסיס גבוה (רע)
    
    console.log(`🧮 מחשב ניקוד למגרש: ${field.name} (${field.sportType})`);
    
    // המרת העדפות המשתמש ממספרים לשמות עבריים
    const userSportNames = userPreferences.map(sportId => SPORT_MAPPING[sportId]).filter(Boolean);
    console.log(`📋 העדפות משתמש בעברית:`, userSportNames);
    
    // בדיקת עדיפות - החזרה להשוואת שמות
    const preferenceIndex = userSportNames.indexOf(field.sportType);
    if (preferenceIndex !== -1) {
      score = preferenceIndex * 10; // עדיפות 1 = 0, עדיפות 2 = 10, וכו'
      console.log(`✅ נמצא בעדיפות ${preferenceIndex + 1}, ניקוד בסיס: ${score}`);
    } else {
      console.log(`❌ לא נמצא בעדיפות (ספורט: ${field.sportType}), ניקוד בסיס: ${score}`);
    }
    
    // קנס כפילויות
    const timesUsed = usedSports.filter(sport => sport === field.sportType).length;
    if (timesUsed > 0) {
      score += 50;
      console.log(`🔄 קנס כפילות: +50 (השתמשנו ${timesUsed} פעמים), ניקוד כולל: ${score}`);
    }
    
    // קנס רצף
    if (selectedWorkout.length > 0) {
      const lastWorkout = selectedWorkout[selectedWorkout.length - 1];
      if (lastWorkout.field && lastWorkout.field.sportType === field.sportType) {
        score += 30;
        console.log(`⭐ קנס רצף: +30, ניקוד סופי: ${score}`);
      }
    }
    
    console.log(`📊 ניקוד סופי למגרש ${field.name}: ${score}`);
    return score;
  };

  const runSmartAlgorithm = (timeSlots, fieldsByTime, userPreferences) => {
    const selectedWorkout = [];
    const usedSports = [];
    
    console.log('🧠 מתחיל אלגוריתם חכם...');
    console.log('🎯 העדפות משתמש (IDs):', userPreferences);
    
    // המרת העדפות למערך שמות עבריים לבדיקה
    const userSportNames = userPreferences.map(sportId => SPORT_MAPPING[sportId]).filter(Boolean);
    console.log('🎯 העדפות משתמש (עברית):', userSportNames);
    
    for (let i = 0; i < timeSlots.length; i++) {
      const timeSlot = timeSlots[i];
      const availableFields = fieldsByTime[timeSlot] || [];
      
      console.log(`\n⏰ מעבד זמן: ${timeSlot}`);
      console.log(`🏟️ מגרשים זמינים: ${availableFields.length}`);
      availableFields.forEach(field => {
        console.log(`  - ${field.name} (${field.sportType})`);
      });
      
      if (availableFields.length === 0) {
        console.log('❌ אין מגרשים זמינים בזמן זה');
        selectedWorkout.push({
          time: timeSlot,
          field: null,
          needsAlternative: true,
          reason: 'אין מגרשים זמינים'
        });
        continue;
      }
      
      let bestChoice = null;
      let bestScore = 999;
      
      console.log('🔍 מחשב ניקודים:');
      for (const field of availableFields) {
        const score = calculateScore(field, userPreferences, usedSports, selectedWorkout);
        
        console.log(`${field.name}: ${score}`);
        
        if (score < bestScore) {
          bestScore = score;
          bestChoice = field;
          console.log(`🥇 מגרש חדש בראש: ${field.name} עם ניקוד ${score}`);
        }
      }
      
      if (bestChoice) {
        console.log(`✅ נבחר: ${bestChoice.name} (${bestChoice.sportType}) עם ניקוד ${bestScore}`);
        selectedWorkout.push({
          time: timeSlot,
          field: bestChoice,
          score: bestScore
        });
        usedSports.push(bestChoice.sportType);
        console.log(`📝 ספורטים שנוצרו עד כה:`, usedSports);
      }
    }
    
    return {
      slots: selectedWorkout,
      totalSlots: selectedWorkout.length,
      successfulSlots: selectedWorkout.filter(slot => slot.field !== null).length
    };
  };

  const adjustTime = (timeStr, minutesOffset) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + minutesOffset;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const calculateDuration = (start, end) => {
    const [startHours, startMinutes] = start.split(':').map(Number);
    const [endHours, endMinutes] = end.split(':').map(Number);
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    return endTotal - startTotal;
  };

  const generateTimeAlternatives = (originalStart, originalEnd) => {
    const alternatives = [];
    const originalDuration = calculateDuration(originalStart, originalEnd);
    
    alternatives.push({
      type: 'הקדמה קלה',
      startTime: adjustTime(originalStart, -15),
      endTime: adjustTime(originalEnd, -15)
    });
    
    alternatives.push({
      type: 'דחייה קלה',
      startTime: adjustTime(originalStart, 15),
      endTime: adjustTime(originalEnd, 15)
    });
    
    alternatives.push({
      type: 'הקדמה חזקה',
      startTime: adjustTime(originalStart, -30),
      endTime: adjustTime(originalEnd, -30)
    });
    
    alternatives.push({
      type: 'דחייה חזקה',
      startTime: adjustTime(originalStart, 30),
      endTime: adjustTime(originalEnd, 30)
    });
    
    const minimumWorkout = 30;
    const maxReduction = originalDuration - minimumWorkout;
    
    if (maxReduction >= 15) {
      alternatives.push({
        type: 'קיצור קל',
        startTime: originalStart,
        endTime: adjustTime(originalEnd, -15)
      });
    }
    
    if (maxReduction >= 30) {
      alternatives.push({
        type: 'קיצור חזק',
        startTime: originalStart,
        endTime: adjustTime(originalEnd, -30)
      });
    }
    
    return alternatives;
  };

  const isWorkoutValid = (workout) => {
    if (!workout || !workout.slots) return false;
    const validSlots = workout.slots.filter(slot => slot.field !== null);
    return validSlots.length >= Math.ceil(workout.totalSlots * 0.7);
  };

  const createSmartWorkout = async () => {
    console.log('🧠 מתחיל אלגוריתם חכם...');
    
    if (timeSlots.length === 0 || Object.keys(fieldsByTime).length === 0) {
      console.log('❌ אין נתונים זמינים לאלגוריתם');
      return null;
    }
    
    const originalWorkout = runSmartAlgorithm(timeSlots, fieldsByTime, userPreferences);
    
    if (isWorkoutValid(originalWorkout)) {
      console.log('✅ אלגוריתם הצליח בזמן המקורי');
      return originalWorkout;
    }
    
    console.log('🔄 מחפש חלופות זמן...');
    const alternatives = generateTimeAlternatives(startTime, endTime);
    
    for (const alternative of alternatives) {
      console.log(`🕐 בודק חלופה: ${alternative.startTime} - ${alternative.endTime}`);
      
      try {
        const altTimeSlots = createTimeSlotsForRange(alternative.startTime, alternative.endTime);
        const altFieldsByTime = await loadFieldsForTimeSlots(altTimeSlots, selectedDate);
        const altWorkout = runSmartAlgorithm(altTimeSlots, altFieldsByTime, userPreferences);
        
        if (isWorkoutValid(altWorkout)) {
          console.log('✅ נמצאה חלופת זמן מתאימה');
          return {
            ...altWorkout,
            isAlternative: true,
            alternativeType: alternative.type,
            originalTime: { startTime, endTime },
            newTime: { startTime: alternative.startTime, endTime: alternative.endTime }
          };
        }
      } catch (error) {
        console.log(`❌ שגיאה בבדיקת חלופה: ${error.message}`);
      }
    }
    
    console.log('💡 מציע חלופות מוגבלות...');
    return {
      success: false,
      alternatives: alternatives,
      partialWorkout: originalWorkout
    };
  };

  const generateWorkout = async () => {
    if (timeSlots.length === 0 || Object.keys(fieldsByTime).length === 0) {
      setError('לא נטענו נתונים. אנא רענן את הדף.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      console.log('🚀 מתחיל ליצור תוכנית אימון...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const smartWorkout = await createSmartWorkout();
      
      if (smartWorkout) {
        setWorkoutPlan(smartWorkout);
        console.log('✅ תוכנית אימון נוצרה בהצלחה');
      } else {
        setError('לא הצליח ליצור תוכנית אימון מתאימה');
      }
      
    } catch (error) {
      console.error('❌ שגיאה ביצירת אימון:', error);
      setError('שגיאה ביצירת האימון. אנא נסה שוב.');
    } finally {
      setIsGenerating(false);
    }
  };

  const runTests = () => {
    console.log('🧪 הפעלת בדיקות:');
    console.log('👤 משתמש:', user);
    console.log('📅 תאריך:', selectedDate);
    console.log('⏰ זמן:', `${startTime} - ${endTime}`);
    console.log('🎯 העדפות:', userPreferences);
    console.log('⏰ רבעי שעה:', timeSlots);
    console.log('🏟️ מגרשים לפי זמן:', fieldsByTime);
    
    let totalFields = 0;
    Object.values(fieldsByTime).forEach(fields => {
      totalFields += fields.length;
    });
    console.log('📊 סך הכל מגרשים זמינים:', totalFields);
    
    alert('בדיקות הושלמו! בדוק את הקונסול לפרטים.');
  };

  const canCreateWorkout = () => {
    return !loading && timeSlots.length > 0 && Object.keys(fieldsByTime).length > 0;
  };

  if (loading) {
    return (
      <div className="create-workout-container">
        <button className="back-button" onClick={onBackClick}>חזרה</button>
        <div className="content">
          <h1>⏳ טוען נתונים...</h1>
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
        <h1>🏋️ יוצר אימון מותאם אישית</h1>
        
        <div className="workout-info">
          <div className="info-card">
            <h3>📅 פרטי האימון</h3>
            <p><strong>תאריך:</strong> {selectedDate}</p>
            <p><strong>שעה:</strong> {startTime} - {endTime}</p>
            <p><strong>משתמש:</strong> {user.userName}</p>
            <p><strong>רבעי שעה:</strong> {timeSlots.length}</p>
          </div>
          
          <div className="info-card">
            <h3>🎯 העדפות המשתמש</h3>
            {userPreferences.length > 0 ? (
              <p>ספורטים מועדפים: {userPreferences.map((sportId, index) => 
                `${index + 1}. ${SPORT_MAPPING[sportId] || sportId}`
              ).join(', ')}</p>
            ) : (
              <p>אין העדפות שמורות</p>
            )}
          </div>
          
          <div className="info-card">
            <h3>🏟️ מגרשים זמינים</h3>
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
            className="test-button"
            onClick={runTests}
          >
            🧪 בדוק נתונים
          </button>

          <button
            className="generate-button"
            onClick={generateWorkout}
            disabled={isGenerating || !canCreateWorkout()}
          >
            {isGenerating ? '⏳ יוצר אימון...' : '🎯 צור תוכנית אימון חכמה'}
          </button>
        </div>

        {workoutPlan && (
          <div className="workout-result">
            <h2>✅ תוכנית האימון שלך</h2>
            
            {workoutPlan.isAlternative && (
              <div className="warning">
                🔄 הזמן המקורי שונה: {workoutPlan.alternativeType}
                <br />
                זמן מקורי: {workoutPlan.originalTime.startTime} - {workoutPlan.originalTime.endTime}
                <br />
                זמן חדש: {workoutPlan.newTime.startTime} - {workoutPlan.newTime.endTime}
              </div>
            )}
            
            <div className="total-weight">
              הצלחנו ליצור {workoutPlan.successfulSlots} מתוך {workoutPlan.totalSlots} רבעי שעה
            </div>
            
            <div className="workout-timeline">
              {workoutPlan.slots.map((slot, index) => (
                <div key={index} className="time-slot">
                  <div className="time">{slot.time}</div>
                  <div className="field-info">
                    {slot.field ? (
                      <>
                        <strong>{slot.field.name}</strong>
                        <span>ספורט: {slot.field.sportType}</span>
                        {slot.score !== undefined && (
                          <span style={{fontSize: '0.8rem', opacity: 0.7}}>
                            ניקוד: {slot.score}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <strong style={{color: '#ff6b6b'}}>מנוחה</strong>
                        <span>{slot.reason || 'לא זמין'}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateWorkout;