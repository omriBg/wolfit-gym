// נוצר קובץ זמני לתיקון
// בדיקה פשוטה
console.log('Testing simple server');

const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.json({ message: 'Server is working!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
