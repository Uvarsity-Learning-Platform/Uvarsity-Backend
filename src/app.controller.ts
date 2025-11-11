import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot(): string {
    return 'Welcome to Uvarsity Backend 🎓 — API is live at /api/v1 🚀';
  }

  @Get('api/v1')
  getHello(): string {
    return 'Uvarsity Backend is live 🎓🚀';
  }
}
