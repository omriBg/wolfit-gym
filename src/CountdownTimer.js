import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ targetDate, targetTime, workoutGroup, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        // יצירת תאריכים
        const [year, month, day] = targetDate.split('-');
        const [targetHours, targetMinutes] = targetTime.split(':');
        const workoutTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(targetHours), parseInt(targetMinutes));
        const now = new Date();
        
        // יצירת תאריכים מקומיים
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const workoutDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // חישוב הפרש ימים ישירות ללא המרה ל-ISO
        const diffDays = Math.floor((workoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const diffMs = workoutTime.getTime() - now.getTime();
        
        // בדיקה אם האימון כבר התחיל לפי השעה הנוכחית
        const isWorkoutActive = checkIfWorkoutIsActive(now);
        
        if (isWorkoutActive) {
          if (onComplete) onComplete();
          return { days: 0, hours: 0, minutes: 0, seconds: 0, isWorkoutActive: true };
        }
        
        // אם זה היום, נחשב שעות ודקות לספירה לאחור
        if (diffDays === 0) {
          // אם הזמן כבר עבר, האימון כבר התחיל
          if (diffMs <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, isWorkoutActive: true };
          }
          
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
          return { days: 0, hours, minutes, seconds };
        } else {
          // אם זה לא היום, נחזיר רק את מספר הימים
          return { days: diffDays, hours: 0, minutes: 0, seconds: 0 };
        }
      } catch (error) {
        console.error('שגיאה בחישוב הזמן:', error);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
    };

    // עדכון ראשוני
    setTimeLeft(calculateTimeLeft());

    // עדכון כל שנייה
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, targetTime, onComplete]);

  const formatNumber = (num) => {
    return num.toString().padStart(2, '0');
  };

  // פונקציה לבדיקה אם האימון כבר התחיל
  const checkIfWorkoutIsActive = (now) => {
    if (!workoutGroup || !Array.isArray(workoutGroup)) {
      return false;
    }

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // בדוק אם השעה הנוכחית נמצאת בטווח הזמן של האימון
    for (const slot of workoutGroup) {
      if (slot.startTime && slot.endTime) {
        if (currentTime >= slot.startTime && currentTime < slot.endTime) {
          return true;
        }
      }
    }
    
    return false;
  };

  // פונקציה לזיהוי המגרש הרלוונטי לפי השעה הנוכחית
  const getCurrentField = () => {
    if (!workoutGroup || !Array.isArray(workoutGroup)) {
      return null;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // מצא את המגרש הרלוונטי לפי השעה הנוכחית
    for (const slot of workoutGroup) {
      if (slot.startTime && slot.endTime) {
        if (currentTime >= slot.startTime && currentTime < slot.endTime) {
          return {
            name: slot.fieldName,
            sport: slot.sportType,
            time: `${slot.startTime} - ${slot.endTime}`
          };
        }
      }
    }
    
    return null;
  };

  
  // אם האימון כבר התחיל, הצג את המגרש הרלוונטי
  if (timeLeft.isWorkoutActive) {
    const currentField = getCurrentField();
    if (currentField) {
      return (
        <div className="countdown-timer active">
          <div className="active-workout-indicator">
            <div className="active-icon">🏃‍♂️</div>
            <div className="active-text">כעת מתאמן במגרש:</div>
            <div className="current-field">
              <div className="field-name">{currentField.name}</div>
              <div className="field-sport">{currentField.sport}</div>
              <div className="field-time">{currentField.time}</div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="countdown-timer active">
          <div className="active-workout-indicator">
            <div className="active-icon">🏃‍♂️</div>
            <div className="active-text">האימון התחיל!</div>
          </div>
        </div>
      );
    }
  }
  
  if (timeLeft.days > 0) {
    let dayText = '';
    if (timeLeft.days === 1) {
      dayText = 'מחר';
    } else if (timeLeft.days === 2) {
      dayText = 'בעוד יומיים';
    } else {
      dayText = `בעוד ${timeLeft.days} ימים`;
    }
    
    
    return (
      <div className="countdown-timer">
        <div className="countdown-text">{dayText}</div>
      </div>
    );
  }

  // אם זה היום, הצג ספירה לאחור מלאה
  if (timeLeft.days === 0) {
    return (
      <div className="countdown-timer">
        <div className="countdown-text">האימון מתחיל בעוד</div>
        <div className="countdown-display">
          <span className="countdown-number">{formatNumber(timeLeft.hours)}</span>
          <span className="countdown-separator">:</span>
          <span className="countdown-number">{formatNumber(timeLeft.minutes)}</span>
          <span className="countdown-separator">:</span>
          <span className="countdown-number">{formatNumber(timeLeft.seconds)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="countdown-timer">
      <div className="countdown-text">האימון מתחיל בעוד</div>
      <div className="countdown-display">
        <span className="countdown-number">{formatNumber(timeLeft.minutes)}</span>
        <span className="countdown-separator">:</span>
        <span className="countdown-number">{formatNumber(timeLeft.seconds)}</span>
      </div>
    </div>
  );
};

export default CountdownTimer;
