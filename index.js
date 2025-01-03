const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} request for '${req.url}'`);
  next();
});

// Basic route
app.get('/', (req, res) => {
  res.send('Hello, World! Welcome to my testing Node.js app.');
});

// Catch-all route for 404
app.use((req, res) => {
  res.status(404).send('Sorry, page not found.');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
