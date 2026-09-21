const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    logger.info(`Ethereal email test account created: ${testAccount.user}`);
  } else {
    transporter = nodemailer.createTransport(env.SMTP_URL);
  }
  return transporter;
}

async function sendEmail(options) {
  try {
    const mailer = await getTransporter();
    const info = await mailer.sendMail({
      from: env.EMAIL_FROM || '"SaaS Notes" <noreply@example.com>',
      ...options
    });
    
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`Email sent: ${info.messageId}`);
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (err) {
    logger.error(`Failed to send email: ${err.message}`);
  }
}

exports.sendVerificationEmail = async (to, token, name) => {
  const link = `http://localhost:${env.PORT || 3000}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: 'Verify your email',
    html: `<p>Hi ${name || 'there'},</p><p>Please verify your email by clicking the link below:</p><p><a href="${link}">${link}</a></p>`
  });
};

exports.sendPasswordResetEmail = async (to, token, name) => {
  const link = `http://localhost:${env.PORT || 3000}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: 'Password Reset Request',
    html: `<p>Hi ${name || 'there'},</p><p>You requested a password reset. Click the link below to reset your password. The link expires in 1 hour.</p><p><a href="${link}">${link}</a></p>`
  });
};

exports.sendInviteEmail = async (to, tenantName, token, name) => {
  const link = `http://localhost:${env.PORT || 3000}/accept-invite?token=${token}`;
  await sendEmail({
    to,
    subject: `You have been invited to ${tenantName}`,
    html: `<p>Hi ${name || 'there'},</p><p>You have been invited to join the workspace <strong>${tenantName}</strong>. Click the link below to accept the invitation:</p><p><a href="${link}">${link}</a></p>`
  });
};
