import React, { useState, useEffect } from 'react';
import './OrderTrain.css';
import './EditUser.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CreateWorkout from './CreateWorkout';

function OrderTrain({ onBackClick, user }){
  const [selectDate, setSelectDate] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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

  function generateTimeOptions() {
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
        times.push(timeString);
      }
    }
    return times;
  }

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
        times.push(timeString);
      }
    }
    
    return times;
  }

  const handleCreateWorkout = () => {
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
  };

  if (showCreateWorkout) {
    return (
      <CreateWorkout 
        user={user}
        selectedDate={selectDate.toISOString().split('T')[0]}
        startTime={startTime}
        endTime={endTime}
        onBackClick={handleBackFromCreateWorkout}
      />
    );
  }

  return(
    <div className="order-train-container">
      <button className="back-button" onClick={onBackClick}>חזרה</button>
      <div className="order-content">
        <h1>הזמנת אימון</h1>
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
          <div style={{marginTop: '160px'}}>
            <h3>בחר שעת התחלה</h3>
            <select 
              value={startTime || ''} 
              onChange={(e) => {
                setStartTime(e.target.value);
                setEndTime(null);
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
              {generateTimeOptions().map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        )}

        {startTime && (
          <div style={{marginTop: '30px'}}>
            <h3>בחר שעת סיום</h3>
            <select 
              value={endTime || ''} 
              onChange={(e) => setEndTime(e.target.value)}
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