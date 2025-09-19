// backend/reminderService.js
const { Pool } = require('pg');
const { sendWorkoutReminderEmail } = require('./emailService');

// חיבור למסד נתונים
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'Wolfit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9526',
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
    sslmode: 'require'
  } : false,
});

// פונקציה לבדיקת תזכורות
async function checkAndSendReminders() {
  try {
    console.log('🔍 בודק תזכורות...');
    
    // חישוב זמן - שעה וחצי מהיום
    const now = new Date();
    const reminderTime = new Date(now.getTime() + (90 * 60 * 1000)); // 90 דקות
    
    // פורמט תאריך ושעה לבדיקה
    const reminderDate = reminderTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const reminderTimeStr = reminderTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    
    console.log(`⏰ מחפש אימונים ב-${reminderDate} בשעה ${reminderTimeStr}`);
    
    // חיפוש אימונים שעה וחצי מהיום
    const query = `
      SELECT DISTINCT 
        bf.bookingdate,
        bf.starttime,
        u.iduser,
        u.username,
        u.email,
        f.fieldname as field_name,
        f.sporttype,
        st.sportname
      FROM BookField bf
      JOIN "User" u ON bf.iduser = u.iduser
      JOIN Field f ON bf.idfield = f.idfield
      JOIN SportTypes st ON f.sporttype = st.sporttype
      WHERE bf.bookingdate = $1
      AND bf.starttime = $2
      ORDER BY bf.starttime, u.iduser
    `;
    
    const result = await pool.query(query, [reminderDate, reminderTimeStr]);
    
    if (result.rows.length === 0) {
      console.log('ℹ️ אין אימונים לתזכורת כרגע');
      return;
    }
    
    console.log(`📧 נמצאו ${result.rows.length} הזמנות לתזכורת`);
    
    // קיבוץ לפי משתמש
    const userWorkouts = {};
    
    for (const row of result.rows) {
      const userId = row.iduser;
      
      if (!userWorkouts[userId]) {
        userWorkouts[userId] = {
          user: {
            id: row.iduser,
            username: row.username,
            email: row.email
          },
          date: row.bookingdate,
          slots: []
        };
      }
      
      userWorkouts[userId].slots.push({
        time: row.starttime,
        field: {
          name: row.field_name,
          sportType: row.sportname
        }
      });
    }
    
    // שליחת תזכורות לכל משתמש
    for (const userId in userWorkouts) {
      const workout = userWorkouts[userId];
      
      try {
        // מיון לפי זמן
        workout.slots.sort((a, b) => a.time.localeCompare(b.time));
        
        const startTime = workout.slots[0].time;
        const endTime = workout.slots[workout.slots.length - 1].time;
        
        const workoutDetails = {
          date: workout.date,
          startTime: startTime,
          endTime: endTime,
          slots: workout.slots
        };
        
        console.log(`📧 שולח תזכורת למשתמש ${workout.user.username} (${workout.user.email})`);
        
        const emailResult = await sendWorkoutReminderEmail(
          workout.user.email,
          workout.user.username,
          workoutDetails
        );
        
        if (emailResult.success) {
          console.log(`✅ תזכורת נשלחה בהצלחה למשתמש ${workout.user.username}`);
        } else {
          console.log(`❌ שגיאה בשליחת תזכורת למשתמש ${workout.user.username}:`, emailResult.error);
        }
        
      } catch (error) {
        console.error(`❌ שגיאה בעיבוד תזכורת למשתמש ${workout.user.username}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ שגיאה בבדיקת תזכורות:', error);
  }
}

// הפעלת בדיקת תזכורות כל דקה
function startReminderService() {
  console.log('🚀 מתחיל שירות תזכורות...');
  
  // בדיקה ראשונית
  checkAndSendReminders();
  
  // בדיקה כל דקה
  setInterval(checkAndSendReminders, 60 * 1000); // 60 שניות
  
  console.log('✅ שירות תזכורות פועל - בדיקה כל דקה');
}

module.exports = {
  checkAndSendReminders,
  startReminderService
};
