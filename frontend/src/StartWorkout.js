import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './StartWorkout.css';
import './CountdownTimer.css';
import CountdownTimer from './CountdownTimer';
import { API_BASE_URL } from './config';

function StartWorkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/future-workouts/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
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
          
          // מציאת זמן הסיום האחרון לכל תאריך
          const workoutsByDate = {};
          data.workouts.forEach(workout => {
            if (!workoutsByDate[workout.date]) {
              workoutsByDate[workout.date] = [];
            }
            workoutsByDate[workout.date].push(workout);
          });

          const lastEndTimeByDate = {};
          Object.keys(workoutsByDate).forEach(date => {
            const dayWorkouts = workoutsByDate[date].sort((a, b) => a.endTime.localeCompare(b.endTime));
            lastEndTimeByDate[date] = dayWorkouts[dayWorkouts.length - 1].endTime;
          });

          // סינון אימונים רק לפי זמן הסיום של האימון האחרון ביום
          const now = new Date();
          console.log('זמן נוכחי:', now.toISOString());
          console.log('כל האימונים מהשרת:', data.workouts.length);
          console.log('פירוט כל האימונים:', data.workouts.map(w => ({ date: w.date, startTime: w.startTime, endTime: w.endTime })));
          
          const filteredWorkouts = data.workouts.filter(workout => {
            // חילוץ תאריך מהמחרוזת UTC
            let dateString;
            if (workout.date.includes('T')) {
              // אם זה פורמט UTC, נחלץ רק את החלק של התאריך
              dateString = workout.date.split('T')[0];
            } else {
              // אם זה כבר פורמט YYYY-MM-DD
              dateString = workout.date;
            }
            
            // יצירת תאריך מקומי מהמחרוזת YYYY-MM-DD
            const [year, month, day] = dateString.split('-');
            const workoutDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            
            const lastEndTime = lastEndTimeByDate[workout.date];
            const [hours, minutes] = lastEndTime.split(':');
            
            // יצירת תאריך עם זמן סיום בזמן מקומי
            const dayEndTime = new Date(workoutDate);
            dayEndTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            const isAfterNow = dayEndTime > now;
            console.log(`בדיקת תאריך: ${workout.date} -> ${dateString} ${lastEndTime} -> ${dayEndTime.toISOString()}, אחרי עכשיו: ${isAfterNow}`);
            return isAfterNow;
          });
          
          console.log(`סוננו ${data.workouts.length - filteredWorkouts.length} אימונים שהיום שלהם כבר הסתיים`);
          
          const sortedWorkouts = filteredWorkouts.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + a.startTime);
            const dateB = new Date(b.date + ' ' + b.startTime);
            return dateA - dateB;
          });

          // חלוקה לפי תאריך ויצירת אימונים רציפים
          const workoutsByDateDisplay = {};
          sortedWorkouts.forEach(workout => {
            const dateKey = workout.date;
            if (!workoutsByDateDisplay[dateKey]) {
              workoutsByDateDisplay[dateKey] = [];
            }
            
            // בדיקה אם זה המשך של אימון קיים או אימון חדש
            const lastWorkoutGroup = workoutsByDateDisplay[dateKey][workoutsByDateDisplay[dateKey].length - 1];
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
                workoutsByDateDisplay[dateKey].push([workout]);
              }
            } else {
              // אימון ראשון ביום
              console.log(`יוצר אימון ראשון ביום`);
              workoutsByDateDisplay[dateKey].push([workout]);
            }
          });

          setWorkoutsByField(workoutsByDateDisplay);
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
      
      // חילוץ תאריך מהמחרוזת UTC
      let dateString;
      if (dateKey.includes('T')) {
        // אם זה פורמט UTC, נחלץ רק את החלק של התאריך
        dateString = dateKey.split('T')[0];
      } else {
        // אם זה כבר פורמט YYYY-MM-DD
        dateString = dateKey;
      }
      
      // יצירת תאריך מקומי מהמחרוזת YYYY-MM-DD
      const [year, month, day] = dateString.split('-');
      const workoutDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // איפוס השעות כדי להשוות רק תאריכים (בשימוש זמן מקומי)
      today.setHours(0, 0, 0, 0);
      workoutDate.setHours(0, 0, 0, 0);
      
      const diffTime = workoutDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
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
      const today = new Date();
      
      // חילוץ תאריך מהמחרוזת UTC
      let dateString;
      if (dateKey.includes('T')) {
        // אם זה פורמט UTC, נחלץ רק את החלק של התאריך
        dateString = dateKey.split('T')[0];
      } else {
        // אם זה כבר פורמט YYYY-MM-DD
        dateString = dateKey;
      }
      
      // יצירת תאריך מקומי מהמחרוזת YYYY-MM-DD
      const [year, month, day] = dateString.split('-');
      const workoutDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // איפוס השעות כדי להשוות רק תאריכים (בשימוש זמן מקומי)
      today.setHours(0, 0, 0, 0);
      workoutDate.setHours(0, 0, 0, 0);
      
      // תמיד נחשב ספירה אחורה (לא רק אם זה היום)
      const firstWorkout = workouts[0];
      if (!firstWorkout || !firstWorkout.startTime) {
        return 'האימון התחיל!';
      }
      
      // יצירת תאריך מלא עם שעה (בשימוש זמן מקומי)
      const [hours, minutes] = firstWorkout.startTime.split(':');
      const workoutTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
      const now = new Date();
      
      const diffMs = workoutTime.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        return 'האימון התחיל!';
      }
      
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
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
    // מעבר למסך הזמנת אימון
    navigate('/workout-booking');
  };

  return (
    <div className="start-workout-container">
      <button className="back-button" onClick={() => navigate('/main-menu')}>
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
                        workoutGroup={workoutGroup}
                        onComplete={() => handleStartWorkout(`${dateKey}_${groupIndex}`)}
                      />
                      {/* מציג כפתור רק אם זה היום */}
                      {(() => {
                        const today = new Date();
                        
                        // חילוץ תאריך מהמחרוזת UTC
                        let dateString;
                        if (dateKey.includes('T')) {
                          // אם זה פורמט UTC, נחלץ רק את החלק של התאריך
                          dateString = dateKey.split('T')[0];
                        } else {
                          // אם זה כבר פורמט YYYY-MM-DD
                          dateString = dateKey;
                        }
                        
                        // יצירת תאריך מקומי מהמחרוזת YYYY-MM-DD
                        const [year, month, day] = dateString.split('-');
                        const workoutDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        
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