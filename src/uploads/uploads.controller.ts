import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '../common/decorators/current-user.decorator'
import { StorageService, type UploadFile } from '../storage/storage.service'

/** Mimetypes aceitos: imagens comuns + PDF (para a carteira do CRMV). */
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']

/** Limite de tamanho do arquivo (5 MB). */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/** Pastas lógicas permitidas no bucket — evita path injection vindo do cliente. */
const ALLOWED_FOLDERS = new Set(['vet-photos', 'crmv-docs', 'pet-photos', 'misc'])

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('image')
  @ApiOperation({ summary: 'Faz upload de uma imagem/documento e retorna a URL pública' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  async uploadImage(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadFile | undefined,
    @Body('folder') folder?: string
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório (campo "file" do multipart).')
    }
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não suportado (use JPG, PNG, WEBP ou PDF).')
    }

    const safeFolder = folder && ALLOWED_FOLDERS.has(folder) ? folder : 'misc'
    const url = await this.storage.uploadImage(file, `${safeFolder}/${user.userId}`)
    return { url }
  }
}
