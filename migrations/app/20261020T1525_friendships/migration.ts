#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7f48e262111a6ccb406b4ae0af112a615e27e27d05cf182bfc410d443aafaeab/contract';
import endContract from '../../snapshots/7f48e262111a6ccb406b4ae0af112a615e27e27d05cf182bfc410d443aafaeab/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/92378754b671ac8dfa7c968602a7298c50d43ee231d0222b8b5d575bcd033208/contract';
import startContract from '../../snapshots/92378754b671ac8dfa7c968602a7298c50d43ee231d0222b8b5d575bcd033208/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'friendship',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('requestedBy', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userHigh', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('userLow', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'friendship_status_check_f0e5c74c',
            "\"status\" IN ('PENDING', 'ACCEPTED')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'friendship',
        constraint: 'friendship_userLow_userHigh_key',
        columns: ['userLow', 'userHigh'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'friendship',
        index: 'friendship_userHigh_idx_70c53c29',
        columns: ['userHigh'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'friendship',
        index: 'friendship_userLow_idx_b7762932',
        columns: ['userLow'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'friendship',
        foreignKey: {
          name: 'friendship_userLow_fkey',
          columns: ['userLow'],
          references: { schema: 'public', table: 'profile', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'friendship',
        foreignKey: {
          name: 'friendship_userHigh_fkey',
          columns: ['userHigh'],
          references: { schema: 'public', table: 'profile', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'friendship' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
