// utils/emailTransporter.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'Gmail',
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

export default transporter; // ✅ Use ESM export
