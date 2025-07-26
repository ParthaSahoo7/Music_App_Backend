const sendVerificationSMS = async (phoneNumber, verificationCode) => {
  const message = `Your verification code is: ${verificationCode}. It will expire in 5 minutes.`;
  
  // Assuming you have a function to send SMS
  return sendSMS(phoneNumber, message);
}

export { sendVerificationSMS }; // ✅ Use ESM export