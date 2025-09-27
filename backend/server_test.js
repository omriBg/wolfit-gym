// backend/server.js
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const timeout = require('connect-timeout');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { OptimalHungarianAlgorithm, CompleteOptimalWorkoutScheduler, SPORT_MAPPING } = require('./optimalWorkoutAlgorithm');
const { sendWorkoutBookingEmail, sendWorkoutCancellationEmail } = require('./emailService');
const { startReminderService } = require('./reminderService');

// Import utilities
const { pool, testConnection, queryWithTimeout, withTransaction } = require('./utils/database');
const { 
  globalErrorHandler, 
  handleUnhandledRejection, 
  handleUncaughtException, 
  handleNotFound, 
  catchAsync,
  AppError,
  logger 
} = require('./utils/errorHandler');
const { 
  basicHealthCheck, 
  detailedHealthCheck, 
  readinessCheck, 
  livenessCheck, 
  updateStats 
} = require('./utils/healthCheck');

require('dotenv').config();

// כפיית IPv4 עבור Supabase (פתרון לבעיית ENETUNREACH)
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first';
process.env.NODE_DNS_RESOLVER = 'ipv4first';

// הגדרת DNS ל-IPv4 בלבד
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// Handle unhandled promise rejections
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

const app = express();
app.set('trust proxy', 1);  // נדרש עבור Render/Heroku
const PORT = process.env.PORT || 3001;

// Request timeout middleware
console.log('IMPORTS TEST');
