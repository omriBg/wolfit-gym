import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ targetDate, targetTime, onComplete }) => {
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
        
        // איפוס השעות כדי להשוות רק תאריכים
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const workoutDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        workoutDate.setHours(0, 0, 0, 0);
        
        console.log('היום:', today.toISOString().split('T')[0]);
        console.log('תאריך אימון:', targetDate);
        console.log('היום (timestamp):', today.getTime());
        console.log('תאריך אימון (timestamp):', workoutDate.getTime());
        
        // חישוב הפרש ימים
        const diffDays = Math.ceil((workoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        console.log('הפרש ימים:', diffDays);
        
        const diffMs = workoutTime.getTime() - now.getTime();
        
        if (diffMs <= 0) {
          if (onComplete) onComplete();
          return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }
        
        // אם זה היום, נחשב שעות ודקות
        if (diffDays === 0) {
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

  console.log('timeLeft:', timeLeft);
  
  if (timeLeft.days > 0) {
    let dayText = '';
    if (timeLeft.days === 1) {
      dayText = 'מחר';
    } else if (timeLeft.days === 2) {
      dayText = 'בעוד יומיים';
    } else {
      dayText = `בעוד ${timeLeft.days} ימים`;
    }
    
    console.log('מציג טקסט ימים:', dayText);
    
    return (
      <div className="countdown-timer">
        <div className="countdown-text">{dayText}</div>
      </div>
    );
  }

  if (timeLeft.hours > 0) {
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
    <div className="countdown-timer urgent">
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
