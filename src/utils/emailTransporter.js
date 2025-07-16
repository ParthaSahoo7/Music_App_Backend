// utils/emailTransporter.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail', // Gmail preconfigures host and port
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true, 
  maxConnections: 3,
  maxMessages: 100,
  rateLimit: 5, 
  logger: false, 
  debug: false,  
});

module.exports = transporter;
