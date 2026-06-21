import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return {
      success: true,
      message: 'User registered successfully',
      data,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: FastifyRequest) {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const data = await this.authService.login(dto, ipAddress, userAgent);
    return {
      success: true,
      message: 'Login successful',
      data,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Req() req: FastifyRequest,
  ) {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const data = await this.authService.refreshTokens(
      refreshToken,
      ipAddress,
      userAgent,
    );
    return {
      success: true,
      message: 'Tokens refreshed successfully',
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@User() currentUser: any, @Req() req: FastifyRequest) {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    await this.authService.logout(
      currentUser.userId,
      currentUser.sessionId,
      ipAddress,
      userAgent,
    );
    return {
      success: true,
      message: 'Logged out of current device successfully',
      data: null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@User() currentUser: any, @Req() req: FastifyRequest) {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    await this.authService.logoutAll(currentUser.userId, ipAddress, userAgent);
    return {
      success: true,
      message: 'Logged out of all devices successfully',
      data: null,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(dto.email);
    return {
      success: true,
      message: data.message,
      data: null,
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const data = await this.authService.resetPassword(dto.token, dto.password);
    return {
      success: true,
      message: data.message,
      data: null,
    };
  }
}
