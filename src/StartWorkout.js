import React, { useState, useEffect } from 'react';
import './StartWorkout.css';
import './CountdownTimer.css';
import CountdownTimer from './CountdownTimer';

function StartWorkout({ onBackClick, user }) {
  const [workouts, setWorkouts] = useState([]);
  const [workoutsByField, setWorkoutsByField] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // מניעת גלילה של הגוף כשהמסך פתוח
    document.body.style.overflow = 'hidden';
    
    // פונקציה לטעינת האימונים העתידיים מהשרת
    const fetchWorkouts = async () => {
      try {
        setLoading(true);
        setError('');
        
        if (!user || !user.id) {
          setError('משתמש לא מחובר');
          setLoading(false);
          return;
        }
        
        console.log('טוען אימונים עבור משתמש:', user.id);
        
        const response = await fetch(`https://wolfit-gym-backend-ijvq.onrender.com/api/future-workouts/${user.id}`);
        const data = await response.json();
        
        if (data.success) {
          console.log('נמצאו אימונים:', data.workouts);
          console.log('פירוט האימונים:', data.workouts.map(w => ({
            date: w.date,
            startTime: w.startTime,
            endTime: w.endTime,
            fieldName: w.fieldName
          })));
          setWorkouts(data.workouts);
          
          // סינון אימונים שכבר הסתיימו ומיון לפי תאריך ושעה
          const now = new Date();
          const filteredWorkouts = data.workouts.filter(workout => {
            const [year, month, day] = workout.date.split('-');
            const [hours, minutes] = workout.endTime.split(':');
            const workoutEndTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
            return workoutEndTime > now;
          });
          
          console.log(`סוננו ${data.workouts.length - filteredWorkouts.length} אימונים שכבר הסתיימו`);
          
          const sortedWorkouts = filteredWorkouts.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + a.startTime);
            const dateB = new Date(b.date + ' ' + b.startTime);
            return dateA - dateB;
          });
          
          // חלוקה לפי תאריך ויצירת אימונים רציפים
          const workoutsByDate = {};
          sortedWorkouts.forEach(workout => {
            // בדיקה אם האימון כבר הסתיים
            const now = new Date();
            const [year, month, day] = workout.date.split('-');
            const [hours, minutes] = workout.endTime.split(':');
            const workoutEndTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
            
            // אם האימון כבר הסתיים, נדלג עליו
            if (workoutEndTime <= now) {
              console.log(`אימון שכבר הסתיים: ${workout.date} ${workout.endTime}`);
              return;
            }
            
            const dateKey = workout.date;
            if (!workoutsByDate[dateKey]) {
              workoutsByDate[dateKey] = [];
            }
            
            // בדיקה אם זה המשך של אימון קיים או אימון חדש
            const lastWorkoutGroup = workoutsByDate[dateKey][workoutsByDate[dateKey].length - 1];
            if (lastWorkoutGroup && lastWorkoutGroup.length > 0) {
              const lastSlot = lastWorkoutGroup[lastWorkoutGroup.length - 1];
              
              // חישוב הזמן בצורה פשוטה יותר
              const lastTime = lastSlot.startTime.split(':');
              const currentTime = workout.startTime.split(':');
              const lastMinutes = parseInt(lastTime[0]) * 60 + parseInt(lastTime[1]);
              const currentMinutes = parseInt(currentTime[0]) * 60 + parseInt(currentTime[1]);
              const timeDiff = currentMinutes - lastMinutes;
              
              console.log(`בדיקת רציפות: ${lastSlot.startTime} -> ${workout.startTime}, הפרש: ${timeDiff} דקות`);
              
              // אם ההפרש הוא 15 דקות (רבע שעה), זה אותו אימון
              if (timeDiff === 15) {
                // המשך של האימון הקיים - רציף
                console.log(`ממשיך אימון קיים (רציף - 15 דקות)`);
                lastWorkoutGroup.push(workout);
              } else {
                // אימון חדש - יש פער אחר
                console.log(`יוצר אימון חדש (הפרש ${timeDiff} דקות)`);
                workoutsByDate[dateKey].push([workout]);
              }
            } else {
              // אימון ראשון ביום
              console.log(`יוצר אימון ראשון ביום`);
              workoutsByDate[dateKey].push([workout]);
            }
          });
          
          setWorkoutsByField(workoutsByDate);
        } else {
          console.log('לא נמצאו אימונים או שגיאה:', data.message);
          setError(data.message);
          setWorkouts([]);
          setWorkoutsByField({});
        }
        
      } catch (error) {
        console.error('שגיאה בטעינת האימונים:', error);
        setError('שגיאה בחיבור לשרת. נסה שוב.');
        setWorkouts([]);
        setWorkoutsByField({});
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();

    // החזרת הגלילה כשיוצאים מהמסך
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [user?.id]);

  // עדכון הספירה אחורה כל דקה
  useEffect(() => {
    const interval = setInterval(() => {
      // עדכון כפוי של הקומפוננטה כדי לעדכן את הספירה אחורה
      setWorkouts(prevWorkouts => [...prevWorkouts]);
    }, 60000); // כל דקה

    return () => clearInterval(interval);
  }, []);

  // פונקציה לעיצוב התאריך
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // אם התאריך לא תקין, ננסה פורמט אחר
        const [year, month, day] = dateString.split('-');
        const newDate = new Date(year, month - 1, day);
        if (isNaN(newDate.getTime())) {
          return dateString; // נחזיר את המחרוזת המקורית אם לא הצלחנו
        }
        return newDate.toLocaleDateString('he-IL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return date.toLocaleDateString('he-IL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('שגיאה בעיצוב התאריך:', error);
      return dateString;
    }
  };

  // פונקציה לעיצוב השעה
  const formatTime = (timeString) => {
    return timeString.substring(0, 5); // HH:MM
  };

  // פונקציה לחישוב זמן עד האימון
  const getTimeUntilWorkout = (dateKey) => {
    try {
      const today = new Date();
      const workoutDate = new Date(dateKey);
      
      // איפוס השעות כדי להשוות רק תאריכים
      today.setHours(0, 0, 0, 0);
      workoutDate.setHours(0, 0, 0, 0);
      
      const diffTime = workoutDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (isNaN(diffDays)) {
        return 'בקרוב';
      }
      
      if (diffDays === 0) {
        return 'היום';
      } else if (diffDays === 1) {
        return 'מחר';
      } else if (diffDays === 2) {
        return 'בעוד יומיים';
      } else {
        return `בעוד ${diffDays} ימים`;
      }
    } catch (error) {
      console.error('שגיאה בחישוב זמן עד האימון:', error);
      return 'בקרוב';
    }
  };

  // פונקציה לספירה אחורה אם זה היום
  const getCountdownText = (dateKey, workouts) => {
    try {
      console.log('חישוב ספירה אחורה עבור:', dateKey, workouts);
      
      const today = new Date();
      const workoutDate = new Date(dateKey);
      
      console.log('היום:', today.toISOString().split('T')[0]);
      console.log('תאריך אימון:', dateKey);
      
      // איפוס השעות כדי להשוות רק תאריכים
      today.setHours(0, 0, 0, 0);
      workoutDate.setHours(0, 0, 0, 0);
      
      console.log('השוואת תאריכים:', today.getTime(), workoutDate.getTime());
      
      // תמיד נחשב ספירה אחורה (לא רק אם זה היום)
      const firstWorkout = workouts[0];
      if (!firstWorkout || !firstWorkout.startTime) {
        return 'האימון התחיל!';
      }
      
      console.log('שעת האימון:', firstWorkout.startTime);
      
      // יצירת תאריך מלא עם שעה
      const [year, month, day] = dateKey.split('-');
      const [hours, minutes] = firstWorkout.startTime.split(':');
      const workoutTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
      const now = new Date();
      
      console.log('זמן אימון:', workoutTime);
      console.log('עכשיו:', now);
      
      const diffMs = workoutTime.getTime() - now.getTime();
      console.log('הפרש במילישניות:', diffMs);
      
      if (diffMs <= 0) {
        return 'האימון התחיל!';
      }
      
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      console.log('ימים:', diffDays, 'שעות:', diffHours, 'דקות:', diffMinutes);
      
      if (diffDays > 0) {
        return `האימון מתחיל בעוד ${diffDays} ימים`;
      } else if (diffHours > 0) {
        return `האימון מתחיל בעוד ${diffHours} שעות ו-${diffMinutes} דקות`;
      } else {
        return `האימון מתחיל בעוד ${diffMinutes} דקות`;
      }
    } catch (error) {
      console.error('שגיאה בחישוב הספירה אחורה:', error);
      return 'האימון מתחיל בקרוב';
    }
  };

  const handleStartWorkout = (workoutId) => {
    console.log('מתחיל אימון:', workoutId);
    // כאן תוסיף את הלוגיקה להתחלת אימון
  };

  const handleBookNewWorkout = () => {
    console.log('מעבר להזמנת אימון חדש');
    // כאן תוסיף את הלוגיקה למעבר למסך הזמנת אימון
    if (onBackClick) {
      // חזרה למסך הראשי ומשם יוכלו ללחוץ על הזמנת אימון
      onBackClick();
    }
  };

  return (
    <div className="start-workout-container">
      <button className="back-button" onClick={onBackClick}>
        חזרה
      </button>
      
      <div className="start-workout-content">
        <h1>האימונים העתידיים שלך</h1>
        
        {loading ? (
          <div className="loading">
            <p>טוען את האימונים שלך מהמערכת...</p>
          </div>
        ) : error ? (
          <div className="no-workouts">
            <p>שגיאה: {error}</p>
            <button className="no-workouts-button" onClick={() => window.location.reload()}>
              נסה שוב
            </button>
          </div>
        ) : workouts.length === 0 ? (
          <div className="no-workouts">
            <p>אין לך אימונים עתידיים מתוכננים</p>
            <button className="no-workouts-button" onClick={handleBookNewWorkout}>
              הזמן אימון חדש
            </button>
          </div>
        ) : (
          <div className="workouts-list">
            {Object.entries(workoutsByField).map(([dateKey, workoutGroups]) => (
              <div key={dateKey} className="date-section">
                <h2 className="date-title">תאריך: {formatDate(dateKey)}</h2>
                
                {workoutGroups.map((workoutGroup, groupIndex) => {
                  const firstWorkout = workoutGroup[0];
                  const lastWorkout = workoutGroup[workoutGroup.length - 1];
                  const totalDuration = workoutGroup.length * 15; // כל שיבוץ הוא 15 דקות
                  
                  return (
                    <div key={groupIndex} className="workout-session">
                      <div className="workout-session-header">
                        <div className="workout-time-range">
                          {formatTime(firstWorkout.startTime)} - {formatTime(lastWorkout.endTime)} ({totalDuration} דקות)
                        </div>
                      </div>
                      
                      <div className="workout-schedule">
                        <h4>לוח זמנים:</h4>
                        <div className="time-slots">
                          {workoutGroup.map((slot, index) => {
                            const startTime = slot.startTime;
                            const endTime = slot.endTime;
                            const isValidTime = startTime && endTime && startTime !== endTime;
                            
                            return (
                              <div key={index} className="time-slot">
                                <span className="time">
                                  {isValidTime ? `${formatTime(startTime)} - ${formatTime(endTime)}` : `${formatTime(startTime)} (15 דקות)`}
                                </span>
                                <span className="field">{slot.fieldName}</span>
                                <span className="sport">{slot.sportType}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <CountdownTimer 
                        targetDate={dateKey}
                        targetTime={firstWorkout.startTime}
                        onComplete={() => handleStartWorkout(`${dateKey}_${groupIndex}`)}
                      />
                      {/* מציג כפתור רק אם זה היום */}
                      {(() => {
                        const today = new Date();
                        const workoutDate = new Date(dateKey);
                        today.setHours(0, 0, 0, 0);
                        workoutDate.setHours(0, 0, 0, 0);
                        const isToday = today.getTime() === workoutDate.getTime();
                        
                        return isToday ? (
                          <button 
                            className="start-workout-btn"
                            onClick={() => handleStartWorkout(`${dateKey}_${groupIndex}`)}
                            style={{ marginTop: '15px' }}
                          >
                            התחל אימון
                          </button>
                        ) : null;
                      })()}
                    </div>
                  );
                })}
              </div>
            ))}
            

          </div>
        )}
      </div>
    </div>
  );
}

export default StartWorkout;