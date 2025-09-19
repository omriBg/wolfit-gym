// backend/emailService.js
const nodemailer = require('nodemailer');

// הגדרת transporter עבור Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// פונקציה לשליחת אימייל הזמנת אימון
async function sendWorkoutBookingEmail(userEmail, userName, workoutDetails) {
  try {
    const { date, startTime, endTime, slots } = workoutDetails;
    
    // יצירת תוכן האימייל
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px;">🏋️ WOLFit</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">האימון שלך הוזמן בהצלחה!</p>
        </div>
        
        <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8b5cf6; margin-top: 0;">שלום ${userName}! 👋</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            האימון שלך הוזמן בהצלחה! הנה הפרטים:
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8b5cf6; margin-top: 0;">📅 פרטי האימון</h3>
            <p style="margin: 8px 0;"><strong>תאריך:</strong> ${formatDate(date)}</p>
            <p style="margin: 8px 0;"><strong>שעה:</strong> ${startTime} - ${endTime}</p>
            <p style="margin: 8px 0;"><strong>משך:</strong> ${calculateDuration(startTime, endTime)} דקות</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8b5cf6; margin-top: 0;">🏟️ לוח זמנים מפורט</h3>
            ${generateScheduleHTML(slots)}
          </div>
          
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin-top: 0;">💪 מוכנים לאימון?</h3>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">
              נשמח לראות אותך באימון!<br>
              תזכורת תשלח לך שעה וחצי לפני האימון.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
            צוות WOLFit 🏋️‍♂️
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: `🏋️ WOLFit - האימון שלך הוזמן! ${formatDate(date)} ב-${startTime}`,
      html: emailContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ אימייל הזמנת אימון נשלח:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ שגיאה בשליחת אימייל הזמנת אימון:', error);
    return { success: false, error: error.message };
  }
}

// פונקציה לשליחת אימייל תזכורת
async function sendWorkoutReminderEmail(userEmail, userName, workoutDetails) {
  try {
    const { date, startTime, endTime, slots } = workoutDetails;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px;">⏰ WOLFit</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">תזכורת - האימון שלך מתחיל בקרוב!</p>
        </div>
        
        <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #ff6b6b; margin-top: 0;">שלום ${userName}! ⏰</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            האימון שלך מתחיל בעוד שעה וחצי! הנה הפרטים:
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">🚨 תזכורת - האימון מתחיל בקרוב!</h3>
            <p style="margin: 8px 0; color: #856404;"><strong>תאריך:</strong> ${formatDate(date)}</p>
            <p style="margin: 8px 0; color: #856404;"><strong>שעה:</strong> ${startTime} - ${endTime}</p>
            <p style="margin: 8px 0; color: #856404;"><strong>משך:</strong> ${calculateDuration(startTime, endTime)} דקות</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8b5cf6; margin-top: 0;">🏟️ לוח זמנים מפורט</h3>
            ${generateScheduleHTML(slots)}
          </div>
          
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin-top: 0;">💪 מוכנים לאימון?</h3>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">
              אל תשכחו להביא מים וטוב לב!<br>
              נשמח לראות אתכם באימון.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
            צוות WOLFit 🏋️‍♂️
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: `⏰ WOLFit - תזכורת! האימון שלך מתחיל בעוד שעה וחצי - ${formatDate(date)} ב-${startTime}`,
      html: emailContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ אימייל תזכורת נשלח:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ שגיאה בשליחת אימייל תזכורת:', error);
    return { success: false, error: error.message };
  }
}

// פונקציות עזר
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function calculateDuration(startTime, endTime) {
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  return Math.round((end - start) / (1000 * 60));
}

function generateScheduleHTML(slots) {
  if (!slots || slots.length === 0) {
    return '<p>אין פרטים זמינים</p>';
  }
  
  let html = '<div style="margin-top: 15px;">';
  
  slots.forEach((slot, index) => {
    if (slot.field) {
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; border-radius: 6px; margin: 8px 0; border-left: 4px solid #8b5cf6;">
          <div>
            <strong style="color: #8b5cf6;">${slot.time}</strong>
            <div style="font-size: 14px; color: #666; margin-top: 4px;">
              🏟️ ${slot.field.name} | 🏃 ${slot.sportType}
            </div>
          </div>
          <div style="color: #4CAF50; font-weight: bold;">✅</div>
        </div>
      `;
    } else {
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px; margin: 8px 0; border-left: 4px solid #ccc;">
          <div>
            <strong style="color: #666;">${slot.time}</strong>
            <div style="font-size: 14px; color: #999; margin-top: 4px;">
              לא זמין
            </div>
          </div>
          <div style="color: #999;">❌</div>
        </div>
      `;
    }
  });
  
  html += '</div>';
  return html;
}

module.exports = {
  sendWorkoutBookingEmail,
  sendWorkoutReminderEmail
};
