import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [hoursMap, setHoursMap] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    console.log('AdminDashboard נטען');
    const token = localStorage.getItem('authToken');
    console.log('טוקן ב-useEffect:', token ? 'קיים' : 'לא קיים');
    if (token) {
      console.log('אורך הטוקן:', token.length);
    }
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchEmail.trim() === '') {
      setFilteredUsers(users);
    } else {
      // Clear existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      // Set new timeout for debounced search
      const timeout = setTimeout(() => {
        searchUsers(searchEmail);
      }, 300); // 300ms delay
      
      setSearchTimeout(timeout);
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [users, searchEmail]);

  const searchUsers = async (email) => {
    if (email.trim() === '') {
      setFilteredUsers(users);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/search-user?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setFilteredUsers(data.users);
      } else {
        setError('שגיאה בחיפוש משתמשים');
        setFilteredUsers([]);
      }
    } catch (err) {
      setError('שגיאה בחיפוש משתמשים');
      setFilteredUsers([]);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      console.log('טוקן שנמצא:', token ? 'קיים' : 'לא קיים');
      console.log('API_BASE_URL:', API_BASE_URL);
      const response = await fetch(`${API_BASE_URL}/api/admin/all-users-hours`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('סטטוס תגובה:', response.status);
      const data = await response.json();
      console.log('תגובה מהשרת:', data);
      if (data.success) {
        console.log('משתמשים שהתקבלו:', data.users);
        console.log('מספר משתמשים:', data.users.length);
        if (data.users.length > 0) {
          console.log('דוגמה למשתמש:', data.users[0]);
          console.log('availableHours:', data.users[0].availableHours);
          console.log('lastUpdated:', data.users[0].lastUpdated);
          console.log('כל השדות:', Object.keys(data.users[0]));
        }
        setUsers(data.users);
        setFilteredUsers(data.users);
      } else {
        setError('שגיאה בטעינת משתמשים');
      }
    } catch (err) {
      setError('שגיאה בטעינת משתמשים');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHours = async (userId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/add-hours/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hours: hoursMap[userId] || 1,
          reason: 'הוספת שעות על ידי מנהל'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        loadUsers(); // טעינה מחדש של רשימת המשתמשים
      } else {
        setError(data.message || 'שגיאה בהוספת שעות');
      }
    } catch (err) {
      setError('שגיאה בהוספת שעות');
    }
  };

  const handleSubtractHours = async (userId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/subtract-hours/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hours: hoursMap[userId] || 1,
          reason: 'הפחתת שעות על ידי מנהל'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        loadUsers(); // טעינה מחדש של רשימת המשתמשים
      } else {
        setError(data.message || 'שגיאה בהפחתת שעות');
      }
    } catch (err) {
      setError('שגיאה בהפחתת שעות');
    }
  };

  const loadUserHistory = async (userId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/user-hours-history/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setUserHistory(data.history);
        setShowHistory(true);
      } else {
        setError('שגיאה בטעינת היסטוריה');
      }
    } catch (err) {
      setError('שגיאה בטעינת היסטוריה');
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>ניהול משתמשים</h1>
        <button onClick={() => navigate('/admin-choice')} className="back-button">
          חזרה
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">טוען...</div>
      ) : (
        <div className="users-container">
          <div className="search-container">
            <input
              type="text"
              placeholder="חיפוש משתמש לפי אימייל..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="search-input"
            />
            <div className="search-results-count">
              {filteredUsers.length} מתוך {users.length} משתמשים
            </div>
          </div>
          <table className="users-table">
            <thead>
              <tr>
                <th>שם משתמש</th>
                <th>אימייל</th>
                <th>שעות זמינות</th>
                <th>עדכון אחרון</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                console.log('מציג משתמש:', user.username, 'availableHours:', user.availableHours);
                return (
                <tr key={user.iduser}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td className="hours-cell">
                    <span className="hours-number">{user.availableHours !== null && user.availableHours !== undefined ? user.availableHours : 0}</span>
                    <span className="hours-unit"> לבנות אימון</span>
                  </td>
                  <td className="date-cell">
                    {user.lastUpdated && user.lastUpdated !== 'Invalid Date' 
                      ? new Date(user.lastUpdated).toLocaleString('he-IL') 
                      : 'לא עודכן'
                    }
                  </td>
                  <td className="actions">
                    <div className="hours-control">
                      <input
                        type="number"
                        min="1"
                        value={hoursMap[user.iduser] || 1}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 1;
                          setHoursMap(prev => ({
                            ...prev,
                            [user.iduser]: newValue
                          }));
                        }}
                      />
                      <button onClick={() => handleAddHours(user.iduser)} className="add-button">
                        הוסף
                      </button>
                      <button onClick={() => handleSubtractHours(user.iduser)} className="subtract-button">
                        הפחת
                      </button>
                    </div>
                    <button onClick={() => loadUserHistory(user.iduser)} className="history-button">
                      היסטוריה
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showHistory && (
        <div className="history-modal">
          <div className="history-content">
            <h2>היסטוריית שעות</h2>
            <table className="history-table">
              <thead>
                <tr>
                  <th>פעולה</th>
                  <th>שעות</th>
                  <th>סיבה</th>
                  <th>תאריך</th>
                </tr>
              </thead>
              <tbody>
                {userHistory.map((record, index) => (
                  <tr key={index}>
                    <td>{record.action}</td>
                    <td>{record.hours}</td>
                    <td>{record.reason}</td>
                    <td>{new Date(record.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setShowHistory(false)} className="close-button">
              סגור
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
