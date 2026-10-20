#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7f48e262111a6ccb406b4ae0af112a615e27e27d05cf182bfc410d443aafaeab/contract';
import startContract from '../../snapshots/7f48e262111a6ccb406b4ae0af112a615e27e27d05cf182bfc410d443aafaeab/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/eea6188ffc3cb12749012d9dfbf73fcfbceeadf37ec203f6f809a11b90820638/contract';
import endContract from '../../snapshots/eea6188ffc3cb12749012d9dfbf73fcfbceeadf37ec203f6f809a11b90820638/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'geocodeCache',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('results', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['key'])],
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'geocodeCache' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
