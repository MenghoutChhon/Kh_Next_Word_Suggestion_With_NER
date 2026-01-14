import crypto from 'crypto';
import { pool } from '../core/database.service';

/**
 * Team Management Service
 * Handles team invitations, member management, and real-time updates
 */

interface InviteMemberRequest {
  organizationId: string;
  invitedByUserId: string;
  invitedUserEmail: string;
  role?: 'admin' | 'member';
}

interface TeamMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  status: string;
  invitedBy: string | null;
  createdAt: Date;
}

class TeamManagementService {

  /**
   * Invite a member to the organization
   */
  async inviteMember(request: InviteMemberRequest): Promise<{ success: boolean; message: string; memberId?: string }> {
    try {
      // Verify inviter has permission
      const canInvite = await this.canUserInvite(request.organizationId, request.invitedByUserId);
      if (!canInvite) {
        return {
          success: false,
          message: 'You do not have permission to invite members'
        };
      }

      // Check if user exists
      let invitedUser = await this.getUserByEmail(request.invitedUserEmail);
      
      if (!invitedUser) {
        // Create a pending user account
        invitedUser = await this.createPendingUser(request.invitedUserEmail);
      }

      // Check if already a member
      const existingMember = await this.isAlreadyMember(request.organizationId, invitedUser.id);
      if (existingMember) {
        return {
          success: false,
          message: 'User is already a member of this organization'
        };
      }

      // Create team member record
      const memberId = crypto.randomUUID();
      const query = `
        INSERT INTO "TeamMember" (
          id, organization_id, "userId", role, status, invited_by, "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, 'pending', $5, NOW(), NOW())
        RETURNING id
      `;

      await pool.query(query, [
        memberId,
        request.organizationId,
        invitedUser.id,
        request.role || 'member',
        request.invitedByUserId
      ]);

      // Send invitation email (implement email service)
      await this.sendInvitationEmail(request.invitedUserEmail, request.organizationId);

      // Log audit
      await this.logAudit(request.invitedByUserId, 'team_member_invited', {
        memberId,
        email: request.invitedUserEmail
      });

      return {
        success: true,
        message: `Invitation sent to ${request.invitedUserEmail}`,
        memberId
      };

    } catch (error: any) {
      console.error('Error inviting member:', error);
      return {
        success: false,
        message: error.message || 'Failed to invite member'
      };
    }
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(memberId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await pool.query(
        `UPDATE "TeamMember" 
         SET status = 'active', "updatedAt" = NOW()
         WHERE id = $1 AND "userId" = $2 AND status = 'pending'
         RETURNING id`,
        [memberId, userId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Invitation not found or already processed'
        };
      }

      await this.logAudit(userId, 'team_invitation_accepted', { memberId });

      return {
        success: true,
        message: 'Invitation accepted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to accept invitation'
      };
    }
  }

  /**
   * Reject team invitation
   */
  async rejectInvitation(memberId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await pool.query(
        `DELETE FROM "TeamMember"
         WHERE id = $1 AND "userId" = $2 AND status = 'pending'
         RETURNING id`,
        [memberId, userId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Invitation not found'
        };
      }

      await this.logAudit(userId, 'team_invitation_rejected', { memberId });

      return {
        success: true,
        message: 'Invitation rejected'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to reject invitation'
      };
    }
  }

  /**
   * Get all team members for an organization
   */
  async getTeamMembers(organizationId: string): Promise<TeamMember[]> {
    const query = `
      SELECT 
        tm.id,
        tm."userId",
        u.full_name as "userName",
        u.email as "userEmail",
        tm.role,
        tm.status,
        tm.invited_by as "invitedBy",
        tm."createdAt"
      FROM "TeamMember" tm
      JOIN "User" u ON tm."userId" = u.id
      WHERE tm.organization_id = $1
      ORDER BY tm."createdAt" DESC
    `;

    const result = await pool.query(query, [organizationId]);
    return result.rows;
  }

  /**
   * Remove team member
   */
  async removeMember(
    organizationId: string,
    memberId: string,
    removedByUserId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify permission
      const canRemove = await this.canUserRemoveMember(organizationId, removedByUserId);
      if (!canRemove) {
        return {
          success: false,
          message: 'You do not have permission to remove members'
        };
      }

      const result = await pool.query(
        `DELETE FROM "TeamMember"
         WHERE id = $1 AND organization_id = $2
         RETURNING "userId"`,
        [memberId, organizationId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Member not found'
        };
      }

      await this.logAudit(removedByUserId, 'team_member_removed', {
        memberId,
        removedUserId: result.rows[0].userId
      });

      return {
        success: true,
        message: 'Member removed successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to remove member'
      };
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: string,
    updatedByUserId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify permission
      const canUpdate = await this.canUserUpdateRole(organizationId, updatedByUserId);
      if (!canUpdate) {
        return {
          success: false,
          message: 'You do not have permission to update member roles'
        };
      }

      const result = await pool.query(
        `UPDATE "TeamMember"
         SET role = $1, "updatedAt" = NOW()
         WHERE id = $2 AND organization_id = $3
         RETURNING id`,
        [newRole, memberId, organizationId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Member not found'
        };
      }

      await this.logAudit(updatedByUserId, 'team_member_role_updated', {
        memberId,
        newRole
      });

      return {
        success: true,
        message: 'Member role updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update member role'
      };
    }
  }

  /**
   * Check if user can invite members
   */
  private async canUserInvite(organizationId: string, userId: string): Promise<boolean> {
    const query = `
      SELECT role FROM "TeamMember"
      WHERE organization_id = $1 AND "userId" = $2 AND status = 'active'
    `;

    const result = await pool.query(query, [organizationId, userId]);
    
    if (result.rows.length === 0) {
      // Check if user is organization owner
      const orgQuery = `SELECT owner_id FROM "Organization" WHERE id = $1`;
      const orgResult = await pool.query(orgQuery, [organizationId]);
      return orgResult.rows[0]?.owner_id === userId;
    }

    const role = result.rows[0].role;
    return role === 'owner' || role === 'admin';
  }

  /**
   * Check if user can remove members
   */
  private async canUserRemoveMember(organizationId: string, userId: string): Promise<boolean> {
    return await this.canUserInvite(organizationId, userId); // Same permission
  }

  /**
   * Check if user can update roles
   */
  private async canUserUpdateRole(organizationId: string, userId: string): Promise<boolean> {
    const orgQuery = `SELECT owner_id FROM "Organization" WHERE id = $1`;
    const orgResult = await pool.query(orgQuery, [organizationId]);
    return orgResult.rows[0]?.owner_id === userId; // Only owner can update roles
  }

  /**
   * Get user by email
   */
  private async getUserByEmail(email: string): Promise<any | null> {
    const result = await pool.query(`SELECT * FROM "User" WHERE email = $1`, [email]);
    return result.rows[0] || null;
  }

  /**
   * Create pending user account
   */
  private async createPendingUser(email: string): Promise<any> {
    const userId = crypto.randomUUID();
    const tempPassword = crypto.randomBytes(16).toString('hex');

    const query = `
      INSERT INTO "User" (id, email, password_hash, role, tier, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, 'pending', 'free', NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [userId, email, tempPassword]);
    return result.rows[0];
  }

  /**
   * Check if user is already a member
   */
  private async isAlreadyMember(organizationId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT id FROM "TeamMember" WHERE organization_id = $1 AND "userId" = $2`,
      [organizationId, userId]
    );
    return result.rows.length > 0;
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(email: string, organizationId: string): Promise<void> {
    // TODO: Integrate with email service
    console.log(`[DEV] Invitation email sent to ${email} for organization ${organizationId}`);
  }

  /**
   * Log audit event
   */
  private async logAudit(userId: string, action: string, details: any): Promise<void> {
    await pool.query(
      `INSERT INTO "AuditLog" (id, "userId", action, details, "createdAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [crypto.randomUUID(), userId, action, JSON.stringify(details)]
    );
  }

  /**
   * Get pending invitations for a user
   */
  async getPendingInvitations(userId: string): Promise<any[]> {
    const query = `
      SELECT 
        tm.id as "memberId",
        o.name as "organizationName",
        o.id as "organizationId",
        tm.role,
        tm."createdAt"
      FROM "TeamMember" tm
      JOIN "Organization" o ON tm.organization_id = o.id
      WHERE tm."userId" = $1 AND tm.status = 'pending'
      ORDER BY tm."createdAt" DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}

export const teamManagementService = new TeamManagementService();
export default teamManagementService;
