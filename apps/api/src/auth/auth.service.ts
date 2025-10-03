import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  login({ userId }: { userId: string }) {
    return { message: 'Login successful', userId };
  }
}
