import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { PrismaService } from '../prisma/prisma.service'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Healthcheck (status da API + ping no banco)' })
  async check(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
    } catch {
      // F9: banco fora -> 503 (readiness probe deve falhar), no shape { success:false, detail }.
      throw new ServiceUnavailableException('Banco de dados indisponível')
    }
    return { status: 'ok', database: 'up' }
  }
}
