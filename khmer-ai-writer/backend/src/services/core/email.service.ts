import sgMail from '@sendgrid/mail';
import { config } from '../../config/env';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

class EmailService {
  constructor() {
    // Initialize SendGrid with API key
    if (config.email?.sendgridApiKey) {
      sgMail.setApiKey(config.email.sendgridApiKey);
    }
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!config.email?.sendgridApiKey) {
        console.warn('[WARNING] SendGrid API key not configured. Email not sent.');
      return true; // Return true in dev mode
      }

      const msg: any = {
        to: options.to,
        from: {
          email: config.email.fromEmail || 'noreply@malwaredetection.com',
          name: config.email.fromName || 'Khmer ML'
        },
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      // Add reply-to if configured
      if (config.email.replyTo) {
        msg.replyTo = config.email.replyTo;
      }

      await sgMail.send(msg);
      return true;
    } catch (error: any) {
      console.error('[ERROR] Failed to send email:', error.response?.body || error);
      if (error.response?.body?.errors) {
        console.error('[ERROR] SendGrid errors:', JSON.stringify(error.response.body.errors, null, 2));
        console.error('[INFO] Please verify your sender email at: https://app.sendgrid.com/settings/sender_auth/senders');
      }
      return false;
    }
  }

  /**
   * Send team invitation email
   */
  async sendTeamInvitation(
    email: string,
    teamName: string,
    inviterName: string,
    role: string,
    token: string
  ): Promise<boolean> {
    const acceptUrl = `${config.app?.frontendUrl || 'http://localhost:3001'}/invitations/accept?token=${token}`;
    
    const text = `
Hello,

You have been invited to join the team "${teamName}" on Khmer ML.

Invited by: ${inviterName}
Your role: ${role.charAt(0).toUpperCase() + role.slice(1)}

To accept this invitation, click the link below:
${acceptUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

Best regards,
Khmer ML Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Team Invitation</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      
      <p>You have been invited to join the team <strong>"${teamName}"</strong> on Khmer ML.</p>
      
      <div class="info-box">
        <p><strong>Invited by:</strong> ${inviterName}</p>
        <p><strong>Your role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
        <p><strong>Expires:</strong> 7 days from now</p>
      </div>
      
      <p>To accept this invitation, click the button below:</p>
      
      <a href="${acceptUrl}" class="button">Accept Invitation</a>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea;">${acceptUrl}</p>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Khmer ML. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: email, subject: `Invitation to join ${teamName}`, text, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    userName: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${config.app?.frontendUrl || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
    
    const text = `
Hello ${userName},

You requested to reset your password for Khmer ML.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email and your password will remain unchanged.

For security reasons, never share this link with anyone.

Best regards,
Khmer ML Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello ${userName},</p>
      
      <p>You requested to reset your password for Khmer ML.</p>
      
      <p>Click the button below to reset your password:</p>
      
      <a href="${resetUrl}" class="button">Reset Password</a>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
      
      <div class="alert-box">
        <p><strong>⏱️ Important:</strong> This link will expire in 1 hour.</p>
      </div>
      
      <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
      
      <p style="color: #dc3545; font-weight: bold;">⚠️ For security reasons, never share this link with anyone.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Khmer ML. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ 
      to: email, 
      subject: 'Reset Your Password - Khmer ML', 
      text, 
      html 
    });
  }

  /**
   * Send password change confirmation email
   */
  async sendPasswordChangeConfirmation(email: string, userName: string): Promise<boolean> {
    const text = `
Hello ${userName},

Your password has been successfully changed.

If you did not make this change, please contact our support team immediately and secure your account.

Time of change: ${new Date().toLocaleString()}

Best regards,
Khmer ML Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 Password Changed</h1>
    </div>
    <div class="content">
      <p>Hello ${userName},</p>
      
      <div class="success-box">
        <p><strong>✅ Your password has been successfully changed.</strong></p>
        <p>Time of change: ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="alert-box">
        <p><strong>⚠️ Security Notice</strong></p>
        <p>If you did not make this change, please contact our support team immediately and secure your account.</p>
      </div>
      
      <p>For your security, we recommend:</p>
      <ul>
        <li>Using a strong, unique password</li>
        <li>Enabling two-factor authentication</li>
        <li>Not sharing your password with anyone</li>
      </ul>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Khmer ML. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: email, subject: 'Password Changed Successfully', text, html });
  }

  /**
   * Send account deletion confirmation email
   */
  async sendAccountDeletionConfirmation(email: string, userName: string): Promise<boolean> {
    const text = `
Hello ${userName},

Your account has been successfully deleted from Khmer ML.

All your data has been permanently removed from our systems:
- User profile and settings
- Scan history and reports
- API keys and usage data
- Team memberships (if any)
- Billing information

If you deleted your account by mistake or wish to return, you can create a new account at any time.

We're sorry to see you go. If you have any feedback about why you left, we'd love to hear from you.

Time of deletion: ${new Date().toLocaleString()}

Best regards,
Khmer ML Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👋 Account Deleted</h1>
    </div>
    <div class="content">
      <p>Hello ${userName},</p>
      
      <p>Your account has been successfully deleted from Khmer ML.</p>
      
      <div class="info-box">
        <p><strong>Data Removed:</strong></p>
        <ul>
          <li>User profile and settings</li>
          <li>Scan history and reports</li>
          <li>API keys and usage data</li>
          <li>Team memberships (if any)</li>
          <li>Billing information</li>
        </ul>
        <p><strong>Time of deletion:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <p>We're sorry to see you go! 😢</p>
      
      <p>If you deleted your account by mistake or wish to return, you can create a new account at any time.</p>
      
      <p>If you have any feedback about why you left, we'd love to hear from you. Your input helps us improve our service.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Khmer ML. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: email, subject: 'Account Deleted - We\'ll Miss You', text, html });
  }

  /**
   * Send welcome email for new users
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const text = `
Welcome to Khmer ML, ${userName}!

Thank you for joining us. We're excited to have you on board!

With Khmer ML, you can:
- Scan files and URLs for threats
- Get detailed threat analysis reports
- Access real-time monitoring
- Use our powerful API (Premium/Business)

Getting Started:
1. Complete your profile in Settings
2. Try your first generation
3. Explore our dashboard and features

Need help? Check out our documentation or contact support.

Best regards,
Khmer ML Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .feature-box { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Khmer ML!</h1>
    </div>
    <div class="content">
      <p>Hello ${userName},</p>
      
      <p>Thank you for joining us. We're excited to have you on board! 🚀</p>
      
      <h3>What You Can Do:</h3>
      <div class="feature-box">
        <strong>🔍 Scan files and URLs</strong> - Advanced AI-powered threat detection
      </div>
      <div class="feature-box">
        <strong>📊 Detailed Reports</strong> - Get comprehensive threat analysis
      </div>
      <div class="feature-box">
        <strong>📈 Real-time Monitoring</strong> - Track your security metrics
      </div>
      <div class="feature-box">
        <strong>🔌 Powerful API</strong> - Integrate with your workflow (Premium/Business)
      </div>
      
      <h3>Getting Started:</h3>
      <ol>
        <li>Complete your profile in Settings</li>
        <li>Try your first generation</li>
        <li>Explore our dashboard and features</li>
      </ol>
      
      <p>Need help? We're here for you! Check out our documentation or contact support.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Khmer ML. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: email, subject: 'Welcome to Khmer ML! 🎉', text, html });
  }

  /**
   * Send member removed notification
   */
  async sendMemberRemovedNotification(
    email: string,
    userName: string,
    teamName: string,
    removedBy: string
  ): Promise<boolean> {
    const text = `
Hello ${userName},

You have been removed from the team "${teamName}" on Khmer ML.

Removed by: ${removedBy}
Time: ${new Date().toLocaleString()}

You will no longer have access to this team's resources and data.

If you believe this was done in error, please contact the team owner.

Best regards,
Khmer ML Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚫 Removed from Team</h1>
    </div>
    <div class="content">
      <p>Hello ${userName},</p>
      
      <p>You have been removed from the team <strong>"${teamName}"</strong> on Khmer ML.</p>
      
      <div class="info-box">
        <p><strong>Removed by:</strong> ${removedBy}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <p>You will no longer have access to this team's resources and data.</p>
      
      <p>If you believe this was done in error, please contact the team owner.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Khmer ML. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: email, subject: `Removed from team: ${teamName}`, text, html });
  }

  /**
   * Send role change notification
   */
  async sendRoleChangeNotification(
    email: string,
    userName: string,
    teamName: string,
    oldRole: string,
    newRole: string,
    changedBy: string
  ): Promise<boolean> {
    const text = `
Hello ${userName},

Your role in the team "${teamName}" has been changed.

Previous role: ${oldRole.charAt(0).toUpperCase() + oldRole.slice(1)}
New role: ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}
Changed by: ${changedBy}
Time: ${new Date().toLocaleString()}

Your permissions have been updated according to your new role.

Best regards,
Khmer ML Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👤 Role Changed</h1>
    </div>
    <div class="content">
      <p>Hello ${userName},</p>
      
      <p>Your role in the team <strong>"${teamName}"</strong> has been changed.</p>
      
      <div class="info-box">
        <p><strong>Previous role:</strong> ${oldRole.charAt(0).toUpperCase() + oldRole.slice(1)}</p>
        <p><strong>New role:</strong> ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}</p>
        <p><strong>Changed by:</strong> ${changedBy}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <p>Your permissions have been updated according to your new role.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Khmer ML. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: email, subject: `Your role in ${teamName} has changed`, text, html });
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(
    email: string,
    userName: string,
    paymentDetails: {
      transactionId: string;
      amount: number;
      tier: string;
      invoiceId: string;
    }
  ): Promise<boolean> {
    const text = `
Hello ${userName},

Thank you for your payment! Your subscription has been successfully upgraded.

Payment Details:
- Transaction ID: ${paymentDetails.transactionId}
- Invoice Number: ${paymentDetails.invoiceId}
- Amount: $${paymentDetails.amount.toFixed(2)} USD
- Plan: ${paymentDetails.tier.charAt(0).toUpperCase() + paymentDetails.tier.slice(1)}
- Date: ${new Date().toLocaleString()}

Your account has been upgraded and you now have access to all ${paymentDetails.tier} features!

You can download your invoice from your account dashboard.

If you have any questions, please don't hesitate to contact our support team.

Best regards,
Khmer ML Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .success-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
    .info-box { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Payment Successful!</h1>
    </div>
    <div class="content">
      <div style="text-align: center;">
        <div class="success-badge">Payment Confirmed</div>
      </div>
      
      <p>Hello ${userName},</p>
      <p>Thank you for your payment! Your subscription has been successfully upgraded.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #10b981;">Payment Details</h3>
        <div class="detail-row">
          <strong>Transaction ID:</strong>
          <span>${paymentDetails.transactionId}</span>
        </div>
        <div class="detail-row">
          <strong>Invoice Number:</strong>
          <span>${paymentDetails.invoiceId}</span>
        </div>
        <div class="detail-row">
          <strong>Amount:</strong>
          <span>$${paymentDetails.amount.toFixed(2)} USD</span>
        </div>
        <div class="detail-row">
          <strong>Plan:</strong>
          <span>${paymentDetails.tier.charAt(0).toUpperCase() + paymentDetails.tier.slice(1)}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <strong>Date:</strong>
          <span>${new Date().toLocaleString()}</span>
        </div>
      </div>
      
      <p style="background: #ecfdf5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        🎉 <strong>Your account has been upgraded!</strong><br>
        You now have access to all ${paymentDetails.tier} features.
      </p>
      
      <p>You can download your invoice from your account dashboard at any time.</p>
      
      <p>If you have any questions or concerns, please don't hesitate to contact our support team at <a href="mailto:support@malwaredetection.com">support@malwaredetection.com</a>.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Khmer ML. All rights reserved.</p>
      <p>This is an automated receipt for your payment.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ 
      to: email, 
      subject: `Payment Confirmed - Invoice ${paymentDetails.invoiceId}`, 
      text, 
      html 
    });
  }
}

export const emailService = new EmailService();
