import * as bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {

