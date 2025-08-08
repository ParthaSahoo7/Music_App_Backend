// const { validationResult } = require("express-validator");
// const jwt = require("jsonwebtoken");
// const { OAuth2Client } = require("google-auth-library");
// const appleSignin = require("apple-signin-auth");
// const UserAuth = require("../../models/UserAuth");
// const EmailVerificationToken = require("../../models/EmailVerificationToken");
// const PasswordResetToken = require('../../models/PasswordResetToken')
// const authService = require("./authServices");
// const {
//   successResponse,
//   errorResponse,
// } = require("../../utils/responseTemplate");
// const {
//   sendVerificationEmail,
//   sendPasswordResetEmail,
// } = require("../../utils/emailServices");
// const { sendVerificationSMS } = require("../../utils/smsServices");
// const { createRequestLogger } = require("../../utils/requestLogger");
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import UserAuth from '../../models/UserAuth.js';
import EmailVerificationToken from '../../models/EmailVerificationToken.js';
import PasswordResetToken from '../../models/PasswordResetToken.js';
import authService from './authServices.js';
import { successResponse, errorResponse } from '../../utils/responseTemplate.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../utils/emailServices.js';
import { sendVerificationSMS } from '../../utils/smsServices.js';
import { createRequestLogger } from '../../utils/requestLogger.js';



const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generate6DigitToken = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveEmailVerificationToken = async (userId, token) => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await EmailVerificationToken.findOneAndUpdate(
    { userId },
    { token, expiresAt },
    { upsert: true, new: true }
  );
};

const savePasswordVerificationToken = async (userId, otp) => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
  await PasswordResetToken.findOneAndUpdate(
    { userId },
    { otp, expiresAt },
    { upsert: true, new: true }
  );
};


const register = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Incoming registration request");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during registration");
      return res.status(400).json(
        errorResponse(
          {
            message:
              "We couldn’t process your registration. Please check the details you’ve entered.",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { email, password } = req.body;
    const username = email.split("@")[0].toLowerCase();

    log.debug(`Checking if email already exists: ${email}`);
    const existingUser = await UserAuth.findOne({ email });

    if (existingUser) {
      if (existingUser.isEmailVerified) {
        log.info(`Registration attempt with already verified email: ${email}`);
        return res.status(409).json(
          errorResponse(
            {
              message: `Looks like you've already signed up with ${email}. Go ahead and log in instead.`,
            },
            409
          )
        );
      } else {
        log.info(`Email already registered but not verified: ${email}`);
        const token = generate6DigitToken();
        await saveEmailVerificationToken(existingUser._id, token);

        sendVerificationEmail(existingUser.email, token)
          .then(() =>
            log.info(`Re-sent verification email to ${existingUser.email}`)
          )
          .catch((err) =>
            log.error(`Failed to resend verification email: ${err.message}`)
          );
        const sanitizedUser = {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          isEmailVerified: existingUser.isEmailVerified,
          createdAt: existingUser.createdAt,
        };
        return res
          .status(200)
          .json(
            successResponse(
              sanitizedUser,
              `You're almost there! A fresh verification code has been sent to ${existingUser.email}. Please enter the code to verify your email.`
            )
          );
      }
    }

    log.debug(`Registering new user with email: ${email}`);
    const newUser = await authService.registerUser({
      username,
      email,
      password,
    });

    const token = generate6DigitToken();
    await saveEmailVerificationToken(newUser._id, token);

    sendVerificationEmail(newUser.email, token)
      .then(() => log.info(`Verification email sent to ${newUser.email}`))
      .catch((err) =>
        log.error(`Failed to send verification email: ${err.message}`)
      );

    const sanitizedUser = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      isEmailVerified: newUser.isEmailVerified,
      createdAt: newUser.createdAt,
    };

    log.info(
      `New user registered: ${sanitizedUser.username} (${sanitizedUser.email})`
    );

    return res
      .status(201)
      .json(
        successResponse(
          sanitizedUser,
          `Welcome aboard, ${sanitizedUser.username}! A verification code has been sent to ${sanitizedUser.email}. Please enter the code to activate your account.`,
          201
        )
      );
  } catch (error) {
    log.error(`Unhandled error during registration: ${error.message}`);
    return res.status(500).json(
      errorResponse(
        {
          message:
            "Oops! Something went wrong on our end. Hang tight — we’re on it.",
        },
        500
      )
    );
  }
};

const login = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Incoming login request");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json(
          errorResponse(
            { message: "Invalid login credentials.", errors: errors.array() },
            400
          )
        );
    }

    const { email, password } = req.body;
    const user = await UserAuth.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res
        .status(401)
        .json(errorResponse({ message: "Invalid email or password." }, 401));
    }

    if (!user.isEmailVerified) {
      const token = generate6DigitToken();
      await saveEmailVerificationToken(user._id, token);

      sendVerificationEmail(user.email, token)
        .then(() => log.info(`Verification email re-sent to ${user.email}`))
        .catch((err) =>
          log.error(`Error resending verification email: ${err.message}`)
        );

      const sanitizedUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      };
      return res
        .status(200)
        .json(
          successResponse(
            sanitizedUser,
            `You're almost there! A fresh verification code has been sent to ${user.email}. Please enter the code to verify your email.`
          )
        );
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    return res.status(200).json(
      successResponse(
        {
          id: user.id,
          email: user.email,
          username: user.username,
          isEmailVerified: user.isEmailVerified,
          token,
        },
        "Login successful."
      )
    );
  } catch (error) {
    log.error(`Login error: ${error.message}`);
    return res
      .status(500)
      .json(errorResponse({ message: "Login failed. Try again later." }, 500));
  }
};

const logout = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Incoming logout request");

  try {
    // Note: Since JWT is stateless, logout is typically handled client-side
    // by removing the token. Server can optionally maintain a token blacklist
    log.info("User logged out");
    return res
      .status(200)
      .json(successResponse({}, "You have been logged out successfully."));
  } catch (error) {
    log.error(`Error during logout: ${error.message}`);
    return res.status(500).json(
      errorResponse(
        {
          message: "Failed to log out. Please try again.",
        },
        500
      )
    );
  }
};

const forgotPassword = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Incoming forgot password request");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during forgot password");
      return res.status(400).json(
        errorResponse(
          {
            message: "Please provide a valid email address.",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { email } = req.body;
    const { user, resetToken } = await authService.forgotPassword(email);

    await sendPasswordResetEmail(email, resetToken)
      .then(() => log.info(`Password reset email sent to ${email}`))
      .catch((err) =>
        log.error(`Failed to send password reset email: ${err.message}`)
      );

    return res
      .status(200)
      .json(
        successResponse(
          {},
          `A password verification code has been sent to ${email}. Please check your inbox.`
        )
      );
  } catch (error) {
    log.error(`Error during forgot password: ${error.message}`);
    return res.status(404).json(
      errorResponse(
        {
          message: "No account found with that email address.",
        },
        404
      )
    );
  }
};

const verifyForgotPasswordToken = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Incoming forgot password token verification request");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during forgot password verification");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid input for password reset verification.",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { email, otp } = req.body;
    const user = await UserAuth.findOne({ email });

    if (!user) {
      log.warn(`User not found for email: ${email}`);
      return res
        .status(404)
        .json(errorResponse({ message: "User not found." }, 404));
    }

    const tokenEntry = await PasswordResetToken.findOne({ userId: user._id });
    const isExpired = tokenEntry?.expiresAt < new Date();
    console.log(tokenEntry)

    if (!tokenEntry || tokenEntry.token !== otp || isExpired) {
      if (isExpired) {
        await PasswordResetToken.deleteOne({ userId: user._id });

        const newOtp = generate6DigitToken();
        await savePasswordVerificationToken(user._id, newOtp); // assumes this saves with expiry
        await sendPasswordResetEmail(user.email, newOtp);

        log.warn("Expired OTP: previous token deleted and new one sent.");
        return res.status(400).json(
          errorResponse(
            {
              message: "OTP has expired. A new code has been sent to your email.",
            },
            400
          )
        );
      }

      log.warn(`Invalid OTP provided for user: ${user._id}`);
      return res
        .status(400)
        .json(errorResponse({ message: "Invalid OTP." }, 400));
    }

    log.info(`OTP verified successfully for user: ${user.email}`);
    return res
      .status(200)
      .json(
        successResponse(
          {},
          "OTP verified successfully. You may now reset your password."
        )
      );
  } catch (error) {
    log.error(`Error verifying OTP: ${error.message}`);
    return res.status(500).json(
      errorResponse(
        {
          message: "An error occurred while verifying the OTP.",
        },
        500
      )
    );
  }
};


const resetPassword = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Incoming reset password request");
  

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during reset password");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid reset token or password.",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const {email, newPassword } = req.body;
    await authService.resetPassword(email, newPassword);

    log.info("Password reset successful");
    return res
      .status(200)
      .json(
        successResponse(
          {},
          "Your password has been reset successfully. You can now log in with your new password."
        )
      );
  } catch (error) {
    log.error(`Error during password reset: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: "Invalid or expired reset token. Please request a new one.",
        },
        400
      )
    );
  }
};

const sendEmailVerification = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Incoming email verification request");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during email verification request");
      return res.status(400).json(
        errorResponse(
          {
            message: "Please provide a valid email address.",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { email } = req.body;
    const { user, token, otp } = await authService.sendEmailOTP(email);

    await sendVerificationEmail(email, otp)
      .then(() => log.info(`Verification OTP sent to ${email}`))
      .catch((err) =>
        log.error(`Failed to send verification OTP: ${err.message}`)
      );

    return res
      .status(200)
      .json(
        successResponse(
          { token },
          `A verification code has been sent to ${email}. Please check your inbox.`
        )
      );
  } catch (error) {
    log.error(`Error during email verification request: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message:
            error.message === "Email already verified"
              ? "This email is already verified."
              : "No account found with that email address.",
        },
        400
      )
    );
  }
};

const verifyEmail = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Incoming email verification attempt");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during email verification");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid input for verification.",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { userId, otp } = req.body;
    const user = await UserAuth.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json(errorResponse({ message: "User not found." }, 404));
    }

    const tokenEntry = await EmailVerificationToken.findOne({ userId });
    const isExpired = tokenEntry?.expiresAt < new Date();
    if (!tokenEntry || tokenEntry.token !== otp || isExpired) {
      if (isExpired) {
        await EmailVerificationToken.deleteOne({ userId });

        const newOtp = generate6DigitToken();
        await saveEmailVerificationToken(userId, newOtp);
        await sendVerificationEmail(user.email, newOtp);

        log.warn("Expired OTP: previous token deleted and new one sent.");
        return res.status(400).json(
          errorResponse(
            {
              message:
                "Verification code expired. A new code has been sent to your email.",
            },
            400
          )
        );
      }

      return res
        .status(400)
        .json(errorResponse({ message: "Invalid verification code." }, 400));
    }

    user.isEmailVerified = true;
    await user.save();
    await EmailVerificationToken.deleteOne({ userId });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    log.info(`Email verified and user logged in: ${user.email}`);
    return res.status(200).json(
      successResponse(
        {
          id: user.id,
          email: user.email,
          username: user.username,
          isEmailVerified: user.isEmailVerified,
          token,
        },
        "Email verified successfully. You're now logged in."
      )
    );
  } catch (error) {
    log.error(`Email verification error: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: "Failed to verify email. Please try again.",
        },
        400
      )
    );
  }
};

const sendPhoneVerification = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Incoming phone verification request");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during phone verification request");
      return res.status(400).json(
        errorResponse(
          {
            message: "Please provide a valid country code and phone number.",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { countryCode, phoneNumber } = req.body;
    const { user, token, otp } = await authService.sendPhoneOTP(
      countryCode,
      phoneNumber
    );

    await sendVerificationSMS(countryCode + phoneNumber, otp)
      .then(() =>
        log.info(`Verification OTP sent to ${countryCode}${phoneNumber}`)
      )
      .catch((err) =>
        log.error(`Failed to send verification OTP: ${err.message}`)
      );

    return res
      .status(200)
      .json(
        successResponse(
          { token },
          `A verification code has been sent to ${countryCode}${phoneNumber}.`
        )
      );
  } catch (error) {
    log.error(`Error during phone verification request: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message:
            error.message === "Phone already verified"
              ? "This phone number is already verified."
              : "No account found with that phone number.",
        },
        400
      )
    );
  }
};

const verifyPhone = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Incoming phone verification attempt");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during phone verification");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid phone number or OTP.",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { countryCode, phoneNumber, otp, token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await authService.verifyPhoneOTP(decoded.userId, otp, token);

    log.info(`Phone verified for user: ${countryCode}${phoneNumber}`);
    return res
      .status(200)
      .json(
        successResponse(
          { phoneNumber: user.phoneNumber },
          "Phone number verified successfully!"
        )
      );
  } catch (error) {
    log.error(`Error during phone verification: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: "Invalid or expired verification code.",
        },
        400
      )
    );
  }
};

const googleAuth = async (req, res) => { 
  const log = createRequestLogger(req);
  log.info("Incoming Google auth request");
  console.log("Google auth request body:", req.body);
  

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during Goog auth");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid Google ID token.",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { idToken } = req.body;
    const ticket = await googleClient.verifyIdToken({
  idToken,
  audience: [
    process.env.GOOGLE_CLIENT_ID_WEB,
    process.env.GOOGLE_CLIENT_ID_IOS,
    process.env.GOOGLE_CLIENT_ID_ANDROID,
  ],
});

    const payload = ticket.getPayload();

    const user = await authService.googleAuth(payload);
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    const sanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    log.info(`Google auth successful for: ${sanitizedUser.email}`);
    return res
      .status(200)
      .json(
        successResponse(
          { user: sanitizedUser, token },
          "Google authentication successful! Welcome!"
        )
      );
  } catch (error) {
    log.error(`Error during Google auth: ${error.message}`);
    return res.status(401).json(
      errorResponse(
        {
          message: "Google authentication failed. Please try again.",
        },
        401
      )
    );
  }
};

const appleAuth = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Incoming Apple auth request");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during Apple auth");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid Apple ID token.",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { identityToken } = req.body;
    const {
      email,
      sub: appleId,
      given_name,
      family_name,
    } = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      nonce: undefined,
    });

    const user = await authService.appleAuth({
      email,
      appleId,
      given_name,
      family_name,
    });
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    const sanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    log.info(`Apple auth successful for: ${sanitizedUser.email}`);
    return res
      .status(200)
      .json(
        successResponse(
          { user: sanitizedUser, token },
          "Apple authentication successful! Welcome!"
        )
      );
  } catch (error) {
    log.error(`Error during Apple auth: ${error.message}`);
    return res.status(401).json(
      errorResponse(
        {
          message: "Apple authentication failed. Please try again.",
        },
        401
      )
    );
  }
};

export default  {
  register,
  login,
  logout,
  forgotPassword,
  verifyForgotPasswordToken,
  resetPassword,
  sendEmailVerification,
  verifyEmail,
  sendPhoneVerification,
  verifyPhone,
  googleAuth,
  appleAuth,
};
