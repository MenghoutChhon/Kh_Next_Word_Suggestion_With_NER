import * as crypto from 'crypto';
import { pool } from '../core/database.service';

/**
 * Multi-Factor Authentication Service
 * Implements TOTP (Time-based One-Time Password) for 2FA
 */

interface MFASetupResult {
  success: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  message: string;
}

interface MFAVerifyResult {
  success: boolean;
  message: string;
}

class MFAService {
  
  /**
   * Generate a secret key for TOTP
   */
  private generateSecret(): string {
    return crypto.randomBytes(20).toString('hex');
  }

  /**
   * Generate 8 backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code.match(/.{1,4}/g)?.join('-') || code);
    }
    return codes;
  }

  /**
   * Generate TOTP code from secret
   */
  private generateTOTP(secret: string, window: number = 0): string {
    const epoch = Math.floor(Date.now() / 1000 / 30) + window;
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    hmac.update(Buffer.from(epoch.toString(16).padStart(16, '0'), 'hex'));
    const hash = hmac.digest();
    
    const offset = hash[hash.length - 1] & 0xf;
    const binary = ((hash[offset] & 0x7f) << 24) |
                   ((hash[offset + 1] & 0xff) << 16) |
                   ((hash[offset + 2] & 0xff) << 8) |
                   (hash[offset + 3] & 0xff);
    
    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Generate QR code URL for authenticator apps
   */
  private generateQRCodeUrl(email: string, secret: string): string {
    const issuer = 'MalwareDetectionAI';
    const label = `${issuer}:${email}`;
    const params = new URLSearchParams({
      secret: secret,
      issuer: issuer,
      algorithm: 'SHA1',
      digits: '6',
      period: '30'
    });
    
    const otpauth = `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
    // For production, you'd use a QR code library or service
    // For now, return the otpauth URL that can be converted to QR
    return otpauth;
  }

  /**
   * Setup MFA for a user
   */
  async setupMFA(userId: string, email: string): Promise<MFASetupResult> {
    try {
      // Check if MFA is already enabled
      const checkQuery = 'SELECT two_factor_enabled FROM users WHERE id = $1';
      const checkResult = await pool.query(checkQuery, [userId]);
      
      if (checkResult.rows.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      if (checkResult.rows[0].two_factor_enabled) {
        return {
          success: false,
          message: 'MFA is already enabled for this account'
        };
      }

      // Generate secret and backup codes
      const secret = this.generateSecret();
      const backupCodes = this.generateBackupCodes();
      const qrCodeUrl = this.generateQRCodeUrl(email, secret);

      // Hash backup codes before storing
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => this.hashBackupCode(code))
      );

      // Store secret and backup codes (don't enable MFA yet - wait for verification)
      const updateQuery = `
        UPDATE users 
        SET two_factor_secret = $1, 
            mfa_backup_codes = $2,
            updated_at = NOW()
        WHERE id = $3
      `;
      
      await pool.query(updateQuery, [secret, JSON.stringify(hashedBackupCodes), userId]);

      return {
        success: true,
        secret,
        qrCode: qrCodeUrl,
        backupCodes,
        message: 'MFA setup initiated. Please verify with your authenticator app.'
      };
    } catch (error) {
      console.error('Error setting up MFA:', error);
      return {
        success: false,
        message: 'Failed to setup MFA. Please try again.'
      };
    }
  }

  /**
   * Verify and enable MFA
   */
  async verifyAndEnableMFA(userId: string, code: string): Promise<MFAVerifyResult> {
    try {
      // Get user's MFA secret
      const query = 'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1';
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const { two_factor_secret, two_factor_enabled } = result.rows[0];

      if (!two_factor_secret) {
        return {
          success: false,
          message: 'MFA setup not initiated. Please setup MFA first.'
        };
      }

      if (two_factor_enabled) {
        return {
          success: false,
          message: 'MFA is already enabled'
        };
      }

      // Verify the code
      const isValid = this.verifyTOTP(two_factor_secret, code);

      if (!isValid) {
        return {
          success: false,
          message: 'Invalid verification code'
        };
      }

      // Enable MFA
      const enableQuery = 'UPDATE users SET two_factor_enabled = TRUE, updated_at = NOW() WHERE id = $1';
      await pool.query(enableQuery, [userId]);

      return {
        success: true,
        message: 'MFA enabled successfully'
      };
    } catch (error) {
      console.error('Error verifying MFA:', error);
      return {
        success: false,
        message: 'Failed to verify MFA code. Please try again.'
      };
    }
  }

  /**
   * Verify TOTP code
   */
  private verifyTOTP(secret: string, code: string): boolean {
    // Check current window and +/- 1 window (90 seconds total)
    for (let window = -1; window <= 1; window++) {
      const validCode = this.generateTOTP(secret, window);
      if (validCode === code) {
        return true;
      }
    }
    return false;
  }

  /**
   * Verify MFA code during login
   */
  async verifyMFACode(userId: string, code: string): Promise<MFAVerifyResult> {
    try {
      // Get user's MFA secret
      const query = 'SELECT two_factor_secret, two_factor_enabled, mfa_backup_codes FROM users WHERE id = $1';
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const { two_factor_secret, two_factor_enabled, mfa_backup_codes } = result.rows[0];

      if (!two_factor_enabled) {
        return {
          success: false,
          message: 'MFA is not enabled for this account'
        };
      }

      // Try TOTP verification first
      const isTOTPValid = this.verifyTOTP(two_factor_secret, code);
      
      if (isTOTPValid) {
        return {
          success: true,
          message: 'MFA verification successful'
        };
      }

      // Try backup code verification
      if (mfa_backup_codes) {
        const backupCodes = JSON.parse(mfa_backup_codes);
        const isBackupCodeValid = await this.verifyBackupCode(userId, code, backupCodes);
        
        if (isBackupCodeValid) {
          return {
            success: true,
            message: 'MFA verification successful (backup code used)'
          };
        }
      }

      return {
        success: false,
        message: 'Invalid MFA code'
      };
    } catch (error) {
      console.error('Error verifying MFA code:', error);
      return {
        success: false,
        message: 'Failed to verify MFA code. Please try again.'
      };
    }
  }

  /**
   * Hash backup code
   */
  private async hashBackupCode(code: string): Promise<string> {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(code.replace(/-/g, ''), salt);
  }

  /**
   * Verify and consume backup code
   */
  private async verifyBackupCode(
    userId: string, 
    code: string, 
    hashedCodes: string[]
  ): Promise<boolean> {
    const bcrypt = require('bcryptjs');
    const cleanCode = code.replace(/-/g, '').toUpperCase();

    for (let i = 0; i < hashedCodes.length; i++) {
      const isValid = await bcrypt.compare(cleanCode, hashedCodes[i]);
      if (isValid) {
        // Remove used backup code
        hashedCodes.splice(i, 1);
        
        // Update database
        const updateQuery = `
          UPDATE users 
          SET mfa_backup_codes = $1, updated_at = NOW() 
          WHERE id = $2
        `;
        await pool.query(updateQuery, [JSON.stringify(hashedCodes), userId]);
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * Disable MFA
   */
  async disableMFA(userId: string, password: string): Promise<MFAVerifyResult> {
    try {
      // Verify password
      const bcrypt = require('bcryptjs');
      const query = 'SELECT password_hash FROM users WHERE id = $1';
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const isPasswordValid = await bcrypt.compare(password, result.rows[0].password_hash);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid password'
        };
      }

      // Disable MFA and clear secrets
      const disableQuery = `
        UPDATE users 
        SET two_factor_enabled = FALSE, 
            two_factor_secret = NULL, 
            mfa_backup_codes = NULL,
            updated_at = NOW()
        WHERE id = $1
      `;
      
      await pool.query(disableQuery, [userId]);

      return {
        success: true,
        message: 'MFA disabled successfully'
      };
    } catch (error) {
      console.error('Error disabling MFA:', error);
      return {
        success: false,
        message: 'Failed to disable MFA. Please try again.'
      };
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, password: string): Promise<{
    success: boolean;
    backupCodes?: string[];
    message: string;
  }> {
    try {
      // Verify password
      const bcrypt = require('bcryptjs');
      const query = 'SELECT password_hash, two_factor_enabled FROM users WHERE id = $1';
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      if (!result.rows[0].two_factor_enabled) {
        return {
          success: false,
          message: 'MFA is not enabled'
        };
      }

      const isPasswordValid = await bcrypt.compare(password, result.rows[0].password_hash);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid password'
        };
      }

      // Generate new backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => this.hashBackupCode(code))
      );

      // Update database
      const updateQuery = `
        UPDATE users 
        SET mfa_backup_codes = $1, updated_at = NOW() 
        WHERE id = $2
      `;
      
      await pool.query(updateQuery, [JSON.stringify(hashedBackupCodes), userId]);

      return {
        success: true,
        backupCodes,
        message: 'Backup codes regenerated successfully'
      };
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      return {
        success: false,
        message: 'Failed to regenerate backup codes. Please try again.'
      };
    }
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      const query = 'SELECT two_factor_enabled FROM users WHERE id = $1';
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return false;
      }

      return result.rows[0].two_factor_enabled || false;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  }
}

export const mfaService = new MFAService();
