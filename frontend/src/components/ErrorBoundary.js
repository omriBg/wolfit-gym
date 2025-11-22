import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // עדכן state כך שהרינדור הבא יציג את ה-UI החלופי
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // רשום את השגיאה ל-console או לשירות ניטור
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // כאן ניתן לשלוח את השגיאה לשירות ניטור (כמו Sentry)
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // ניתן לרנדר כל UI מותאם אישית
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h1>אופס, משהו השתבש</h1>
            <p>מצטערים, אירעה שגיאה בלתי צפויה. אנא נסה שוב.</p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>פרטי שגיאה (פיתוח בלבד)</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
            
            <div className="error-actions">
              <button onClick={this.handleReload} className="btn-primary">
                רענן דף
              </button>
              <button onClick={this.handleGoHome} className="btn-secondary">
                חזור לדף הבית
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

