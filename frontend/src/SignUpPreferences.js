import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './SignUpPreferences.css';
import { API_BASE_URL } from './config';
import FitnessMetricsChart from './components/FitnessMetricsChart';
import InteractiveBodySelector from './components/InteractiveBodySelector';


async function sendRegistrationToServer(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('שגיאה בשליחה לשרת:', error);
      return {
        success: false,
        message: 'שגיאה בחיבור לשרת'
      };
    }
  }

  const SPORTS_LIST = [
    { id: 1, name: 'כדורגל', icon: '', image: '/images/sports/football.jpg' },        // Soccer
    { id: 2, name: 'כדורסל', icon: '', image: '/images/sports/basketball.jpg' },       // Basketball  
    { id: 3, name: 'טיפוס', icon: '', image: '/images/sports/climbing.jpg' },         // Climbing
    { id: 4, name: 'חדר כושר', icon: '', image: '/images/sports/gym.jpg' },     // Strength Training
    { id: 5, name: 'קורדינציה', icon: '', image: '/images/sports/coordination.jpg' },    // Coordination
    { id: 6, name: 'טניס', icon: '', image: '/images/sports/tennis.jpg' },         // Tennis
    { id: 7, name: 'פינגפונג', icon: '', image: '/images/sports/pingpong.jpg' },     // Ping Pong
    { id: 8, name: 'אגרוף', icon: '', image: '/images/sports/dance.jpg' },        // Boxing
    { id: 9, name: 'אופניים', icon: '', image: '/images/sports/cycling.jpg' }       // Cycling
  ];


function SignUpPreferences() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { userData, googleData, phoneData } = location.state || {};
  const [selectedSports, setSelectedSports] = useState([]);
  const [preferenceMode, setPreferenceMode] = useState('simple');
  const [intensityLevel, setIntensityLevel] = useState(2);
  
  // שדות חדשים לבחירת אזורי גוף ומרכיבי כשירות (לא נשמרים במסד נתונים)
  const [wantsStrengthTraining, setWantsStrengthTraining] = useState(false);
  const [selectedBodyAreas, setSelectedBodyAreas] = useState([]);
  const [selectedFitnessComponents, setSelectedFitnessComponents] = useState([]);
  
  // מצב לניהול גרף מדדי הכושר
  const [chartOpen, setChartOpen] = useState(false);
  const [selectedSportForChart, setSelectedSportForChart] = useState(null);


  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    console.log('🔍 SignUpPreferences - userData:', userData);
    console.log('🔍 SignUpPreferences - googleData:', googleData);
    console.log('🔍 SignUpPreferences - phoneData:', phoneData);
    console.log('🔍 SignUpPreferences - phoneData.phoneNumber:', phoneData?.phoneNumber);
  }, [userData, googleData, phoneData]);

  function changeToSimple() {
    setPreferenceMode('simple');
  }

  function changeToRanked() {
    setPreferenceMode('ranked');
  }


  // פונקציות להעברת ספורטים
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


  function isSimpleActive() {
    return preferenceMode === 'simple' ? 'mode-button active' : 'mode-button';
  }

  function isRankedActive() {
    return preferenceMode === 'ranked' ? 'mode-button active' : 'mode-button';
  }

  function toggleSport(sportId) {
    const currentSelected = selectedSports.slice();
    const isCurrentlySelected = currentSelected.includes(sportId);
    
    if (preferenceMode === 'simple') {
      if (isCurrentlySelected) {
        const newSelected = currentSelected.filter(function(id) {
          return id !== sportId;
        });
        setSelectedSports(newSelected);
      } else {
        currentSelected.push(sportId);
        setSelectedSports(currentSelected);
      }
    } else {
      if (isCurrentlySelected) {
        const newSelected = currentSelected.filter(function(id) {
          return id !== sportId;
        });
        setSelectedSports(newSelected);
      } else {
        currentSelected.push(sportId);
        setSelectedSports(currentSelected);
      }
    }
  }



  function getSportsByPreference() {
    const preferred = [];
    const others = [];
    
    SPORTS_LIST.forEach(function(sport) {
      const isSelected = selectedSports.includes(sport.id);
      if (isSelected) {
        preferred.push(sport);
      } else {
        others.push(sport);
      }
    });
    
    return { preferred: preferred, others: others };
  }

  function getSortedPreferred() {
    const preferred = getSportsByPreference().preferred;
    
    if (preferenceMode === 'simple') {
      return preferred; 
    } else {
      return preferred.sort(function(a, b) {
        const positionA = selectedSports.indexOf(a.id);
        const positionB = selectedSports.indexOf(b.id);
        return positionA - positionB;
      });
    }
  }

  function getRankingIcon(rank) {
    const icons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    return icons[rank - 1] || `${rank}`;
  }

  function getIntensityLabel(level) {
    const labels = {
      1: 'קל',
      2: 'בינוני', 
      3: 'קשה'
    };
    return labels[level] || 'בינוני';
  }

  function getIntensityColor(level) {
    const colors = {
      1: '#4CAF50',
      2: '#FF9800',
      3: '#F44336'
    };
    return colors[level] || '#FF9800';
  }

  function getSportsForAlgorithm() {
    const selectedSportsData = getSortedPreferred();
    const selectedIds = selectedSportsData.map(sport => sport.id);
    const unselectedSports = SPORTS_LIST.filter(sport => !selectedIds.includes(sport.id));
    
    return [...selectedSportsData, ...unselectedSports];
  }

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

  async function handleCompleteSignUp() {
    if (selectedSports.length === 0) {
      alert('אנא בחר לפחות ספורט אחד');
      return;
    }

    // בדיקת תאריך לידה
    if (!userData?.birthdate) {
      alert('אנא בחר תאריך לידה');
      return;
    }

    const preferences = {
      intensityLevel: intensityLevel,
      preferenceMode: preferenceMode,
      selectedSports: selectedSports,
      sportsRanked: getSportsForAlgorithm(), // המערך הממוין לאלגוריתם
      wantsStrengthTraining: wantsStrengthTraining,
      selectedBodyAreas: selectedBodyAreas,
      selectedFitnessComponents: selectedFitnessComponents
    };
      const completeUserData = {
        ...userData,
        ...preferences,
        googleId: googleData?.googleId,
        phoneData: phoneData
      };
    console.log('נתונים בסיסיים:', userData);
    console.log('נתוני Google:', googleData);
    console.log('נתוני טלפון:', phoneData);
    console.log('נתוני טלפון - phoneNumber:', phoneData?.phoneNumber);
    console.log('העדפות ספורט:', preferences);
    console.log('נתונים מלאים שנשלחים:', completeUserData);
    console.log('phoneData.phoneNumber שנשלח:', completeUserData.phoneData?.phoneNumber);

    // שליחה לשרת
    const result = await sendRegistrationToServer(completeUserData);
    
    if (result.success) {
      console.log('הרשמה הושלמה בהצלחה:', result);
      login(result.token, result.user);
      navigate('/dashboard');
    } else {
      alert('שגיאה בהרשמה: ' + result.message);
    }
  }

  return (
    <div className="edit-user-container">
      <button className="back-button" onClick={() => navigate('/signup')}>
        חזרה
      </button>
      
      <div className="content">
        <h1>העדפות ספורט</h1>
        <p>בחר את הספורטים והעצמיות המועדפת עליך</p>
        

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
                {getSportsByPreference().others.map(function(sport) {
                  return (
                    <div key={sport.id} className="sport-item">
                      <div 
                        className="sport-image-container"
                        onClick={function() { toggleSport(sport.id); }}
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
                  );
                })}
              </div>
            </div>
          </div>

          <div className="summary-section">
            <div className="intensity-section">
              <h4>רמת עצמיות מועדפת:</h4>
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
              <h4>אימון כוח:</h4>
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
                <InteractiveBodySelector
                  selectedAreas={selectedBodyAreas}
                  onAreasChange={setSelectedBodyAreas}
                  selectedFitnessComponents={selectedFitnessComponents}
                  onFitnessComponentsChange={setSelectedFitnessComponents}
                />
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

            {/* כפתור השלמת ההרשמה */}
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button 
                onClick={handleCompleteSignUp}
                style={{
                  width: '250px',
                  height: '55px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: (selectedSports.length > 0 && userData?.birthdate) ? 'linear-gradient(45deg, #b38ed8, #9c7dc4)' : 'rgba(255, 255, 255, 0.2)',
                  color: (selectedSports.length > 0 && userData?.birthdate) ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: (selectedSports.length > 0 && userData?.birthdate) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  opacity: (selectedSports.length > 0 && userData?.birthdate) ? 1 : 0.6
                }}
                disabled={selectedSports.length === 0 || !userData?.birthdate}
              >
                השלם הרשמה
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

export default SignUpPreferences;