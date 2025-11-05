import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaystackService {
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private configService: ConfigService) {}

  async initializeTransaction(email: string, amount: number, callback_url: string) {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    const response = await axios.post(
      `${this.baseUrl}/transaction/initialize`,
      { email, amount, callback_url },
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    return response.data;
  }

  async verifyTransaction(reference: string) {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    const response = await axios.get(
      `${this.baseUrl}/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    return response.data;
  }
}