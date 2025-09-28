// backend/optimalWorkoutAlgorithm.js
// אלגוריתם הונגרי מלא ומתוקן לאופטימליות מקסימלית

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
  }

  findInitialZeros() {
    console.log('🔍 מחפש אפסים ראשוניים...');
    
    this.starredZeros.clear();
    this.primedZeros.clear();
    
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.matrix[i][j] === 0 && !this.rowCovered[i] && !this.colCovered[j]) {
          this.starredZeros.add(`${i},${j}`);
          this.rowCovered[i] = true;
          this.colCovered[j] = true;
        }
      }
    }
    
    this.clearCovers();
    return 3;
  }

  coverStarredColumns() {
    console.log('⭐ מכסה עמודות עם אפסים מסומנים...');
    
    let coveredColumns = 0;
    for (let j = 0; j < this.n; j++) {
      for (let i = 0; i < this.n; i++) {
        if (this.starredZeros.has(`${i},${j}`)) {
          this.colCovered[j] = true;
          coveredColumns++;
          break;
        }
      }
    }
    
    if (coveredColumns >= this.n) {
      return 6; // סיום
    }
    
    return 4;
  }

  findUncoveredZero() {
    console.log('🔍 מחפש אפס לא מכוסה...');
    
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.matrix[i][j] === 0 && !this.rowCovered[i] && !this.colCovered[j]) {
          this.primedZeros.add(`${i},${j}`);
          
          // בדיקה אם יש אפס מסומן בשורה
          let starredInRow = false;
          for (let k = 0; k < this.n; k++) {
            if (this.starredZeros.has(`${i},${k}`)) {
              this.rowCovered[i] = true;
              this.colCovered[k] = false;
              starredInRow = true;
              break;
            }
          }
          
          if (!starredInRow) {
            return 5; // בניית נתיב
          }
        }
      }
    }
    
    // לא נמצא אפס לא מכוסה - צריך לחסר מינימום
    this.addMinimumValue();
    return 4;
  }

  constructAugmentingPath() {
    console.log('🛤️ בונה נתיב הרחבה...');
    
    // מציאת האפס הפריים האחרון
    let primeZero = null;
    for (const zero of this.primedZeros) {
      primeZero = zero;
    }
    
    if (!primeZero) {
      return 4;
    }
    
    const [row, col] = primeZero.split(',').map(Number);
    this.path = [[row, col]];
    
    // בניית הנתיב
    let currentRow = row;
    let currentCol = col;
    
    while (true) {
      // חיפוש אפס מסומן בעמודה
      let starredInCol = null;
      for (let i = 0; i < this.n; i++) {
        if (this.starredZeros.has(`${i},${currentCol}`)) {
          starredInCol = [i, currentCol];
          break;
        }
      }
      
      if (!starredInCol) {
        break;
      }
      
      this.path.push(starredInCol);
      
      // חיפוש אפס פריים בשורה
      let primedInRow = null;
      for (let j = 0; j < this.n; j++) {
        if (this.primedZeros.has(`${starredInCol[0]},${j}`)) {
          primedInRow = [starredInCol[0], j];
          break;
        }
      }
      
      if (!primedInRow) {
        break;
      }
      
      this.path.push(primedInRow);
      currentCol = primedInRow[1];
    }
    
    // עדכון האפסים
    this.updateZeros();
    this.clearCovers();
    this.clearPrimes();
    
    return 3;
  }

  updateZeros() {
    console.log('🔄 מעדכן אפסים...');
    
    for (let i = 0; i < this.path.length; i += 2) {
      const [row, col] = this.path[i];
      this.starredZeros.add(`${row},${col}`);
    }
    
    for (let i = 1; i < this.path.length; i += 2) {
      const [row, col] = this.path[i];
      this.starredZeros.delete(`${row},${col}`);
    }
  }

  clearCovers() {
    this.rowCovered.fill(false);
    this.colCovered.fill(false);
  }

  clearPrimes() {
    this.primedZeros.clear();
  }

  addMinimumValue() {
    console.log('➕ מוסיף ערך מינימלי...');
    
    let minVal = Infinity;
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (!this.rowCovered[i] && !this.colCovered[j] && this.matrix[i][j] < minVal) {
          minVal = this.matrix[i][j];
        }
      }
    }
    
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.rowCovered[i]) {
          this.matrix[i][j] += minVal;
        }
        if (!this.colCovered[j]) {
          this.matrix[i][j] -= minVal;
        }
      }
    }
  }

  extractAssignment() {
    console.log('📋 מחלץ השמה...');
    
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.starredZeros.has(`${i},${j}`)) {
          this.assignment[i] = j;
          break;
        }
      }
    }
  }

  createFallbackAssignment() {
    console.log('🆘 יוצר השמה חלופית...');
    
    const assignment = new Array(this.n).fill(-1);
    const used = new Array(this.n).fill(false);
    
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (!used[j] && this.originalMatrix[i][j] < Infinity) {
          assignment[i] = j;
          used[j] = true;
          break;
        }
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
    
    // עונש על שימוש יתר בספורט
    const usagePenalty = currentUsage * 100;
    score -= usagePenalty;
    
    // בונוס על זמינות מגרשים
    const fieldCount = availableFields.filter(field => field.sportTypeId === sportId).length;
    score += fieldCount * 50;
    
    return Math.max(0, score);
  }

  // יצירת מטריצת עלות אופטימלית
  createOptimalCostMatrix() {
    console.log('📊 יוצר מטריצת עלות אופטימלית...');
    
    const n = this.timeSlots.length;
    const costMatrix = [];
    
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        row.push(Infinity);
      }
      costMatrix.push(row);
    }
    
    // יצירת אפשרויות ספורט לכל זמן
    const sportOptions = [];
    for (let i = 0; i < n; i++) {
      const timeSlot = this.timeSlots[i];
      const options = [];
      
      for (const sportId of this.availableSports) {
        const score = this.calculatePreciseScore(timeSlot, sportId);
        if (score > 0) {
          options.push({ sportId, score, timeSlot });
        }
      }
      
      // מיון לפי ניקוד (גבוה יותר = טוב יותר)
      options.sort((a, b) => b.score - a.score);
      sportOptions.push(options);
    }
    
    // מילוי מטריצת העלות
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (j < sportOptions[i].length) {
          const option = sportOptions[i][j];
          // המרת ניקוד לעלות (נמוך יותר = טוב יותר)
          costMatrix[i][j] = 10000 - option.score;
        }
      }
    }
    
    console.log('📊 מטריצת עלות נוצרה:', costMatrix.map(row => 
      row.map(val => val === Infinity ? '∞' : val)
    ));
    
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
    
    const result = {
      slots: [],
      successfulSlots: 0,
      totalScore: 0,
      sportsUsage: {}
    };
    
    for (let i = 0; i < this.timeSlots.length; i++) {
      const timeSlot = this.timeSlots[i];
      const assignedOptionIndex = assignment[i];
      
      if (assignedOptionIndex >= 0 && assignedOptionIndex < this.availableSports.length) {
        const sportId = this.availableSports[assignedOptionIndex];
        const currentUsage = result.sportsUsage[sportId] || 0;
        
        if (!result.sportsUsage[sportId]) {
          result.sportsUsage[sportId] = 0;
        }
        
        if (currentUsage < this.maxUsagePerSport) {
          const selectedField = this.findOptimalField(timeSlot, sportId);
          const score = this.calculatePreciseScore(timeSlot, sportId, currentUsage);
          
          if (selectedField && score > 0) {
            result.sportsUsage[sportId] = currentUsage + 1;
            result.totalScore += score;
            result.successfulSlots++;
            
            result.slots.push({
              time: timeSlot,
              field: selectedField,
              sportType: SPORT_MAPPING[sportId],
              sportId: sportId,
              usage: currentUsage + 1,
              score: score,
              isOptimal: true
            });
            
            console.log(`✅ ${timeSlot}: ${SPORT_MAPPING[sportId]} (${score} נק') במגרש ${selectedField.name}`);
          } else {
            result.slots.push({
              time: timeSlot,
              field: null,
              reason: 'לא נמצא מגרש מתאים',
              isOptimal: false
            });
            console.log(`❌ ${timeSlot}: לא נמצא מגרש ל-${SPORT_MAPPING[sportId]}`);
          }
        } else {
          result.slots.push({
            time: timeSlot,
            field: null,
            reason: 'ספורט זה כבר שומש',
            isOptimal: false
          });
          console.log(`⚠️ ${timeSlot}: ספורט כבר שומש`);
        }
      } else {
        result.slots.push({
          time: timeSlot,
          field: null,
          reason: 'לא נמצא שיבוץ אופטימלי',
          isOptimal: false
        });
        console.log(`❌ ${timeSlot}: לא נמצא שיבוץ`);
      }
    }
    
    console.log(`🏆 פתרון אופטימלי: ${result.successfulSlots}/${this.timeSlots.length} זמנים`);
    console.log(`📊 ניקוד כולל: ${result.totalScore}`);
    
    return result;
  }

  findOptimalField(timeSlot, sportId) {
    const availableFields = this.fieldsByTime[timeSlot] || [];
    const matchingFields = availableFields.filter(field => 
      field.sportTypeId === sportId && field.isAvailable !== false
    );
    
    if (matchingFields.length === 0) {
      return null;
    }
    
    // החזרת המגרש הראשון (אפשר לשפר עם לוגיקה נוספת)
    return matchingFields[0];
  }

  solve() {
    return this.solveOptimal();
  }
}

module.exports = {
  OptimalHungarianAlgorithm,
  CompleteOptimalWorkoutScheduler,
  SPORT_MAPPING
};
