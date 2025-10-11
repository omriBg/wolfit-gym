import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './DashboardPage.css';

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  useEffect(() => {
    // זיהוי מובייל
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // אנימציה אוטומטית מהירה של הטקסטים
    const startAutoScroll = () => {
      setAutoScroll(true);
      let lineIndex = 0;
      const textLines = [
        "WOLFit",
        "Play Different, Train Better"
      ];
      
      const interval = setInterval(() => {
        if (lineIndex < textLines.length) {
          setCurrentLineIndex(lineIndex);
          lineIndex++;
        } else {
          clearInterval(interval);
          // המעבר האוטומטי המהיר למסך הבא
          setTimeout(() => {
            navigate('/main-menu');
          }, 1000); // רק שנייה אחת במקום 2
        }
      }, 800); // כל 0.8 שניות במקום 1.5 - מהיר יותר

      return () => clearInterval(interval);
    };

    // התחלת האנימציה האוטומטית אחרי שנייה אחת בלבד
    const autoScrollTimer = setTimeout(startAutoScroll, 1000);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(autoScrollTimer);
    };
  }, []);

  const textLines = [
    "WOLFit",
    "Play Different, Train Better"
  ];

  const visibleLines = autoScroll ? currentLineIndex : 0;

  return (
    <div className={`dashboard-page ${isMobile ? 'mobile-fix' : ''} ${autoScroll ? 'auto-shrink' : ''}`}>
      <img
        src="/logo2.png"
        alt="WOLFit Logo2"
        className={`main-logo2 ${autoScroll ? 'scrolled auto-shrink' : ''}`}
      />
      
      <div className={`spacer ${isMobile ? 'mobile-fix' : ''}`}></div>

      {autoScroll && (
        <div className="text-container">
          {textLines.map((line, index) => (
            <div 
              key={index} 
              className={`text-line ${
                index === currentLineIndex ? 'auto-animate' : 
                index < currentLineIndex ? 'auto-fade-out' : ''
              }`}
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
