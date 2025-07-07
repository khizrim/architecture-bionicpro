import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { createError } from './errorHandler';

interface JWTPayload {
  sub: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
  preferred_username?: string;
  email?: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

const client = jwksRsa({
  jwksUri: process.env.KEYCLOAK_JWKS_URI || 'http://localhost:8080/realms/reports-realm/protocol/openid_connect/certs',
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void => {
  console.log('Getting signing key for kid:', header.kid);
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Error getting signing key:', err);
      return callback(err);
    }
    console.log('Successfully got signing key:', !!key);
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
};

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(createError('Access token is required', 401));
  }

  jwt.verify(token, getKey, {
    algorithms: ['RS256'],
    issuer: process.env.KEYCLOAK_ISSUER || 'http://localhost:8080/realms/reports-realm'
  }, (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err);
      return next(createError('Invalid or expired token', 401));
    }

    req.user = decoded as JWTPayload;
    next();
  });
};

export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError('User not authenticated', 401));
    }

    const userRoles = req.user.realm_access?.roles || [];
    
    if (!userRoles.includes(requiredRole)) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
}; 