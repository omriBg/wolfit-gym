#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

// הגדרת חיבור למסד הנתונים
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// פונקציה להצגת רשימת משתמשים
async function listUsers() {
  try {
    const result = await pool.query(`
      SELECT iduser, name, email, isadmin, created_at 
      FROM "User" 
      ORDER BY iduser DESC 
      LIMIT 20
    `);
    
    console.log('\n📋 רשימת משתמשים:');
    console.log('═'.repeat(80));
    console.log('ID\t| שם\t\t| אימייל\t\t\t\t| מנהל\t| תאריך יצירה');
    console.log('─'.repeat(80));
    
    result.rows.forEach(user => {
      const isAdmin = user.isadmin ? '✅ כן' : '❌ לא';
      const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString('he-IL') : 'לא ידוע';
      console.log(`${user.iduser}\t| ${user.name}\t| ${user.email}\t| ${isAdmin}\t| ${createdDate}`);
    });
    
    return result.rows;
  } catch (error) {
    console.error('❌ שגיאה בטעינת רשימת משתמשים:', error.message);
    return [];
  }
}

// פונקציה להפיכת משתמש למנהל
async function setUserAsAdmin(userId, isAdmin = true) {
  try {
    // בדיקה שהמשתמש קיים
    const userCheck = await pool.query(
      'SELECT iduser, name, email, isadmin FROM "User" WHERE iduser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      console.log('❌ משתמש לא נמצא!');
      return false;
    }
    
    const user = userCheck.rows[0];
    console.log(`\n🔍 משתמש נבחר: ${user.name} (${user.email})`);
    console.log(`📊 סטטוס נוכחי: ${user.isadmin ? 'מנהל' : 'משתמש רגיל'}`);
    
    // עדכון סטטוס המנהל
    await pool.query(
      'UPDATE "User" SET isadmin = $1 WHERE iduser = $2',
      [isAdmin, userId]
    );
    
    console.log(`✅ ${isAdmin ? 'הוענקו' : 'הוסרו'} הרשאות מנהל למשתמש ${user.name}`);
    return true;
  } catch (error) {
    console.error('❌ שגיאה בעדכון הרשאות:', error.message);
    return false;
  }
}

// פונקציה לחיפוש משתמש לפי שם או אימייל
async function searchUser(searchTerm) {
  try {
    const result = await pool.query(`
      SELECT iduser, name, email, isadmin 
      FROM "User" 
      WHERE name ILIKE $1 OR email ILIKE $1
      ORDER BY iduser DESC
    `, [`%${searchTerm}%`]);
    
    if (result.rows.length === 0) {
      console.log('❌ לא נמצאו משתמשים המתאימים לחיפוש');
      return [];
    }
    
    console.log(`\n🔍 תוצאות חיפוש עבור "${searchTerm}":`);
    console.log('═'.repeat(80));
    console.log('ID\t| שם\t\t| אימייל\t\t\t\t| מנהל');
    console.log('─'.repeat(80));
    
    result.rows.forEach(user => {
      const isAdmin = user.isadmin ? '✅ כן' : '❌ לא';
      console.log(`${user.iduser}\t| ${user.name}\t| ${user.email}\t| ${isAdmin}`);
    });
    
    return result.rows;
  } catch (error) {
    console.error('❌ שגיאה בחיפוש משתמש:', error.message);
    return [];
  }
}

// פונקציה ראשית
async function main() {
  console.log('🔧 כלי ניהול הרשאות מנהל');
  console.log('═'.repeat(50));
  
  try {
    // טעינת רשימת משתמשים
    const users = await listUsers();
    
    if (users.length === 0) {
      console.log('❌ לא נמצאו משתמשים במסד הנתונים');
      return;
    }
    
    // קבלת קלט מהמשתמש
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const question = (query) => new Promise(resolve => rl.question(query, resolve));
    
    console.log('\n📝 אפשרויות:');
    console.log('1. הזן ID של משתמש');
    console.log('2. חפש לפי שם או אימייל');
    console.log('3. צא');
    
    const choice = await question('\nבחר אפשרות (1-3): ');
    
    switch (choice) {
      case '1': {
        const userId = await question('\nהזן ID של המשתמש: ');
        const user = users.find(u => u.iduser.toString() === userId);
        
        if (!user) {
          console.log('❌ משתמש לא נמצא ברשימה');
          break;
        }
        
        const action = await question(`\nמה לעשות עם ${user.name}?\n1. הפוך למנהל\n2. הסר הרשאות מנהל\n3. ביטול\nבחר (1-3): `);
        
        if (action === '1') {
          await setUserAsAdmin(userId, true);
        } else if (action === '2') {
          await setUserAsAdmin(userId, false);
        } else {
          console.log('❌ בוטל');
        }
        break;
      }
      
      case '2': {
        const searchTerm = await question('\nהזן שם או אימייל לחיפוש: ');
        const searchResults = await searchUser(searchTerm);
        
        if (searchResults.length > 0) {
          const userId = await question('\nהזן ID של המשתמש מהרשימה: ');
          const user = searchResults.find(u => u.iduser.toString() === userId);
          
          if (!user) {
            console.log('❌ משתמש לא נמצא ברשימה');
            break;
          }
          
          const action = await question(`\nמה לעשות עם ${user.name}?\n1. הפוך למנהל\n2. הסר הרשאות מנהל\n3. ביטול\nבחר (1-3): `);
          
          if (action === '1') {
            await setUserAsAdmin(userId, true);
          } else if (action === '2') {
            await setUserAsAdmin(userId, false);
          } else {
            console.log('❌ בוטל');
          }
        }
        break;
      }
      
      case '3':
        console.log('👋 להתראות!');
        break;
        
      default:
        console.log('❌ אפשרות לא תקינה');
    }
    
    rl.close();
    
  } catch (error) {
    console.error('❌ שגיאה כללית:', error.message);
  } finally {
    await pool.end();
  }
}

// הרצת הסקריפט
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { listUsers, setUserAsAdmin, searchUser };
