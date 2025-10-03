import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  login({ userId }: { userId: string }) {
    console.log('Login successful', userId);
    return { message: 'Login successful', userId };
  }
}
