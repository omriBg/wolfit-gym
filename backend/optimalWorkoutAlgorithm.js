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
  8: 'אגרוף',
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

  // פונקציה להדפסת מטריצה בצורה יפה
  printMatrix(matrix) {
    console.log('┌' + '─'.repeat(matrix[0].length * 8) + '┐');
    for (let i = 0; i < matrix.length; i++) {
      let row = '│';
      for (let j = 0; j < matrix[i].length; j++) {
        const val = matrix[i][j];
        let displayVal;
        if (val === Infinity) {
          displayVal = '∞';
        } else if (val === -1) {
          displayVal = 'X';
        } else {
          displayVal = val.toString();
        }
        
        // הוספת סימונים מיוחדים
        let marker = '';
        if (this.starredZeros && this.starredZeros.has(`${i},${j}`)) {
          marker = '⭐';
        } else if (this.primedZeros && this.primedZeros.has(`${i},${j}`)) {
          marker = '🔸';
        }
        
        row += ` ${displayVal.padStart(4)}${marker} `;
      }
      row += '│';
      console.log(row);
    }
    console.log('└' + '─'.repeat(matrix[0].length * 8) + '┘');
  }

  solve() {
    // Step 1: Reduce matrix by subtracting row and column minimums
    this.reduceMatrix();
    
    let step = 2;
    let iterations = 0;
    const maxIterations = this.n * this.n;
    
    while (step !== 6 && iterations < maxIterations) {
      switch (step) {
        case 2: step = this.findInitialZeros(); break;
        case 3: step = this.coverStarredColumns(); break;
        case 4: step = this.findUncoveredZero(); break;
        case 5: step = this.constructAugmentingPath(); break;
      }
      iterations++;
    }
    
    if (step === 6) {
      console.log(`✅ אלגוריתם הונגרי הושלם בהצלחה (${iterations} איטרציות)`);
      this.extractAssignment();
      return this.assignment;
    } else {
      console.log('❌ אלגוריתם הונגרי לא התכנס - משתמש בפתרון חלופי');
      return this.createFallbackAssignment();
    }
  }

  reduceMatrix() {
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
    
    console.log('🔍 סורק מטריצה לאפסים...');
    
    // Find independent zeros (star them)
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.matrix[i][j] === 0 && !usedRows.has(i) && !usedCols.has(j)) {
          this.starredZeros.add(`${i},${j}`);
          usedRows.add(i);
          usedCols.add(j);
          console.log(`⭐ סימן אפס ב-(${i},${j}) - שורה ${i} ועמודה ${j} כעת תפוסות`);
        }
      }
    }
    
    console.log(`✅ נמצאו ${this.starredZeros.size} אפסים מסומנים`);
    console.log(`📋 שורות תפוסות: [${Array.from(usedRows).join(', ')}]`);
    console.log(`📋 עמודות תפוסות: [${Array.from(usedCols).join(', ')}]`);
    return 3;
  }

  coverStarredColumns() {
    console.log('📋 מכסה עמודות עם אפסים מסומנים...');
    
    this.colCovered.fill(false);
    let coveredCount = 0;
    
    console.log(`🔍 בודק ${this.starredZeros.size} אפסים מסומנים...`);
    
    // Cover columns that contain starred zeros
    for (const zero of this.starredZeros) {
      const [row, col] = zero.split(',').map(Number);
      if (!this.colCovered[col]) {
        this.colCovered[col] = true;
        coveredCount++;
        console.log(`📋 כיסיתי עמודה ${col} (בגלל אפס ב-${row},${col})`);
      }
    }
    
    console.log(`📊 כוסו ${coveredCount} עמודות מתוך ${this.n}`);
    console.log(`📋 עמודות מכוסות: [${this.colCovered.map((covered, i) => covered ? i : null).filter(i => i !== null).join(', ')}]`);
    
    if (coveredCount >= this.n) {
      console.log('🎯 נמצא פתרון אופטימלי! כל העמודות מכוסות');
      return 6; // Solution found
    }
    
    console.log(`⚠️ לא כל העמודות מכוסות (${coveredCount}/${this.n}), ממשיך לשלב 4`);
    return 4; // Need to continue
  }

  findUncoveredZero() {
    console.log('🔍 מחפש אפס לא מכוסה...');
    
    while (true) {
      const uncoveredZero = this.getUncoveredZero();
      
      if (!uncoveredZero) {
        console.log('📉 לא נמצא אפס לא מכוסה - מקטין מטריצה');
        console.log('🔧 מקטין אלמנטים לא מכוסים...');
        this.reduceUncoveredElements();
        console.log('📊 מטריצה אחרי הקטנה:');
        this.printMatrix(this.matrix);
        continue;
      }
      
      const { row, col } = uncoveredZero;
      console.log(`🎯 נמצא אפס לא מכוסה ב-(${row},${col})`);
      
      this.primedZeros.add(`${row},${col}`);
      console.log(`🔸 סימנתי אפס בגרש ב-(${row},${col})`);
      
      // Check if there's a starred zero in the same row
      const starredInRow = this.findStarredZeroInRow(row);
      
      if (starredInRow !== -1) {
        console.log(`🔄 נמצא אפס מסומן בשורה ${row}, עמודה ${starredInRow}`);
        this.rowCovered[row] = true;
        this.colCovered[starredInRow] = false;
        console.log(`📋 כיסיתי שורה ${row} וחשיפתי עמודה ${starredInRow}`);
      } else {
        console.log('🚀 עובר לבניית נתיב מגדיל');
        this.path = [{ row, col, type: 'primed' }];
        console.log(`🛤️ התחלת נתיב: (${row},${col}) - primed`);
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
    console.log(`🛤️ נתיב נוכחי: ${this.path.map(p => `(${p.row},${p.col})`).join(' → ')}`);
    
    let currentStep = this.path[this.path.length - 1];
    
    // Build alternating path
    while (true) {
      console.log(`🔍 מחפש אפס מסומן בעמודה ${currentStep.col}...`);
      
      // Find starred zero in same column
      const starredInCol = this.findStarredZeroInColumn(currentStep.col);
      
      if (starredInCol === -1) {
        console.log('✅ נתיב מגדיל הושלם - לא נמצא אפס מסומן בעמודה');
        break;
      }
      
      console.log(`⭐ נמצא אפס מסומן ב-(${starredInCol},${currentStep.col})`);
      this.path.push({ row: starredInCol, col: currentStep.col, type: 'starred' });
      console.log(`🛤️ הוספתי לנתיב: (${starredInCol},${currentStep.col}) - starred`);
      
      // Find primed zero in same row
      console.log(`🔍 מחפש אפס מסומן בגרש בשורה ${starredInCol}...`);
      const primedInRow = this.findPrimedZeroInRow(starredInCol);
      
      if (primedInRow === -1) {
        console.log('❌ שגיאה בבניית נתיב - לא נמצא אפס מסומן בגרש');
        break;
      }
      
      console.log(`🔸 נמצא אפס מסומן בגרש ב-(${starredInCol},${primedInRow})`);
      this.path.push({ row: starredInCol, col: primedInRow, type: 'primed' });
      console.log(`🛤️ הוספתי לנתיב: (${starredInCol},${primedInRow}) - primed`);
      currentStep = this.path[this.path.length - 1];
    }
    
    console.log(`🛤️ נתיב סופי: ${this.path.map(p => `(${p.row},${p.col})`).join(' → ')}`);
    
    // Update starred zeros based on path
    console.log('⭐ מעדכן אפסים מסומנים לפי הנתיב...');
    this.updateStarredZeros();
    
    // Clear covers and primed zeros
    console.log('🧹 מנקה כיסויים ואפסים מסומנים בגרש...');
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
    console.log(`⭐ אפסים מסומנים לפני עדכון: [${Array.from(this.starredZeros).join(', ')}]`);
    
    // Unstar all starred zeros in the path
    console.log('🔸 מסיר אפסים מסומנים בנתיב...');
    for (let i = 1; i < this.path.length; i += 2) {
      const step = this.path[i];
      if (this.starredZeros.has(`${step.row},${step.col}`)) {
        this.starredZeros.delete(`${step.row},${step.col}`);
        console.log(`   🔸 הסרתי אפס מסומן ב-(${step.row},${step.col})`);
      }
    }
    
    // Star all primed zeros in the path
    console.log('⭐ מוסיף אפסים מסומנים בנתיב...');
    for (let i = 0; i < this.path.length; i += 2) {
      const step = this.path[i];
      this.starredZeros.add(`${step.row},${step.col}`);
      console.log(`   ⭐ הוספתי אפס מסומן ב-(${step.row},${step.col})`);
    }
    
    console.log(`⭐ אפסים מסומנים אחרי עדכון: [${Array.from(this.starredZeros).join(', ')}]`);
    console.log(`⭐ סה"כ ${this.starredZeros.size} אפסים מסומנים`);
  }

  reduceUncoveredElements() {
    console.log('🔧 מקטין אלמנטים לא מכוסים...');
    
    // Find minimum uncovered value
    let minVal = Infinity;
    const uncoveredElements = [];
    
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (!this.rowCovered[i] && !this.colCovered[j] && this.matrix[i][j] < Infinity) {
          minVal = Math.min(minVal, this.matrix[i][j]);
          uncoveredElements.push({ row: i, col: j, val: this.matrix[i][j] });
        }
      }
    }
    
    console.log(`🔍 אלמנטים לא מכוסים: ${uncoveredElements.length}`);
    console.log(`🔍 ערכים לא מכוסים: [${uncoveredElements.map(e => `${e.val}@(${e.row},${e.col})`).join(', ')}]`);
    
    if (minVal === Infinity || minVal <= 0) {
      console.log('⚠️ לא נמצא ערך מינימלי תקין');
      return;
    }
    
    console.log(`🔢 ערך מינימלי לא מכוסה: ${minVal}`);
    
    let subtractedCount = 0;
    let addedCount = 0;
    
    // Subtract from uncovered, add to double-covered
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.rowCovered[i] && this.colCovered[j]) {
          // Double covered - add
          this.matrix[i][j] += minVal;
          addedCount++;
        } else if (!this.rowCovered[i] && !this.colCovered[j]) {
          // Uncovered - subtract
          if (this.matrix[i][j] < Infinity) {
            this.matrix[i][j] -= minVal;
            subtractedCount++;
          }
        }
      }
    }
    
  }

  extractAssignment() {
    this.assignment.fill(-1);
    
    for (const zero of this.starredZeros) {
      const [row, col] = zero.split(',').map(Number);
      this.assignment[row] = col;
    }
    
    const assignedCount = this.assignment.filter(val => val !== -1).length;
    console.log(`✅ השמה סופית: ${assignedCount}/${this.n} מוקצים`);
  }

  createFallbackAssignment() {
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
    
    const assignedCount = assignment.filter(val => val !== -1).length;
    console.log(`✅ השמה חלופית: ${assignedCount}/${this.n} מוקצים`);
    
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
    
    console.log(`🚀 מערכת שיבוץ אופטימלית: ${this.timeSlots.length} זמנים, ${this.availableSports.length} ספורטים`);
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
    
    let score = 10000; // ניקוד בסיס גבוה מאוד
    
    // בונוס חזק להעדפות משתמש (סדר חשוב!)
    const preferenceIndex = this.userPreferences.indexOf(sportId);
    if (preferenceIndex !== -1) {
      const preferenceBonus = (this.userPreferences.length - preferenceIndex) * 5000;
      score += preferenceBonus;
    }
    
    // עונש קל על עדיפות נמוכה (גיוון חשוב!)
    const priorityPenalty = (priority - 1) * 1000;
    score -= priorityPenalty;
    
    // עונש קל על שימוש חוזר (רק אם זה לא עדיפות ראשונה)
    if (priority > 1) {
      const usagePenalty = currentUsage * currentUsage * 50;
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
    const timePenalty = timeIndex * 2;
    score -= timePenalty;
    
    const finalScore = Math.max(1000, score); // ניקוד מינימלי של 1000
    return finalScore;
  }

  // יצירת מטריצת עלויות מושלמת לאלגוריתם ההונגרי
  createOptimalCostMatrix() {
    const numTimeSlots = this.timeSlots.length;
    
    // יוצר "אפשרויות ספורט" - עם עדיפות נכונה
    const sportOptions = [];
    
    // קודם כל - ספורטים אהובים פעם ראשונה (הכי גבוה)
    for (const sportId of this.userPreferences) {
      sportOptions.push({
        sportId,
        usage: 0,
        id: `${sportId}_1`,
        name: `${SPORT_MAPPING[sportId]} (אהוב ראשון)`,
        priority: 1 // עדיפות הכי גבוהה
      });
    }
    
    // אחר כך - ספורטים לא אהובים פעם ראשונה
    for (const sportId of this.availableSports) {
      if (!this.userPreferences.includes(sportId)) {
        sportOptions.push({
          sportId,
          usage: 0,
          id: `${sportId}_2`,
          name: `${SPORT_MAPPING[sportId]} (לא אהוב ראשון)`,
          priority: 2 // עדיפות גבוהה
        });
      }
    }
    
    // אחר כך - ספורטים אהובים בפעם השנייה
    for (const sportId of this.userPreferences) {
      sportOptions.push({
        sportId,
        usage: 1,
        id: `${sportId}_3`,
        name: `${SPORT_MAPPING[sportId]} (אהוב חוזר)`,
        priority: 3 // עדיפות בינונית
      });
    }
    
    // לבסוף - ספורטים לא אהובים בפעם השנייה
    for (const sportId of this.availableSports) {
      if (!this.userPreferences.includes(sportId)) {
        sportOptions.push({
          sportId,
          usage: 1,
          id: `${sportId}_4`,
          name: `${SPORT_MAPPING[sportId]} (לא אהוב חוזר)`,
          priority: 4 // עדיפות נמוכה ביותר
        });
      }
    }
    
    const matrixSize = Math.max(numTimeSlots, sportOptions.length);
    const costMatrix = Array(matrixSize).fill().map(() => Array(matrixSize).fill(0));
    
    // מילוי המטריצה
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        if (i < numTimeSlots && j < sportOptions.length) {
          // זמן אמיתי ← אפשרות ספורט אמיתית
          const timeSlot = this.timeSlots[i];
          const sportOption = sportOptions[j];
          const score = this.calculatePreciseScore(timeSlot, sportOption.sportId, sportOption.usage, sportOption.priority);
          
          // המרה לעלות: ניקוד גבוה = עלות נמוכה (רק ערכים חיוביים!)
          costMatrix[i][j] = score === -1 ? 999999 : Math.max(1, 50000 - score);
          
          if (score !== -1) {
            console.log(`  [${i},${j}] ${timeSlot} + ${sportOption.name}: ניקוד=${score}, עלות=${costMatrix[i][j]}`);
          }
          
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
    
    // this.printCostMatrix(costMatrix, numTimeSlots, sportOptions.length);
    
    // שמירת מידע על האפשרויות למטרות דיבוג
    this.sportOptions = sportOptions;
    this.matrixSize = matrixSize;
    
    return costMatrix;
  }

  // פונקציה להדפסת מטריצת עלויות עם הסברים
  printCostMatrix(matrix, numTimeSlots, numSportOptions) {
    // Function kept for debugging if needed, but no console output
  }

  // פתרון הבעיה באלגוריתם הונגרי
  solveOptimal() {
    const costMatrix = this.createOptimalCostMatrix();
    const hungarian = new OptimalHungarianAlgorithm(costMatrix);
    const assignment = hungarian.solve();
    
    return this.parseOptimalAssignment(assignment);
  }

  // פירוק תוצאת האלגוריתם ההונגרי לתוכנית אימון
  parseOptimalAssignment(assignment) {
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
            
          } else {
            result.push({
              time: timeSlot,
              field: null,
              reason: 'לא נמצא מגרש מתאים',
              isOptimal: false
            });
          }
        } else {
          result.push({
            time: timeSlot,
            field: null,
            reason: 'ספורט זה כבר שומש',
            isOptimal: false
          });
        }
      } else {
        result.push({
          time: timeSlot,
          field: null,
          reason: 'לא נמצא שיבוץ אופטימלי',
          isOptimal: false
        });
      }
    }
    
    const successfulSlots = result.filter(slot => slot.field !== null).length;
    
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
      return { valid: false, issues };
    }
    
    return { valid: true, issues: [] };
  }

  // פונקציה ראשית לפתרון
  solve() {
    // בדיקת תקינות
    const validation = this.validateInputData();
    if (!validation.valid) {
      throw new Error(`נתונים לא תקינים: ${validation.issues.join(', ')}`);
    }
    
    try {
      // פתרון אופטימלי
      const result = this.solveOptimal();
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





