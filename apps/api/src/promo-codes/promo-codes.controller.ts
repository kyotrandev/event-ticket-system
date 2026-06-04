import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import {
  ValidatePromoCodeDto,
  ValidatePromoCodeResponseDto,
} from './dto/validate-promo-code.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PromoCode } from './domain/promo-code';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllPromoCodesDto } from './dto/find-all-promo-codes.dto';

@ApiTags('Promocodes')
@Controller({
  path: 'promo-codes',
  version: '1',
})
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  // Public: customers pre-check a code against their cart subtotal.
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ValidatePromoCodeResponseDto })
  async validate(
    @Body() dto: ValidatePromoCodeDto,
  ): Promise<ValidatePromoCodeResponseDto> {
    const { discountAmount } = await this.promoCodesService.validateForUse(
      dto.code,
      dto.amount,
    );
    return { valid: true, discountAmount };
  }

  // --- Admin management (SPEC US-6.3) ---

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiCreatedResponse({
    type: PromoCode,
  })
  create(@Body() createPromoCodeDto: CreatePromoCodeDto) {
    return this.promoCodesService.create(createPromoCodeDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiOkResponse({
    type: InfinityPaginationResponse(PromoCode),
  })
  async findAll(
    @Query() query: FindAllPromoCodesDto,
  ): Promise<InfinityPaginationResponseDto<PromoCode>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.promoCodesService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: PromoCode,
  })
  findById(@Param('id') id: string) {
    return this.promoCodesService.findById(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: PromoCode,
  })
  update(
    @Param('id') id: string,
    @Body() updatePromoCodeDto: UpdatePromoCodeDto,
  ) {
    return this.promoCodesService.update(id, updatePromoCodeDto);
  }

  // Soft delete: deactivates the code (SPEC US-6.3).
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.promoCodesService.remove(id);
  }
}
