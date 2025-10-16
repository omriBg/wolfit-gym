// קובץ בדיקה ל-API endpoints של SMS
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001';

async function testSMSAPI() {
  console.log('🧪 בודק SMS API endpoints...');
  
  try {
    // בדיקה 1: שליחת קוד SMS
    console.log('\n📱 בדיקת שליחת קוד SMS:');
    const sendResponse = await fetch(`${API_BASE_URL}/api/send-sms-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: '+972501234567' // שנה למספר שלך לבדיקה
      })
    });
    
    const sendResult = await sendResponse.json();
    console.log('תוצאת שליחת SMS:', sendResult);
    
    if (sendResult.success) {
      console.log('✅ שליחת SMS עבדה!');
      
      // בדיקה 2: אימות קוד SMS
      console.log('\n🔐 בדיקת אימות קוד SMS:');
      const verifyResponse = await fetch(`${API_BASE_URL}/api/verify-sms-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: '+972501234567',
          smsCode: '123456' // קוד דמה
        })
      });
      
      const verifyResult = await verifyResponse.json();
      console.log('תוצאת אימות SMS:', verifyResult);
      
      if (verifyResult.success) {
        console.log('✅ אימות SMS עבד!');
        console.log('🔑 JWT Token:', verifyResult.token ? 'קיים' : 'חסר');
        console.log('👤 User Data:', verifyResult.user);
      } else {
        console.log('ℹ️ אימות SMS לא עבד (כנראה משתמש חדש):', verifyResult.message);
      }
    } else {
      console.log('❌ שליחת SMS לא עבדה:', sendResult.message);
    }
    
  } catch (error) {
    console.error('❌ שגיאה בבדיקת API:', error.message);
    console.log('💡 ודא שהשרת רץ על פורט 3001');
  }
}

// הרצת הבדיקה
testSMSAPI().catch(console.error);
