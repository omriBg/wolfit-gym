import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [hoursToAdd, setHoursToAdd] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const [userHistory, setUserHistory] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/all-users-hours`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
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
          hours: hoursToAdd,
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
          hours: hoursToAdd,
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
              {users.map(user => (
                <tr key={user.iduser}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.availablehours} רבעי שעה</td>
                  <td>{new Date(user.lastupdated).toLocaleString()}</td>
                  <td className="actions">
                    <div className="hours-control">
                      <input
                        type="number"
                        min="1"
                        value={hoursToAdd}
                        onChange={(e) => setHoursToAdd(parseInt(e.target.value) || 1)}
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
              ))}
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
                    <td>{new Date(record.createdat).toLocaleString()}</td>
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
