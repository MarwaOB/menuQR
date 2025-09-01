const nodemailer = require('nodemailer');

// Email service configuration
class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.initializeTransporter();
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeTransporter();
    }
  }

  async initializeTransporter() {
    // Configure email transporter based on environment
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Production configuration - send real emails
      console.log('🚀 Configuring REAL email delivery via SMTP');
      
      // Try Gmail first, then fallback to generic SMTP
      const isGmail = process.env.EMAIL_USER.includes('@gmail.com');
      
      if (isGmail) {
        console.log('📧 Using Gmail SMTP configuration');
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      } else {
        console.log('📧 Using generic SMTP configuration');
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });
      }
    } else {
      // Development configuration using Ethereal Email (fake SMTP service for testing)
      try {
        // Create test account dynamically for development
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        console.log('✅ Ethereal Email test account created for development');
        console.log('📧 Test email credentials:', testAccount.user);
      } catch (error) {
        console.error('❌ Failed to create Ethereal test account, using fallback configuration');
        // Fallback to a simple configuration for development
        this.transporter = nodemailer.createTransport({
          host: 'localhost',
          port: 1025,
          ignoreTLS: true,
          auth: false
        });
      }
    }
    this.isInitialized = true;
  }

  async sendPasswordResetEmail(email, restaurantName, resetToken) {
    await this.ensureInitialized();
    try {
      // Create reset URL using environment variable or default to local network IP
      const frontendUrl = process.env.FRONTEND_URL || 'http://192.168.1.105:5173';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'MenuQR <noreply@menuqr.com>',
        to: email,
        subject: 'Password Reset Request - MenuQR',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Password Reset Request</h2>
            
            <p>Hello ${restaurantName},</p>
            
            <p>We received a request to reset your password for your MenuQR account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
            
            <p><strong>This link will expire in 1 hour.</strong></p>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            
            <p style="color: #6b7280; font-size: 12px;">
              This email was sent by MenuQR. If you have any questions, please contact our support team.
            </p>
          </div>
        `,
        text: `
          Password Reset Request - MenuQR
          
          Hello ${restaurantName},
          
          We received a request to reset your password for your MenuQR account.
          
          Please click the following link to reset your password:
          ${resetUrl}
          
          This link will expire in 1 hour.
          
          If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('Password reset email sent successfully:', info.messageId);
      
      // Check if we're using real email service or test service
      const isRealEmail = process.env.EMAIL_USER && process.env.EMAIL_PASS;
      
      if (!isRealEmail) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
      
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: !isRealEmail ? nodemailer.getTestMessageUrl(info) : null
      };
      
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(email, restaurantName) {
    await this.ensureInitialized();
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'MenuQR <noreply@menuqr.com>',
        to: email,
        subject: 'Welcome to MenuQR!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Welcome to MenuQR!</h2>
            
            <p>Hello ${restaurantName},</p>
            
            <p>Welcome to MenuQR! Your account has been successfully created.</p>
            
            <p>You can now:</p>
            <ul>
              <li>Create and manage your digital menus</li>
              <li>Generate QR codes for easy customer access</li>
              <li>Track orders and analytics</li>
              <li>Customize your restaurant profile</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                 style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Get Started
              </a>
            </div>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Thank you for choosing MenuQR!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            
            <p style="color: #6b7280; font-size: 12px;">
              This email was sent by MenuQR. If you have any questions, please contact our support team.
            </p>
          </div>
        `,
        text: `
          Welcome to MenuQR!
          
          Hello ${restaurantName},
          
          Welcome to MenuQR! Your account has been successfully created.
          
          You can now create and manage your digital menus, generate QR codes, track orders, and more.
          
          Visit ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login to get started.
          
          Thank you for choosing MenuQR!
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
      
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw error for welcome email failure - it's not critical
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create and export a singleton instance
const emailService = new EmailService();
module.exports = emailService;
