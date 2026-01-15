import * as crypto from 'crypto';
import { pool } from '../core/database.service';
import sgMail from '@sendgrid/mail';
import { config } from '../../config/env';

interface OTPRecord {
  id: string;
  email: string;
  otp_code: string;
  expires_at: Date;
  verified: boolean;
  created_at: Date;
}

class OTPService {
  constructor() {
    // Initialize SendGrid with API key
    if (config.email?.sendgridApiKey) {
      sgMail.setApiKey(config.email.sendgridApiKey);
    }
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async generateAndSendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Generate 6-digit OTP
      const otpCode = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      const query = `
        INSERT INTO otp_verifications (email, otp_code, expires_at)
        VALUES ($1, $2, $3)
        RETURNING id
      `;
      
      await pool.query(query, [email, otpCode, expiresAt]);

      // Send OTP via email
      await this.sendOtpEmail(email, otpCode);
      
      // Log OTP in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] OTP for ${email}: ${otpCode}`);
      }

      return {
        success: true,
        message: 'OTP sent successfully to your email address'
      };
    } catch (error) {
      console.error('Error generating OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.'
      };
    }
  }

  async verifyOTP(email: string, otpCode: string): Promise<{ success: boolean; message: string }> {
    try {
      const query = `
        SELECT * FROM otp_verifications 
        WHERE email = $1 AND otp_code = $2 AND expires_at > NOW() AND verified = FALSE
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [email, otpCode]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid or expired OTP code'
        };
      }

      // Mark OTP as verified
      const updateQuery = `
        UPDATE otp_verifications 
        SET verified = TRUE 
        WHERE id = $1
      `;
      
      await pool.query(updateQuery, [result.rows[0].id]);

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Failed to verify OTP. Please try again.'
      };
    }
  }

  async cleanupExpiredOTPs(): Promise<void> {
    try {
      const query = 'DELETE FROM otp_verifications WHERE expires_at < NOW()';
      await pool.query(query);
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }

  private async sendOtpEmail(email: string, otpCode: string): Promise<void> {
    try {
      if (!config.email?.sendgridApiKey) {
        console.warn('[WARNING] SendGrid API key not configured. OTP email not sent.');
        console.log(`[DEV] OTP Code for ${email}: ${otpCode}`);
        return;
      }

      const msg = {
        to: email,
        from: config.email.fromEmail || 'noreply@malwaredetection.com',
        subject: 'Your Khmer ML Verification Code',
        text: this.getOtpEmailText(otpCode),
        html: this.getOtpEmailHtml(otpCode),
      };

      await sgMail.send(msg);
      console.log(`[SUCCESS] OTP email sent to ${email}`);
    } catch (error: any) {
      console.error('[ERROR] Failed to send OTP email:', error.response?.body || error.message);
      // Don't throw error - allow signup to continue even if email fails
      // OTP is logged in development mode
    }
  }

  private getOtpEmailText(otpCode: string): string {
    return `
Your Khmer ML Verification Code

Hello,

Your verification code is: ${otpCode}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Khmer ML Team
    `;
  }

  private getOtpEmailHtml(otpCode: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #a31010 0%, #7a0c0c 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .otp-code { background: white; border: 2px solid #a31010; border-radius: 8px; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #a31010; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Khmer ML</h1>
    </div>
    <div class="content">
      <h2>Email Verification</h2>
      <p>Hello,</p>
      <p>Thank you for signing up! Please use the verification code below to complete your registration:</p>
      <div class="otp-code">${otpCode}</div>
      <p><strong>This code will expire in 10 minutes.</strong></p>
      <p>If you didn't request this code, please ignore this email.</p>
      <div class="footer">
        <p>Best regards,<br>Khmer ML Team</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  async isEmailVerified(email: string): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count FROM otp_verifications 
        WHERE email = $1 AND verified = TRUE
      `;
      
      const result = await pool.query(query, [email]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  }

  async resendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if there's a recent OTP (within 1 minute)
      const recentQuery = `
        SELECT COUNT(*) as count FROM otp_verifications 
        WHERE email = $1 AND created_at > NOW() - INTERVAL '1 minute'
      `;
      
      const recentResult = await pool.query(recentQuery, [email]);
      
      if (parseInt(recentResult.rows[0].count) > 0) {
        return {
          success: false,
          message: 'Please wait 1 minute before requesting a new OTP'
        };
      }

      return await this.generateAndSendOTP(email);
    } catch (error) {
      console.error('Error resending OTP:', error);
      return {
        success: false,
        message: 'Failed to resend OTP. Please try again.'
      };
    }
  }
}

export const otpService = new OTPService();

// Cleanup expired OTPs every hour
setInterval(() => {
  otpService.cleanupExpiredOTPs();
}, 60 * 60 * 1000);