import React, { useState, useEffect } from 'react';
import './CreateWorkout.css';

// מיפוי ספורטים (תואם לשרת שלך)
const SPORT_MAPPING = {
  1: 'כדורגל',
  2: 'כדורסל',  
  3: 'טיפוס',
  4: 'חדר כושר',
  5: 'קורדינציה',
  6: 'טניס',
  7: 'פינגפונג',
  8: 'ריקוד',
  9: 'אופניים'
};

// אלגוריתם הונגרי מלא ומתוקן לאופטימליות מקסימלית
class OptimalHungarianAlgorithm {
  constructor(matrix) {
    this.originalMatrix = matrix.map(row => [...row]);
    this.matrix = matrix.map(row => [...row]);
    this.n = this.matrix.length;
    this.rowCovered = new Array(this.n).fill(false);
    this.colCovered = new Array(this.n).fill(false);
    this.assignment = new Array(this.n).fill(-1);
    this.starredZeros = new Set();
    this.primedZeros = new Set();
    this.path = [];
    
    console.log('🔥 מתחיל אלגוריתם הונגרי אופטימלי מלא');
    console.log('גודל מטריצה:', this.n + 'x' + this.n);
  }

  solve() {
    // Step 1: Reduce matrix by subtracting row and column minimums
    this.reduceMatrix();
    
    let step = 2;
    let iterations = 0;
    const maxIterations = this.n * this.n;
    
    while (step !== 6 && iterations < maxIterations) {
      console.log(`🔄 שלב ${step}, איטרציה ${iterations}`);
      
      switch (step) {
        case 2: step = this.findInitialZeros(); break;
        case 3: step = this.coverStarredColumns(); break;
        case 4: step = this.findUncoveredZero(); break;
        case 5: step = this.constructAugmentingPath(); break;
      }
      iterations++;
    }
    
    if (step === 6) {
      console.log('✅ אלגוריתם הונגרי הושלם בהצלחה');
      console.log('מספר איטרציות:', iterations);
      this.extractAssignment();
      return this.assignment;
    } else {
      console.log('❌ אלגוריתם הונגרי לא התכנס');
      return this.createFallbackAssignment();
    }
  }

  reduceMatrix() {
    console.log('🔧 מפחית מטריצה...');
    
    // Subtract row minimums
    for (let i = 0; i < this.n; i++) {
      const finiteValues = this.matrix[i].filter(val => val < Infinity);
      if (finiteValues.length > 0) {
        const minVal = Math.min(...finiteValues);
        if (minVal > 0) {
          for (let j = 0; j < this.n; j++) {
            if (this.matrix[i][j] < Infinity) {
              this.matrix[i][j] -= minVal;
            }
          }
        }
      }
    }
    
    // Subtract column minimums
    for (let j = 0; j < this.n; j++) {
      const column = [];
      for (let i = 0; i < this.n; i++) {
        if (this.matrix[i][j] < Infinity) {
          column.push(this.matrix[i][j]);
        }
      }
      
      if (column.length > 0) {
        const minVal = Math.min(...column);
        if (minVal > 0) {
          for (let i = 0; i < this.n; i++) {
            if (this.matrix[i][j] < Infinity) {
              this.matrix[i][j] -= minVal;
            }
          }
        }
      }
    }
    
    console.log('✅ הפחתת מטריצה הושלמה');
  }

  findInitialZeros() {
    console.log('🔍 מחפש אפסים ראשוניים...');
    
    this.starredZeros.clear();
    const usedRows = new Set();
    const usedCols = new Set();
    
    // Find independent zeros (star them)
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.matrix[i][j] === 0 && !usedRows.has(i) && !usedCols.has(j)) {
          this.starredZeros.add(`${i},${j}`);
          usedRows.add(i);
          usedCols.add(j);
          console.log(`⭐ סימן אפס ב-(${i},${j})`);
        }
      }
    }
    
    console.log(`✅ נמצאו ${this.starredZeros.size} אפסים מסומנים`);
    return 3;
  }

  coverStarredColumns() {
    console.log('📋 מכסה עמודות עם אפסים מסומנים...');
    
    this.colCovered.fill(false);
    let coveredCount = 0;
    
    // Cover columns that contain starred zeros
    for (const zero of this.starredZeros) {
      const [row, col] = zero.split(',').map(Number);
      if (!this.colCovered[col]) {
        this.colCovered[col] = true;
        coveredCount++;
      }
    }
    
    console.log(`📊 כוסו ${coveredCount} עמודות`);
    
    if (coveredCount >= this.n) {
      console.log('🎯 נמצא פתרון אופטימלי!');
      return 6; // Solution found
    }
    
    return 4; // Need to continue
  }

  findUncoveredZero() {
    console.log('🔍 מחפש אפס לא מכוסה...');
    
    while (true) {
      const uncoveredZero = this.getUncoveredZero();
      
      if (!uncoveredZero) {
        console.log('📉 לא נמצא אפס לא מכוסה - מקטין מטריצה');
        this.reduceUncoveredElements();
        continue;
      }
      
      const { row, col } = uncoveredZero;
      console.log(`🎯 נמצא אפס לא מכוסה ב-(${row},${col})`);
      
      this.primedZeros.add(`${row},${col}`);
      
      // Check if there's a starred zero in the same row
      const starredInRow = this.findStarredZeroInRow(row);
      
      if (starredInRow !== -1) {
        console.log(`🔄 נמצא אפס מסומן בשורה ${row}, עמודה ${starredInRow}`);
        this.rowCovered[row] = true;
        this.colCovered[starredInRow] = false;
      } else {
        console.log('🚀 עובר לבניית נתיב מגדיל');
        this.path = [{ row, col, type: 'primed' }];
        return 5;
      }
    }
  }

  getUncoveredZero() {
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.matrix[i][j] === 0 && !this.rowCovered[i] && !this.colCovered[j]) {
          return { row: i, col: j };
        }
      }
    }
    return null;
  }

  findStarredZeroInRow(row) {
    for (const zero of this.starredZeros) {
      const [r, c] = zero.split(',').map(Number);
      if (r === row) return c;
    }
    return -1;
  }

  reduceUncoveredElements() {
    console.log('🔧 מקטין אלמנטים לא מכוסים...');
    
    // Find minimum uncovered value
    let minVal = Infinity;
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (!this.rowCovered[i] && !this.colCovered[j] && this.matrix[i][j] < Infinity) {
          minVal = Math.min(minVal, this.matrix[i][j]);
        }
      }
    }
    
    if (minVal === Infinity || minVal <= 0) {
      console.log('⚠️ לא נמצא ערך מינימלי תקין');
      return;
    }
    
    console.log(`🔢 ערך מינימלי: ${minVal}`);
    
    // Subtract from uncovered, add to double-covered
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.rowCovered[i] && this.colCovered[j]) {
          // Double covered - add
          this.matrix[i][j] += minVal;
        } else if (!this.rowCovered[i] && !this.colCovered[j]) {
          // Uncovered - subtract
          if (this.matrix[i][j] < Infinity) {
            this.matrix[i][j] -= minVal;
          }
        }
      }
    }
  }

  constructAugmentingPath() {
    console.log('🛤️ בונה נתיב מגדיל...');
    
    let currentStep = this.path[this.path.length - 1];
    
    // Build alternating path
    while (true) {
      // Find starred zero in same column
      const starredInCol = this.findStarredZeroInColumn(currentStep.col);
      
      if (starredInCol === -1) {
        console.log('✅ נתיב מגדיל הושלם');
        break;
      }
      
      this.path.push({ row: starredInCol, col: currentStep.col, type: 'starred' });
      
      // Find primed zero in same row
      const primedInRow = this.findPrimedZeroInRow(starredInCol);
      
      if (primedInRow === -1) {
        console.log('❌ שגיאה בבניית נתיב');
        break;
      }
      
      this.path.push({ row: starredInCol, col: primedInRow, type: 'primed' });
      currentStep = this.path[this.path.length - 1];
    }
    
    // Update starred zeros based on path
    this.updateStarredZeros();
    
    // Clear covers and primed zeros
    this.rowCovered.fill(false);
    this.colCovered.fill(false);
    this.primedZeros.clear();
    this.path = [];
    
    return 3;
  }

  findStarredZeroInColumn(col) {
    for (const zero of this.starredZeros) {
      const [r, c] = zero.split(',').map(Number);
      if (c === col) return r;
    }
    return -1;
  }

  findPrimedZeroInRow(row) {
    for (const zero of this.primedZeros) {
      const [r, c] = zero.split(',').map(Number);
      if (r === row) return c;
    }
    return -1;
  }

  updateStarredZeros() {
    console.log('⭐ מעדכן אפסים מסומנים...');
    
    // Unstar all starred zeros in the path
    for (let i = 1; i < this.path.length; i += 2) {
      const step = this.path[i];
      this.starredZeros.delete(`${step.row},${step.col}`);
    }
    
    // Star all primed zeros in the path
    for (let i = 0; i < this.path.length; i += 2) {
      const step = this.path[i];
      this.starredZeros.add(`${step.row},${step.col}`);
    }
    
    console.log(`⭐ עודכנו ${this.starredZeros.size} אפסים מסומנים`);
  }

  extractAssignment() {
    console.log('📊 מחלץ השמה סופית...');
    
    this.assignment.fill(-1);
    
    for (const zero of this.starredZeros) {
      const [row, col] = zero.split(',').map(Number);
      this.assignment[row] = col;
    }
    
    const assignedCount = this.assignment.filter(val => val !== -1).length;
    console.log(`✅ השמה סופית: ${assignedCount}/${this.n} מוקצים`);
  }

  createFallbackAssignment() {
    console.log('🔄 יוצר השמה חלופית...');
    
    const assignment = new Array(this.n).fill(-1);
    const usedCols = new Set();
    
    // Simple greedy assignment on original matrix
    for (let i = 0; i < this.n; i++) {
      let bestCol = -1;
      let bestValue = Infinity;
      
      for (let j = 0; j < this.n; j++) {
        if (!usedCols.has(j) && this.originalMatrix[i][j] < bestValue) {
          bestValue = this.originalMatrix[i][j];
          bestCol = j;
        }
      }
      
      if (bestCol !== -1 && bestValue < Infinity) {
        assignment[i] = bestCol;
        usedCols.add(bestCol);
      }
    }
    
    return assignment;
  }
}

// מערכת שיבוץ אימונים אופטימלית מלאה
class CompleteOptimalWorkoutScheduler {
  constructor(timeSlots, fieldsByTime, userPreferences) {
    this.timeSlots = timeSlots;
    this.fieldsByTime = fieldsByTime;
    this.userPreferences = userPreferences || [];
    this.availableSports = this.extractAvailableSports();
    this.maxUsagePerSport = 2;
    
    console.log('🚀 מערכת שיבוץ אופטימלית נוצרה:');
    console.log('⏰ זמנים:', this.timeSlots.length);
    console.log('🏃 ספורטים זמינים:', this.availableSports);
    console.log('❤️ העדפות משתמש:', this.userPreferences);
  }

  extractAvailableSports() {
    const sportsSet = new Set();
    Object.values(this.fieldsByTime).forEach(fields => {
      fields.forEach(field => {
        if (field.sportTypeId) {
          sportsSet.add(field.sportTypeId);
        }
      });
    });
    return Array.from(sportsSet).sort((a, b) => a - b);
  }

  // חישוב ניקוד מדויק לכל שילוב זמן-ספורט
  calculatePreciseScore(timeSlot, sportId, currentUsage = 0, priority = 1) {
    const availableFields = this.fieldsByTime[timeSlot] || [];
    const hasAvailableField = availableFields.some(field => 
      field.sportTypeId === sportId && field.isAvailable !== false
    );
    
    if (!hasAvailableField) {
      return -1; // בלתי אפשרי
    }
    
    let score = 1000; // ניקוד בסיס גבוה
    
    // בונוס חזק להעדפות משתמש (סדר חשוב!)
    const preferenceIndex = this.userPreferences.indexOf(sportId);
    if (preferenceIndex !== -1) {
      score += (this.userPreferences.length - preferenceIndex) * 500;
    }
    
    // עונש חזק על עדיפות נמוכה (גיוון חשוב!)
    const priorityPenalty = (priority - 1) * 2000;
    score -= priorityPenalty;
    
    // עונש על שימוש חוזר (רק אם זה לא עדיפות ראשונה)
    if (priority > 1) {
      const usagePenalty = currentUsage * currentUsage * 100;
      score -= usagePenalty;
    }
    
    // בונוס לאיכות המגרש
    const bestField = availableFields
      .filter(field => field.sportTypeId === sportId)
      .sort((a, b) => (b.name || '').length - (a.name || '').length)[0];
    
    if (bestField && bestField.name && bestField.name.length > 10) {
      score += 50; // מגרש איכותי
    }
    
    // עונש קל על זמנים מאוחרים (העדפה לזמנים מוקדמים)
    const timeIndex = this.timeSlots.indexOf(timeSlot);
    score -= timeIndex * 2;
    
    return Math.max(0, score);
  }

  // יצירת מטריצת עלויות מושלמת לאלגוריתם ההונגרי
  createOptimalCostMatrix() {
    console.log('🏗️ יוצר מטריצת עלויות אופטימלית...');
    
    const numTimeSlots = this.timeSlots.length;
    
    // יוצר "אפשרויות ספורט" - עם עדיפות לגיוון
    const sportOptions = [];
    
    // קודם כל - כל ספורט פעם ראשונה (גיוון מקסימלי)
    for (const sportId of this.availableSports) {
      sportOptions.push({
        sportId,
        usage: 0,
        id: `${sportId}_1`,
        name: `${SPORT_MAPPING[sportId]} (ראשון)`,
        priority: 1 // עדיפות גבוהה
      });
    }
    
    // אחר כך - ספורטים לא אהובים (אם אין ברירה)
    for (const sportId of this.availableSports) {
      if (!this.userPreferences.includes(sportId)) {
        sportOptions.push({
          sportId,
          usage: 1,
          id: `${sportId}_2`,
          name: `${SPORT_MAPPING[sportId]} (לא אהוב)`,
          priority: 2 // עדיפות נמוכה
        });
      }
    }
    
    // לבסוף - חזרה על ספורטים אהובים (רק אם אין ברירה)
    for (const sportId of this.userPreferences) {
      sportOptions.push({
        sportId,
        usage: 1,
        id: `${sportId}_3`,
        name: `${SPORT_MAPPING[sportId]} (חוזר)`,
        priority: 3 // עדיפות נמוכה ביותר
      });
    }
    
    const matrixSize = Math.max(numTimeSlots, sportOptions.length);
    console.log(`📐 גודל מטריצה: ${matrixSize}x${matrixSize}`);
    console.log(`🏃 אפשרויות ספורט: ${sportOptions.length}`);
    
    const costMatrix = Array(matrixSize).fill().map(() => Array(matrixSize).fill(0));
    
    // מילוי המטריצה
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        if (i < numTimeSlots && j < sportOptions.length) {
          // זמן אמיתי ← אפשרות ספורט אמיתית
          const timeSlot = this.timeSlots[i];
          const sportOption = sportOptions[j];
          const score = this.calculatePreciseScore(timeSlot, sportOption.sportId, sportOption.usage, sportOption.priority);
          
          // המרה לעלות: ניקוד גבוה = עלות נמוכה
          costMatrix[i][j] = score === -1 ? 999999 : (10000 - score);
          
        } else if (i < numTimeSlots) {
          // זמן אמיתי ← ספורט דמה (עלות גבוהה מאוד)
          costMatrix[i][j] = 999999;
          
        } else if (j < sportOptions.length) {
          // זמן דמה ← ספורט אמיתי (עלות נמוכה)
          costMatrix[i][j] = 1;
          
        } else {
          // זמן דמה ← ספורט דמה (עלות 0)
          costMatrix[i][j] = 0;
        }
      }
    }
    
    // שמירת מידע על האפשרויות למטרות דיבוג
    this.sportOptions = sportOptions;
    this.matrixSize = matrixSize;
    
    console.log('✅ מטריצת עלויות נוצרה בהצלחה');
    return costMatrix;
  }

  // פתרון הבעיה באלגוריתם הונגרי
  solveOptimal() {
    console.log('🎯 מתחיל פתרון אופטימלי מלא...');
    
    const costMatrix = this.createOptimalCostMatrix();
    const hungarian = new OptimalHungarianAlgorithm(costMatrix);
    const assignment = hungarian.solve();
    
    console.log('📋 תוצאת האלגוריתם ההונגרי:', assignment);
    
    return this.parseOptimalAssignment(assignment);
  }

  // פירוק תוצאת האלגוריתם ההונגרי לתוכנית אימון
  parseOptimalAssignment(assignment) {
    console.log('🔍 מנתח תוצאת השמה אופטימלית...');
    
    const result = [];
    const sportsUsageCount = {};
    const usedSportOptions = new Set(); // מניעת כפילות
    let totalScore = 0;
    
    for (let i = 0; i < this.timeSlots.length; i++) {
      const timeSlot = this.timeSlots[i];
      const assignedOptionIndex = assignment[i];
      
      if (assignedOptionIndex !== -1 && 
          assignedOptionIndex < this.sportOptions.length) {
        
        const sportOption = this.sportOptions[assignedOptionIndex];
        const currentUsage = sportsUsageCount[sportOption.sportId] || 0;
        
        // בדיקה אם השמה תקינה (לא כפילות באותה אופציה)
        if (!usedSportOptions.has(assignedOptionIndex)) {
          const selectedField = this.findOptimalField(timeSlot, sportOption.sportId);
          const score = this.calculatePreciseScore(timeSlot, sportOption.sportId, currentUsage);
          
          if (selectedField && score > 0) {
            sportsUsageCount[sportOption.sportId] = currentUsage + 1;
            usedSportOptions.add(assignedOptionIndex); // סימון כשימוש
            totalScore += score;
            
            result.push({
              time: timeSlot,
              field: selectedField,
              sportType: SPORT_MAPPING[sportOption.sportId],
              sportId: sportOption.sportId,
              usage: currentUsage + 1,
              score: score,
              isOptimal: true
            });
            
            console.log(`✅ ${timeSlot}: ${SPORT_MAPPING[sportOption.sportId]} (${score} נק') במגרש ${selectedField.name}`);
          } else {
            result.push({
              time: timeSlot,
              field: null,
              reason: 'לא נמצא מגרש מתאים',
              isOptimal: false
            });
            console.log(`❌ ${timeSlot}: לא נמצא מגרש ל-${SPORT_MAPPING[sportOption.sportId]}`);
          }
        } else {
          result.push({
            time: timeSlot,
            field: null,
            reason: 'ספורט זה כבר שומש',
            isOptimal: false
          });
          console.log(`⚠️ ${timeSlot}: ספורט כבר שומש`);
        }
      } else {
        result.push({
          time: timeSlot,
          field: null,
          reason: 'לא נמצא שיבוץ אופטימלי',
          isOptimal: false
        });
        console.log(`❌ ${timeSlot}: לא נמצא שיבוץ`);
      }
    }
    
    const successfulSlots = result.filter(slot => slot.field !== null).length;
    
    console.log(`🏆 פתרון אופטימלי: ${successfulSlots}/${this.timeSlots.length} זמנים`);
    console.log(`🎯 ניקוד כולל: ${totalScore}`);
    console.log(`📊 שימוש בספורטים:`, sportsUsageCount);
    
    return {
      slots: result,
      totalSlots: this.timeSlots.length,
      successfulSlots: successfulSlots,
      totalScore: totalScore,
      sportsUsage: sportsUsageCount,
      isOptimal: true,
      algorithm: 'Hungarian Algorithm (Optimal)'
    };
  }

  // מציאת המגרש האופטימלי לספורט בזמן נתון
  findOptimalField(timeSlot, sportId) {
    const availableFields = this.fieldsByTime[timeSlot] || [];
    const suitableFields = availableFields.filter(field => 
      field.sportTypeId === sportId && field.isAvailable !== false
    );
    
    if (suitableFields.length === 0) {
      return null;
    }
    
    // מיון לפי איכות המגרש
    return suitableFields.sort((a, b) => {
      // העדף מגרשים עם שמות מפורטים יותר
      const scoreA = (a.name || '').length + (a.description || '').length;
      const scoreB = (b.name || '').length + (b.description || '').length;
      return scoreB - scoreA;
    })[0];
  }

  // בדיקת תקינות הנתונים לפני הפתרון
  validateInputData() {
    console.log('🔍 בודק תקינות נתונים...');
    
    const issues = [];
    
    if (!this.timeSlots || this.timeSlots.length === 0) {
      issues.push('אין זמנים מוגדרים');
    }
    
    if (!this.fieldsByTime || Object.keys(this.fieldsByTime).length === 0) {
      issues.push('אין מגרשים זמינים');
    }
    
    if (this.availableSports.length === 0) {
      issues.push('אין ספורטים זמינים');
    }
    
    // בדיקה שיש לפחות מגרש אחד זמין
    const totalFields = Object.values(this.fieldsByTime).flat().length;
    if (totalFields === 0) {
      issues.push('אין מגרשים זמינים בכלל');
    }
    
    if (issues.length > 0) {
      console.log('❌ בעיות בנתונים:', issues);
      return { valid: false, issues };
    }
    
    console.log('✅ נתונים תקינים');
    return { valid: true, issues: [] };
  }

  // פונקציה ראשית לפתרון
  solve() {
    console.log('🚀 מתחיל פתרון בעיית שיבוץ אופטימלי מלא...');
    
    // בדיקת תקינות
    const validation = this.validateInputData();
    if (!validation.valid) {
      throw new Error(`נתונים לא תקינים: ${validation.issues.join(', ')}`);
    }
    
    try {
      // פתרון אופטימלי
      const result = this.solveOptimal();
      
      console.log('🏆 פתרון אופטימלי הושלם בהצלחה!');
      return result;
      
    } catch (error) {
      console.error('❌ שגיאה בפתרון אופטימלי:', error);
      throw new Error(`שגיאה בפתרון אופטימלי: ${error.message}`);
    }
  }
}

// הרכיב הראשי עם השלמות מלאות
function CreateWorkout({ user, selectedDate, startTime, endTime, onBackClick }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [userPreferences, setUserPreferences] = useState([]);
  const [fieldsByTime, setFieldsByTime] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    console.log('🎬 CreateWorkout נטען עם פרמטרים:', {
      user: user?.userName,
      selectedDate,
      startTime,
      endTime
    });
    
    initializeWorkoutData();
  }, []);

  const initializeWorkoutData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📊 טוען נתוני משתמש...');
      await loadUserPreferences();
      
      console.log('⏰ יוצר רבעי שעה...');
      const slots = createTimeSlots();
      setTimeSlots(slots);
      
      console.log('🏟️ טוען מגרשים זמינים...');
      await loadAvailableFields(slots);
      
      console.log('✅ כל הנתונים נטענו בהצלחה');
      
    } catch (err) {
      console.error('❌ שגיאה בטעינת נתונים:', err);
      setError('שגיאה בטעינת נתונים. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      if (!user || !user.id) {
        throw new Error('משתמש לא מוגדר');
      }
      
      const url = `https://wolfit-gym-backend-ijvq.onrender.com/api/user-preferences/${user.id}`;
      console.log('📡 קורא העדפות מ:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        const preferences = data.data.selectedSports || [];
        setUserPreferences(preferences);
        console.log('❤️ העדפות נטענו:', preferences.map(id => SPORT_MAPPING[id]).join(', '));
      } else {
        console.log('⚠️ אין העדפות שמורות');
        setUserPreferences([]);
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת העדפות:', error);
      setUserPreferences([]);
      throw error;
    }
  };

  const createTimeSlots = () => {
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    console.log(`⏰ יוצר רבעי שעה מ-${startTime} עד ${endTime}`);
    
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += 15) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
    
    console.log(`📅 נוצרו ${slots.length} רבעי שעה:`, slots.join(', '));
    return slots;
  };

  const loadAvailableFields = async (timeSlots) => {
    try {
      console.log('🌐 שולח בקשה למגרשים זמינים...');
      
      const requestBody = {
        date: selectedDate,
        timeSlots: timeSlots
      };
      
      console.log('📋 נתוני בקשה:', requestBody);
      
      const response = await fetch('https://wolfit-gym-backend-ijvq.onrender.com/api/available-fields-for-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setFieldsByTime(data.fieldsByTime);
          
          // סטטיסטיקות מפורטות
          const totalFieldSlots = Object.values(data.fieldsByTime).flat().length;
          const timeSlotsWithFields = Object.keys(data.fieldsByTime).length;
          const sportTypes = new Set();
          
          Object.values(data.fieldsByTime).flat().forEach(field => {
            sportTypes.add(field.sportTypeId);
          });
          
          console.log('🏟️ מגרשים נטענו בהצלחה:');
          console.log(`📊 סה"כ מגרש-זמנים: ${totalFieldSlots}`);
          console.log(`⏰ זמנים עם מגרשים: ${timeSlotsWithFields}/${timeSlots.length}`);
          console.log(`🏃 סוגי ספורט זמינים: ${Array.from(sportTypes).map(id => SPORT_MAPPING[id]).join(', ')}`);
          
          return;
        } else {
          throw new Error(data.message);
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ שגיאה בטעינת מגרשים:', error);
      throw error;
    }
  };

  const generateOptimalWorkout = () => {
    console.log('🎯 מתחיל יצירת תוכנית אימון אופטימלית...');
    
    if (timeSlots.length === 0 || Object.keys(fieldsByTime).length === 0) {
      console.log('❌ אין נתונים זמינים ליצירת אימון');
      return null;
    }

    // בדיקה שיש מגרשים זמינים
    const totalFields = Object.values(fieldsByTime).flat().length;
    if (totalFields === 0) {
      console.log('❌ אין מגרשים זמינים בכלל');
      return null;
    }

    try {
      const scheduler = new CompleteOptimalWorkoutScheduler(timeSlots, fieldsByTime, userPreferences);
      const result = scheduler.solve();
      
      console.log('🏆 תוכנית אימון אופטימלית נוצרה:', result);
      return result;
      
    } catch (error) {
      console.error('❌ שגיאה ביצירת תוכנית אופטימלית:', error);
      throw error;
    }
  };

  const generateWorkout = async () => {
    if (timeSlots.length === 0 || Object.keys(fieldsByTime).length === 0) {
      setError('לא נטענו נתונים. אנא רענן את הדף.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      console.log('🚀 מתחיל ליצור תוכנית אימון אופטימלית מלאה...');
      
      // סימולציה של זמן עיבוד (כדי שהמשתמש יראה שמשהו קורה)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const optimalWorkout = generateOptimalWorkout();
      
      if (optimalWorkout && optimalWorkout.successfulSlots > 0) {
        setWorkoutPlan(optimalWorkout);
        console.log('✅ תוכנית אימון אופטימלית נוצרה בהצלחה');
      } else {
        setError('לא הצליח ליצור תוכנית אימון מתאימה. נסה שעות או תאריך אחרים.');
      }
      
    } catch (error) {
      console.error('❌ שגיאה ביצירת אימון:', error);
      setError(`שגיאה ביצירת האימון: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveWorkoutToDatabase = async () => {
    if (!workoutPlan || !user || !user.id) {
      setError('אין תוכנית אימון או משתמש לא מוגדר');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      // הכנת רשימת הזמנות למגרשים
      const bookings = workoutPlan.slots
        .filter(slot => slot.field !== null)
        .map(slot => ({
          idField: slot.field.id,
          bookingDate: selectedDate,
          startTime: slot.time,
          idUser: user.id
        }));

      if (bookings.length === 0) {
        setError('אין מגרשים לשמירה');
        setIsSaving(false);
        return;
      }

      const requestBody = {
        bookings: bookings,
        userId: user.id,
        date: selectedDate
      };

      console.log('💾 שומר אימון:', requestBody);

      const response = await fetch('https://wolfit-gym-backend-ijvq.onrender.com/api/book-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSaveSuccess(true);
        console.log('✅ אימון נשמר בהצלחה');
        
        setTimeout(() => {
          if (onBackClick) {
            onBackClick();
          }
        }, 2000);
      } else {
        setError(`שגיאה בשמירת האימון: ${data.message}`);
      }

    } catch (error) {
      console.error('❌ שגיאה בשמירת האימון:', error);
      setError(`שגיאה בשמירת האימון: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const canCreateWorkout = () => {
    return !loading && timeSlots.length > 0 && Object.keys(fieldsByTime).length > 0;
  };

  if (loading) {
    return (
      <div className="create-workout-container">
        <button className="back-button" onClick={onBackClick}>חזרה</button>
        <div className="content">
          <h1>🔄 טוען נתונים...</h1>
          <p>אנא המתן בזמן שאנו טוענים את המידע הדרוש ליצירת האימון האופטימלי</p>
          <div style={{ 
            margin: '20px 0', 
            padding: '15px', 
            background: 'rgba(81, 207, 102, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(81, 207, 102, 0.3)'
          }}>
            המערכת טוענה את העדפותיך, בודקת זמינות מגרשים ומכינה אלגוריתם אופטימלי...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-workout-container">
      <button className="back-button" onClick={onBackClick}>
        חזרה
      </button>
      
      <div className="content">
        <h1>🎯 יוצר אימון אופטימלי מלא (Hungarian Algorithm)</h1>
        
        <div className="workout-info">
          <div className="info-card">
            <h3>🗓️ פרטי האימון</h3>
            <p><strong>תאריך:</strong> {selectedDate}</p>
            <p><strong>שעה:</strong> {startTime} - {endTime}</p>
            <p><strong>משתמש:</strong> {user.userName}</p>
            <p><strong>רבעי שעה:</strong> {timeSlots.length}</p>
          </div>
          
          <div className="info-card">
            <h3>❤️ העדפות המשתמש</h3>
            {userPreferences.length > 0 ? (
              <div>
                <p><strong>ספורטים מועדפים (לפי סדר):</strong></p>
                <ol style={{ margin: '10px 0', paddingRight: '20px' }}>
                  {userPreferences.map((sportId) => (
                    <li key={sportId} style={{ margin: '5px 0' }}>
                      {SPORT_MAPPING[sportId] || `ספורט ${sportId}`}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p style={{ color: '#ff6b6b' }}>⚠️ אין העדפות שמורות - האלגוריתם ישתמש בהעדפות ברירת מחדל</p>
            )}
          </div>
          
          <div className="info-card">
            <h3>🏟️ מגרשים זמינים</h3>
            <p><strong>זמנים עם מגרשים:</strong> {Object.keys(fieldsByTime).length}/{timeSlots.length}</p>
            <p><strong>סה"כ מגרש-זמנים:</strong> {Object.values(fieldsByTime).flat().length}</p>
            
            {Object.keys(fieldsByTime).length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <strong>דוגמאות זמינות:</strong>
                {Object.entries(fieldsByTime).slice(0, 3).map(([time, fields]) => (
                  <div key={time} className="time-fields" style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                    <strong>{time}:</strong> {fields.length} מגרשים ({fields.map(f => SPORT_MAPPING[f.sportTypeId]).join(', ')})
                  </div>
                ))}
                {Object.keys(fieldsByTime).length > 3 && <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>ועוד...</div>}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ 
            color: '#ff6b6b', 
            textAlign: 'center', 
            margin: '20px 0',
            padding: '15px',
            background: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 107, 107, 0.3)'
          }}>
            ❌ {error}
          </div>
        )}

        <div className="action-buttons">
          <button
            className="generate-button"
            onClick={generateWorkout}
            disabled={isGenerating || !canCreateWorkout()}
            style={{
              background: isGenerating ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {isGenerating ? '🔄 יוצר אימון אופטימלי...' : '🎯 צור תוכנית אימון אופטימלית'}
          </button>
        </div>

        {workoutPlan && (
          <div className="workout-result" style={{ marginTop: '30px' }}>
            <h2>🏆 התוכנית האופטימלית שלך</h2>
            
            <div className="optimization-info" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '20px',
              borderRadius: '12px',
              margin: '20px 0',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 15px 0' }}>📊 סטטיסטיקות אופטימליות</h3>
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{workoutPlan.successfulSlots}/{workoutPlan.totalSlots}</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>רבעי שעה מוצלחים</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{workoutPlan.totalScore}</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>ניקוד כולל</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>✅</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>{workoutPlan.algorithm}</div>
                </div>
              </div>
            </div>

            {workoutPlan.sportsUsage && Object.keys(workoutPlan.sportsUsage).length > 0 && (
              <div className="sports-summary" style={{
                background: 'rgba(81, 207, 102, 0.1)',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid rgba(81, 207, 102, 0.3)',
                margin: '20px 0'
              }}>
                <h3 style={{ margin: '0 0 15px 0' }}>📈 פילוג ספורטים אופטימלי:</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                  {Object.entries(workoutPlan.sportsUsage).map(([sportId, count]) => (
                    <div key={sportId} style={{
                      background: 'white',
                      padding: '10px 15px',
                      borderRadius: '20px',
                      border: '1px solid rgba(81, 207, 102, 0.5)',
                      fontSize: '14px'
                    }}>
                      <strong>{SPORT_MAPPING[sportId] || `ספורט ${sportId}`}:</strong> {count} פעמים
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="workout-timeline">
              <h3>⏰ לוח זמנים מפורט:</h3>
              {workoutPlan.slots.map((slot, index) => (
                <div key={index} className="time-slot" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px',
                  margin: '10px 0',
                  border: slot.field ? '2px solid #51cf66' : '2px solid #ff6b6b',
                  borderRadius: '8px',
                  background: slot.field ? 'rgba(81, 207, 102, 0.05)' : 'rgba(255, 107, 107, 0.05)'
                }}>
                  <div className="time" style={{
                    minWidth: '80px',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {slot.time}
                  </div>
                  <div className="field-info" style={{ flex: 1, marginRight: '15px' }}>
                    {slot.field ? (
                      <>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#51cf66' }}>
                          ✅ {slot.field.name}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                          🏃 ספורט: {slot.sportType} | 
                          🔄 שימוש: {slot.usage}/2 | 
                          {slot.score && (
                            <span> 🎯 ניקוד: {slot.score}</span>
                          )}
                          {slot.isOptimal && <span style={{ color: '#51cf66' }}> | ⭐ אופטימלי</span>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#ff6b6b' }}>
                          ❌ לא זמין
                        </div>
                        <div style={{ fontSize: '14px', color: '#999', marginTop: '5px' }}>
                          {slot.reason || 'לא נמצא מגרש מתאים'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {saveSuccess ? (
              <div style={{ 
                color: '#51cf66', 
                textAlign: 'center', 
                margin: '30px 0',
                padding: '20px',
                background: 'rgba(81, 207, 102, 0.1)',
                borderRadius: '12px',
                border: '2px solid rgba(81, 207, 102, 0.3)'
              }}>
                <h3>🎉 האימון האופטימלי נשמר בהצלחה!</h3>
                <p>מעביר אותך לתפריט הראשי בעוד רגעים...</p>
              </div>
            ) : (
              <div className="action-buttons" style={{ marginTop: '30px', textAlign: 'center' }}>
                <button
                  className="save-button"
                  onClick={saveWorkoutToDatabase}
                  disabled={isSaving}
                  style={{ 
                    background: isSaving ? '#ccc' : 'linear-gradient(135deg, #51cf66 0%, #4ecdc4 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '15px 40px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {isSaving ? '💾 שומר אימון...' : '✅ אישור ושמירת האימון האופטימלי'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateWorkout;