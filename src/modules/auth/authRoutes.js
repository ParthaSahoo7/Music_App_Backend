const express = require('express');
const { check } = require('express-validator');
const authController = require('./authControllers');
const authorizeUser = require('../../middlewares/authorizeUser')

const router = express.Router();

router.post(
  '/register',
  [
    check('email', 'Valid email is required').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ],
  authController.register
);

router.post(
  '/login',
  [
    check('email', 'Valid email is required').isEmail(),
    check('password', 'Password is required').notEmpty(),
  ],
  authController.login
);

router.post('/logout', authController.logout);

router.post(
  '/forgot-password',
  [check('email', 'Valid email is required').isEmail()],
  authController.forgotPassword
);

router.post(
  '/verify-forgot-password-token',
  check('email', 'Email is required').isEmail(),
  check('otp', 'OTP is required').notEmpty(),
  authController.verifyForgotPasswordToken
)

router.post(
  '/reset-password',
  [
    check('email', 'email is required').isEmail(),
    check('newPassword', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ],
  
  authController.resetPassword
);

router.post(
  '/send-otp-email',
  [check('email', 'Valid email is required').isEmail()],
  authController.sendEmailVerification
);

router.post(
  '/verify-email',
  [
    check('userId', 'Valid userId is required').notEmpty(),
    check('otp', 'OTP is required').notEmpty(),
  ],
  authController.verifyEmail
);

router.post(
  '/send-otp-phone',
  [
    check('countryCode', 'Country code is required').notEmpty(),
    check('phoneNumber', 'Phone number is required').notEmpty(),
  ],
  authController.sendPhoneVerification
);

router.post(
  '/verify-phone',
  [
    check('countryCode', 'Country code is required').notEmpty(),
    check('phoneNumber', 'Phone number is required').notEmpty(),
    check('otp', 'OTP is required').notEmpty(),
  ],
  authController.verifyPhone
);

router.post(
  '/oauth/google',
  [check('idToken', 'Google ID token is required').notEmpty()],
  authController.googleAuth
);

router.post(
  '/oauth/apple',
  [check('identityToken', 'Apple ID token is required').notEmpty()],
  authController.appleAuth
);



module.exports = router;
