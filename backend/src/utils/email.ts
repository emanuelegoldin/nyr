// Email utility for sending verification emails
// Spec: 01-authentication.md
import nodemailer from 'nodemailer';
import config from '../config';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: config.email.user && config.email.password ? {
    user: config.email.user,
    pass: config.email.password
  } : undefined
});

export const sendVerificationEmail = async (
  email: string,
  token: string,
  frontendUrl: string = process.env.FRONTEND_URL || 'http://localhost:5173'
): Promise<void> => {
  const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: 'Verify your NYR Bingo Account',
    html: `
      <h1>Welcome to NYR Bingo!</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, please ignore this email.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
};
