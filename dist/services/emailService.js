"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    async sendEmail(options) {
        try {
            if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.log('Email not configured - would send:', options.subject);
                return true;
            }
            const mailOptions = {
                from: `"UDEH GLOBAL" <${process.env.SMTP_USER}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text || options.subject,
            };
            await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully to:', options.to);
            return true;
        }
        catch (error) {
            console.error('Email sending failed:', error);
            return false;
        }
    }
    getWelcomeTemplate(userName, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
        return {
            subject: 'Welcome to UDEH GLOBAL - Verify Your Email',
            html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">Welcome to UDEH GLOBAL!</h2>
          <p>Hi ${userName},</p>
          <p>Thank you for joining UDEH GLOBAL. To complete your registration, please verify your email address.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Verify Email Address
            </a>
          </div>
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <p>Best regards,<br>The UDEH GLOBAL Team</p>
        </div>
      `,
            text: `Welcome to UDEH GLOBAL! Please verify your email by visiting: ${verificationUrl}`
        };
    }
    getPasswordResetTemplate(userName, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        return {
            subject: 'Reset Your UDEH GLOBAL Password',
            html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi ${userName},</p>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>The UDEH GLOBAL Team</p>
        </div>
      `,
            text: `Reset your password by visiting: ${resetUrl}`
        };
    }
    getOrderConfirmationTemplate(userName, orderNumber, orderTotal) {
        return {
            subject: `Order Confirmation #${orderNumber} - UDEH GLOBAL`,
            html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">Order Confirmed!</h2>
          <p>Hi ${userName},</p>
          <p>Thank you for your order. We're getting your items ready for shipment.</p>
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0;">Order #${orderNumber}</h3>
            <p style="margin: 0;"><strong>Total: $${orderTotal.toFixed(2)}</strong></p>
          </div>
          <p>You'll receive tracking information once your order ships.</p>
          <p>Best regards,<br>The UDEH GLOBAL Team</p>
        </div>
      `,
            text: `Your order #${orderNumber} has been confirmed. Total: $${orderTotal.toFixed(2)}`
        };
    }
    async sendWelcomeEmail(email, userName, verificationToken) {
        const template = this.getWelcomeTemplate(userName, verificationToken);
        return this.sendEmail({
            to: email,
            subject: template.subject,
            html: template.html,
            text: template.text
        });
    }
    async sendPasswordResetEmail(email, userName, resetToken) {
        const template = this.getPasswordResetTemplate(userName, resetToken);
        return this.sendEmail({
            to: email,
            subject: template.subject,
            html: template.html,
            text: template.text
        });
    }
    async sendOrderConfirmationEmail(email, userName, orderNumber, orderTotal) {
        const template = this.getOrderConfirmationTemplate(userName, orderNumber, orderTotal);
        return this.sendEmail({
            to: email,
            subject: template.subject,
            html: template.html,
            text: template.text
        });
    }
}
exports.emailService = new EmailService();
exports.default = exports.emailService;
