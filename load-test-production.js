// load-test-production.js - בדיקת עומסים לאתר באוויר
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },   // עלייה הדרגתית ל-10 משתמשים
    { duration: '1m', target: 50 },    // עלייה ל-50 משתמשים
    { duration: '2m', target: 100 },  // עלייה ל-100 משתמשים
    { duration: '1m', target: 0 },    // ירידה הדרגתית ל-0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% מהבקשות מתחת ל-2 שניות
    http_req_failed: ['rate<0.1'],     // פחות מ-10% כישלונות
  },
};

const BASE_URL = 'https://wolfit-gym.vercel.app';

export default function () {
  // 1. בדיקת דף הבית
  let homePage = http.get(`${BASE_URL}/`);
  check(homePage, { 
    'homepage status 200': (r) => r.status === 200,
    'homepage fast': (r) => r.timings.duration < 3000
  });

  sleep(1);

  // 2. בדיקת API endpoints (אם קיימים)
  let healthCheck = http.get(`${BASE_URL}/api/health`);
  check(healthCheck, { 
    'health check status': (r) => r.status === 200 || r.status === 404
  });

  sleep(1);

  // 3. בדיקת סטטיק assets
  let staticAssets = http.get(`${BASE_URL}/static/css/main.022d0b8e.css`);
  check(staticAssets, { 
    'static assets load': (r) => r.status === 200
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: `
📊 תוצאות בדיקת עומסים:
✅ בקשות מוצלחות: ${data.metrics.http_reqs.values.count - data.metrics.http_req_failed.values.count}
❌ בקשות נכשלו: ${data.metrics.http_req_failed.values.count}
📈 אחוז הצלחה: ${((1 - data.metrics.http_req_failed.values.count / data.metrics.http_reqs.values.count) * 100).toFixed(2)}%
⏱️ זמן תגובה ממוצע: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
⏱️ זמן תגובה 95%: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
🚀 בקשות לשנייה: ${data.metrics.http_reqs.values.rate.toFixed(2)}
    `,
  };
}







