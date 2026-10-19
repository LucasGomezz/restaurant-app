#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/018b160800ebbc62e75821d0785357c0c2c23c15b684fbf57bf5a1dc18f1a7cb/contract';
import endContract from '../../snapshots/018b160800ebbc62e75821d0785357c0c2c23c15b684fbf57bf5a1dc18f1a7cb/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'dish',
        columns: [
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('visitId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'restaurant',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lat', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('lng', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'restaurant_status_check_c3347a5a',
            "\"status\" IN ('PENDING', 'VISITED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'visit',
        columns: [
          col('coupleImageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('restaurantId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('visitDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'visit',
        constraint: 'visit_restaurantId_key',
        columns: ['restaurantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dish',
        index: 'dish_visitId_idx_fcfcb8fb',
        columns: ['visitId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurant',
        index: 'restaurant_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'dish',
        foreignKey: {
          name: 'dish_visitId_fkey',
          columns: ['visitId'],
          references: { schema: 'public', table: 'visit', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'visit',
        foreignKey: {
          name: 'visit_restaurantId_fkey',
          columns: ['restaurantId'],
          references: { schema: 'public', table: 'restaurant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
