

import React, { useState, useEffect } from 'react';
import MainMenu from './MainMenu';
import './WelcomeScreen.css';

function WelcomeScreen({ user }) {
  const [scrollY, setScrollY] = useState(0);
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

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    
    // אנימציה אוטומטית של הטקסטים
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
          // המעבר האוטומטי למסך הבא
          setTimeout(() => {
            setShowMainMenu(true);
          }, 2000);
        }
      }, 1500); // כל 1.5 שניות

      return () => clearInterval(interval);
    };

    // התחלת האנימציה האוטומטית אחרי 2 שניות
    const autoScrollTimer = setTimeout(startAutoScroll, 2000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
      clearTimeout(autoScrollTimer);
    };
  }, []);

  const isScrolled = scrollY > (isMobile ? 50 : 100);

  const textLines = [
    "WOLFit",
    "אתה יודע למה הגעת",
    "אתה יודע מה מחכה לך",
    "אתה יודע איך זה מרגיש לצאת מפה",
    "הגיע הזמן לשבור את השיא של אתמול",
    "Play Different, Train Better"
  ];

  const getVisibleLines = () => {
    if (autoScroll) {
      return currentLineIndex;
    }
    if (!isScrolled) return 0;
    const scrollAfterLogo = scrollY - (isMobile ? 50 : 100);
    const lineDistance = isMobile ? 150 : 300;
    const lineNumber = Math.floor(scrollAfterLogo / lineDistance);
    return Math.min(lineNumber, textLines.length);
  };

  const visibleLines = getVisibleLines();

  // חישוב מתי לעבור לתפריט
  const totalScrollNeeded = isMobile ? 
    50 + (textLines.length * 150) + 100 :
    100 + (textLines.length * 300) + 300;

  let content;

  if (showMainMenu || visibleLines >= textLines.length) {
    content = <MainMenu user={user}/>
  } else {
    content = (
      <>
        <div className="text-container">
          {textLines.map((line, index) => (
            <div 
              key={index} 
              className={`text-line ${
                autoScroll ? 
                  (index === currentLineIndex ? 'auto-animate' : 
                   index < currentLineIndex ? 'auto-fade-out' : '') :
                  (index === visibleLines ? 'visible' : 
                   index < visibleLines ? 'fade-out' : '')
              }`}
            >
              {line}
            </div>
          ))}
        </div>
        
        <div className="scroll-indicator">
          <div className="scroll-line"></div>
          {textLines.map((_, index) => (
            <div 
              key={index}
              className={`scroll-dot ${index === visibleLines ? 'active' : ''}`}
              onClick={() => {
                const baseScroll = isMobile ? 50 : 50;
                const lineDistance = isMobile ? 150 : 200;
                const targetScroll = baseScroll + (index * lineDistance);
                window.scrollTo({ top: targetScroll, behavior: 'smooth' });
              }}
            ></div>
          ))}
        </div>
        
        {/* אינדיקטור גלילה מתקדם */}
        <div className={`advanced-scroll-indicator ${visibleLines >= textLines.length ? 'hidden' : ''}`}>
          <div className="scroll-arrow-container">
            <div className="scroll-arrow">⬇</div>
          </div>
          <div className="scroll-progress">
            <div 
              className="progress-bar" 
              style={{ 
                width: `${Math.min((scrollY / (totalScrollNeeded * 0.8)) * 100, 100)}%` 
              }}
            ></div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className={`WelcomeScreen ${isMobile ? 'mobile-fix' : ''} ${autoScroll ? 'auto-shrink' : ''}`}>
      <img
        src="/logo2.png"
        alt="WOLFit Logo2"
        className={`main-logo2 ${isScrolled || autoScroll ? 'scrolled' : ''} ${autoScroll ? 'auto-shrink' : ''}`}
      />
      
      {/* אינדיקטור גלילה למסך הראשוני */}
      {!isScrolled && !autoScroll && (
        <div className="initial-scroll-indicator">
          <div className="scroll-arrow">⬇</div>
        </div>
      )}
      
      <div className={`spacer ${isMobile ? 'mobile-fix' : ''}`}></div>

      {(isScrolled || autoScroll) && content}
    </div>
  );
}

export default WelcomeScreen;