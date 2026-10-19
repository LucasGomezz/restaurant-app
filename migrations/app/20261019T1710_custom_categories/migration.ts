#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5a63566a1dd521307545005e9be6dfde8c8aa783f4161c953227220b8d97a959/contract';
import endContract from '../../snapshots/5a63566a1dd521307545005e9be6dfde8c8aa783f4161c953227220b8d97a959/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8f449a0d28d054d44f2cf8638047aaa992d18eece3c799e725caf5a8dfe521bd/contract';
import startContract from '../../snapshots/8f449a0d28d054d44f2cf8638047aaa992d18eece3c799e725caf5a8dfe521bd/contract.json' with { type: 'json' };
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
        table: 'category',
        columns: [
          col('baseKind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('icon', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'category_baseKind_check_76d53074',
            "\"baseKind\" IN ('RESTAURANT', 'TRIP', 'EVENT')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurant',
        column: col('categoryId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'category',
        constraint: 'category_name_key',
        columns: ['name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurant',
        index: 'restaurant_categoryId_idx_15c304f2',
        columns: ['categoryId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurant',
        foreignKey: {
          name: 'restaurant_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'category', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'category' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
