import * as bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  if (!password || !hashedPassword) {
    throw new Error('Password and hash must be provided');
  }
  return await bcrypt.compare(password, hashedPassword);
}
