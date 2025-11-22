import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = 'טוען...', size = 'medium', fullScreen = false }) => {
  const sizeClass = `spinner-${size}`;
  const containerClass = fullScreen ? 'loading-spinner-fullscreen' : 'loading-spinner-container';

  return (
    <div className={containerClass}>
      <div className={`spinner ${sizeClass}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;

