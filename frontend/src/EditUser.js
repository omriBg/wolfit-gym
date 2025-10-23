import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './EditUser.css';
import { API_BASE_URL } from './config';
import FitnessMetricsChart from './components/FitnessMetricsChart';


function EditUser() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [selectedSports, setSelectedSports] = useState([]);
  const [preferenceMode, setPreferenceMode] = useState('simple');
  const [intensityLevel, setIntensityLevel] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  
  // שדות חדשים לבחירת אזורי גוף
  const [wantsStrengthTraining, setWantsStrengthTraining] = useState(false);
  const [selectedBodyAreas, setSelectedBodyAreas] = useState([]);

  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // מצב לניהול גרף מדדי הכושר
  const [chartOpen, setChartOpen] = useState(false);
  const [selectedSportForChart, setSelectedSportForChart] = useState(null);

  const SPORTS_LIST = [
    { id: 1, name: 'כדורגל', icon: '⚽', image: '/images/sports/football.jpg' },
    { id: 2, name: 'כדורסל', icon: '🏀', image: '/images/sports/basketball.jpg' },
    { id: 3, name: 'טיפוס', icon: '🧗', image: '/images/sports/climbing.jpg' },
    { id: 4, name: 'חדר כושר', icon: '🏋️', image: '/images/sports/gym.jpg' },
    { id: 5, name: 'קורדינציה', icon: '🎯', image: '/images/sports/coordination.jpg' },
    { id: 6, name: 'טניס', icon: '🎾', image: '/images/sports/tennis.jpg' },
    { id: 7, name: 'פינגפונג', icon: '🏓', image: '/images/sports/pingpong.jpg' },
    { id: 8, name: 'אגרוף', icon: '🥊', image: '/images/sports/dance.jpg' },
    { id: 9, name: 'אופניים', icon: '🚴', image: '/images/sports/cycling.jpg' }
  ];

  // רשימת אזורי גוף
  const BODY_AREAS = [
    { id: 'back', name: 'גב', icon: '🦴' },
    { id: 'shoulders', name: 'כתפיים', icon: '💪' },
    { id: 'arms', name: 'ידיים', icon: '🦾' },
    { id: 'chest', name: 'חזה', icon: '🫁' },
    { id: 'core', name: 'ליבה/בטן', icon: '🎯' },
    { id: 'legs', name: 'רגליים', icon: '🦵' }
  ];

  const loadUserPreferences = async () => {
    if (!currentUser || !currentUser.id) {
      console.log('אין משתמש נוכחי');
      return;
    }
    
    console.log('טוען העדפות עבור משתמש:', currentUser.id);
    setIsLoading(true);
    
    try {
      console.log('🔍 מתחיל לטעון העדפות עבור משתמש:', currentUser.id);
      const token = localStorage.getItem('authToken');
      console.log('🔑 נמצא טוקן:', token ? 'כן' : 'לא');
      
      const response = await fetch(`${API_BASE_URL}/api/user-preferences/${currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('📡 תגובה מהשרת:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('נתונים שהתקבלו:', result);
        
          if (result.success && result.data) {
            console.log('✅ התקבלו נתונים תקינים מהשרת');
            const { intensityLevel, sports, preferenceMode, wantsStrengthTraining, selectedBodyAreas } = result.data;
            
            console.log('💪 רמת עצימות:', intensityLevel);
            console.log('🎯 כל הספורטים:', sports);
            console.log('🔄 מצב העדפה:', preferenceMode);
            console.log('💪 אימון כוח:', wantsStrengthTraining);
            console.log('🎯 אזורי גוף:', selectedBodyAreas);
            
            console.log('📝 מתחיל לעבד את הנתונים...');
            
            // מחלץ את הספורטים הנבחרים
            // מחלץ את הספורטים הנבחרים
            let selectedIds;
            if (Array.isArray(sports)) {
              // אם זה מערך של אובייקטים עם selected
              if (sports.some(sport => 'selected' in sport)) {
                selectedIds = sports
                  .filter(sport => sport.selected)
                  .sort((a, b) => (a.rank || 0) - (b.rank || 0))
                  .map(sport => sport.id);
              } 
              // אם זה מערך של אובייקטים עם id ישירות
              else {
                selectedIds = sports
                  .sort((a, b) => (a.rank || 0) - (b.rank || 0))
                  .map(sport => sport.id);
              }
            } else {
              selectedIds = [];
            }
            
            console.log('ספורטים נבחרים:', selectedIds);
            
            setIntensityLevel(intensityLevel || 2);
            setSelectedSports(selectedIds);
            setPreferenceMode(preferenceMode || 'simple');
            setWantsStrengthTraining(wantsStrengthTraining || false);
            setSelectedBodyAreas(selectedBodyAreas || []);
          
          console.log('State עודכן בהצלחה');
        } else {
          console.log('אין העדפות קיימות או תגובה לא תקינה');
          setSelectedSports([]);
          setPreferenceMode('simple');
          setIntensityLevel(2);
          setWantsStrengthTraining(false);
          setSelectedBodyAreas([]);
        }
      } else {
        console.log('שגיאה בתגובה מהשרת:', response.status);
        setSelectedSports([]);
        setPreferenceMode('simple');
        setIntensityLevel(2);
        setWantsStrengthTraining(false);
        setSelectedBodyAreas([]);
      }
    } catch (error) {
      console.error('שגיאה בטעינת העדפות:', error);
      setSelectedSports([]);
      setPreferenceMode('simple');
      setIntensityLevel(2);
      setWantsStrengthTraining(false);
      setSelectedBodyAreas([]);
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
        selectedSports: selectedSports,
        wantsStrengthTraining: wantsStrengthTraining,
        selectedBodyAreas: selectedBodyAreas
      };

      console.log('📤 נתונים לשליחה:', JSON.stringify(requestData, null, 2));

      const url = `${API_BASE_URL}/api/save-user-preferences/${currentUser.id}`; 
      console.log('🌐 URL:', url);

      const token = localStorage.getItem('authToken');
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('📥 תגובת שמירה:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ תוצאת שמירה:', result);
        setSaveMessage('✅ השינויים נשמרו בהצלחה!');
        setTimeout(() => {
          setSaveMessage('');
          // חזרה לתפריט הראשי לאחר שמירת ההעדפות
          navigate('/main-menu');
        }, 1000);
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

  // פונקציות לטיפול באזורי גוף
  const toggleBodyArea = (areaId) => {
    const currentSelected = selectedBodyAreas.slice();
    const isCurrentlySelected = currentSelected.includes(areaId);
    
    if (isCurrentlySelected) {
      const newSelected = currentSelected.filter(id => id !== areaId);
      setSelectedBodyAreas(newSelected);
    } else {
      currentSelected.push(areaId);
      setSelectedBodyAreas(currentSelected);
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

  // פונקציה לפתיחת גרף מדדי הכושר
  const openFitnessChart = (sport) => {
    setSelectedSportForChart(sport);
    setChartOpen(true);
  };

  // פונקציה לסגירת גרף מדדי הכושר
  const closeFitnessChart = () => {
    setChartOpen(false);
    setSelectedSportForChart(null);
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
      <button className="back-button" onClick={() => navigate('/main-menu')}>חזרה</button>
      
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
                  
          <div className="ranking-instructions">
            <p>📋 לחץ על הספורט כדי להוסיף/להסיר מהרשימה</p>
            {preferenceMode === 'ranked' && (
              <p>⬆️⬇️ השתמש בחצים כדי לשנות את סדר הדירוג</p>
            )}
            <p>📊 לחץ על כפתור הגרף בצד שמאל למעלה כדי לראות את מרכיבי הכושר של הספורט</p>
          </div>

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
                        className={preferenceMode === 'ranked' ? 'ranked-sport-button' : 'sport-button'}
                      >
                        {preferenceMode === 'ranked' && (
                          <div className="ranking-display">
                            <div className="rank-number">{rank}</div>
                            <div className="sport-image-container">
                              <img src={sport.image} alt={sport.name} className="sport-image" />
                              <div className="sport-name-overlay">{sport.name}</div>
                            </div>
                          </div>
                        )}
                        {preferenceMode === 'simple' && (
                          <div className="sport-image-container">
                            <img src={sport.image} alt={sport.name} className="sport-image" />
                            <div className="sport-name-overlay">{sport.name}</div>
                          </div>
                        )}
                      </button>
                      {preferenceMode === 'ranked' && (
                        <div className="ranking-controls">
                          <button 
                            className="rank-control-btn up-btn"
                            onClick={() => moveSportUp(sport.id)}
                            disabled={index === 0}
                            title="העבר למעלה"
                          >
                            ⬆️
                          </button>
                          <button 
                            className="rank-control-btn down-btn"
                            onClick={() => moveSportDown(sport.id)}
                            disabled={index === getSortedPreferred().length - 1}
                            title="העבר למטה"
                          >
                            ⬇️
                          </button>
                        </div>
                      )}
                      <button 
                        className="fitness-chart-btn"
                        onClick={() => openFitnessChart(sport)}
                        title="צפה במדדי הכושר"
                      >
                        📊
                      </button>
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
                    <div 
                      className="sport-image-container"
                      onClick={() => toggleSport(sport.id)}
                      data-sport={sport.name === 'כדורסל' ? 'basketball' : ''}
                    >
                      <img src={sport.image} alt={sport.name} className="sport-image" />
                      <div className="sport-name-overlay">{sport.name}</div>
                    </div>
                    <button 
                      className="fitness-chart-btn"
                      onClick={() => openFitnessChart(sport)}
                      title="צפה במדדי הכושר"
                    >
                      📊
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

            {/* שדה חדש לבחירת אימון כוח */}
            <div className="strength-training-section">
              <h4>💪 אימון כוח:</h4>
              <div className="strength-training-option">
                <label className="strength-checkbox">
                  <input
                    type="checkbox"
                    checked={wantsStrengthTraining}
                    onChange={(e) => setWantsStrengthTraining(e.target.checked)}
                  />
                  <span className="checkbox-text">אני רוצה לשלב תרגילי כוח באימון</span>
                </label>
              </div>
              
              {wantsStrengthTraining && (
                <div className="body-areas-section">
                  <h5>🎯 בחר איזה אזור בגוף אתה רוצה לעבוד:</h5>
                  <div className="body-areas-grid">
                    {BODY_AREAS.map((area) => (
                      <button
                        key={area.id}
                        className={`body-area-btn ${selectedBodyAreas.includes(area.id) ? 'selected' : ''}`}
                        onClick={() => toggleBodyArea(area.id)}
                      >
                        <span className="body-area-icon">{area.icon}</span>
                        <span className="body-area-name">{area.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
              <>
                {/* רקע שחור לגמרי */}
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  zIndex: 999
                }}></div>
                
                {/* תיבת ההודעה */}
                <div className="save-message" style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#fff',
                  color: '#000',
                  padding: '20px 30px',
                  borderRadius: '12px',
                  border: '2px solid #8b5cf6',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  zIndex: 1000,
                  textAlign: 'center',
                  animation: 'popup 0.3s ease-out'
                }}>
                  {saveMessage}
                </div>
              </>
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
      
      {/* רכיב גרף מדדי הכושר */}
      <FitnessMetricsChart
        sportName={selectedSportForChart?.name}
        sportId={selectedSportForChart?.id}
        isOpen={chartOpen}
        onClose={closeFitnessChart}
      />
    </div>
  );
}

export default EditUser;