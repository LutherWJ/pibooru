import { db } from "../db";
import type { User } from "../db/schema";
import { logger } from "../util/logger";

/**
 * UserModel
 * Encapsulates database logic for user authentication.
 */
export class UserModel {
  /**
   * Creates a new user with a hashed password.
   */
  static async create(username: string, password: string): Promise<number | null> {
    try {
      const passwordHash = await Bun.password.hash(password);
      const result = db.prepare(`
        INSERT INTO users (username, password_hash) 
        VALUES (?, ?)
      `).run(username, passwordHash);

      return result.lastInsertRowid as number;
    } catch (e) {
      logger.error("DB", "Failed to create user", { username, error: e });
      return null;
    }
  }

  /**
   * Finds a user by their username.
   */
  static findByUsername(username: string): User | undefined {
    return db.query("SELECT * FROM users WHERE username = ?").get(username) as User | undefined;
  }

  /**
   * Finds a user by their ID.
   */
  static findById(id: number): User | undefined {
    return db.query("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
  }

  /**
   * Verifies a user's password.
   */
  static async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = this.findByUsername(username);
    if (!user) return null;

    const isValid = await Bun.password.verify(password, user.password_hash);
    return isValid ? user : null;
  }
}
