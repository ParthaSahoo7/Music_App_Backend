// const transporter = require('./emailTransporter');
import transporter from './emailTransporter.js';
import dotenv from 'dotenv';
dotenv.config();

const sendVerificationEmail = async (toEmail, token) => {
  console.log('Sending verification email to:', toEmail);
  const mailOptions = {
    from: `"Your App Team" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Email Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 24px; border-radius: 8px;">
        <h2 style="color: #333;">Confirm your email address</h2>
        <p style="font-size: 16px;">Thanks for signing up! Please use the code below to verify your email address:</p>
        <div style="font-size: 32px; font-weight: bold; margin: 20px 0; color: #007bff;">${token}</div>
        <p style="font-size: 14px; color: #777;">This code will expire in 5 minutes.</p>
        <p style="font-size: 14px; color: #999;">If you didn't request this, you can safely ignore this email.</p>
        <br />
        <p style="font-size: 14px; color: #333;">— Your App Team</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};


const sendPasswordResetEmail = async (toEmail, token) => {
  const mailOptions = {
    from: `"Your App Team" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Password Reset Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 24px; border-radius: 8px;">
        <h2 style="color: #333;">Confirm your email address</h2>
        <p style="font-size: 16px;">Thanks for signing up! Please use the code below to verify your email address:</p>
        <div style="font-size: 32px; font-weight: bold; margin: 20px 0; color: #007bff;">${token}</div>
        <p style="font-size: 14px; color: #777;">This code will expire in 5 minutes.</p>
        <p style="font-size: 14px; color: #999;">If you didn't request this, you can safely ignore this email.</p>
        <br />
        <p style="font-size: 14px; color: #333;">— Your App Team</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};


export { sendVerificationEmail, sendPasswordResetEmail }; // ✅ Use ESM export
