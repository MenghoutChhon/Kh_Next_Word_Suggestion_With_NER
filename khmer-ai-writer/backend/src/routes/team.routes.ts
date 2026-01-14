import { Router } from 'express';
import teamController from '../controllers/team.controller';
import auth from '../middleware/auth';

const router = Router();

/**
 * Team Management Routes
 * All routes require authentication
 */

// Get team info
router.get('/', auth, teamController.getTeamInfo);

// Invite member
router.post('/invite', auth, teamController.inviteMember);

// Get pending invitations for current user
router.get('/invitations/pending', auth, teamController.getPendingInvitations);

// Accept invitation
router.post('/invitations/:invitationId/accept', auth, teamController.acceptInvitation);

// Decline invitation
router.post('/invitations/:invitationId/decline', auth, teamController.declineInvitation);

// Leave team
router.post('/leave/:teamId', auth, teamController.leaveTeam);

// Remove member (owner/admin only)
router.delete('/members/:memberId', auth, teamController.removeMember);

// Update member role (owner only)
router.put('/members/:memberId/role', auth, teamController.updateMemberRole);

// Create team
router.post('/create', auth, teamController.createTeam);

// Get team stats
router.get('/stats', auth, teamController.getTeamStats);

// Update team settings
router.put('/:teamId/settings', auth, teamController.updateTeamSettings);

// Delete team
router.delete('/:teamId', auth, teamController.deleteTeam);

export default router;