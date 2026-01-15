import { pool } from '../core/database.service';
import crypto from 'crypto';
import { emailService } from '../core/email.service';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Payment Service for handling subscription payments
 * Supports: Visa Card payments to "Menghout Chhon 4026 4503 0330 3902"
 */

interface PaymentRequest {
  userId: string;
  amount: number;
  tier: 'premium' | 'business';
  paymentMethod: 'visa' | 'bank_transfer' | 'khqr' | 'card' | 'KHQR' | 'COUPON' | 'coupon' | 'demo';
  cardNumber?: string;
  cardHolderName?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  couponCode?: string;
  discount?: number;
  billingCycle?: 'monthly' | 'annual';
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message: string;
  billingId?: string;
}

const TIER_PRICES = {
  free: 0,
  premium: 29.99,
  business: 99.99
};

const MERCHANT_CARD = {
  number: '4026450303303902',
  holder: 'Menghout Chhon'
};

class PaymentService {
  
  // Demo coupon codes
  private validCoupons: { [key: string]: number } = {
    'DEMO100': 100,  // 100% off for demo
    'WELCOME50': 50, // 50% off
    'SAVE20': 20     // 20% off
  };

  /**
   * Validate coupon code
   */
  validateCoupon(code: string): { valid: boolean; discount: number } {
    const upperCode = code.toUpperCase().trim();
    if (this.validCoupons[upperCode]) {
      return {
        valid: true,
        discount: this.validCoupons[upperCode]
      };
    }
    return { valid: false, discount: 0 };
  }
  
  /**
   * Process payment for tier upgrade
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      // Validate payment request
      const validation = this.validatePaymentRequest(request);
      
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message || 'Invalid payment request'
        };
      }

      // Generate transaction ID
      const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // Create billing record
      const billing = await this.createBillingRecord({
        userId: request.userId,
        amount: request.amount,
        transactionId,
        paymentMethod: request.paymentMethod,
        cardNumber: request.cardNumber ? this.maskCardNumber(request.cardNumber) : null,
        tierUpgrade: request.tier
      });

      // If 100% discount coupon, skip payment processing
      if (request.couponCode && request.discount === 100) {
        await this.updateBillingStatus(billing.id, 'completed');
        await this.upgradeUserTier(request.userId, request.tier);
        await this.createSubscription(request.userId, request.tier, request.amount);
        await this.logAudit(request.userId, 'coupon_upgrade', {
          transactionId,
          couponCode: request.couponCode,
          tier: request.tier
        });

        return {
          success: true,
          transactionId,
          billingId: billing.id,
          message: `Coupon applied! Your account has been upgraded to ${request.tier}.`
        };
      }

      // Process payment based on method
      if (request.paymentMethod === 'visa' || request.paymentMethod === 'card') {
        return await this.processVisaPayment(request, transactionId, billing.id);
      } else if (request.paymentMethod === 'bank_transfer') {
        return await this.processBankTransfer(request, transactionId, billing.id);
      } else if (request.paymentMethod === 'khqr' || request.paymentMethod === 'KHQR') {
        // Simulate KHQR payment (in production, integrate with KHQR gateway)
        await this.updateBillingStatus(billing.id, 'completed');
        await this.upgradeUserTier(request.userId, request.tier);
        await this.createSubscription(request.userId, request.tier, request.amount);
        await this.logAudit(request.userId, 'payment_success', {
          transactionId,
          amount: request.amount,
          tier: request.tier,
          method: 'KHQR'
        });

        return {
          success: true,
          transactionId,
          billingId: billing.id,
          message: `Payment successful! Your account has been upgraded to ${request.tier}.`
        };
      } else if (request.paymentMethod === 'COUPON' || request.paymentMethod === 'coupon' || request.paymentMethod === 'demo') {
        // Coupon payment (should already be handled above but add explicit case)
        await this.updateBillingStatus(billing.id, 'completed');
        await this.upgradeUserTier(request.userId, request.tier);
        await this.createSubscription(request.userId, request.tier, 0, request.billingCycle || 'monthly');
        await this.logAudit(request.userId, 'coupon_upgrade', {
          transactionId,
          couponCode: request.couponCode,
          tier: request.tier
        });

        const message = request.paymentMethod === 'demo'
          ? `Demo upgrade applied! Your account has been upgraded to ${request.tier}.`
          : `Coupon applied! Your account has been upgraded to ${request.tier}.`;

        return {
          success: true,
          transactionId,
          billingId: billing.id,
          message
        };
      }

      return {
        success: false,
        message: 'Unsupported payment method'
      };

    } catch (error: any) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        message: error.message || 'Payment processing failed'
      };
    }
  }

  /**
   * Demo upgrade helper when payments are disabled
   */
  async demoUpgrade(userId: string, tier: 'premium' | 'business', billingCycle: 'monthly' | 'annual' = 'monthly'): Promise<PaymentResult> {
    const transactionId = `DEMO-${Date.now()}`;
    try {
      // Create a completed billing record with zero amount
      const billing = await this.createBillingRecord({
        userId,
        amount: 0,
        transactionId,
        paymentMethod: 'demo',
        cardNumber: null,
        tierUpgrade: tier
      });
      await this.updateBillingStatus(billing.id, 'completed');

      // Apply upgrade and create a subscription
      await this.upgradeUserTier(userId, tier);
      await this.createSubscription(userId, tier, 0, billingCycle);

      return {
        success: true,
        transactionId,
        billingId: billing.id,
        message: `Demo upgrade applied: ${tier} plan activated`
      };
    } catch (error: any) {
      console.error('Demo upgrade failed:', error);
      return {
        success: false,
        message: error.message || 'Demo upgrade failed'
      };
    }
  }

  /**
   * Process Visa card payment
   */
  private async processVisaPayment(
    request: PaymentRequest,
    transactionId: string,
    billingId: string
  ): Promise<PaymentResult> {
    try {
      // Validate card number
      if (!request.cardNumber || !this.isValidCardNumber(request.cardNumber)) {
        await this.updateBillingStatus(billingId, 'failed');
        return {
          success: false,
          message: 'Invalid card number'
        };
      }

      // Validate CVV
      if (!request.cvv || request.cvv.length !== 3) {
        await this.updateBillingStatus(billingId, 'failed');
        return {
          success: false,
          message: 'Invalid CVV'
        };
      }

      // Validate expiry
      if (!this.isValidExpiry(request.expiryMonth || '', request.expiryYear || '')) {
        await this.updateBillingStatus(billingId, 'failed');
        return {
          success: false,
          message: 'Card has expired'
        };
      }

      // Simulate payment processing (in production, integrate with payment gateway)
      // For now, we'll simulate a successful payment
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing delay

      // Update billing status to completed
      await this.updateBillingStatus(billingId, 'completed');

      // Upgrade user tier
      await this.upgradeUserTier(request.userId, request.tier);

      // Create or update subscription
      await this.createSubscription(request.userId, request.tier, request.amount);

      // Log audit trail
      await this.logAudit(request.userId, 'payment_success', {
        transactionId,
        amount: request.amount,
        tier: request.tier
      });

      // Generate invoice
      const invoiceId = await this.createInvoice({
        userId: request.userId,
        billingId,
        transactionId,
        amount: request.amount,
        tier: request.tier,
        billingCycle: request.billingCycle || 'monthly'
      });

      // Send payment confirmation email
      await this.sendPaymentConfirmationEmail(request.userId, {
        transactionId,
        amount: request.amount,
        tier: request.tier,
        invoiceId
      });

      return {
        success: true,
        transactionId,
        billingId,
        message: `Payment successful! Your account has been upgraded to ${request.tier}.`
      };

    } catch (error: any) {
      await this.updateBillingStatus(billingId, 'failed');
      throw error;
    }
  }

  /**
   * Process bank transfer
   */
  private async processBankTransfer(
    request: PaymentRequest,
    transactionId: string,
    billingId: string
  ): Promise<PaymentResult> {
    // Bank transfers require manual verification
    await this.updateBillingStatus(billingId, 'pending');

    return {
      success: true,
      transactionId,
      billingId,
      message: `Bank transfer initiated. Please transfer $${request.amount} to:\nAccount: ${MERCHANT_CARD.holder}\nCard: ${MERCHANT_CARD.number}\nReference: ${transactionId}`
    };
  }

  /**
   * Create billing record in database
   */
  private async createBillingRecord(data: {
    userId: string;
    amount: number;
    transactionId: string;
    paymentMethod: string;
    cardNumber: string | null;
    tierUpgrade: string;
  }): Promise<{ id: string }> {
    const query = `
      INSERT INTO payment_history (
        id, user_id, amount, currency, status, payment_method, 
        transaction_id, description, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id
    `;

    const result = await pool.query(query, [
      crypto.randomUUID(),
      data.userId,
      data.amount,
      'USD',
      'pending',
      data.paymentMethod,
      data.transactionId,
      `Upgrade to ${data.tierUpgrade} tier`
    ]);

    return { id: result.rows[0].id };
  }

  /**
   * Update billing status
   */
  private async updateBillingStatus(billingId: string, status: string): Promise<void> {
    await pool.query(
      `UPDATE payment_history SET status = $1 WHERE id = $2`,
      [status, billingId]
    );
  }

  /**
   * Upgrade user tier and update usage limits
   */
  private async upgradeUserTier(userId: string, tier: string): Promise<void> {
    // Define tier limits
    const tierLimits = {
      free: {
        apiCalls: 100,
        storage: 1073741824 // 1 GB
      },
      premium: {
        apiCalls: 1000,
        storage: 10737418240 // 10 GB
      },
      business: {
        apiCalls: -1, // unlimited
        storage: 107374182400 // 100 GB
      }
    };

    const limits = tierLimits[tier as keyof typeof tierLimits] || tierLimits.free;

    await pool.query(
      `UPDATE users 
       SET tier = $1, 
           api_calls_limit = $2,
           storage_limit = $3,
           updated_at = NOW() 
       WHERE id = $4`,
      [tier, limits.apiCalls, limits.storage, userId]
    );

  }

  /**
   * Create or update subscription
   */
  private async createSubscription(userId: string, tier: string, amount: number, billingCycle: 'monthly' | 'annual' = 'monthly'): Promise<void> {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (billingCycle === 'annual' ? 12 : 1));

    // Check if subscription exists
    const existing = await pool.query(
      `SELECT id FROM subscriptions WHERE user_id = $1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      // Update existing - use 'plan' column to match actual database schema
      await pool.query(
        `UPDATE subscriptions 
         SET plan = $1, current_period_end = $2, amount = $3, billing_cycle = $4, updated_at = NOW(), status = 'active'
         WHERE user_id = $5`,
        [tier, endDate, amount, billingCycle, userId]
      );
    } else {
      // Insert new - use 'plan' column and match actual database schema
      await pool.query(
        `INSERT INTO subscriptions (
          id, user_id, plan, status, current_period_start, current_period_end, amount, currency, billing_cycle, created_at, updated_at
        )
        VALUES ($1, $2, $3, 'active', NOW(), $4, $5, 'USD', $6, NOW(), NOW())`,
        [crypto.randomUUID(), userId, tier, endDate, amount, billingCycle]
      );
    }
  }

  /**
   * Log audit event (optional - skipped if table doesn't exist)
   */
  private async logAudit(userId: string, action: string, details: any): Promise<void> {
    try {
      // Skip audit logging if table doesn't exist
      // In production, you'd create an audit_log table
    } catch (error) {
      // Silently fail if audit table doesn't exist
      console.warn('Audit logging skipped:', error);
    }
  }

  /**
   * Validate payment request
   */
  private validatePaymentRequest(request: PaymentRequest): { valid: boolean; message?: string } {
    if (!request.userId) {
      return { valid: false, message: 'User ID is required' };
    }

    if (!request.tier || !['premium', 'business'].includes(request.tier)) {
      return { valid: false, message: 'Invalid tier' };
    }

    // Accept all payment methods including KHQR and COUPON
    const validPaymentMethods = ['visa', 'bank_transfer', 'khqr', 'KHQR', 'card', 'COUPON', 'coupon', 'demo'];
    if (!request.paymentMethod || !validPaymentMethods.includes(request.paymentMethod)) {
      return { valid: false, message: 'Invalid payment method' };
    }

    // Skip amount validation if 100% discount coupon is applied or COUPON payment method
    const is100PercentDiscount = request.discount === 100 || request.paymentMethod === 'COUPON' || request.paymentMethod === 'coupon' || request.paymentMethod === 'demo';
    if (!is100PercentDiscount && !request.couponCode && request.amount !== TIER_PRICES[request.tier]) {
      return { valid: false, message: 'Invalid amount for selected tier' };
    }

    // Only validate card details for visa/card payments (not for COUPON or KHQR)
    if (request.paymentMethod === 'visa' || request.paymentMethod === 'card') {
      if (!request.cardNumber || !request.cvv || !request.expiryMonth || !request.expiryYear) {
        return { valid: false, message: 'Card details are incomplete' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate card number using Luhn algorithm
   */
  private isValidCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleaned)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate card expiry
   */
  private isValidExpiry(month: string, year: string): boolean {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const expMonth = parseInt(month);
    const expYear = parseInt(year.length === 2 ? `20${year}` : year);

    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;

    return true;
  }

  /**
   * Mask card number for security
   */
  private maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');
    return `**** **** **** ${cleaned.slice(-4)}`;
  }

  /**
   * Get user's billing history
   */
  async getBillingHistory(userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM payment_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get current subscription
   */
  async getSubscription(userId: string): Promise<any | null> {
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Set subscription to canceled but don't downgrade tier immediately
      // Tier will remain active until end of billing period
    await pool.query(
      `UPDATE subscriptions SET status = 'canceled', auto_renew = false, updated_at = NOW()
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

      return {
        success: true,
        message: 'Subscription will be canceled at the end of the current billing period'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to cancel subscription'
      };
    }
  }

  /**
   * Upgrade user tier with audit trail
   */
  async upgradeTier(userId: string, newTier: string, reason: string = 'upgrade'): Promise<{ success: boolean; message: string }> {
    try {
      // Get current tier
      const userResult = await pool.query('SELECT tier FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const oldTier = userResult.rows[0].tier;

      // Validate tier hierarchy
      const tierHierarchy = ['free', 'premium', 'business'];
      if (tierHierarchy.indexOf(newTier) <= tierHierarchy.indexOf(oldTier)) {
        return { success: false, message: 'Can only upgrade to higher tier' };
      }

      // Update user tier and limits using the centralized method
      await this.upgradeUserTier(userId, newTier);

      // Record tier change
      await pool.query(
        `INSERT INTO tier_changes (user_id, old_tier, new_tier, reason, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, oldTier, newTier, reason]
      );

      // Create team if upgrading to business
      if (newTier === 'business') {
        const teamExists = await pool.query('SELECT id FROM teams WHERE owner_id = $1', [userId]);
        if (teamExists.rows.length === 0) {
          await pool.query(
            `INSERT INTO teams (owner_id, name, member_limit, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [userId, 'My Team', 25]
          );
        }
      }

      return {
        success: true,
        message: `Successfully upgraded to ${newTier} tier`
      };
    } catch (error: any) {
      console.error('Upgrade tier error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upgrade tier'
      };
    }
  }

  /**
   * Downgrade user tier with cleanup
   */
  async downgradeTier(userId: string, newTier: string, reason: string = 'downgrade'): Promise<{ success: boolean; message: string }> {
    try {
      // Get current tier
      const userResult = await pool.query('SELECT tier FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const oldTier = userResult.rows[0].tier;

      // Validate tier hierarchy
      const tierHierarchy = ['free', 'premium', 'business'];
      if (tierHierarchy.indexOf(newTier) >= tierHierarchy.indexOf(oldTier)) {
        return { success: false, message: 'Can only downgrade to lower tier' };
      }

      // Handle team cleanup if downgrading to free
      if (newTier === 'free') {
        const teamResult = await pool.query('SELECT id FROM teams WHERE owner_id = $1', [userId]);
        if (teamResult.rows.length > 0) {
          const teamId = teamResult.rows[0].id;
          
          // Remove all team members
          await pool.query('DELETE FROM team_members WHERE team_id = $1', [teamId]);
          
          // Cancel pending invitations
          await pool.query(
            `UPDATE team_invitations SET status = 'expired' WHERE team_id = $1 AND status = 'pending'`,
            [teamId]
          );
          
          // Delete the team
          await pool.query('DELETE FROM teams WHERE id = $1', [teamId]);
        }
      }

      // Update user tier
      await pool.query(
        `UPDATE users SET 
           tier = $1, 
           tier_updated_at = NOW(), 
           updated_at = NOW(), 
           current_team_id = NULL,
           api_calls_limit = CASE 
             WHEN $3 = 'free' THEN 100
             WHEN $3 = 'premium' THEN 1000
             ELSE api_calls_limit
           END,
           storage_limit = CASE 
             WHEN $4 = 'free' THEN 1073741824
             WHEN $4 = 'premium' THEN 10737418240
             ELSE storage_limit
           END
         WHERE id = $5`,
        [newTier, newTier, newTier, userId]
      );

      // Record tier change
      await pool.query(
        `INSERT INTO tier_changes (user_id, old_tier, new_tier, reason, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, oldTier, newTier, reason]
      );

      // Update subscription status
      await pool.query(
        `UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
         WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      return {
        success: true,
        message: `Successfully downgraded to ${newTier} tier`
      };
    } catch (error: any) {
      console.error('Downgrade tier error:', error);
      return {
        success: false,
        message: error.message || 'Failed to downgrade tier'
      };
    }
  }

  /**
   * Create invoice record and generate PDF
   */
  private async createInvoice(data: {
    userId: string;
    billingId: string;
    transactionId: string;
    amount: number;
    tier: string;
    billingCycle: string;
  }): Promise<string> {
    try {
      // Get user details
      const userResult = await pool.query(
        'SELECT email, full_name FROM users WHERE id = $1',
        [data.userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      const invoiceId = `INV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const invoiceDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Create invoice record in database
      await pool.query(
        `INSERT INTO invoices (
          id, user_id, invoice_number, transaction_id, billing_id,
          amount, currency, status, tier, billing_cycle,
          invoice_date, due_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          crypto.randomUUID(),
          data.userId,
          invoiceId,
          data.transactionId,
          data.billingId,
          data.amount,
          'USD',
          'paid',
          data.tier,
          data.billingCycle,
          invoiceDate,
          dueDate
        ]
      );

      // Generate PDF invoice
      await this.generateInvoicePDF({
        invoiceId,
        transactionId: data.transactionId,
        customerName: user.full_name || user.email,
        customerEmail: user.email,
        amount: data.amount,
        tier: data.tier,
        billingCycle: data.billingCycle,
        invoiceDate,
        dueDate
      });

      return invoiceId;
    } catch (error) {
      console.error('Failed to create invoice:', error);
      throw error;
    }
  }

  /**
   * Generate PDF invoice
   */
  private async generateInvoicePDF(data: {
    invoiceId: string;
    transactionId: string;
    customerName: string;
    customerEmail: string;
    amount: number;
    tier: string;
    billingCycle: string;
    invoiceDate: Date;
    dueDate: Date;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create invoices directory if it doesn't exist
        const invoicesDir = path.join(__dirname, '../../../exports/invoices');
        if (!fs.existsSync(invoicesDir)) {
          fs.mkdirSync(invoicesDir, { recursive: true });
        }

        const filePath = path.join(invoicesDir, `${data.invoiceId}.pdf`);
        const doc = new PDFDocument({ margin: 50 });

        doc.pipe(fs.createWriteStream(filePath));

        // Header
        doc.fontSize(20).text('INVOICE', 50, 50, { align: 'center' });
        doc.fontSize(10).text(data.invoiceId, 50, 75, { align: 'center' });

        // Company Info
        doc.moveDown();
        doc.fontSize(12).text('Malware Detection Platform', 50, 120);
        doc.fontSize(10).text('Advanced AI-Powered Security', 50, 135);
        doc.text('support@malwaredetection.com', 50, 150);

        // Invoice Details
        doc.fontSize(10)
          .text(`Invoice Date: ${data.invoiceDate.toLocaleDateString()}`, 350, 120)
          .text(`Due Date: ${data.dueDate.toLocaleDateString()}`, 350, 135)
          .text(`Transaction ID: ${data.transactionId}`, 350, 150);

        // Customer Info
        doc.moveDown(2);
        doc.fontSize(12).text('Bill To:', 50, 200);
        doc.fontSize(10)
          .text(data.customerName, 50, 220)
          .text(data.customerEmail, 50, 235);

        // Invoice Items
        doc.moveDown(2);
        const tableTop = 300;
        doc.fontSize(10)
          .text('Description', 50, tableTop, { width: 250 })
          .text('Billing Cycle', 300, tableTop, { width: 100 })
          .text('Amount', 450, tableTop, { width: 100, align: 'right' });

        doc.moveTo(50, tableTop + 20)
          .lineTo(550, tableTop + 20)
          .stroke();

        const itemY = tableTop + 30;
        doc.text(`${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)} Plan`, 50, itemY, { width: 250 })
          .text(data.billingCycle.charAt(0).toUpperCase() + data.billingCycle.slice(1), 300, itemY, { width: 100 })
          .text(`$${data.amount.toFixed(2)}`, 450, itemY, { width: 100, align: 'right' });

        // Total
        doc.moveTo(50, itemY + 30)
          .lineTo(550, itemY + 30)
          .stroke();

        doc.fontSize(12)
          .text('Total:', 350, itemY + 45)
          .text(`$${data.amount.toFixed(2)}`, 450, itemY + 45, { width: 100, align: 'right' });

        // Status
        doc.fontSize(14)
          .fillColor('green')
          .text('PAID', 50, itemY + 80);

        // Footer
        doc.fontSize(8)
          .fillColor('gray')
          .text('Thank you for your business!', 50, 700, { align: 'center' })
          .text('For support, contact: support@malwaredetection.com', 50, 715, { align: 'center' });

        doc.end();

        doc.on('finish', () => resolve());
        doc.on('error', (err) => reject(err));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send payment confirmation email
   */
  private async sendPaymentConfirmationEmail(
    userId: string,
    data: {
      transactionId: string;
      amount: number;
      tier: string;
      invoiceId: string;
    }
  ): Promise<void> {
    try {
      const userResult = await pool.query(
        'SELECT email, full_name FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        console.error('User not found for payment confirmation email');
        return;
      }

      const user = userResult.rows[0];

      await emailService.sendPaymentConfirmation(
        user.email,
        user.full_name || user.email,
        {
          transactionId: data.transactionId,
          amount: data.amount,
          tier: data.tier,
          invoiceId: data.invoiceId
        }
      );
    } catch (error) {
      console.error('Failed to send payment confirmation email:', error);
      // Don't throw - email failure shouldn't fail the payment
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
