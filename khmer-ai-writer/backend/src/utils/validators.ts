import { body } from 'express-validator';

export const emailValidator = body('email').isEmail().withMessage('Email is invalid');
export const passwordValidator = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters');

export default { emailValidator, passwordValidator };