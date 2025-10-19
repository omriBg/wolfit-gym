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
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [workoutToCancel, setWorkoutToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [availableHours, setAvailableHours] = useState(0);

  // פונקציה לטעינת השעות הזמינות
  const loadUserHours = async () => {
    try {
      if (!user || !user.id) return;
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/user-hours/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setAvailableHours(data.availableHours);
        console.log('שעות זמינות נטענו:', data.availableHours);
      }
    } catch (err) {
      console.error('שגיאה בטעינת שעות:', err);
    }
  };

  useEffect(() => {
    // מניעת גלילה של הגוף כשהמסך פתוח
    document.body.style.overflow = 'hidden';
    
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
            
            // נציג אימונים שעדיין לא הסתיימו לחלוטין (כולל אימונים נוכחיים)
            const isNotFinished = dayEndTime > now;
            console.log(`בדיקת תאריך: ${workout.date} -> ${dateString} ${lastEndTime} -> ${dayEndTime.toISOString()}, לא הסתיים: ${isNotFinished}`);
            return isNotFinished;
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
              
              // אם ההפרש הוא 15 דקות (לבנות אימון), זה אותו אימון
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
          
          // זיהוי אימון נוכחי
          const currentTime = new Date();
          let foundCurrentWorkout = null;
          
          for (const [dateKey, workoutGroups] of Object.entries(workoutsByDateDisplay)) {
            for (const workoutGroup of workoutGroups) {
              const firstWorkout = workoutGroup[0];
              const lastWorkout = workoutGroup[workoutGroup.length - 1];
              
              // חילוץ תאריך
              let dateString;
              if (dateKey.includes('T')) {
                dateString = dateKey.split('T')[0];
              } else {
                dateString = dateKey;
              }
              
              const [year, month, day] = dateString.split('-');
              const workoutDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              
              // יצירת זמן התחלה וסיום
              const [startHours, startMinutes] = firstWorkout.startTime.split(':');
              const [endHours, endMinutes] = lastWorkout.endTime.split(':');
              
              const startTime = new Date(workoutDate);
              startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
              
              const endTime = new Date(workoutDate);
              endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
              
              // בדיקה אם האימון נוכחי
              if (currentTime >= startTime && currentTime <= endTime) {
                foundCurrentWorkout = {
                  date: dateKey,
                  workoutGroup: workoutGroup,
                  startTime: firstWorkout.startTime,
                  endTime: lastWorkout.endTime,
                  currentField: workoutGroup.find(w => {
                    const [wHours, wMinutes] = w.startTime.split(':');
                    const wStartTime = new Date(workoutDate);
                    wStartTime.setHours(parseInt(wHours), parseInt(wMinutes), 0, 0);
                    const wEndTime = new Date(wStartTime.getTime() + 15 * 60000); // 15 דקות
                    return currentTime >= wStartTime && currentTime <= wEndTime;
                  })
                };
                break;
              }
            }
            if (foundCurrentWorkout) break;
          }
          
          setCurrentWorkout(foundCurrentWorkout);
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

    loadUserHours();
    fetchWorkouts();

    // החזרת הגלילה כשיוצאים מהמסך
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [user?.id]);

  // עדכון הספירה אחורה וזמן נוכחי כל דקה
  useEffect(() => {
    const interval = setInterval(() => {
      // עדכון כפוי של הקומפוננטה כדי לעדכן את הספירה אחורה והזמן הנוכחי
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

  const loadFutureWorkouts = async () => {
    try {
      if (!user || !user.id) return;
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/future-workouts/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setWorkouts(data.workouts);
        setWorkoutsByField(data.workoutsByField);
        console.log('אימונים נטענו מחדש:', data.workouts.length);
      }
    } catch (err) {
      console.error('שגיאה בטעינת אימונים:', err);
    }
  };

  const handleCancelWorkout = (workoutGroup) => {
    // הגנה מפני ביטול כפול
    if (isCancelling || showCancelConfirm) {
      console.log('ביטול כבר בתהליך או דיאלוג פתוח, לא ניתן לבטל אימון נוסף');
      return;
    }
    
    // הצגת דיאלוג אישור
    setWorkoutToCancel(workoutGroup);
    setShowCancelConfirm(true);
  };

  const confirmCancelWorkout = async () => {
    // הגנה מפני לחיצה כפולה
    if (isCancelling) {
      console.log('ביטול כבר בתהליך, מדלג...');
      return;
    }

    // הגדרת מצב ביטול מיד
    setIsCancelling(true);
    console.log('מבטל אימון:', workoutToCancel);

    try {
      
      if (!user || !user.id) {
        setError('משתמש לא מחובר');
        setIsCancelling(false);
        return;
      }

      // יצירת רשימת הזמנות למחיקה
      const bookingsToDelete = workoutToCancel.map(workout => {
        // וידוא שהשעה בפורמט הנכון (HH:MM:SS)
        let startTime = workout.startTime;
        if (startTime && !startTime.includes(':')) {
          startTime = startTime + ':00';
        }
        
        return {
          idField: workout.fieldId,
          bookingDate: workout.date,
          startTime: startTime,
          idUser: user.id
        };
      });

      console.log('מחיקת הזמנות:', bookingsToDelete);

      const token = localStorage.getItem('authToken');
      const successfulCancellations = [];
      const failedCancellations = [];
      
      try {
        // מחיקת כל ההזמנות בנפרד עם מעקב אחרי הצלחות וכשלונות
        for (const booking of bookingsToDelete) {
          try {
            // עיבוד התאריך והשעה לפורמט נכון ל-URL
            const encodedDate = booking.bookingDate;
            // המרת השעה לפורמט שהשרת מצפה לו (ללא נקודותיים)
            const encodedTime = booking.startTime.replace(/:/g, '');
            
            console.log('מנסה לבטל הזמנה:', {
              userId: user.id,
              date: encodedDate,
              fieldId: booking.idField,
              time: encodedTime
            });
            
            const response = await fetch(
              `${API_BASE_URL}/api/cancel-workout/${user.id}/${encodedDate}/${booking.idField}/${encodedTime}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                }
              });

            const data = await response.json();
            
            if (data.success) {
              successfulCancellations.push(booking);
              console.log('✅ בוטל בהצלחה:', booking);
            } else {
              failedCancellations.push({
                booking,
                error: data.message || 'שגיאה לא ידועה'
              });
              console.error('❌ כשל בביטול:', booking, data.message);
            }
          } catch (bookingError) {
            failedCancellations.push({
              booking,
              error: bookingError.message || 'שגיאה בחיבור לשרת'
            });
            console.error('❌ שגיאה בביטול הזמנה:', booking, bookingError);
          }
        }
        
        // בדיקה אם כל הביטולים הצליחו
        if (failedCancellations.length === 0) {
          console.log('✅ כל האימונים בוטלו בהצלחה');
          setError('');
          // רענון רשימת האימונים והשעות
          loadFutureWorkouts();
          loadUserHours();
          // סגירת דיאלוג האישור אחרי העדכון
          setTimeout(() => {
            setShowCancelConfirm(false);
            setWorkoutToCancel(null);
            setIsCancelling(false);
          }, 1000); // המתנה של שנייה כדי לראות את הגלגל
        } else if (successfulCancellations.length > 0) {
          // ביטול חלקי - הצגת שגיאה מפורטת
          const errorMessage = `בוטלו ${successfulCancellations.length} מתוך ${bookingsToDelete.length} הזמנות. 
          כשלונות: ${failedCancellations.map(f => f.error).join(', ')}`;
          setError(errorMessage);
          console.warn('⚠️ ביטול חלקי:', errorMessage);
          // עדיין נסגור את הדיאלוג ונעדכן את הרשימה
          loadFutureWorkouts();
          loadUserHours();
          setTimeout(() => {
            setShowCancelConfirm(false);
            setWorkoutToCancel(null);
            setIsCancelling(false);
          }, 1000);
        } else {
          // כל הביטולים נכשלו
          const errorMessage = `כל הביטולים נכשלו: ${failedCancellations.map(f => f.error).join(', ')}`;
          setError(errorMessage);
          console.error('❌ כל הביטולים נכשלו:', errorMessage);
          setIsCancelling(false);
        }
      } catch (error) {
        console.error('שגיאה כללית בביטול האימון:', error);
        setError('שגיאה בחיבור לשרת. נסה שוב.');
        setIsCancelling(false);
      }
    } catch (error) {
      console.error('שגיאה בביטול האימון:', error);
      setError('שגיאה בחיבור לשרת. נסה שוב.');
      setIsCancelling(false);
    }
  };

  const cancelCancelWorkout = () => {
    setShowCancelConfirm(false);
    setWorkoutToCancel(null);
    setIsCancelling(false);
  };

  const handleBookNewWorkout = () => {
    console.log('מעבר להזמנת אימון חדש');
    // מעבר למסך הזמנת אימון
    navigate('/workout-booking');
  };

  return (
    <div className="start-workout-container">
      <button 
        className="back-button" 
        onClick={() => navigate('/main-menu')}
        disabled={isCancelling}
      >
        {isCancelling ? 'מבטל...' : 'חזרה'}
      </button>
      
      <div className="start-workout-content">
        <div className="workout-header">
          <h1>האימונים שלך</h1>
          <div className="available-hours">
            <span className="hours-label">שעות זמינות:</span>
            <span className="hours-value">{availableHours} לבנות אימון</span>
          </div>
        </div>
        
        {/* חלון אימון נוכחי */}
        {currentWorkout && (
          <div className="current-workout-section">
            <h2 className="current-workout-title">🏃‍♂️ אימון נוכחי</h2>
            <div className="current-workout-card">
              <div className="current-workout-info">
                <div className="current-field">
                  <span className="field-label">מגרש נוכחי:</span>
                  <span className="field-name">{currentWorkout.currentField?.fieldName || 'לא זמין'}</span>
                </div>
                <div className="current-time">
                  <span className="time-label">זמן נוכחי:</span>
                  <span className="time-value">{new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="workout-duration">
                  <span className="duration-label">משך האימון:</span>
                  <span className="duration-value">{currentWorkout.startTime} - {currentWorkout.endTime}</span>
                </div>
              </div>
              <div className="current-workout-actions">
                <button 
                  className="cancel-current-workout-btn"
                  onClick={() => handleCancelWorkout(currentWorkout.workoutGroup)}
                  disabled={isCancelling || showCancelConfirm}
                >
                  {isCancelling ? 'מבטל...' : showCancelConfirm ? 'ממתין לאישור...' : 'בטל אימון נוכחי'}
                </button>
              </div>
            </div>
          </div>
        )}
        
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
                                  {isValidTime ? `${formatTime(startTime)} - ${formatTime(endTime)}` : `${formatTime(startTime)} (לבנות אימון)`}
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
                        onComplete={() => console.log('אימון הושלם:', `${dateKey}_${groupIndex}`)}
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
                        
                        return (
                          <button 
                            className="cancel-workout-btn"
                            onClick={() => handleCancelWorkout(workoutGroup)}
                            style={{ marginTop: '15px' }}
                            disabled={isCancelling || showCancelConfirm}
                          >
                            {isCancelling ? 'מבטל...' : showCancelConfirm ? 'ממתין לאישור...' : 'בטל אימון'}
                          </button>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            ))}
            

          </div>
        )}
      </div>

      {/* Overlay למניעת לחיצות במהלך ביטול */}
      {isCancelling && (
        <div className="cancelling-overlay">
          <div className="cancelling-content">
            <div className="loading-spinner"></div>
            <p>מבטל את האימון...</p>
            <p className="cancelling-subtitle">אנא המתן, זה יכול לקחת כמה שניות</p>
          </div>
        </div>
      )}

      {/* דיאלוג אישור ביטול אימון */}
      {showCancelConfirm && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <div className="confirm-dialog-header">
              <h3>אישור ביטול אימון</h3>
            </div>
            <div className="confirm-dialog-body">
              <p>האם אתה בטוח שברצונך לבטל את האימון?</p>
              <p className="confirm-dialog-warning">
                ⚠️ פעולה זו לא ניתנת לביטול
              </p>
            </div>
            <div className="confirm-dialog-actions">
              <button 
                className="confirm-btn cancel-btn"
                onClick={cancelCancelWorkout}
                disabled={isCancelling}
              >
                לא, שמור על האימון
              </button>
              <button 
                className="confirm-btn confirm-cancel-btn"
                onClick={confirmCancelWorkout}
                disabled={isCancelling}
              >
                {isCancelling ? 'מבטל...' : 'כן, בטל את האימון'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StartWorkout;