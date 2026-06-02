import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InitiateTransferDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  sponsorName?: string;
}

// ── Response shapes (mirror what the frontend Transfer interface expects) ──

export interface TransferResponse {
  id: string;
  reference: string;
  phone: string;
  name: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  provider: string | null;
  externalReference: string | null;
  sponsorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateTransferResponse {
  success: boolean;
  message: string;
  data: TransferResponse;
}

export interface TransferStatusResponse {
  success: boolean;
  message: string;
  data: TransferResponse;
}

export interface TransferHistoryResponse {
  success: boolean;
  data: TransferResponse[];
  total: number;
}
