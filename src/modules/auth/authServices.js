// const UserAuth = require('../../models/UserAuth');
// const UserProfile = require('../../models/UserProfile');
// const PasswordVerificationToken = require('../../models/PasswordResetToken')
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const { sendVerificationSMS } = require('../../utils/smsServices');
// const { sendVerificationEmail, sendPasswordResetEmail } = require('../../utils/emailServices');

import UserAuth from '../../models/UserAuth.js';
import UserProfile from '../../models/UserProfile.js';
import PasswordVerificationToken from '../../models/PasswordResetToken.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendVerificationSMS } from '../../utils/smsServices.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../utils/emailServices.js';  

const generate6DigitToken = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const savePasswordVerificationToken = async (userId, token) => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await PasswordVerificationToken.findOneAndUpdate(
    { userId },
    { token, expiresAt },
    { upsert: true, new: true }
  );
};

const registerUser = async (userData) => {
    const user = new UserAuth(userData);
    await user.save();

    const profile = new UserProfile({ userId: user._id });
    await profile.save();

    return user;
};

const loginUser = async ({ email, password }) => {
    const user = await UserAuth.findOne({ email, isDeleted: false, isBan: false });
    if (!user) {
        throw new Error('Invalid credentials');
    }
    if (!(await user.matchPassword(password))) {
        throw new Error('Invalid credentials');
    }
    if (!user.isEmailVerified) {
        throw new Error('Email not verified');
    }
    return user;
};

const forgotPassword = async (email) => {
    const user = await UserAuth.findOne({ email, isDeleted: false });
    if (!user) {
        throw new Error('User not found');
    }
    const resetToken = generate6DigitToken();
    await savePasswordVerificationToken(user.id, resetToken);

    return { user, resetToken };
};

const resetPassword = async (email, newPassword) => {
    const user = await UserAuth.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }

    user.password = newPassword;

    await user.save();
    return user;
};


const sendEmailOTP = async (email) => {
    const user = await UserAuth.findOne({ email, isDeleted: false });
    if (!user) {
        throw new Error('User not found');
    }
    if (user.isEmailVerified) {
        throw new Error('Email already verified');
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = jwt.sign(
        { userId: user._id, otp },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );
    return { user, token, otp };
};

const verifyEmailOTP = async (userId, otp, token) => {
    const user = await UserAuth.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.otp !== otp) {
            throw new Error('Invalid OTP');
        }
        user.isEmailVerified = true;
        await user.save();
        return user;
    } catch (error) {
        throw new Error('Invalid or expired OTP');
    }
};

const sendPhoneOTP = async (countryCode, phoneNumber) => {
    const user = await UserAuth.findOne({ countryCode, phoneNumber, isDeleted: false });
    if (!user) {
        throw new Error('User not found');
    }
    if (user.isPhoneVerified) {
        throw new Error('Phone already verified');
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = jwt.sign(
        { userId: user._id, otp },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );
    return { user, token, otp };
};

const verifyPhoneOTP = async (userId, otp, token) => {
    const user = await UserAuth.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.otp !== otp) {
            throw new Error('Invalid OTP');
        }
        user.isPhoneVerified = true;
        await user.save();
        return user;
    } catch (error) {
        throw new Error('Invalid or expired OTP');
    }
};

const googleAuth = async (googleProfile) => {
    let user = await UserAuth.findOne({ email: googleProfile.email, isDeleted: false });
    if (!user) {
        const username = googleProfile.email.split('@')[0].toLowerCase();
        user = new UserAuth({
            username,
            email: googleProfile.email,
            firstName: googleProfile.given_name,
            lastName: googleProfile.family_name,
            isEmailVerified: true,
            password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10)
        });
        await user.save();
        await new UserProfile({ userId: user._id }).save();
    }
    return user;
};

const appleAuth = async (appleProfile) => {
    let user = await UserAuth.findOne({ email: appleProfile.email, isDeleted: false });
    if (!user) {
        const username = appleProfile.email.split('@')[0].toLowerCase();
        user = new UserAuth({
            username,
            email: appleProfile.email,
            firstName: appleProfile.given_name || '',
            lastName: appleProfile.family_name || '',
            isEmailVerified: true,
            password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10)
        });
        await user.save();
        await new UserProfile({ userId: user._id }).save();
    }
    return user;
};


export default {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    sendEmailOTP,
    verifyEmailOTP,
    sendPhoneOTP,
    verifyPhoneOTP,
    googleAuth,
    appleAuth   
};