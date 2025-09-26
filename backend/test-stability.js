// test-stability.js - בדיקת שיפורי יציבות
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testStability() {
  console.log('🧪 מתחיל בדיקת יציבות...\n');
  
  const tests = [
    {
      name: 'Health Check',
      url: '/health',
      expectedStatus: 200
    },
    {
      name: 'Detailed Health Check',
      url: '/health/detailed',
      expectedStatus: 200
    },
    {
      name: 'Readiness Check',
      url: '/ready',
      expectedStatus: 200
    },
    {
      name: 'Liveness Check',
      url: '/live',
      expectedStatus: 200
    },
    {
      name: 'Legacy Test Endpoint',
      url: '/test',
      expectedStatus: 200
    },
    {
      name: '404 Test',
      url: '/nonexistent',
      expectedStatus: 404
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`🔍 בודק: ${test.name}...`);
      const response = await axios.get(`${BASE_URL}${test.url}`, {
        timeout: 5000
      });
      
      if (response.status === test.expectedStatus) {
        console.log(`✅ ${test.name}: עבר (${response.status})`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: נכשל - קיבל ${response.status}, ציפה ל-${test.expectedStatus}`);
        failed++;
      }
    } catch (error) {
      if (error.response && error.response.status === test.expectedStatus) {
        console.log(`✅ ${test.name}: עבר (${error.response.status})`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: נכשל - ${error.message}`);
        failed++;
      }
    }
  }
  
  console.log(`\n📊 תוצאות בדיקה:`);
  console.log(`✅ עבר: ${passed}`);
  console.log(`❌ נכשל: ${failed}`);
  console.log(`📈 אחוז הצלחה: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 כל הבדיקות עברו בהצלחה! המערכת יציבה.');
  } else {
    console.log('\n⚠️ יש בעיות שדורשות תשומת לב.');
  }
}

// בדיקת עומס
async function testLoad() {
  console.log('\n🚀 מתחיל בדיקת עומס...');
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      axios.get(`${BASE_URL}/health`, { timeout: 5000 })
        .then(response => ({ success: true, status: response.status }))
        .catch(error => ({ success: false, error: error.message }))
    );
  }
  
  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`📊 תוצאות בדיקת עומס:`);
  console.log(`✅ הצליח: ${successful}`);
  console.log(`❌ נכשל: ${failed}`);
  console.log(`📈 אחוז הצלחה: ${Math.round((successful / results.length) * 100)}%`);
}

// הרצת הבדיקות
async function runTests() {
  try {
    await testStability();
    await testLoad();
  } catch (error) {
    console.error('❌ שגיאה בבדיקות:', error.message);
    console.log('\n💡 ודא שהשרת רץ על http://localhost:3001');
  }
}

runTests();
