import React, { useState, useEffect } from 'react';
import './WolfAssistant.css';

const WolfAssistant = ({ onRecommendation, isOpen, onClose }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const questions = [
    {
      id: 'age',
      question: "שלום! אני וולף, העוזר האישי שלך.\n\nבואו נתחיל - מה הגיל שלך?",
      type: 'select',
      options: [
        { value: 'teen', label: '15-18' },
        { value: 'young', label: '19-25' },
        { value: 'adult', label: '26-35' },
        { value: 'middle', label: '36-50' },
        { value: 'senior', label: '50+' }
      ]
    },
    {
      id: 'fitness_level',
      question: "איך היית מתאר את רמת הכושר הנוכחית שלך?",
      type: 'select',
      options: [
        { value: 'beginner', label: 'מתחיל - לא עושה כושר באופן קבוע' },
        { value: 'novice', label: 'מתחיל - עושה כושר מדי פעם' },
        { value: 'intermediate', label: 'בינוני - עושה כושר 2-3 פעמים בשבוע' },
        { value: 'advanced', label: 'מתקדם - עושה כושר 4-5 פעמים בשבוע' },
        { value: 'expert', label: 'מומחה - עושה כושר 6+ פעמים בשבוע' }
      ]
    },
    {
      id: 'workout_frequency',
      question: "כמה פעמים בשבוע אתה מתכנן להתאמן?",
      type: 'select',
      options: [
        { value: '1', label: 'פעם בשבוע' },
        { value: '2', label: 'פעמיים בשבוע' },
        { value: '3', label: '3 פעמים בשבוע' },
        { value: '4', label: '4 פעמים בשבוע' },
        { value: '5+', label: '5+ פעמים בשבוע' }
      ]
    },
    {
      id: 'workout_duration',
      question: "כמה זמן אתה מתכנן להתאמן בכל פעם?",
      type: 'select',
      options: [
        { value: '15-30', label: '15-30 דקות' },
        { value: '30-45', label: '30-45 דקות' },
        { value: '45-60', label: '45-60 דקות' },
        { value: '60-90', label: '60-90 דקות' },
        { value: '90+', label: '90+ דקות' }
      ]
    },
    {
      id: 'goals',
      question: "מה המטרה העיקרית שלך באימונים?",
      type: 'select',
      options: [
        { value: 'weight_loss', label: 'ירידה במשקל' },
        { value: 'muscle_gain', label: 'בניית שרירים' },
        { value: 'endurance', label: 'שיפור סיבולת לב-ריאה' },
        { value: 'strength', label: 'חיזוק כוח' },
        { value: 'general_fitness', label: 'כושר כללי' },
        { value: 'flexibility', label: 'גמישות' }
      ]
    },
    {
      id: 'injuries',
      question: "האם יש לך פציעות או בעיות רפואיות שצריך לקחת בחשבון?",
      type: 'select',
      options: [
        { value: 'none', label: 'לא, אין בעיות' },
        { value: 'minor', label: 'בעיות קלות (כאבי גב, ברכיים)' },
        { value: 'moderate', label: 'בעיות בינוניות' },
        { value: 'severe', label: 'בעיות משמעותיות' }
      ]
    }
  ];

  const getIntensityRecommendation = () => {
    const { age, fitness_level, workout_frequency, workout_duration, goals, injuries } = answers;
    
    let intensity = 'medium';
    let reasoning = '';
    
    // חישוב רמת עצימות על בסיס התשובות
    let score = 0;
    
    // גיל
    if (age === 'teen' || age === 'young') score += 2;
    else if (age === 'adult') score += 1;
    else if (age === 'middle') score += 0;
    else if (age === 'senior') score -= 1;
    
    // רמת כושר
    if (fitness_level === 'expert') score += 3;
    else if (fitness_level === 'advanced') score += 2;
    else if (fitness_level === 'intermediate') score += 1;
    else if (fitness_level === 'novice') score += 0;
    else if (fitness_level === 'beginner') score -= 1;
    
    // תדירות אימונים
    if (workout_frequency === '5+') score += 2;
    else if (workout_frequency === '4') score += 1;
    else if (workout_frequency === '3') score += 0;
    else if (workout_frequency === '2') score -= 1;
    else if (workout_frequency === '1') score -= 2;
    
    // משך אימון
    if (workout_duration === '90+') score += 2;
    else if (workout_duration === '60-90') score += 1;
    else if (workout_duration === '45-60') score += 0;
    else if (workout_duration === '30-45') score -= 1;
    else if (workout_duration === '15-30') score -= 2;
    
    // מטרות
    if (goals === 'muscle_gain' || goals === 'strength') score += 2;
    else if (goals === 'endurance') score += 1;
    else if (goals === 'weight_loss') score += 0;
    else if (goals === 'general_fitness') score -= 1;
    else if (goals === 'flexibility') score -= 2;
    
    // פציעות
    if (injuries === 'severe') score -= 3;
    else if (injuries === 'moderate') score -= 2;
    else if (injuries === 'minor') score -= 1;
    
    // קביעת רמת עצימות
    if (score >= 4) {
      intensity = 'high';
      reasoning = 'תבסס על התשובות שלך, אתה מוכן לעצימות גבוהה. יש לך ניסיון, כושר טוב ותדירות אימונים גבוהה.';
    } else if (score >= 1) {
      intensity = 'medium';
      reasoning = 'רמת עצימות בינונית תתאים לך בדיוק. זה יאפשר לך להתקדם בצורה בטוחה ויעילה.';
    } else {
      intensity = 'low';
      reasoning = 'מומלץ להתחיל בעצימות נמוכה כדי לבנות בסיס חזק ולהתרגל לאימונים.';
    }
    
    return { intensity, reasoning, score };
  };

  const handleAnswer = (answer) => {
    const questionId = questions[currentQuestion].id;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    
    if (currentQuestion < questions.length - 1) {
      setIsTyping(true);
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
        setIsTyping(false);
      }, 1000);
    } else {
      // סיום השאלות - חישוב המלצה
      setIsTyping(true);
      setTimeout(() => {
        const rec = getIntensityRecommendation();
        setRecommendation(rec);
        setShowRecommendation(true);
        setIsTyping(false);
      }, 1500);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowRecommendation(false);
    setRecommendation(null);
  };

  const handleApplyRecommendation = () => {
    if (recommendation && onRecommendation) {
      onRecommendation(recommendation.intensity);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="wolf-assistant-overlay">
      <div className="wolf-assistant-container">
        <div className="wolf-assistant-header">
          <div className="wolf-avatar">W</div>
          <h3>וולף - העוזר האישי שלך</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="wolf-assistant-content">
          {!showRecommendation ? (
            <>
              <div className="question-container">
                <div className="wolf-message">
                  {questions[currentQuestion].question}
                </div>
                
                {isTyping && (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
              </div>
              
              {!isTyping && (
                <div className="answer-options">
                  {questions[currentQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      className="answer-button"
                      onClick={() => handleAnswer(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
              <div className="progress-text">
                שאלה {currentQuestion + 1} מתוך {questions.length}
              </div>
            </>
          ) : (
            <div className="recommendation-container">
              <div className="wolf-message">
                <h4>המלצתי עבורך:</h4>
                <div className={`intensity-badge intensity-${recommendation.intensity}`}>
                  {recommendation.intensity === 'high' ? 'עצימות גבוהה' : 
                   recommendation.intensity === 'medium' ? 'עצימות בינונית' : 'עצימות נמוכה'}
                </div>
                <p className="reasoning">{recommendation.reasoning}</p>
                
                <div className="recommendation-details">
                  <h5>מה זה אומר?</h5>
                  {recommendation.intensity === 'high' && (
                    <ul>
                      <li>אימונים אינטנסיביים עם הפסקות קצרות</li>
                      <li>תרגילים מורכבים ומאתגרים</li>
                      <li>משך אימון ארוך יותר</li>
                      <li>שילוב של כוח וסיבולת</li>
                    </ul>
                  )}
                  {recommendation.intensity === 'medium' && (
                    <ul>
                      <li>אימונים מאוזנים עם הפסקות בינוניות</li>
                      <li>תרגילים מגוונים ברמת קושי בינונית</li>
                      <li>משך אימון בינוני</li>
                      <li>שילוב של כוח, סיבולת וגמישות</li>
                    </ul>
                  )}
                  {recommendation.intensity === 'low' && (
                    <ul>
                      <li>אימונים קלים עם הפסקות ארוכות</li>
                      <li>תרגילים בסיסיים ופשוטים</li>
                      <li>משך אימון קצר יותר</li>
                      <li>התמקדות בבניית בסיס וטכניקה</li>
                    </ul>
                  )}
                </div>
              </div>
              
              <div className="recommendation-actions">
                <button className="apply-button" onClick={handleApplyRecommendation}>
                  החל המלצה
                </button>
                <button className="restart-button" onClick={handleRestart}>
                  התחל מחדש
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WolfAssistant;
