// utils/errorHandler.js - מערכת טיפול בשגיאות מתקדמת
const logger = require('./logger');

// מחלקה לשגיאות מותאמות אישית
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// טיפול בשגיאות מסד נתונים
const handleDatabaseError = (err) => {
  let error = { ...err };
  error.message = err.message;

  // שגיאות PostgreSQL ספציפיות
  if (err.code === '23505') { // unique violation
    const message = 'ערך כבר קיים במסד הנתונים';
    error = new AppError(message, 400);
  } else if (err.code === '23503') { // foreign key violation
    const message = 'נתון לא קיים במסד הנתונים';
    error = new AppError(message, 400);
  } else if (err.code === '23502') { // not null violation
    const message = 'שדה חובה חסר';
    error = new AppError(message, 400);
  } else if (err.code === '42P01') { // undefined table
    const message = 'טבלה לא קיימת במסד הנתונים';
    error = new AppError(message, 500);
  } else if (err.code === 'ECONNREFUSED') {
    const message = 'לא ניתן להתחבר למסד הנתונים';
    error = new AppError(message, 503);
  } else if (err.code === 'ETIMEDOUT') {
    const message = 'פג זמן החיבור למסד הנתונים';
    error = new AppError(message, 504);
  }

  return error;
};

// טיפול בשגיאות JWT
const handleJWTError = () => {
  return new AppError('טוקן לא תקין', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('טוקן פג תוקף', 401);
};

// טיפול בשגיאות validation
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `נתונים לא תקינים: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// שליחת שגיאות ללקוח בסביבת פיתוח
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// שליחת שגיאות ללקוח בסביבת ייצור
const sendErrorProd = (err, res) => {
  // שגיאות operational - שליחה ללקוח
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // שגיאות תכנות - לא שליחה ללקוח
    logger.error('שגיאה קריטית:', err);
    
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
};

// Middleware ראשי לטיפול בשגיאות
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // רישום השגיאה
  logger.error('שגיאה:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId || 'anonymous'
  });

  let error = { ...err };
  error.message = err.message;

  // טיפול בשגיאות ספציפיות
  if (error.code && error.code.startsWith('23')) {
    error = handleDatabaseError(error);
  } else if (error.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (error.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  } else if (error.name === 'ValidationError') {
    error = handleValidationError(error);
  }

  // שליחה ללקוח בהתאם לסביבה
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Middleware לטיפול בשגיאות לא מטופלות
const handleUnhandledRejection = (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
};

const handleUncaughtException = (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
};

// Middleware לטיפול בבקשות שלא נמצאו
const handleNotFound = (req, res, next) => {
  const err = new AppError(`לא נמצא: ${req.originalUrl}`, 404);
  next(err);
};

// Wrapper לפונקציות async
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  AppError,
  globalErrorHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  handleNotFound,
  catchAsync,
  logger
};
