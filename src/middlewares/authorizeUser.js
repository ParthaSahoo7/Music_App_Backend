// const jwt = require('jsonwebtoken');
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// Replace this with your actual secret
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'your_jwt_secret';

function authorizeMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach decoded user info to request
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export default authorizeMiddleware;
