// קובץ בדיקה לשירות SMS
require('dotenv').config();
const { sendSMSCode, validatePhoneNumber } = require('./smsService');

async function testSMSService() {
  console.log('🧪 בודק שירות SMS...');
  
  // בדיקה 1: בדיקת משתני סביבה
  console.log('\n📋 בדיקת משתני סביבה:');
  console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ מוגדר' : '❌ חסר');
  console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ מוגדר' : '❌ חסר');
  console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? '✅ מוגדר' : '❌ חסר');
  
  // בדיקה 2: בדיקת פורמט טלפון
  console.log('\n📱 בדיקת פורמט טלפון:');
  const testNumbers = [
    '+972501234567',
    '0501234567',
    '972501234567',
    'invalid-phone'
  ];
  
  testNumbers.forEach(phone => {
    const result = validatePhoneNumber(phone);
    console.log(`${phone}: ${result.valid ? '✅ תקין' : '❌ לא תקין'} ${result.error || ''}`);
  });
  
  // בדיקה 3: שליחת SMS (רק אם המשתנים מוגדרים)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    console.log('\n📤 בדיקת שליחת SMS:');
    console.log('⚠️ זה ישלח SMS אמיתי! ודא שיש לך מספר טלפון תקין');
    
    // שנה את המספר הזה למספר שלך לבדיקה
    const testPhone = '+972501234567'; // שנה למספר שלך!
    
    if (testPhone === '+972501234567') {
      console.log('❌ אנא שנה את testPhone למספר הטלפון שלך בקובץ test-sms.js');
      return;
    }
    
    const result = await sendSMSCode(testPhone);
    console.log('תוצאת שליחת SMS:', result);
  } else {
    console.log('\n❌ לא ניתן לבדוק שליחת SMS - משתני סביבה חסרים');
  }
}

// הרצת הבדיקה
testSMSService().catch(console.error);
