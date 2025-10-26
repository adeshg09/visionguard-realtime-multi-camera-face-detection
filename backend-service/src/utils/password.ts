/* Relative Imports */
import bcrypt from "bcrypt";

// ----------------------------------------------------------------------
/* Constants */
const SALT_ROUNDS = 12;

// ----------------------------------------------------------------------

/**
 * Hash a password using bcrypt's default salt (12 rounds)
 * @param {string} password - password to hash
 * @returns {Promise<string>} - hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a given password with a hashed password using bcrypt's compare method.
 * @param {string} password - password to compare
 * @param {string} hashedPassword - hashed password to compare with
 * @returns {Promise<boolean>} - true if the password matches the given hashed password, false otherwise
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};
