// backend/emailService.js
const nodemailer = require('nodemailer');

// בדיקת הגדרות אימייל
function validateEmailConfig() {
  const requiredVars = ['EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
  const missing = requiredVars.filter(varName => !process.env[varName] || process.env[varName].includes('your_'));
  
  if (missing.length > 0) {
    console.warn('⚠️ הגדרות אימייל לא מוגדרות:', missing.join(', '));
    return false;
  }
  return true;
}

// הגדרת transporter עבור Gmail
let transporter = null;

function createTransporter() {
  console.log('🔍 בדיקת משתני סביבה:');
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_PORT:', process.env.DB_PORT);
  console.log('DB_NAME:', process.env.DB_NAME);
  console.log('DB_USER:', process.env.DB_USER);
  console.log('DB_SSL:', process.env.DB_SSL);
  console.log('HOST:', process.env.HOST);
  console.log('PORT:', process.env.PORT);
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'exists' : 'missing');

  if (!validateEmailConfig()) {
    console.warn('⚠️ לא ניתן ליצור transporter - הגדרות אימייל חסרות');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      // הגדרות נוספות לפתרון בעיות
      secure: true,
      port: 465,
      tls: {
        rejectUnauthorized: false
      }
    });
    
    console.log('✅ Transporter אימייל נוצר בהצלחה');
    return transporter;
  } catch (error) {
    console.error('❌ שגיאה ביצירת transporter:', error);
    return null;
  }
}

// יצירת transporter בהתחלה
createTransporter();

// פונקציה לשליחת אימייל הזמנת אימון
async function sendWorkoutBookingEmail(userEmail, userName, workoutDetails) {
  try {
    // בדיקה אם transporter זמין
    if (!transporter) {
      console.warn('⚠️ Transporter אימייל לא זמין - מדלג על שליחת אימייל הזמנה');
      return { success: false, error: 'Email service not configured' };
    }

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
    // בדיקה אם transporter זמין
    if (!transporter) {
      console.warn('⚠️ Transporter אימייל לא זמין - מדלג על שליחת אימייל תזכורת');
      return { success: false, error: 'Email service not configured' };
    }

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

// פונקציה לשליחת אימייל ביטול אימון
async function sendWorkoutCancellationEmail(userEmail, userName, workoutDetails) {
  try {
    // בדיקה אם transporter זמין
    if (!transporter) {
      console.warn('⚠️ Transporter אימייל לא זמין - מדלג על שליחת אימייל ביטול');
      return { success: false, error: 'Email service not configured' };
    }

    const { date, startTime, endTime, slots } = workoutDetails;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px;">❌ WOLFit</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">האימון שלך בוטל</p>
        </div>
        
        <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #e74c3c; margin-top: 0;">שלום ${userName}! 😔</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            האימון שלך בוטל. הנה הפרטים של האימון שבוטל:
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #e74c3c; margin-top: 0;">📅 פרטי האימון שבוטל</h3>
            <p style="margin: 8px 0;"><strong>תאריך:</strong> ${formatDate(date)}</p>
            <p style="margin: 8px 0;"><strong>שעה:</strong> ${startTime} - ${endTime}</p>
            <p style="margin: 8px 0;"><strong>משך:</strong> ${calculateDuration(startTime, endTime)} דקות</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin-top: 0;">💪 רוצים להזמין אימון חדש?</h3>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">
              אתם מוזמנים להזמין אימון חדש בכל עת!<br>
              נשמח לראות אתכם שוב.
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
      subject: `❌ WOLFit - האימון שלך בוטל - ${formatDate(date)} ב-${startTime}`,
      html: emailContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ אימייל ביטול אימון נשלח:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ שגיאה בשליחת אימייל ביטול אימון:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendWorkoutBookingEmail,
  sendWorkoutReminderEmail,
  sendWorkoutCancellationEmail
};
