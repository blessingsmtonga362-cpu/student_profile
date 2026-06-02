import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/role.decorator';
import { Role } from '../auth/role.enum';
import { InitiateTransferDto } from './dto/transfer.dto';
import { TransferService } from './transfer.service';

@Controller('transfer')
@UseGuards(AuthGuard)
@Roles(Role.Admin)
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  /**
   * POST /transfer
   * Initiate a single mobile money disbursement.
   * Body: { phone, amount, name }
   */
  @Post()
  initiateTransfer(@Body() dto: InitiateTransferDto) {
    return this.transferService.initiateTransfer(dto.phone, dto.amount, dto.name, dto.sponsorName);
  }

  /**
   * GET /transfer/history
   * Return all past disbursements, newest first.
   */
  @Get('history')
  getHistory() {
    return this.transferService.getTransferHistory();
  }

  /**
   * GET /transfer/:reference/status
   * Look up a single transfer by its reference string.
   * If still pending, refreshes from PayChangu before responding.
   */
  @Get(':reference/status')
  getStatus(@Param('reference') reference: string) {
    return this.transferService.getTransferStatus(reference);
  }
}
