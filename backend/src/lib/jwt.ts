import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';

export type JwtUser = {
  sub: string;
  username: string;
  rol: string;
};

export function signToken(user: JwtUser): string {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(user, config.jwtSecret, options);
}

export function verifyToken(token: string): JwtUser {
  return jwt.verify(token, config.jwtSecret) as JwtUser;
}
