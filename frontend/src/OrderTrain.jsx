import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './OrderTrain.css';
import './EditUser.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CreateWorkout from './CreateWorkout';
import { API_BASE_URL } from './config';

function OrderTrain(){
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectDate, setSelectDate] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [loadingBlockedTimes, setLoadingBlockedTimes] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [availableHours, setAvailableHours] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // 🚀 תיקון 1: הוספת debouncing ו-cache
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [blockedTimesCache, setBlockedTimesCache] = useState({});

  useEffect(() => {
    loadUserHours();
  }, []);

  const loadUserHours = async () => {
    try {
      setLoading(true);
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
      }
    } catch (err) {
      console.error('שגיאה בטעינת שעות:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 תיקון 2: debouncing - מניעת קריאות מרובות מהירות
  useEffect(() => {
    if (selectDate && user?.id) {
      // ביטול טיימר קודם אם קיים
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // יצירת טיימר חדש - המתן 500ms לפני הקריאה
      const timer = setTimeout(() => {
        loadBlockedTimes();
      }, 500);
      
      setDebounceTimer(timer);
    } else {
      setBlockedTimes([]);
    }
    
    // ניקוי טיימר כשהקומפוננטה נהרסת
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [selectDate, user?.id]);

  // עדכון שעות זמינות כשהשעות התפוסות משתנות
  useEffect(() => {
    if (selectDate) {
      const times = generateTimeOptions();
      setAvailableTimes(times);
      console.log('🔄 עדכנתי שעות זמינות:', times);
    }
  }, [blockedTimes, selectDate]);

  // 🚀 תיקון 3: הוספת cache למניעת קריאות מיותרות
  const loadBlockedTimes = async () => {
    try {
      const dateStr = selectDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
      
      // בדיקה אם יש cache לתאריך הזה
      if (blockedTimesCache[dateStr]) {
        console.log('📦 משתמש ב-cache לשעות תפוסות עבור', dateStr);
        setBlockedTimes(blockedTimesCache[dateStr]);
        return;
      }
      
      setLoadingBlockedTimes(true);
      const url = `${API_BASE_URL}/api/user-booked-times/${user.id}/${dateStr}`;
      
      console.log('🔍 טוען שעות תפוסות מ:', url);
      
      const token = localStorage.getItem('authToken');
      console.log('🔑 טוקן:', token ? 'קיים' : 'חסר');
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 תגובת השרת:', response.status, response.statusText);
      const data = await response.json();
      
      if (data.success) {
        setBlockedTimes(data.blockedTimes);
        
        // 🚀 שמירה ב-cache למניעת קריאות חוזרות
        setBlockedTimesCache(prev => ({
          ...prev,
          [dateStr]: data.blockedTimes
        }));
        
        console.log('🚫 שעות תפוסות נטענו:', data.blockedTimes);
        console.log('📊 מספר שעות תפוסות:', data.blockedTimes.length);
      } else {
        console.log('⚠️ שגיאה בטעינת שעות תפוסות:', data.message);
        setBlockedTimes([]);
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת שעות תפוסות:', error);
      setBlockedTimes([]);
    } finally {
      setLoadingBlockedTimes(false);
    }
  };

  function isDateAllowed(date){
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    return dateToCheck >= today && dateToCheck <= sevenDaysFromNow;
  }

  // 🚀 תיקון 4: הפחתת לוגים - הסרת הודעות מיותרות
  function isTimeBlocked(timeString) {
    // בדיקה אם השעות התפוסות נטענו בכלל
    if (!blockedTimes || blockedTimes.length === 0) {
      // הסרת הלוג הזה - הוא יוצר רעש!
      // console.log(`⚠️ אין שעות תפוסות נטענות, שעה ${timeString} זמינה`);
      return false;
    }
    
    // הסרת לוגים מיותרים - רק בדיקה שקטה
    // console.log(`🔍 בודק אם שעה ${timeString} חסומה`);
    // console.log(`📋 שעות תפוסות מהשרת:`, blockedTimes);
    
    // השרת כבר מחזיר את כל השעות החסומות כולל רבע שעה לפני ואחרי
    const isBlocked = blockedTimes.includes(timeString);
    
    // הסרת לוגים מיותרים
    // if (isBlocked) {
    //   console.log(`❌ שעה ${timeString} חסומה`);
    // } else {
    //   console.log(`✅ שעה ${timeString} זמינה`);
    // }
    
    return isBlocked;
  }

  // פונקציה לבדיקה אם טווח זמן חופף לאימון קיים
  function isTimeRangeBlocked(startTime, endTime) {
    if (!startTime || !endTime || !blockedTimes || blockedTimes.length === 0) {
      return false;
    }
    
    console.log(`🔍 בודק אם טווח ${startTime}-${endTime} חופף לאימון קיים`);
    console.log(`📋 שעות תפוסות:`, blockedTimes);
    
    // המרה של הזמנים לדקות
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    // בדיקה אם יש אימון בטווח
    for (const blockedTime of blockedTimes) {
      const [blockedHour, blockedMinute] = blockedTime.split(':').map(Number);
      const blockedMinutes = blockedHour * 60 + blockedMinute;
      
      // בדיקה אם האימון התפוס נמצא בטווח שנבחר
      if (blockedMinutes >= startMinutes && blockedMinutes < endMinutes) {
        console.log(`❌ טווח ${startTime}-${endTime} חופף לאימון ב-${blockedTime}`);
        return true;
      }
    }
    
    console.log(`✅ טווח ${startTime}-${endTime} לא חופף לאימון קיים`);
    return false;
  }

  // 🚀 תיקון 5: הפחתת לוגים ב-generateTimeOptions
  function generateTimeOptions() {
    // הסרת לוגים מיותרים - רק לוג אחד בסוף
    // console.log('🚀 מתחיל ליצור אפשרויות זמן');
    // console.log('📅 תאריך נבחר:', selectDate);
    // console.log('🚫 שעות תפוסות:', blockedTimes);
    
    const times = [];
    const now = new Date();
    const isToday = selectDate && 
      selectDate.getDate() === now.getDate() &&
      selectDate.getMonth() === now.getMonth() &&
      selectDate.getFullYear() === now.getFullYear();
    
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === 23 && minute > 0) break;
        
        if (isToday) {
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const timeInMinutes = hour * 60 + minute;
          const nowInMinutes = currentHour * 60 + currentMinute + 30;
          
          if (timeInMinutes < nowInMinutes) {
            continue;
          }
        }
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // בדיקה אם השעה תפוסה (כולל רבע שעה לפני ואחרי)
        if (!isTimeBlocked(timeString)) {
          times.push(timeString);
        } else {
          // הסרת לוג מיותר
          // console.log(`🚫 שעה ${timeString} נחסמה ולא נוספה לרשימה`);
        }
      }
    }
    
    // רק לוג אחד בסוף במקום 49 לוגים
    console.log(`📋 נוצרו ${times.length} שעות זמינות`);
    return times;
  }

  // 🚀 תיקון 6: הפחתת לוגים ב-generateEndTimeOptions
  function generateEndTimeOptions() {
    if (!startTime) return [];
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startTimeInMinutes = startHour * 60 + startMinute;
    const times = [];
    
    for (let duration = 30; duration <= 90; duration += 15) {
      const endTimeInMinutes = startTimeInMinutes + duration;
      const endHour = Math.floor(endTimeInMinutes / 60);
      const endMinute = endTimeInMinutes % 60;
      
      if (endHour <= 23 && !(endHour === 23 && endMinute > 30)) {
        const timeString = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        // בדיקה אם השעה תפוסה (כולל רבע שעה לפני ואחרי)
        if (!isTimeBlocked(timeString)) {
          times.push(timeString);
        } else {
          // הסרת לוג מיותר
          // console.log(`🚫 שעת סיום ${timeString} נחסמה ולא נוספה לרשימה`);
        }
      }
    }
    
    // רק לוג אחד בסוף
    console.log(`📋 נוצרו ${times.length} שעות סיום זמינות`);
    return times;
  }

  const handleCreateWorkout = () => {
    // בדיקה אם הטווח שנבחר חופף לאימון קיים
    if (isTimeRangeBlocked(startTime, endTime)) {
      alert('הטווח שנבחר חופף לאימון קיים. אנא בחר טווח אחר.');
      return;
    }

    // בדיקה אם יש מספיק שעות
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const requiredQuarters = Math.ceil((endMinutes - startMinutes) / 15);

    if (requiredQuarters > availableHours) {
      alert(`אין מספיק שעות זמינות. נדרשות ${requiredQuarters} רבעי שעה, יש לך ${availableHours} רבעי שעה.`);
      return;
    }
    
    console.log('עוברים ליצירת אימון עם הנתונים:', {
      user,
      selectDate,
      startTime,
      endTime
    });
    setShowCreateWorkout(true);
  };

  const handleBackFromCreateWorkout = () => {
    setShowCreateWorkout(false);
    // חזרה לתפריט הראשי לאחר יצירת אימון
    navigate('/main-menu');
  };

  if (showCreateWorkout) {
    return (
      <CreateWorkout 
        selectedDate={selectDate.toLocaleDateString('en-CA')}
        startTime={startTime}
        endTime={endTime}
      />
    );
  }

  return(
    <div className="order-train-container">
      <button className="back-button" onClick={() => navigate('/main-menu')}>חזרה</button>
      <div className="order-content">
        <h1>הזמנת אימון</h1>
        <div className="available-hours">
          {loading ? (
            <span>טוען שעות זמינות...</span>
          ) : (
            <span>שעות זמינות: {availableHours} רבעי שעה</span>
          )}
        </div>
        <div style={{marginTop: '50px'}}>
          <DatePicker
            open={true}
            onClickOutside={() => {}}
            inline={true}
            showPopperArrow={false}
            filterDate={isDateAllowed}
            onChange={setSelectDate}
            selected={selectDate}
          />
        </div>
        {selectDate != null && (
          <div style={{marginTop: window.innerWidth <= 768 ? '25px' : '160px'}}>
            <h3>בחר שעת התחלה</h3>
            {loadingBlockedTimes ? (
              <div style={{padding: '10px', color: '#666'}}>טוען שעות זמינות...</div>
            ) : (
              <>
                <select 
                  value={startTime || ''} 
                  onChange={(e) => {
                    const newStartTime = e.target.value;
                    setStartTime(newStartTime);
                    setEndTime(null);
                    
                    // אם יש שעת סיום, נבדוק אם הטווח חופף לאימון קיים
                    if (endTime && isTimeRangeBlocked(newStartTime, endTime)) {
                      alert('הטווח שנבחר חופף לאימון קיים. אנא בחר שעת התחלה אחרת.');
                      setStartTime(null);
                    }
                  }}
                  style={{
                    padding: '10px',
                    fontSize: '16px',
                    borderRadius: '5px',
                    border: '1px solid #ccc',
                    backgroundColor: 'white',
                    minWidth: '120px'
                  }}
                >
                  <option value="">בחר שעה</option>
                  {availableTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                <div style={{
                  marginTop: '5px',
                  fontSize: '12px',
                  color: '#888'
                }}>
                  שעות תפוסות: {blockedTimes.length > 0 ? blockedTimes.join(', ') : 'אין'}
                </div>
                {blockedTimes.length > 0 && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    border: '1px solid rgba(255, 107, 107, 0.3)',
                    borderRadius: '5px',
                    fontSize: '14px',
                    color: '#ff6b6b'
                  }}>
                    ⚠️ שעות שכבר יש לך אימון בהן (כולל רבע שעה לפני ואחרי) לא זמינות לבחירה
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {startTime && (
          <div style={{marginTop: window.innerWidth <= 768 ? '25px' : '30px'}}>
            <h3>בחר שעת סיום</h3>
            {loadingBlockedTimes ? (
              <div style={{padding: '10px', color: '#666'}}>טוען שעות זמינות...</div>
            ) : (
                <select 
                  value={endTime || ''} 
                  onChange={(e) => {
                    const newEndTime = e.target.value;
                    setEndTime(newEndTime);
                    
                    // בדיקה אם הטווח חופף לאימון קיים
                    if (newEndTime && isTimeRangeBlocked(startTime, newEndTime)) {
                      alert('הטווח שנבחר חופף לאימון קיים. אנא בחר שעת סיום אחרת.');
                      setEndTime(null);
                    }
                  }}
                  style={{
                    padding: '10px',
                    fontSize: '16px',
                    borderRadius: '5px',
                    border: '1px solid #ccc',
                    backgroundColor: 'white',
                    minWidth: '120px'
                  }}
                >
                <option value="">בחר שעת סיום:</option>
                {generateEndTimeOptions().map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {selectDate && startTime && endTime && (
        <div className="create-workout-button-container">
          <button 
            className="create-workout-button"
            onClick={handleCreateWorkout}
          >
            צור אימון
          </button>
        </div>
      )}
    </div>
  );
}

export default OrderTrain;