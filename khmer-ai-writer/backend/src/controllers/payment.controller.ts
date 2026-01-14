import { Request, Response } from 'express';
import { paymentService } from '../services/payment/payment.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    userId?: string;
    email: string;
    tier: string;
    role?: string;
  };
}

class PaymentController {
  private paymentsEnabled() {
    return process.env.ENABLE_PAYMENTS === 'true';
  }

  private demoDisabledResponse(res: Response) {
    return res.status(503).json({
      success: false,
      message: 'Payments are disabled in this environment. This feature requires the paid service.'
    });
  }
  
  /**
   * Process payment for tier upgrade
   */
  async processPayment(req: AuthRequest, res: Response) {
    try {
      console.log('Payment request received:', JSON.stringify(req.body, null, 2));
      console.log('User ID:', req.user?.id);
      
      const { tier, paymentMethod, cardNumber, cardHolderName, expiryMonth, expiryYear, cvv, couponCode, billingCycle } = req.body;
      const userId = req.user!.id;

      // Validate required fields
      if (!tier || !paymentMethod) {
        console.log('Missing required fields - tier:', tier, 'paymentMethod:', paymentMethod);
        return res.status(400).json({
          success: false,
          message: 'Tier and payment method are required'
        });
      }

      // Validate tier
      if (!['premium', 'business'].includes(tier)) {
        console.log('Invalid tier:', tier);
        return res.status(400).json({
          success: false,
          message: 'Invalid tier. Must be premium or business'
        });
      }

      // Calculate amount based on tier and billing cycle
      const tierPrices: { [key: string]: { monthly: number, annual: number } } = {
        premium: { monthly: 29, annual: 290 },
        business: { monthly: 99, annual: 990 }
      };

      let amount = billingCycle === 'annual' ? tierPrices[tier].annual : tierPrices[tier].monthly;
      let discount = 0;

      // Apply coupon code if provided
      if (couponCode) {
        console.log('Validating coupon:', couponCode);
        const couponResult = paymentService.validateCoupon(couponCode);
        console.log('Coupon validation result:', couponResult);
        if (couponResult.valid) {
          discount = couponResult.discount;
          amount = amount * (1 - discount / 100);
          console.log('Discount applied - Original:', tierPrices[tier][billingCycle === 'annual' ? 'annual' : 'monthly'], 'Final:', amount);
        }
      }

      // Demo shortcut: if payments are disabled, only allow demo/coupon flows
      if (!this.paymentsEnabled()) {
        const demoMethods = ['demo', 'coupon', 'COUPON'];
        if (!demoMethods.includes(paymentMethod)) {
          return res.status(400).json({
            success: false,
            message: 'Only demo payments are allowed in this environment.'
          });
        }

        console.log('Demo payments enabled path - simulating upgrade without external processing');
        const demoResult = await paymentService.demoUpgrade(userId, tier, billingCycle);
        return res.status(200).json({
          success: true,
          message: demoResult.message,
          transactionId: demoResult.transactionId,
          billingId: demoResult.billingId
        });
      }

      console.log('Processing payment with:', { userId, amount, tier, paymentMethod, discount });

      // Process payment
      const result = await paymentService.processPayment({
        userId,
        amount,
        tier,
        paymentMethod,
        cardNumber,
        cardHolderName,
        expiryMonth,
        expiryYear,
        cvv,
        couponCode,
        discount,
        billingCycle
      });

      console.log('Payment result:', result);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          transactionId: result.transactionId,
          billingId: result.billingId
        });
      } else {
        console.log('Payment failed:', result.message);
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error: any) {
      console.error('Payment processing error:', error);
      console.error('Error stack:', error.stack);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during payment processing',
        error: error.message
      });
    }
  }

  /**
   * Get billing history
   */
  async getBillingHistory(req: AuthRequest, res: Response) {
    if (!this.paymentsEnabled()) {
      return this.demoDisabledResponse(res);
    }

    try {
      const userId = req.user!.id;
      const history = await paymentService.getBillingHistory(userId);

      return res.status(200).json({
        success: true,
        data: history
      });

    } catch (error: any) {
      console.error('Error fetching billing history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch billing history'
      });
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(req: AuthRequest, res: Response) {
    if (!this.paymentsEnabled()) {
      return this.demoDisabledResponse(res);
    }

    try {
      const userId = req.user!.id;
      const subscription = await paymentService.getSubscription(userId);

      return res.status(200).json({
        success: true,
        data: subscription
      });

    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription'
      });
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const result = await paymentService.cancelSubscription(userId);

      return res.status(result.success ? 200 : 400).json(result);

    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel subscription'
      });
    }
  }

  /**
   * Upgrade user tier
   */
  async upgradeTier(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id || req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { newTier, reason } = req.body;
      const tierReason: string = reason || 'User requested upgrade';

      if (!['premium', 'business'].includes(newTier)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tier. Must be premium or business'
        });
      }

      // Demo shortcut: apply upgrade directly if payments are off
      if (!this.paymentsEnabled()) {
        const demoResult = await paymentService.demoUpgrade(userId, newTier, 'monthly');
        return res.status(200).json({
          success: true,
          message: demoResult.message
        });
      }

      const result = await paymentService.upgradeTier(userId, newTier, tierReason);
      return res.status(result.success ? 200 : 400).json(result);

    } catch (error: any) {
      console.error('Error upgrading tier:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upgrade tier'
      });
    }
  }

  /**
   * Downgrade user tier
   */
  async downgradeTier(req: AuthRequest, res: Response) {
    // Downgrade is disabled in demo to keep flows simple
    return res.status(503).json({
      success: false,
      message: 'Downgrade is disabled in this demo. Use cancel subscription instead.'
    });
  }

  /**
   * Get available plans and pricing
   */
  async getPlans(req: Request, res: Response) {
    try {
      const plans = [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          currency: 'USD',
          features: [
            '10 generations per month',
            'Core Khmer writing',
            'Email support',
            'Generation history (7 days)'
          ]
        },
        {
          id: 'premium',
          name: 'Premium',
          price: 29.99,
          currency: 'USD',
          features: [
            '500 generations per month',
            'Higher quality suggestions',
            'Priority support',
            'Generation history (30 days)',
            '3 API keys',
            'Team collaboration (5 members)',
            'Usage insights'
          ]
        },
        {
          id: 'business',
          name: 'Business',
          price: 99.99,
          currency: 'USD',
          features: [
            'Unlimited generations',
            'Enterprise Khmer models',
            '24/7 dedicated support',
            'Unlimited generation history',
            '10 API keys',
            'Team collaboration (unlimited)',
            'Advanced analytics',
            'Custom integrations',
            'SLA guarantee'
          ]
        }
      ];

      return res.status(200).json({
        success: true,
        data: plans
      });

    } catch (error: any) {
      console.error('Error fetching plans:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch plans'
      });
    }
  }
}

export const paymentController = new PaymentController();
