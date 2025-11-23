import React from 'react';
import './FacilityInfoModal.css';

function FacilityInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="facility-modal-overlay" onClick={onClose}>
      <div className="facility-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="facility-modal-close" onClick={onClose}>
          ×
        </button>
        
        <div className="facility-modal-header">
          <h2 className="facility-modal-title">על המתחם</h2>
          <div className="facility-modal-title-line"></div>
        </div>

        <div className="facility-modal-body">
          <div className="facility-section">
            <h3 className="facility-section-title">מטרת המתחם</h3>
            <p className="facility-section-text">
              ליצור חוויה ספורטיבית מהנה, ייחודית וטכנולוגית
            </p>
          </div>

          <div className="facility-section">
            <h3 className="facility-section-title">למה חשוב להזיז את הגוף?</h3>
            <p className="facility-section-text">
              מחקרים מראים שאורח חיים יושבני עלול להגדיל את הסיכון למחלות לב, סוכרת ובעיות בריאותיות נוספות. 
              פעילות גופנית סדירה משפרת את הבריאות הנפשית והפיזית, מחזקת את המערכת החיסונית ומאריכה את תוחלת החיים.
            </p>
          </div>

          <div className="facility-section">
            <h3 className="facility-section-title">מבנה המתחם</h3>
            <p className="facility-section-text">
              המתחם כולל <strong>9 סוגי ספורט שונים</strong>, כאשר כל סוג ספורט כולל מספר מגרשים ייחודיים:
            </p>
            <div className="sports-list">
              <div className="sport-item">
                <span className="sport-name">כדורגל</span>
                <span className="sport-count">מספר מגרשים</span>
              </div>
              <div className="sport-item">
                <span className="sport-name">כדורסל</span>
                <span className="sport-count">מספר מגרשים</span>
              </div>
              <div className="sport-item">
                <span className="sport-name">טיפוס</span>
                <span className="sport-count">מספר מגרשים</span>
              </div>
              <div className="sport-item">
                <span className="sport-name">חדר כושר</span>
                <span className="sport-count">מספר מגרשים</span>
              </div>
              <div className="sport-item">
                <span className="sport-name">קורדינציה</span>
                <span className="sport-count">מספר מגרשים</span>
              </div>
              <div className="sport-item">
                <span className="sport-name">טניס</span>
                <span className="sport-count">מספר מגרשים</span>
              </div>
              <div className="sport-item">
                <span className="sport-name">פינגפונג</span>
                <span className="sport-count">מספר מגרשים</span>
              </div>
              <div className="sport-item">
                <span className="sport-name">אגרוף</span>
                <span className="sport-count">מספר מגרשים</span>
              </div>
              <div className="sport-item">
                <span className="sport-name">אופניים</span>
                <span className="sport-count">מספר מגרשים</span>
              </div>
            </div>
            <p className="facility-section-text" style={{ marginTop: '1rem' }}>
              המגוון הרחב מאפשר לך לבחור את הפעילות המתאימה לך ביותר ולבנות אימון מגוון ומאתגר.
            </p>
          </div>

          <div className="facility-section">
            <h3 className="facility-section-title">איך זה עובד?</h3>
            <p className="facility-section-text">
              כל אימון מורכב מכמה לבנות אימון, וכל לבנת אימון היא שיבוץ למגרש ספציפי. 
              המטרה שלנו היא להזיז את הגוף, להתחזק ולהנות - כל זאת בחוויה טכנולוגית מתקדמת.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FacilityInfoModal;

