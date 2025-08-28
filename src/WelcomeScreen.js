

import React, { useState, useEffect } from 'react';
import MainMenu from './MainMenu';
import './WelcomeScreen.css';

function WelcomeScreen({ user }) {
  const [isMobile, setIsMobile] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [showMainMenu, setShowMainMenu] = useState(false);

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
        "אתה יודע למה הגעת",
        "אתה יודע מה מחכה לך",
        "אתה יודע איך זה מרגיש לצאת מפה",
        "הגיע הזמן לשבור את השיא של אתמול",
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
            setShowMainMenu(true);
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
    "אתה יודע למה הגעת",
    "אתה יודע מה מחכה לך",
    "אתה יודע איך זה מרגיש לצאת מפה",
    "הגיע הזמן לשבור את השיא של אתמול",
    "Play Different, Train Better"
  ];

  const visibleLines = autoScroll ? currentLineIndex : 0;

  let content;

  if (showMainMenu || visibleLines >= textLines.length) {
    content = <MainMenu user={user}/>
  } else {
    content = (
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
    )
  }

  return (
    <div className={`WelcomeScreen ${isMobile ? 'mobile-fix' : ''} ${autoScroll ? 'auto-shrink' : ''}`}>
      <img
        src="/logo2.png"
        alt="WOLFit Logo2"
        className={`main-logo2 ${autoScroll ? 'scrolled auto-shrink' : ''}`}
      />
      
      <div className={`spacer ${isMobile ? 'mobile-fix' : ''}`}></div>

      {autoScroll && content}
    </div>
  );
}

export default WelcomeScreen;