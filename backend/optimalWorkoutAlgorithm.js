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
    console.log('📊 מטריצה מקורית:');
    this.printMatrix(this.originalMatrix);
    
    this.reduceMatrix();
    
    console.log('📊 מטריצה אחרי הפחתה:');
    this.printMatrix(this.matrix);
    
    let step = 2;
    let iterations = 0;
    const maxIterations = this.n * this.n;
    
    while (step !== 6 && iterations < maxIterations) {
      console.log(`🔄 שלב ${step}, איטרציה ${iterations}`);
      console.log('📊 מטריצה נוכחית:');
      this.printMatrix(this.matrix);
      console.log('⭐ אפסים מסומנים:', Array.from(this.starredZeros));
      console.log('🔸 אפסים מסומנים בגרש:', Array.from(this.primedZeros));
      console.log('📋 שורות מכוסות:', this.rowCovered.map((covered, i) => covered ? i : null).filter(i => i !== null));
      console.log('📋 עמודות מכוסות:', this.colCovered.map((covered, i) => covered ? i : null).filter(i => i !== null));
      
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
      console.log('📊 מטריצה סופית:');
      this.printMatrix(this.matrix);
      console.log('⭐ אפסים מסומנים סופיים:', Array.from(this.starredZeros));
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
    
    console.log(`🔢 חיסרתי ${minVal} מ-${subtractedCount} אלמנטים לא מכוסים`);
    console.log(`🔢 הוספתי ${minVal} ל-${addedCount} אלמנטים מכוסים כפול`);
  }

  extractAssignment() {
    console.log('📊 מחלץ השמה סופית...');
    console.log(`⭐ אפסים מסומנים לחילוץ: [${Array.from(this.starredZeros).join(', ')}]`);
    
    this.assignment.fill(-1);
    
    for (const zero of this.starredZeros) {
      const [row, col] = zero.split(',').map(Number);
      this.assignment[row] = col;
      console.log(`📊 השמה: שורה ${row} ← עמודה ${col}`);
    }
    
    const assignedCount = this.assignment.filter(val => val !== -1).length;
    console.log(`✅ השמה סופית: ${assignedCount}/${this.n} מוקצים`);
    console.log(`📋 השמה מלאה: [${this.assignment.join(', ')}]`);
  }

  createFallbackAssignment() {
    console.log('🔄 יוצר השמה חלופית...');
    console.log('📊 מטריצה מקורית לפתרון חלופי:');
    this.printMatrix(this.originalMatrix);
    
    const assignment = new Array(this.n).fill(-1);
    const usedCols = new Set();
    
    console.log('🔍 בודק כל שורה למציאת העמודה הטובה ביותר...');
    
    // Simple greedy assignment on original matrix
    for (let i = 0; i < this.n; i++) {
      let bestCol = -1;
      let bestValue = Infinity;
      
      console.log(`\n🔍 בודק שורה ${i}:`);
      
      for (let j = 0; j < this.n; j++) {
        if (!usedCols.has(j) && this.originalMatrix[i][j] < bestValue) {
          bestValue = this.originalMatrix[i][j];
          bestCol = j;
          console.log(`   ✅ עמודה ${j}: ערך ${this.originalMatrix[i][j]} (טוב יותר מ-${bestValue})`);
        } else if (usedCols.has(j)) {
          console.log(`   ❌ עמודה ${j}: כבר שומשה`);
        } else {
          console.log(`   ⚠️ עמודה ${j}: ערך ${this.originalMatrix[i][j]} (לא טוב מ-${bestValue})`);
        }
      }
      
      if (bestCol !== -1 && bestValue < Infinity) {
        assignment[i] = bestCol;
        usedCols.add(bestCol);
        console.log(`   🎯 בחרתי עמודה ${bestCol} עם ערך ${bestValue}`);
      } else {
        console.log(`   ❌ לא נמצא עמודה מתאימה לשורה ${i}`);
      }
    }
    
    const assignedCount = assignment.filter(val => val !== -1).length;
    console.log(`✅ השמה חלופית: ${assignedCount}/${this.n} מוקצים`);
    console.log(`📋 השמה חלופית: [${assignment.join(', ')}]`);
    
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
    console.log(`\n🧮 מחשב ניקוד: ${timeSlot} + ${SPORT_MAPPING[sportId]} (שימוש: ${currentUsage}, עדיפות: ${priority})`);
    
    const availableFields = this.fieldsByTime[timeSlot] || [];
    const hasAvailableField = availableFields.some(field => 
      field.sportTypeId === sportId && field.isAvailable !== false
    );
    
    console.log(`   🔍 מגרשים זמינים לזמן: ${availableFields.length}`);
    console.log(`   🔍 מגרשים מתאימים לספורט: ${availableFields.filter(f => f.sportTypeId === sportId).length}`);
    
    if (!hasAvailableField) {
      console.log(`   ❌ בלתי אפשרי: אין מגרש זמין לספורט ${SPORT_MAPPING[sportId]} בזמן ${timeSlot}`);
      return -1; // בלתי אפשרי
    }
    
    let score = 1000; // ניקוד בסיס גבוה
    console.log(`   📊 ניקוד בסיס: ${score}`);
    
    // בונוס חזק להעדפות משתמש (סדר חשוב!)
    const preferenceIndex = this.userPreferences.indexOf(sportId);
    if (preferenceIndex !== -1) {
      const preferenceBonus = (this.userPreferences.length - preferenceIndex) * 3000;
      score += preferenceBonus;
      console.log(`   ❤️ בונוס העדפה: +${preferenceBonus} (מיקום ${preferenceIndex + 1} מתוך ${this.userPreferences.length})`);
    } else {
      console.log(`   ⚠️ אין בונוס העדפה: ספורט לא נמצא בהעדפות`);
    }
    
    // עונש חזק על עדיפות נמוכה (גיוון חשוב!)
    const priorityPenalty = (priority - 1) * 1800;
    score -= priorityPenalty;
    console.log(`   🎯 עונש עדיפות: -${priorityPenalty} (עדיפות ${priority})`);
    
    // עונש על שימוש חוזר (רק אם זה לא עדיפות ראשונה)
    if (priority > 1) {
      const usagePenalty = currentUsage * currentUsage * 100;
      score -= usagePenalty;
      console.log(`   🔄 עונש שימוש חוזר: -${usagePenalty} (שימוש ${currentUsage})`);
    } else {
      console.log(`   ✅ אין עונש שימוש חוזר: עדיפות ראשונה`);
    }
    
    // בונוס לאיכות המגרש
    const bestField = availableFields
      .filter(field => field.sportTypeId === sportId)
      .sort((a, b) => (b.name || '').length - (a.name || '').length)[0];
    
    if (bestField && bestField.name && bestField.name.length > 10) {
      score += 50; // מגרש איכותי
      console.log(`   🏆 בונוס איכות מגרש: +50 (${bestField.name})`);
    } else {
      console.log(`   ⚠️ אין בונוס איכות מגרש: שם קצר או לא קיים`);
    }
    
    // עונש קל על זמנים מאוחרים (העדפה לזמנים מוקדמים)
    const timeIndex = this.timeSlots.indexOf(timeSlot);
    const timePenalty = timeIndex * 2;
    score -= timePenalty;
    console.log(`   ⏰ עונש זמן מאוחר: -${timePenalty} (מיקום ${timeIndex + 1})`);
    
    const finalScore = Math.max(0, score);
    console.log(`   🎯 ניקוד סופי: ${finalScore} (לפני: ${score})`);
    
    return finalScore;
  }

  // יצירת מטריצת עלויות מושלמת לאלגוריתם ההונגרי
  createOptimalCostMatrix() {
    console.log('🏗️ יוצר מטריצת עלויות אופטימלית...');
    
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
    console.log(`📐 גודל מטריצה: ${matrixSize}x${matrixSize}`);
    console.log(`🏃 אפשרויות ספורט: ${sportOptions.length}`);
    
    // הדפסת אפשרויות הספורט
    console.log('🏃 אפשרויות ספורט שנוצרו:');
    sportOptions.forEach((option, index) => {
      console.log(`  ${index}: ${option.name} (עדיפות ${option.priority}, שימוש ${option.usage})`);
    });
    
    const costMatrix = Array(matrixSize).fill().map(() => Array(matrixSize).fill(0));
    
    console.log('🧮 מחשב עלויות למטריצה...');
    
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
    
    // הדפסת מטריצת העלויות
    console.log('📊 מטריצת עלויות שנוצרה:');
    this.printCostMatrix(costMatrix, numTimeSlots, sportOptions.length);
    
    // שמירת מידע על האפשרויות למטרות דיבוג
    this.sportOptions = sportOptions;
    this.matrixSize = matrixSize;
    
    console.log('✅ מטריצת עלויות נוצרה בהצלחה');
    return costMatrix;
  }

  // פונקציה להדפסת מטריצת עלויות עם הסברים
  printCostMatrix(matrix, numTimeSlots, numSportOptions) {
    console.log('┌' + '─'.repeat(matrix[0].length * 10) + '┐');
    
    // הדפסת כותרות עמודות
    let header = '│     ';
    for (let j = 0; j < matrix[0].length; j++) {
      if (j < numSportOptions) {
        header += `S${j}`.padStart(8) + ' ';
      } else {
        header += `D${j}`.padStart(8) + ' ';
      }
    }
    header += '│';
    console.log(header);
    
    // הדפסת המטריצה
    for (let i = 0; i < matrix.length; i++) {
      let row = '│';
      if (i < numTimeSlots) {
        row += `T${i}`.padStart(4) + ' ';
      } else {
        row += `D${i}`.padStart(4) + ' ';
      }
      
      for (let j = 0; j < matrix[i].length; j++) {
        const val = matrix[i][j];
        let displayVal;
        if (val === 999999) {
          displayVal = '∞';
        } else {
          displayVal = val.toString();
        }
        row += ` ${displayVal.padStart(7)} `;
      }
      row += '│';
      console.log(row);
    }
    console.log('└' + '─'.repeat(matrix[0].length * 10) + '┘');
    console.log('T = זמן, S = ספורט, D = דמה');
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
    console.log('📋 השמה מהאלגוריתם ההונגרי:', assignment);
    
    const result = [];
    const sportsUsageCount = {};
    const usedSportOptions = new Set(); // מניעת כפילות
    let totalScore = 0;
    
    console.log('🔄 מעבד כל זמן:');
    
    for (let i = 0; i < this.timeSlots.length; i++) {
      const timeSlot = this.timeSlots[i];
      const assignedOptionIndex = assignment[i];
      
      console.log(`\n⏰ עובד על זמן ${i}: ${timeSlot}`);
      console.log(`   השמה: ${assignedOptionIndex}`);
      
      if (assignedOptionIndex !== -1 && 
          assignedOptionIndex < this.sportOptions.length) {
        
        const sportOption = this.sportOptions[assignedOptionIndex];
        console.log(`   אפשרות ספורט: ${sportOption.name}`);
        
        const currentUsage = sportsUsageCount[sportOption.sportId] || 0;
        console.log(`   שימוש נוכחי בספורט: ${currentUsage}`);
        
        // בדיקה אם השמה תקינה (לא כפילות באותה אופציה)
        if (!usedSportOptions.has(assignedOptionIndex)) {
          console.log(`   ✅ אפשרות לא שומשה עדיין`);
          
          const selectedField = this.findOptimalField(timeSlot, sportOption.sportId);
          console.log(`   מגרש שנמצא: ${selectedField ? selectedField.name : 'לא נמצא'}`);
          
          const score = this.calculatePreciseScore(timeSlot, sportOption.sportId, currentUsage);
          console.log(`   ניקוד מחושב: ${score}`);
          
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
            
            console.log(`   ✅ הצלחה: ${SPORT_MAPPING[sportOption.sportId]} (${score} נק') במגרש ${selectedField.name}`);
          } else {
            result.push({
              time: timeSlot,
              field: null,
              reason: 'לא נמצא מגרש מתאים',
              isOptimal: false
            });
            console.log(`   ❌ כישלון: לא נמצא מגרש ל-${SPORT_MAPPING[sportOption.sportId]}`);
          }
        } else {
          result.push({
            time: timeSlot,
            field: null,
            reason: 'ספורט זה כבר שומש',
            isOptimal: false
          });
          console.log(`   ⚠️ כישלון: ספורט כבר שומש`);
        }
      } else {
        result.push({
          time: timeSlot,
          field: null,
          reason: 'לא נמצא שיבוץ אופטימלי',
          isOptimal: false
        });
        console.log(`   ❌ כישלון: לא נמצא שיבוץ (השמה: ${assignedOptionIndex})`);
      }
    }
    
    const successfulSlots = result.filter(slot => slot.field !== null).length;
    
    console.log(`\n🏆 סיכום פתרון אופטימלי:`);
    console.log(`   זמנים מוצלחים: ${successfulSlots}/${this.timeSlots.length}`);
    console.log(`   ניקוד כולל: ${totalScore}`);
    console.log(`   שימוש בספורטים:`, sportsUsageCount);
    
    // הדפסת תוכנית האימון הסופית
    console.log(`\n📅 תוכנית אימון סופית:`);
    result.forEach((slot, index) => {
      if (slot.field) {
        console.log(`   ${index + 1}. ${slot.time}: ${slot.sportType} במגרש ${slot.field.name} (${slot.score} נק')`);
      } else {
        console.log(`   ${index + 1}. ${slot.time}: ${slot.reason}`);
      }
    });
    
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





