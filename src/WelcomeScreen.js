

import React, { useState, useEffect } from 'react';
import MainMenu from './MainMenu';
import './WelcomeScreen.css';

function WelcomeScreen({ user }) {
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

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
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const isScrolled = scrollY > (isMobile ? 50 : 100); // פחות גלילה במובייל

  const textLines = [
    "WOLFit",
    "אתה יודע למה הגעת",
    "אתה יודע מה מחכה לך",
    "אתה יודע איך זה מרגיש לצאת מפה",
    "הגיע הזמן לשבור את השיא של אתמול",
    "Play Different, Train Better"
  ];

  const getVisibleLines = () => {
    if (!isScrolled) return 0;
    const scrollAfterLogo = scrollY - (isMobile ? 50 : 100);
    // התאמה למובייל - פחות גלילה לכל שורה
    const lineDistance = isMobile ? 200 : 400;
    const lineNumber = Math.floor(scrollAfterLogo / lineDistance);
    console.log("scrollY:", scrollY, "isMobile:", isMobile, "visibleLines:", Math.min(lineNumber + 1, textLines.length));
    return Math.min(lineNumber - 1);
  };

  const visibleLines = getVisibleLines();

  // חישוב מתי לעבור לתפריט - מוקדם יותר במובייל
  const totalScrollNeeded = isMobile ? 
    50 + (textLines.length * 200) : 
    100 + (textLines.length * 400);

  let content;

  if (scrollY > totalScrollNeeded || visibleLines >= textLines.length) {
    content = <MainMenu user={user}/>
  } else {
    content = (
      <>
        <div className="text-container">
          {textLines.map((line, index) => (
            <div 
              key={index} 
              className={`text-line ${
                index === visibleLines ? 'visible' : 
                index < visibleLines ? 'fade-out' : ''
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
                // התאמת הגלילה למובייל
                const baseScroll = isMobile ? 50 : 100;
                const lineDistance = isMobile ? 150 : 300;
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
                width: `${Math.min((scrollY / totalScrollNeeded) * 100, 100)}%` 
              }}
            ></div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className={`WelcomeScreen ${isMobile ? 'mobile-fix' : ''}`}>
      <img
        src="/logo2.png"
        alt="WOLFit Logo2"
        className={`main-logo2 ${isScrolled ? 'scrolled' : ''}`}
      />
      
      {/* אינדיקטור גלילה למסך הראשוני */}
      {!isScrolled && (
        <div className="initial-scroll-indicator">
          <div className="scroll-arrow">⬇</div>
        </div>
      )}
      
      <div className={`spacer ${isMobile ? 'mobile-fix' : ''}`}></div>

      {isScrolled && content}
    </div>
  );
}

export default WelcomeScreen;