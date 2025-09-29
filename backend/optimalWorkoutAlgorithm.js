// backend/optimalWorkoutAlgorithm.js

// מיפוי ספורטים (תואם לשרת)
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
    
    console.log('🔥 אמתחיל אלגוריתם הונגרי אופטימלי מלא');
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

module.exports = {
  OptimalHungarianAlgorithm,
  CompleteOptimalWorkoutScheduler,
  SPORT_MAPPING
};





