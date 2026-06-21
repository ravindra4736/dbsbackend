import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return {
      message: 'User registered successfully',
      data: await this.authService.register(dto),
    };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return {
      message: 'Login successful',
      data: await this.authService.login(dto),
    };
  }

  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  async refresh(@User() user: any, @Body('refreshToken') refreshToken: string) {
    return {
      message: 'Token refreshed successfully',
      data: await this.authService.refreshTokens(user.userId, refreshToken),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@User() user: any) {
    return {
      message: 'Logout successful',
      data: await this.authService.logout(user.userId),
    };
  }
}

