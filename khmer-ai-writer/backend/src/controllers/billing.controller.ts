import { Request, Response } from 'express';
import * as billingService from '../services/payment/billing.service';
import { pool } from '../services/core/database.service';

export const createBilling = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { amount, currency } = req.body;
    const billing = await billingService.charge(user.sub, amount, currency);
    res.status(201).json(billing);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
};

export const getBillingHistory = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id || user.sub;
    
    const query = `
      SELECT 
        ph.id,
        ph.amount,
        ph.currency,
        ph.status,
        ph.payment_method,
        ph.transaction_id,
        ph.created_at,
        s.plan as tier,
        s.billing_cycle
      FROM payment_history ph
      LEFT JOIN subscriptions s ON ph.subscription_id = s.id
      WHERE ph.user_id = $1
      ORDER BY ph.created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.status(200).json({
      success: true,
      billing: result.rows,
      total: result.rows.length
    });
  } catch (e) {
    console.error('Error fetching billing history:', e);
    res.status(500).json({ 
      success: false,
      error: (e as Error).message 
    });
  }
};

export default { createBilling, getBillingHistory };