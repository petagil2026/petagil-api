import { Module } from '@nestjs/common'

import { StorageService } from './storage.service'

/**
 * StorageModule — provê o `StorageService` (Supabase Storage).
 * Exportado para ser reutilizado por outros módulos (uploads, profiles, pets…).
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
