import React, { useState, useEffect } from 'react';
import './FitnessMetricsChart.css';

const FitnessMetricsChart = ({ sportName, sportId, isOpen, onClose }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  // נתוני מדדי הכושר (לפי הטבלה שנתת)
  const fitnessData = {
    1: { // כדורגל
      name: 'כדורגל',
      metrics: {
        'כוח': 3,
        'מהירות': 3,
        'כוח מתפרץ': 3,
        'סבולת שריר': 2,
        'סבולת לב-ריאה': 3,
        'גמישות': 2,
        'קואורדינציה': 3,
        'שיווי משקל': 3,
        'אגיליטי (זריזות)': 2,
        'דיוק מוטורי': 2
      }
    },
    2: { // כדורסל
      name: 'כדורסל',
      metrics: {
        'כוח': 3,
        'מהירות': 3,
        'כוח מתפרץ': 3,
        'סבולת שריר': 2,
        'סבולת לב-ריאה': 2,
        'גמישות': 2,
        'קואורדינציה': 3,
        'שיווי משקל': 3,
        'אגיליטי (זריזות)': 2,
        'דיוק מוטורי': 2
      }
    },
    3: { // טיפוס
      name: 'טיפוס',
      metrics: {
        'כוח': 3,
        'מהירות': 1,
        'כוח מתפרץ': 2,
        'סבולת שריר': 3,
        'סבולת לב-ריאה': 2,
        'גמישות': 2,
        'קואורדינציה': 3,
        'שיווי משקל': 3,
        'אגיליטי (זריזות)': 2,
        'דיוק מוטורי': 1
      }
    },
    4: { // חדר כושר
      name: 'חדר כושר',
      metrics: {
        'כוח': 3,
        'מהירות': 1,
        'כוח מתפרץ': 2,
        'סבולת שריר': 3,
        'סבולת לב-ריאה': 2,
        'גמישות': 1,
        'קואורדינציה': 1,
        'שיווי משקל': 1,
        'אגיליטי (זריזות)': 1,
        'דיוק מוטורי': 0
      }
    },
    5: { // קורדינציה
      name: 'קורדינציה',
      metrics: {
        'כוח': 1,
        'מהירות': 3,
        'כוח מתפרץ': 1,
        'סבולת שריר': 2,
        'סבולת לב-ריאה': 2,
        'גמישות': 1,
        'קואורדינציה': 3,
        'שיווי משקל': 2,
        'אגיליטי (זריזות)': 3,
        'דיוק מוטורי': 3
      }
    },
    6: { // טניס
      name: 'טניס',
      metrics: {
        'כוח': 2,
        'מהירות': 3,
        'כוח מתפרץ': 2,
        'סבולת שריר': 2,
        'סבולת לב-ריאה': 2,
        'גמישות': 2,
        'קואורדינציה': 3,
        'שיווי משקל': 3,
        'אגיליטי (זריזות)': 3,
        'דיוק מוטורי': 3
      }
    },
    7: { // פינגפונג
      name: 'פינגפונג',
      metrics: {
        'כוח': 1,
        'מהירות': 3,
        'כוח מתפרץ': 1,
        'סבולת שריר': 2,
        'סבולת לב-ריאה': 2,
        'גמישות': 1,
        'קואורדינציה': 3,
        'שיווי משקל': 2,
        'אגיליטי (זריזות)': 3,
        'דיוק מוטורי': 3
      }
    },
    8: { // אגרוף
      name: 'אגרוף',
      metrics: {
        'כוח': 3,
        'מהירות': 3,
        'כוח מתפרץ': 3,
        'סבולת שריר': 2,
        'סבולת לב-ריאה': 3,
        'גמישות': 2,
        'קואורדינציה': 3,
        'שיווי משקל': 3,
        'אגיליטי (זריזות)': 3,
        'דיוק מוטורי': 3
      }
    },
    9: { // אופניים
      name: 'אופניים',
      metrics: {
        'כוח': 2,
        'מהירות': 2,
        'כוח מתפרץ': 1,
        'סבולת שריר': 3,
        'סבולת לב-ריאה': 3,
        'גמישות': 1,
        'קואורדינציה': 2,
        'שיווי משקל': 2,
        'אגיליטי (זריזות)': 0,
        'דיוק מוטורי': 0
      }
    }
  };

  useEffect(() => {
    if (isOpen && sportId) {
      setLoading(true);
      // סימולציה של טעינת נתונים
      setTimeout(() => {
        setMetrics(fitnessData[sportId] || null);
        setLoading(false);
      }, 300);
    }
  }, [isOpen, sportId]);

  const getMetricColor = (value) => {
    if (value === 0) return '#f5f5f5'; // לא רלוונטי - אפור בהיר
    if (value === 1) return '#e0e0e0'; // נמוך - אפור
    if (value === 2) return '#bdbdbd'; // בינוני - אפור בינוני
    if (value === 3) return '#757575'; // גבוה - אפור כהה
    return '#f5f5f5';
  };

  const getMetricLabel = (value) => {
    if (value === 0) return 'לא רלוונטי';
    if (value === 1) return 'נמוך';
    if (value === 2) return 'בינוני';
    if (value === 3) return 'גבוה';
    return 'לא ידוע';
  };

  const getMetricIcon = (value) => {
    if (value === 0) return '○';
    if (value === 1) return '●';
    if (value === 2) return '●';
    if (value === 3) return '●';
    return '○';
  };

  if (!isOpen) return null;

  return (
    <div className="fitness-chart-overlay" onClick={onClose}>
      <div className="fitness-chart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fitness-chart-header">
          <h3>מדדי כושר - {sportName}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="fitness-chart-content">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>טוען נתונים...</p>
            </div>
          ) : metrics ? (
            <div className="metrics-grid">
              {Object.entries(metrics.metrics).map(([metricName, value]) => (
                <div key={metricName} className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">{metricName}</span>
                    <span className="metric-icon">{getMetricIcon(value)}</span>
                  </div>
                  <div className="metric-bar-container">
                    <div 
                      className="metric-bar"
                      style={{
                        width: `${(value / 3) * 100}%`,
                        backgroundColor: getMetricColor(value)
                      }}
                    ></div>
                  </div>
                  <div className="metric-value">
                    <span className="value-label">{getMetricLabel(value)}</span>
                    <span className="value-number">({value}/3)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>לא נמצאו נתונים עבור {sportName}</p>
            </div>
          )}
        </div>
        
        <div className="fitness-chart-footer">
          <div className="legend">
            <div className="legend-item">
              <span className="legend-icon">●</span>
              <span>גבוה (3)</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">●</span>
              <span>בינוני (2)</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">●</span>
              <span>נמוך (1)</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">○</span>
              <span>לא רלוונטי (0)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FitnessMetricsChart;
