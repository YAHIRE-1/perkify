import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Validates Alchemy's HMAC signature header.
 *
 * IMPORTANT: HMAC verification requires the raw, unparsed request body.
 * Make sure this route uses the raw body (e.g. `express.raw({ type: 'application/json' })`
 * mounted on `/webhooks/alchemy` before Nest's global JSON body parser runs),
 * otherwise `req.rawBody` / `req.body` here will not match what Alchemy signed.
 */
@Injectable()
export class AlchemySignatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers['x-alchemy-signature'] as string;
    const secret = this.configService.get<string>('ALCHEMY_WEBHOOK_SECRET');

    if (!signature || !secret) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    // req.rawBody must be populated by a raw-body middleware for this route.
    const rawBody = (request as Request & { rawBody?: Buffer }).rawBody;

    if (!rawBody) {
      throw new UnauthorizedException('Raw body not available for verification');
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    const isValid =
      signatureBuffer.length === expectedBuffer.length &&
      timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
