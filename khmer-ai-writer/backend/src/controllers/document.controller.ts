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
 * Upload document
 */
export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, file_path, file_size, mime_type, access_level = 'private' } = req.body;

    const document = await prisma.document.create({
      data: {
        userId,
        name,
        file_path,
        file_size,
        mime_type,
        access_level,
        status: 'active'
      }
    });

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  }
};

/**
 * Get user documents
 */
export const getUserDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const documents = await prisma.document.findMany({
      where: {
        userId,
        status: { not: 'deleted' }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
};

/**
 * Get document by ID
 */
export const getDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = getParamId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Document id is required'
      });
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
        status: { not: 'deleted' }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document'
    });
  }
};

/**
 * Update document
 */
export const updateDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = getParamId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Document id is required'
      });
    }
    const { name, access_level, status } = req.body;

    const document = await prisma.document.findFirst({
      where: { id, userId }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(access_level && { access_level }),
        ...(status && { status })
      }
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document'
    });
  }
};

/**
 * Delete document (soft delete)
 */
export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = getParamId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Document id is required'
      });
    }

    const document = await prisma.document.findFirst({
      where: { id, userId }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    await prisma.document.update({
      where: { id },
      data: { status: 'deleted' }
    });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
};

export default {
  uploadDocument,
  getUserDocuments,
  getDocument,
  updateDocument,
  deleteDocument
};
