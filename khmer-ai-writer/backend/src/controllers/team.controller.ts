import { Request, Response } from 'express';
import { pool } from '../services/core/database.service';
import { emailService } from '../services/core/email.service';

// Team management with real database integration
const getParamId = (param: string | string[] | undefined) => {
  if (!param) return null;
  return Array.isArray(param) ? param[0] : param;
};

export const getTeamInfo = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userTier = (req as any).user?.tier;
    
    // Only premium and business tier users can access team management
    if (userTier === 'free') {
      return res.status(403).json({ error: 'Team management requires Premium or Business plan' });
    }

    // Get team info from database
    const teamQuery = `
      SELECT t.*, u.email as owner_email, u.full_name as owner_name
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      WHERE t.owner_id = $1 OR t.id IN (
        SELECT team_id FROM team_members WHERE user_id = $1
      )
    `;
    
    const teamResult = await pool.query(teamQuery, [userId]);
    let team = teamResult.rows[0];
    
    // Create team if doesn't exist
    if (!team) {
      const createTeamQuery = `
        INSERT INTO teams (owner_id, name, member_limit, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      const newTeamResult = await pool.query(createTeamQuery, [userId, 'My Team', 25]);
      team = newTeamResult.rows[0];
      await pool.query('UPDATE users SET current_team_id = $1 WHERE id = $2', [team.id, userId]);
    }
    
    // Get team members
    const membersQuery = `
      SELECT tm.*, u.email, u.full_name, u.created_at as joined_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
      ORDER BY tm.created_at ASC
    `;
    
    const membersResult = await pool.query(membersQuery, [team.id]);
    const members = membersResult.rows;
    
    // Add owner as member if not already included
    const ownerAsMember = {
      id: 'owner',
      user_id: team.owner_id,
      email: team.owner_email,
      full_name: team.owner_name,
      role: 'owner',
      status: 'active',
      joined_at: team.created_at
    };
    
    const allMembers = [ownerAsMember, ...members];

    res.json({
      team: {
        id: team.id,
        name: team.name,
        ownerId: team.owner_id,
        memberLimit: team.member_limit,
        createdAt: team.created_at
      },
      members: allMembers,
      stats: {
        totalMembers: allMembers.length,
        activeMembers: allMembers.filter((m: any) => m.status === 'active').length,
        memberLimit: team.member_limit
      }
    });
  } catch (e) {
    console.error('Team info error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

export const inviteMember = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userTier = (req as any).user?.tier;
    const { email, name, role = 'member' } = req.body;

    if (userTier === 'free') {
      return res.status(403).json({ error: 'Team management requires Premium or Business plan' });
    }

    // Get user's team
    const teamQuery = 'SELECT * FROM teams WHERE owner_id = $1';
    const teamResult = await pool.query(teamQuery, [userId]);
    const team = teamResult.rows[0];
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check member limit
    const memberCountQuery = 'SELECT COUNT(*) FROM team_members WHERE team_id = $1';
    const memberCountResult = await pool.query(memberCountQuery, [team.id]);
    const memberCount = parseInt(memberCountResult.rows[0].count) + 1; // +1 for owner

    if (memberCount >= team.member_limit) {
      return res.status(400).json({ error: 'Member limit reached' });
    }

    // Check if user already exists
    const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
    const existingUserResult = await pool.query(existingUserQuery, [email]);
    const invitedUserId = existingUserResult.rows[0]?.id;
    
    // If user doesn't exist, just create invitation (they can register later)
    // If user exists, check if they're already a member
    if (invitedUserId) {
      const existingMemberQuery = 'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2';
      const existingMemberResult = await pool.query(existingMemberQuery, [team.id, invitedUserId]);
      
      if (existingMemberResult.rows.length > 0) {
        return res.status(400).json({ error: 'User is already a team member' });
      }
    }

    // Create invitation record
    const crypto = require('crypto');
    const invitationToken = crypto.randomBytes(32).toString('hex');
    
    const inviteQuery = `
      INSERT INTO team_invitations (team_id, inviter_id, invitee_email, invitee_name, role, status, token, created_at, expires_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW(), NOW() + INTERVAL '7 days')
      RETURNING *
    `;
    const inviteResult = await pool.query(inviteQuery, [team.id, userId, email, name, role, invitationToken]);

    // Send invitation email
    const inviterQuery = 'SELECT full_name FROM users WHERE id = $1';
    const inviterResult = await pool.query(inviterQuery, [userId]);
    const inviterName = inviterResult.rows[0]?.full_name || 'A team member';
    
    await emailService.sendTeamInvitation(email, team.name, inviterName, role, invitationToken);

    res.status(201).json({ 
      invitation: inviteResult.rows[0],
      message: 'Invitation sent successfully' 
    });
  } catch (e) {
    console.error('Invite member error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userTier = (req as any).user?.tier;
    const memberId = getParamId(req.params.memberId);
    if (!memberId) {
      return res.status(400).json({ error: 'Member id is required' });
    }

    if (userTier === 'free') {
      return res.status(403).json({ error: 'Team management requires Premium or Business plan' });
    }

    // Get user's team
    const teamQuery = 'SELECT * FROM teams WHERE owner_id = $1';
    const teamResult = await pool.query(teamQuery, [userId]);
    const team = teamResult.rows[0];
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get member info
    const memberQuery = `
      SELECT tm.*, u.email, u.full_name
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.id = $1 AND tm.team_id = $2
    `;
    const memberResult = await pool.query(memberQuery, [memberId, team.id]);
    const member = memberResult.rows[0];

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove team owner' });
    }

    // Remove member
    const removeQuery = 'DELETE FROM team_members WHERE id = $1';
    await pool.query(removeQuery, [memberId]);

    // Send notification email
    const removerQuery = 'SELECT full_name FROM users WHERE id = $1';
    const removerResult = await pool.query(removerQuery, [userId]);
    const removerName = removerResult.rows[0]?.full_name || 'Team owner';
    
    await emailService.sendMemberRemovedNotification(
      member.email,
      member.full_name,
      team.name,
      removerName
    );

    res.json({ message: 'Member removed successfully' });
  } catch (e) {
    console.error('Remove member error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userTier = (req as any).user?.tier;
    const memberId = getParamId(req.params.memberId);
    if (!memberId) {
      return res.status(400).json({ error: 'Member id is required' });
    }
    const { role } = req.body;

    if (userTier === 'free') {
      return res.status(403).json({ error: 'Team management requires Premium or Business plan' });
    }

    // Get user's team
    const teamQuery = 'SELECT * FROM teams WHERE owner_id = $1';
    const teamResult = await pool.query(teamQuery, [userId]);
    const team = teamResult.rows[0];
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get member info
    const memberQuery = `
      SELECT tm.*, u.email, u.full_name
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.id = $1 AND tm.team_id = $2
    `;
    const memberResult = await pool.query(memberQuery, [memberId, team.id]);
    const member = memberResult.rows[0];

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    // Update member role
    const oldRole = member.role;
    const updateQuery = 'UPDATE team_members SET role = $1 WHERE id = $2 RETURNING *';
    const updateResult = await pool.query(updateQuery, [role, memberId]);

    // Send role change notification
    const changerQuery = 'SELECT full_name FROM users WHERE id = $1';
    const changerResult = await pool.query(changerQuery, [userId]);
    const changerName = changerResult.rows[0]?.full_name || 'Team owner';
    
    await emailService.sendRoleChangeNotification(
      member.email,
      member.full_name,
      team.name,
      oldRole,
      role,
      changerName
    );

    res.json({ 
      member: {
        ...member,
        role
      }, 
      message: 'Member role updated successfully' 
    });
  } catch (e) {
    console.error('Update member role error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

/**
 * Accept team invitation
 */
export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const invitationId = getParamId(req.params.invitationId);
    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation id is required' });
    }

    // Get invitation
    const inviteQuery = `
      SELECT ti.*, t.name as team_name, t.member_limit,
             u.email as inviter_email, u.full_name as inviter_name
      FROM team_invitations ti
      JOIN teams t ON ti.team_id = t.id
      JOIN users u ON ti.inviter_id = u.id
      WHERE ti.id = $1 AND ti.invitee_email = (SELECT email FROM users WHERE id = $2)
    `;
    const inviteResult = await pool.query(inviteQuery, [invitationId, userId]);
    const invitation = inviteResult.rows[0];

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or not for this user' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation already ${invitation.status}` });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await pool.query('UPDATE team_invitations SET status = $1 WHERE id = $2', ['expired', invitationId]);
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Check member limit
    const memberCountQuery = 'SELECT COUNT(*) FROM team_members WHERE team_id = $1';
    const memberCountResult = await pool.query(memberCountQuery, [invitation.team_id]);
    const memberCount = parseInt(memberCountResult.rows[0].count) + 1; // +1 for owner

    if (memberCount >= invitation.member_limit) {
      return res.status(400).json({ error: 'Team member limit reached' });
    }

    // Check if already a member
    const existingMemberQuery = 'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2';
    const existingMemberResult = await pool.query(existingMemberQuery, [invitation.team_id, userId]);

    if (existingMemberResult.rows.length > 0) {
      // Update invitation status
      await pool.query('UPDATE team_invitations SET status = $1 WHERE id = $2', ['accepted', invitationId]);
      return res.status(400).json({ error: 'You are already a team member' });
    }

    // Add as team member
    const addMemberQuery = `
      INSERT INTO team_members (team_id, user_id, role, status, permissions, joined_at)
      VALUES ($1, $2, $3, 'active', $4, NOW())
      RETURNING *
    `;
    
    const defaultPermissions = {
      canInvite: invitation.role === 'admin',
      canRemove: invitation.role === 'admin',
      canScan: true,
      canViewReports: true,
      canExport: invitation.role === 'admin'
    };

    const memberResult = await pool.query(addMemberQuery, [
      invitation.team_id,
      userId,
      invitation.role,
      JSON.stringify(defaultPermissions)
    ]);

    // Update invitation status
    await pool.query('UPDATE team_invitations SET status = $1 WHERE id = $2', ['accepted', invitationId]);

    // Update user's current_team_id
    await pool.query('UPDATE users SET current_team_id = $1 WHERE id = $2', [invitation.team_id, userId]);

    res.json({
      message: 'Successfully joined the team',
      member: memberResult.rows[0],
      team: {
        id: invitation.team_id,
        name: invitation.team_name
      }
    });
  } catch (e) {
    console.error('Accept invitation error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

/**
 * Decline team invitation
 */
export const declineInvitation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const invitationId = getParamId(req.params.invitationId);
    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation id is required' });
    }

    // Get invitation
    const inviteQuery = `
      SELECT * FROM team_invitations 
      WHERE id = $1 AND invitee_email = (SELECT email FROM users WHERE id = $2)
    `;
    const inviteResult = await pool.query(inviteQuery, [invitationId, userId]);
    const invitation = inviteResult.rows[0];

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation already ${invitation.status}` });
    }

    // Update status to declined
    await pool.query('UPDATE team_invitations SET status = $1 WHERE id = $2', ['declined', invitationId]);

    res.json({ message: 'Invitation declined' });
  } catch (e) {
    console.error('Decline invitation error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

/**
 * Get user's pending invitations
 */
export const getPendingInvitations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const query = `
      SELECT ti.*, t.name as team_name, t.member_limit,
             u.email as inviter_email, u.full_name as inviter_name
      FROM team_invitations ti
      JOIN teams t ON ti.team_id = t.id
      JOIN users u ON ti.inviter_id = u.id
      WHERE ti.invitee_email = (SELECT email FROM users WHERE id = $1)
        AND ti.status = 'pending'
        AND ti.expires_at > NOW()
      ORDER BY ti.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      invitations: result.rows,
      count: result.rows.length
    });
  } catch (e) {
    console.error('Get pending invitations error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

/**
 * Leave team (remove yourself)
 */
export const leaveTeam = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const teamId = getParamId(req.params.teamId);
    if (!teamId) {
      return res.status(400).json({ error: 'Team id is required' });
    }

    // Check if user is team owner
    const teamQuery = 'SELECT owner_id FROM teams WHERE id = $1';
    const teamResult = await pool.query(teamQuery, [teamId]);
    const team = teamResult.rows[0];

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.owner_id === userId) {
      return res.status(400).json({ error: 'Team owner cannot leave. Delete the team instead.' });
    }

    // Remove from team members
    const removeQuery = 'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2';
    const result = await pool.query(removeQuery, [teamId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'You are not a member of this team' });
    }

    // Clear current_team_id
    await pool.query('UPDATE users SET current_team_id = NULL WHERE id = $1', [userId]);

    res.json({ message: 'Successfully left the team' });
  } catch (e) {
    console.error('Leave team error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

/**
 * Create a new team
 */
export const createTeam = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userTier = (req as any).user?.tier;
    const { name, description, memberLimit = 25, autoApproveInvites = false, requireMfa = false } = req.body;

    if (userTier === 'free') {
      return res.status(403).json({ error: 'Team creation requires Premium or Business plan' });
    }

    // Check if user already owns a team
    const existingTeamQuery = 'SELECT id FROM teams WHERE owner_id = $1';
    const existingTeam = await pool.query(existingTeamQuery, [userId]);
    
    if (existingTeam.rows.length > 0) {
      return res.status(400).json({ error: 'You already own a team' });
    }

    const createQuery = `
      INSERT INTO teams (owner_id, name, description, member_limit, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await pool.query(createQuery, [userId, name, description || null, memberLimit]);
    const team = result.rows[0];

    // Update user's current team
    await pool.query('UPDATE users SET current_team_id = $1 WHERE id = $2', [team.id, userId]);

    res.status(201).json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        memberLimit: team.member_limit,
        ownerId: team.owner_id,
        createdAt: team.created_at
      }
    });
  } catch (e) {
    console.error('Create team error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

/**
 * Get team statistics
 */
export const getTeamStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userTier = (req as any).user?.tier;

    if (userTier === 'free') {
      return res.status(403).json({ error: 'Team statistics require Premium or Business plan' });
    }

    // Get user's team
    const teamQuery = `
      SELECT id FROM teams WHERE owner_id = $1 
      OR id IN (SELECT team_id FROM team_members WHERE user_id = $1)
    `;
    const teamResult = await pool.query(teamQuery, [userId]);
    const team = teamResult.rows[0];

    if (!team) {
      return res.status(404).json({ error: 'No team found' });
    }

    // Get team usage stats
    const usageQuery = `
      SELECT 
        COUNT(DISTINCT tm.user_id) as total_members,
        COALESCE(SUM(tmu.api_calls_count), 0) as total_api_calls
      FROM team_members tm
      LEFT JOIN team_member_usage tmu ON tm.id = tmu.member_id
      WHERE tm.team_id = $1
    `;
    const usageResult = await pool.query(usageQuery, [team.id]);
    const stats = usageResult.rows[0];

    // Get member activity
    const activityQuery = `
      SELECT tm.user_id, u.email, u.full_name,
             COALESCE(SUM(tmu.api_calls_count), 0) as api_calls
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      LEFT JOIN team_member_usage tmu ON tm.id = tmu.member_id
      WHERE tm.team_id = $1
      GROUP BY tm.user_id, u.email, u.full_name
      ORDER BY api_calls DESC
      LIMIT 10
    `;
    const activityResult = await pool.query(activityQuery, [team.id]);

    res.json({
      success: true,
      stats: {
        totalMembers: parseInt(stats.total_members) + 1, // +1 for owner
        totalGenerations: parseInt(stats.total_api_calls),
        topMembers: activityResult.rows
      }
    });
  } catch (e) {
    console.error('Get team stats error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

/**
 * Update team settings
 */
export const updateTeamSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const teamId = getParamId(req.params.teamId);
    if (!teamId) {
      return res.status(400).json({ error: 'Team id is required' });
    }
    const { name, description, memberLimit, autoApproveInvites, requireMfa, allowPublicReports, dataRetentionDays, primaryColor } = req.body;

    // Check if user is team owner
    const teamQuery = 'SELECT * FROM teams WHERE id = $1 AND owner_id = $2';
    const teamResult = await pool.query(teamQuery, [teamId, userId]);
    const team = teamResult.rows[0];

    if (!team) {
      return res.status(403).json({ error: 'Only team owner can update settings' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (memberLimit !== undefined) {
      updates.push(`member_limit = $${paramCount++}`);
      values.push(memberLimit);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(teamId);

    const updateQuery = `
      UPDATE teams 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    const updatedTeam = result.rows[0];

    res.json({
      success: true,
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        description: updatedTeam.description,
        memberLimit: updatedTeam.member_limit,
        updatedAt: updatedTeam.updated_at
      }
    });
  } catch (e) {
    console.error('Update team settings error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

/**
 * Delete team
 */
export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const teamId = getParamId(req.params.teamId);
    if (!teamId) {
      return res.status(400).json({ error: 'Team id is required' });
    }

    // Check if user is team owner
    const teamQuery = 'SELECT * FROM teams WHERE id = $1 AND owner_id = $2';
    const teamResult = await pool.query(teamQuery, [teamId, userId]);
    const team = teamResult.rows[0];

    if (!team) {
      return res.status(403).json({ error: 'Only team owner can delete the team' });
    }

    // Delete team (cascade will handle related records)
    await pool.query('DELETE FROM teams WHERE id = $1', [teamId]);

    // Clear current_team_id for all affected users
    await pool.query('UPDATE users SET current_team_id = NULL WHERE current_team_id = $1', [teamId]);

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (e) {
    console.error('Delete team error:', e);
    res.status(400).json({ error: (e as Error).message });
  }
};

export default { 
  getTeamInfo, 
  inviteMember, 
  removeMember, 
  updateMemberRole,
  acceptInvitation,
  declineInvitation,
  getPendingInvitations,
  leaveTeam,
  createTeam,
  getTeamStats,
  updateTeamSettings,
  deleteTeam
};
