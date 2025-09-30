// Wolfit Gym Backend Server
require('dotenv').config();

// הגדרות בסיסיות
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Database connection
const { pool, testConnection, waitForPoolReady } = require('./utils/database');
const { OptimalHungarianAlgorithm, CompleteOptimalWorkoutScheduler, SPORT_MAPPING } = require('./optimalWorkoutAlgorithm');

const app = express();
const PORT = process.env.PORT || 10000;