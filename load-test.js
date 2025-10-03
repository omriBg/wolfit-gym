// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 300, // 300 משתמשים
  duration: '2m', // למשך 2 דקות
};

export default function () {
  // הכתובת האמיתית שלך
  const BASE_URL = 'https://wolfit-gym.vercel.app';
  
  // 1. בדיקת בריאות
  let health = http.get(`${BASE_URL}/health`);
  check(health, { 'health ok': (r) => r.status === 200 });

  // 2. קבלת רשימת ספורטים
  let sports = http.get(`${BASE_URL}/api/sports`);
  check(sports, { 'sports ok': (r) => r.status === 200 });

  // 3. יצירת אימון אופטימלי
  let workoutPayload = JSON.stringify({
    userId: Math.floor(Math.random() * 100) + 1,
    date: '2024-12-20',
    timeSlots: ['10:00', '10:15', '10:30'],
    userPreferences: [1, 2, 3]
  });

  let workout = http.post(`${BASE_URL}/api/generate-optimal-workout`, workoutPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(workout, { 
    'workout generated': (r) => r.status === 200,
    'workout fast': (r) => r.timings.duration < 3000
  });

  // 4. שמירת אימון
  if (workout.status === 200) {
    let savePayload = JSON.stringify({
      bookings: [
        { idfield: 1, starttime: '10:00', bookingdate: '2024-12-20' }
      ],
      userId: Math.floor(Math.random() * 100) + 1,
      date: '2024-12-20',
      quarters: 1
    });

    let save = http.post(`${BASE_URL}/api/save-workout`, savePayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(save, { 'workout saved': (r) => r.status === 200 });
  }
}

