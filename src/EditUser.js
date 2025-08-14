import React, { useState, useEffect } from 'react';
import './EditUser.css';

function EditUser({ onBackClick, currentUser }) {
  const [selectedSports, setSelectedSports] = useState([]);
  const [preferenceMode, setPreferenceMode] = useState('simple');
  const [intensityLevel, setIntensityLevel] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const SPORTS_LIST = [
    { id: 1, name: 'כדורגל', icon: '⚽' },
    { id: 2, name: 'כדורסל', icon: '🏀' },
    { id: 3, name: 'טיפוס', icon: '🧗' },
    { id: 4, name: 'חדר כושר', icon: '🏋️' },
    { id: 5, name: 'קורדינציה', icon: '🎯' },
    { id: 6, name: 'טניס', icon: '🎾' },
    { id: 7, name: 'פינגפונג', icon: '🏓' },
    { id: 8, name: 'ריקוד', icon: '💃' },
    { id: 9, name: 'אופניים', icon: '🚴' }
  ];

  const loadUserPreferences = async () => {
    if (!currentUser || !currentUser.id) {
      console.log('אין משתמש נוכחי');
      return;
    }
    
    console.log('טוען העדפות עבור משתמש:', currentUser.id);
    setIsLoading(true);
    
    try {
      const response = await fetch(`https://wolfit-gym-backend-ijvq.onrender.com/api/user-preferences/${currentUser.id}`);
      console.log('תגובה מהשרת:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('נתונים שהתקבלו:', result);
        
        if (result.success && result.data) {
          const { intensityLevel, selectedSports, preferenceMode } = result.data;
          
          console.log('רמת עצימות:', intensityLevel);
          console.log('ספורט נבחרים:', selectedSports);
          console.log('מצב העדפה:', preferenceMode);
          
          setIntensityLevel(intensityLevel || 2);
          setSelectedSports(selectedSports || []);
          setPreferenceMode(preferenceMode || 'simple');
          
          console.log('State עודכן בהצלחה');
        } else {
          console.log('אין העדפות קיימות או תגובה לא תקינה');
          setSelectedSports([]);
          setPreferenceMode('simple');
          setIntensityLevel(2);
        }
      } else {
        console.log('שגיאה בתגובה מהשרת:', response.status);
        setSelectedSports([]);
        setPreferenceMode('simple');
        setIntensityLevel(2);
      }
    } catch (error) {
      console.error('שגיאה בטעינת העדפות:', error);
      setSelectedSports([]);
      setPreferenceMode('simple');
      setIntensityLevel(2);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserPreferences = async () => {
    console.log('=== התחלת שמירת העדפות ===');
    
    if (!currentUser || !currentUser.id) {
      console.log('❌ אין משתמש נוכחי לשמירה');
      return;
    }
    
    if (selectedSports.length === 0) {
      console.log('❌ אין ספורט נבחרים');
      setSaveMessage('אנא בחר לפחות ספורט אחד');
      return;
    }
    
    console.log('✅ משתמש:', currentUser.id);
    console.log('✅ ספורט נבחרים:', selectedSports);
    console.log('✅ מצב דירוג:', preferenceMode);
    console.log('✅ רמת עצימות:', intensityLevel);
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const requestData = {
        intensityLevel: intensityLevel,
        selectedSports: selectedSports
      };

      console.log('📤 נתונים לשליחה:', JSON.stringify(requestData, null, 2));

      const url = `https://wolfit-gym-backend-ijvq.onrender.com/api/save-user-preferences/${currentUser.id}`;
      console.log('🌐 URL:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('📥 תגובת שמירה:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ תוצאת שמירה:', result);
        setSaveMessage('העדפות נשמרו בהצלחה!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const errorText = await response.text();
        console.log('❌ שגיאה בשמירה:', errorText);
        setSaveMessage(`שגיאה בשמירת ההעדפות: ${response.status}`);
      }
    } catch (error) {
      console.error('💥 שגיאה בשמירת העדפות:', error);
      setSaveMessage(`שגיאה בשמירת ההעדפות: ${error.message}`);
    } finally {
      setIsSaving(false);
      console.log('=== סיום שמירת העדפות ===');
    }
  };

  useEffect(() => {
    console.log('=== EditUser נטען ===');
    console.log('👤 משתמש נוכחי:', currentUser);
    
    if (currentUser && currentUser.id) {
      console.log('🔄 מתחיל טעינת העדפות...');
      loadUserPreferences();
    } else {
      console.log('❌ אין משתמש נוכחי');
    }
  }, [currentUser]);

  const changeToSimple = () => {
    setPreferenceMode('simple');
  };

  const changeToRanked = () => {
    setPreferenceMode('ranked');
  };

  const isSimpleActive = () => {
    return preferenceMode === 'simple' ? 'mode-button active' : 'mode-button';
  };

  const isRankedActive = () => {
    return preferenceMode === 'ranked' ? 'mode-button active' : 'mode-button';
  };

  const toggleSport = (sportId) => {
    const currentSelected = selectedSports.slice();
    const isCurrentlySelected = currentSelected.includes(sportId);
    
    if (isCurrentlySelected) {
      const newSelected = currentSelected.filter(id => id !== sportId);
      setSelectedSports(newSelected);
    } else {
      currentSelected.push(sportId);
      setSelectedSports(currentSelected);
    }
  };

  const moveSportUp = (sportId) => {
    const currentSelected = selectedSports.slice();
    const index = currentSelected.indexOf(sportId);
    
    if (index > 0) {
      const temp = currentSelected[index];
      currentSelected[index] = currentSelected[index - 1];
      currentSelected[index - 1] = temp;
      setSelectedSports(currentSelected);
    }
  };

  const moveSportDown = (sportId) => {
    const currentSelected = selectedSports.slice();
    const index = currentSelected.indexOf(sportId);
    
    if (index < currentSelected.length - 1) {
      const temp = currentSelected[index];
      currentSelected[index] = currentSelected[index + 1];
      currentSelected[index + 1] = temp;
      setSelectedSports(currentSelected);
    }
  };

  const getSportsByPreference = () => {
    const preferred = [];
    const others = [];
    
    SPORTS_LIST.forEach(sport => {
      const isSelected = selectedSports.includes(sport.id);
      if (isSelected) {
        preferred.push(sport);
      } else {
        others.push(sport);
      }
    });
    
    console.log('ספורט מועדפים:', preferred.map(s => s.name));
    console.log('ספורט אחרים:', others.map(s => s.name));
    
    return { preferred, others };
  };

  const getSortedPreferred = () => {
    const preferred = getSportsByPreference().preferred;
    
    if (preferenceMode === 'simple') {
      return preferred; 
    } else {
      return preferred.sort((a, b) => {
        const positionA = selectedSports.indexOf(a.id);
        const positionB = selectedSports.indexOf(b.id);
        return positionA - positionB;
      });
    }
  };

  const getRankingIcon = (rank) => {
    const icons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    return icons[rank - 1] || `${rank}`;
  };

  const getIntensityLabel = (level) => {
    switch(level) {
      case 1: return 'קל';
      case 2: return 'בינוני';
      case 3: return 'קשה';
      default: return 'בינוני';
    }
  };

  const getIntensityColor = (level) => {
    switch(level) {
      case 1: return '#4CAF50';
      case 2: return '#FF9800';
      case 3: return '#F44336';
      default: return '#FF9800';
    }
  };

  if (isLoading) {
    return (
      <div className="edit-user-container">
        <div className="content">
          <h2>טוען העדפות...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-user-container">
      <button className="back-button" onClick={onBackClick}>חזרה</button>
      
      <div className="content">
        <h1>עריכת משתמש</h1>
        <p>ערוך את העדפות הספורט והעצימות שלך</p>

        <div className="sports-section">
          <div className="preference-mode-selector">
            <button 
              className={isSimpleActive()}
              onClick={changeToSimple}
            >
              אני אוהב הכל באותה מידה
            </button>
            
            <button 
              className={isRankedActive()}
              onClick={changeToRanked}
            >
              העדפה מדורגת
            </button>
          </div>
                  
          {preferenceMode === 'ranked' && (
            <div className="ranking-instructions">
              <p>📋 לחץ על הספורט כדי להוסיף/להסיר מהרשימה</p>
              <p>⬆️⬇️ השתמש בחצים כדי לשנות את סדר הדירוג</p>
            </div>
          )}

          <div className="sports-container">
            <div className="sports-column">
              <h3>
                {preferenceMode === 'ranked' ? '🏆 תחומים מדורגים' : 'תחומים מועדפים'}
              </h3>
              <div className="sports-list">
                {getSortedPreferred().map((sport, index) => { 
                  const rank = preferenceMode === 'ranked' ? index + 1 : null;
                  return (
                    <div key={sport.id} className="sport-item">
                      <button 
                        onClick={() => toggleSport(sport.id)}
                        className={preferenceMode === 'ranked' ? 'ranked-sport-button' : ''}
                      >
                        {preferenceMode === 'ranked' && (
                          <div className="ranking-display">
                            <span className="sport-icon">{sport.icon}</span>
                            <span className="sport-name">{sport.name}</span>
                          </div>
                        )}
                        {preferenceMode === 'simple' && (
                          <>
                            <span className="sport-icon">{sport.icon}</span>
                            <span className="sport-name">{sport.name}</span>
                          </>
                        )}
                      </button>
                      {preferenceMode === 'ranked' && (
                        <div className="ranking-controls">
                          <button 
                            className="rank-control-btn up-btn"
                            onClick={() => moveSportUp(sport.id)}
                            disabled={index === 0}
                          >
                            ⬆️
                          </button>
                          <button 
                            className="rank-control-btn down-btn"
                            onClick={() => moveSportDown(sport.id)}
                            disabled={index === getSortedPreferred().length - 1}
                          >
                            ⬇️
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="sports-column">
              <h3>שאר האופציות</h3>
              <div className="sports-list">
                {getSportsByPreference().others.map(sport => (
                  <div key={sport.id} className="sport-item">
                    <button onClick={() => toggleSport(sport.id)}>
                      <span className="sport-icon">{sport.icon}</span>
                      <span className="sport-name">{sport.name}</span>
                    </button> 
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="summary-section">
            <div className="intensity-section">
              <h4>🔥 רמת עצימות מועדפת:</h4>
              <div className="intensity-selector">
                {[1, 2, 3].map((level) => (
                  <button
                    key={level}
                    className={`intensity-btn ${intensityLevel === level ? 'active' : ''}`}
                    onClick={() => setIntensityLevel(level)}
                    style={{
                      backgroundColor: intensityLevel === level ? getIntensityColor(level) : 'rgba(255, 255, 255, 0.1)',
                      borderColor: getIntensityColor(level)
                    }}
                  >
                    <span className="intensity-number">{level}</span>
                    <span className="intensity-label">{getIntensityLabel(level)}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {preferenceMode === 'ranked' && selectedSports.length > 0 && (
              <div className="ranking-summary">
                <h4>סדר הדירוג שלך:</h4>
                <div className="ranking-list">
                  {getSortedPreferred().map((sport, index) => (
                    <div key={sport.id} className="ranking-item">
                      <span className="rank-badge">{getRankingIcon(index + 1)}</span>
                      <span className="sport-icon">{sport.icon}</span>
                      <span className="sport-name">{sport.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {saveMessage && (
              <div className="save-message" style={{
                color: saveMessage.includes('בהצלחה') ? '#4CAF50' : '#F44336',
                textAlign: 'center',
                marginTop: '20px',
                fontSize: '16px'
              }}>
                {saveMessage}
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button 
                onClick={() => {
                  console.log('🔘 כפתור שמירה נלחץ!');
                  saveUserPreferences();
                }}
                disabled={isSaving}
                style={{
                  width: '250px',
                  height: '55px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: selectedSports.length > 0 ? 'linear-gradient(45deg, #b38ed8, #9c7dc4)' : 'rgba(255, 255, 255, 0.2)',
                  color: selectedSports.length > 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: selectedSports.length > 0 && !isSaving ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  opacity: selectedSports.length > 0 && !isSaving ? 1 : 0.6
                }}
              >
                {isSaving ? 'שומר...' : 'שמור והמשך'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditUser;