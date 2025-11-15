const twilio = require('twilio');

// בדיקת משתני סביבה
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// בדיקה שכל המשתנים מוגדרים
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  console.warn('⚠️ משתני Twilio לא מוגדרים - שירות SMS לא יהיה זמין');
  console.warn('⚠️ הגדר TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
}

// יצירת לקוח Twilio
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// פונקציה לשליחת קוד SMS
async function sendSMSCode(phoneNumber) {
  try {
    // יצירת קוד אקראי בן 6 ספרות
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`📱 שולח SMS לטלפון: ${phoneNumber}`);
    console.log(`🔐 קוד SMS: ${code}`);
    
    // שליחת הודעת SMS
    const message = await client.messages.create({
      body: `קוד האימות שלך ל-WOLFit Gym: ${code}\n\nהקוד תקף ל-5 דקות.`,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    console.log(`✅ SMS נשלח בהצלחה: ${message.sid}`);
    
    return {
      success: true,
      messageId: message.sid,
      code: code // נחזיר את הקוד לבדיקה (רק בפיתוח!)
    };
    
  } catch (error) {
    console.error('❌ שגיאה בשליחת SMS:', error);
    
    return {
      success: false,
      error: error.message,
      code: null
    };
  }
}

// פונקציה לבדיקת פורמט טלפון
function validatePhoneNumber(phoneNumber) {
  // הסרת רווחים ותווים מיוחדים
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // בדיקה שזה מספר טלפון תקין
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  
  if (!phoneRegex.test(cleaned)) {
    return {
      valid: false,
      error: 'מספר טלפון לא תקין'
    };
  }
  
  // הוספת + אם חסר
  const formatted = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  
  return {
    valid: true,
    formatted: formatted
  };
}

// פונקציה לניקוי מספר טלפון
function cleanPhoneNumber(phoneNumber) {
  // הסרת כל התווים שאינם ספרות או +
  return phoneNumber.replace(/[^\d\+]/g, '');
}

module.exports = {
  sendSMSCode,
  validatePhoneNumber,
  cleanPhoneNumber
};
















