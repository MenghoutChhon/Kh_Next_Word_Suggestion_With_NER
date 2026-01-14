import { Request, Response } from 'express';
import prisma from '../config/database';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tier: string;
  };
}

const getParamId = (param: string | string[] | undefined) => {
  if (!param) return null;
  return Array.isArray(param) ? param[0] : param;
};

/**
 * Log audit event
 */
export const logAuditEvent = async (
  userId: string | undefined,
  action: string,
  resource_type?: string,
  resource_id?: string,
  details?: string,
  ip_address?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        resource_type: resource_type || null,
        resource_id: resource_id || null,
        details: details || null,
        ip_address: ip_address || null
      }
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

/**
 * Get user audit logs
 */
export const getUserAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 50, action } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId };
    if (action) {
      where.action = action;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
};

/**
 * Get audit logs for a resource
 */
export const getResourceAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const resourceType = getParamId(req.params.resource_type);
    const resourceId = getParamId(req.params.resource_id);
    if (!resourceType || !resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource type and id are required'
      });
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        resource_type: resourceType,
        resource_id: resourceId
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching resource audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
};

/**
 * Get all audit logs (admin only)
 */
export const getAllAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { page = 1, limit = 50, action, userId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching all audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
};

export default {
  logAuditEvent,
  getUserAuditLogs,
  getResourceAuditLogs,
  getAllAuditLogs
};
