import React, { useState, useEffect } from 'react';
import './StartWorkout.css';

function StartWorkout({ onBackClick, user }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // פונקציה לטעינת האימונים העתידיים
    const fetchWorkouts = async () => {
      try {
        setLoading(true);
        
        // קריאה לשרת לקבלת האימונים העתידיים של המשתמש
        const response = await fetch(`/api/workouts/future/${user?.id || 1}`);
        const data = await response.json();
        
        if (data.success) {
          setWorkouts(data.workouts);
        } else {
          console.error('שגיאה בטעינת האימונים:', data.message);
        }
      } catch (error) {
        console.error('שגיאה בטעינת האימונים:', error);
        // נתונים לדוגמה למקרה שהשרת לא זמין
        setWorkouts([
          {
            id: 1,
            date: '2024-01-15',
            time: '18:00',
            court: 'מגרש 1',
            duration: 60,
            type: 'אימון כוח'
          },
          {
            id: 2,
            date: '2024-01-17',
            time: '19:30',
            court: 'מגרש 2',
            duration: 90,
            type: 'אימון קרדיו'
          },
          {
            id: 3,
            date: '2024-01-20',
            time: '17:00',
            court: 'מגרש 1',
            duration: 75,
            type: 'אימון גמישות'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();
  }, [user?.id]);

  // פונקציה למיון האימונים לפי מגרש
  const groupWorkoutsByCourt = () => {
    const grouped = {};
    
    workouts.forEach(workout => {
      if (!grouped[workout.court]) {
        grouped[workout.court] = [];
      }
      grouped[workout.court].push(workout);
    });
    
    return grouped;
  };

  // פונקציה לעיצוב התאריך
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const groupedWorkouts = groupWorkoutsByCourt();

  return (
    <div className="start-workout">
      <div className="header">
        <button className="back-button" onClick={onBackClick}>
          ← חזור
        </button>
        <h1>האימונים העתידיים שלך</h1>
      </div>
      
      <div className="workout-content">
        {loading ? (
          <div className="loading">
            <p>טוען אימונים...</p>
          </div>
        ) : workouts.length === 0 ? (
          <div className="no-workouts">
            <p>אין לך אימונים עתידיים</p>
            <button className="start-button">
              <span className="button-text">הזמן אימון חדש</span>
            </button>
          </div>
        ) : (
          <div className="workouts-list">
            {Object.entries(groupedWorkouts).map(([court, courtWorkouts]) => (
              <div key={court} className="court-section">
                <h2 className="court-title">{court}</h2>
                <div className="workouts-grid">
                  {courtWorkouts.map(workout => (
                    <div key={workout.id} className="workout-card">
                      <div className="workout-header">
                        <h3>{workout.type}</h3>
                        <span className="workout-duration">{workout.duration} דקות</span>
                      </div>
                      <div className="workout-details">
                        <p className="workout-date">{formatDate(workout.date)}</p>
                        <p className="workout-time">{workout.time}</p>
                      </div>
                      <button className="start-workout-btn">
                        התחל אימון
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StartWorkout;
