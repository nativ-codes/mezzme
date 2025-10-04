import { verifyToken } from '@clerk/backend';
import {
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Public } from 'src/decorators/public.decorator';

@Injectable()
export class ClerkAuthGuard {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get(Public, context.getHandler());
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const token = req?.headers?.authorization?.split(' ').pop() || null;
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    try {
      const payload = await verifyToken(token as string, {
        secretKey: this.configService.get('CLERK_SECRET_KEY'),
      });

      // Attach user info to request
      req.user = {
        authId: payload.sub, // Clerk user ID
        ...payload,
      };

      return true;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
