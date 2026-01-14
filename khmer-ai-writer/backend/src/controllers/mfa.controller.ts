import { Request, Response } from 'express';
import { mfaService } from '../services/auth/mfa.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    tier: string;
  };
}

class MFAController {
  
  /**
   * Setup MFA for user
   */
  async setupMFA(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const email = req.user!.email;

      const result = await mfaService.setupMFA(userId, email);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          secret: result.secret,
          qrCode: result.qrCode,
          backupCodes: result.backupCodes
        },
        message: result.message
      });
    } catch (error: any) {
      console.error('Error setting up MFA:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to setup MFA'
      });
    }
  }

  /**
   * Verify and enable MFA
   */
  async verifyAndEnableMFA(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Verification code is required'
        });
      }

      const result = await mfaService.verifyAndEnableMFA(userId, code);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error verifying MFA:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify MFA'
      });
    }
  }

  /**
   * Verify MFA code during login
   */
  async verifyMFACode(req: Request, res: Response) {
    try {
      const { userId, code } = req.body;

      if (!userId || !code) {
        return res.status(400).json({
          success: false,
          message: 'User ID and code are required'
        });
      }

      const result = await mfaService.verifyMFACode(userId, code);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error verifying MFA code:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify MFA code'
      });
    }
  }

  /**
   * Disable MFA
   */
  async disableMFA(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required'
        });
      }

      const result = await mfaService.disableMFA(userId, password);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to disable MFA'
      });
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required'
        });
      }

      const result = await mfaService.regenerateBackupCodes(userId, password);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          backupCodes: result.backupCodes
        },
        message: result.message
      });
    } catch (error: any) {
      console.error('Error regenerating backup codes:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to regenerate backup codes'
      });
    }
  }

  /**
   * Get MFA status
   */
  async getMFAStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const isEnabled = await mfaService.isMFAEnabled(userId);

      return res.status(200).json({
        success: true,
        data: {
          mfaEnabled: isEnabled
        }
      });
    } catch (error: any) {
      console.error('Error getting MFA status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get MFA status'
      });
    }
  }
}

export default new MFAController();
