#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/121180e63ca79a0b4c9033f6f67fcd699f994083b139a7fe1980ca7c85838a7e/contract';
import startContract from '../../snapshots/121180e63ca79a0b4c9033f6f67fcd699f994083b139a7fe1980ca7c85838a7e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fd4977cbaf2b60e69bf6feab66b088a4b7cc3f839268a9a664d04f15c04d9f84/contract';
import endContract from '../../snapshots/fd4977cbaf2b60e69bf6feab66b088a4b7cc3f839268a9a664d04f15c04d9f84/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'profile',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('displayName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('username', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'profile',
        constraint: 'profile_username_key',
        columns: ['username'],
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'profile' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
