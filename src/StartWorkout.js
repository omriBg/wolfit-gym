import React from 'react';
import './StartWorkout.css';

function StartWorkout({ onBackClick, user }) {
  return (
    <div className="start-workout">
      <div className="header">
        <button className="back-button" onClick={onBackClick}>
          ← חזור
        </button>
        <h1>התחל אימון</h1>
      </div>
      
      <div className="workout-content">
        <p>ברוך הבא, {user?.name || 'משתמש'}!</p>
        <p>כאן תוכל להתחיל אימון חדש</p>
        
        {/* כאן תוכל להוסיף את הלוגיקה של האימון */}
        <button className="start-button">
          התחל אימון עכשיו
        </button>
      </div>
    </div>
  );
}

export default StartWorkout;
