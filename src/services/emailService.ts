import nodemailer, { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('Email not configured - would send:', options.subject);
        return true; // Return true for development when email isn't configured
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
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  // Email Templates
  getWelcomeTemplate(userName: string, verificationToken: string): EmailTemplate {
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

  getPasswordResetTemplate(userName: string, resetToken: string): EmailTemplate {
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

  getOrderConfirmationTemplate(userName: string, orderNumber: string, orderTotal: number): EmailTemplate {
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

  // Helper methods for specific email types
  async sendWelcomeEmail(email: string, userName: string, verificationToken: string): Promise<boolean> {
    const template = this.getWelcomeTemplate(userName, verificationToken);
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  async sendPasswordResetEmail(email: string, userName: string, resetToken: string): Promise<boolean> {
    const template = this.getPasswordResetTemplate(userName, resetToken);
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  async sendOrderConfirmationEmail(email: string, userName: string, orderNumber: string, orderTotal: number): Promise<boolean> {
    const template = this.getOrderConfirmationTemplate(userName, orderNumber, orderTotal);
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
}

export const emailService = new EmailService();
export default emailService;