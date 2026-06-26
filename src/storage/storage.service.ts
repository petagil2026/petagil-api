import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

/**
 * Subconjunto do arquivo do Multer que realmente usamos no upload.
 * Evita depender do namespace global `Express.Multer` (e do `@types/multer`).
 */
export interface UploadFile {
  buffer: Buffer
  mimetype: string
  originalname: string
  size: number
}

/** Extensão de arquivo a partir do mimetype (fallback `bin`). */
function extFromMime(mimetype: string): string {
  switch (mimetype) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/heic':
      return 'heic'
    case 'application/pdf':
      return 'pdf'
    default:
      return 'bin'
  }
}

/**
 * StorageService — encapsula o Supabase Storage para upload de imagens/documentos.
 *
 * O cliente é criado sob demanda (lazy): se `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
 * não estiverem configurados, a app SOBE normalmente e só o upload falha com erro claro
 * (503). Assim o backend não fica refém das chaves de storage para funcionar.
 *
 * Usa a SERVICE ROLE key (lado servidor) — NUNCA exponha essa chave no app.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private client: SupabaseClient | null = null
  private readonly bucket: string

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'uploads'
  }

  private getClient(): SupabaseClient {
    if (this.client) {
      return this.client
    }
    const url = this.config.get<string>('SUPABASE_URL')
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) {
      throw new ServiceUnavailableException(
        'Upload indisponível: configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env'
      )
    }
    this.client = createClient(url, key, { auth: { persistSession: false } })
    return this.client
  }

  /**
   * Faz upload do arquivo no bucket e retorna a URL pública.
   * @param file Arquivo recebido (buffer + mimetype).
   * @param prefix Prefixo/pasta lógica dentro do bucket (ex.: `vet-photos/<userId>`).
   */
  async uploadImage(file: UploadFile, prefix: string): Promise<string> {
    const client = this.getClient()
    const path = `${prefix}/${randomUUID()}.${extFromMime(file.mimetype)}`

    const { error } = await client.storage.from(this.bucket).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    })

    if (error) {
      this.logger.error(`Falha no upload para o Supabase Storage: ${error.message}`)
      throw new ServiceUnavailableException('Não foi possível enviar o arquivo. Tente novamente.')
    }

    const { data } = client.storage.from(this.bucket).getPublicUrl(path)
    return data.publicUrl
  }
}
