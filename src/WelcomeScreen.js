import React, { useState, useEffect } from 'react';
import MainMenu from './MainMenu';
import './WelcomeScreen.css';

function WelcomeScreen({ user }) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isScrolled = scrollY > 100;

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
    const scrollAfterLogo = scrollY - 100;
    const lineNumber = Math.floor(scrollAfterLogo / 400);
    console.log("scrollY:", scrollY, "visibleLines will be:", Math.min(lineNumber + 1, textLines.length));
    return Math.min(lineNumber -1);
  };

  const visibleLines = getVisibleLines();

  let content;

  if (visibleLines >= textLines.length) {
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
                const targetScroll = 100 + (index * 300);
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
                width: `${Math.min((scrollY / (400 * textLines.length)) * 100, 100)}%` 
              }}
            ></div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="WelcomeScreen">
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
      
      <div className="spacer"></div>

      {isScrolled && content}
    </div>
  );
}

export default WelcomeScreen;