import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
