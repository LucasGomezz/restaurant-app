#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/427091ebe0379a1fce082b4a54f143ed16d2169fdcaeec1caa4ecdccbaebd14a/contract';
import startContract from '../../snapshots/427091ebe0379a1fce082b4a54f143ed16d2169fdcaeec1caa4ecdccbaebd14a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c012549ba8efdd30bee648204a87e9e7ab2f639e02201094e78a2c7cffa9121a/contract';
import endContract from '../../snapshots/c012549ba8efdd30bee648204a87e9e7ab2f639e02201094e78a2c7cffa9121a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'photo',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('path', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('visitId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurant',
        column: col('eventDate', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurant',
        column: col('kind', 'text', {
          notNull: true,
          default: lit('RESTAURANT'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'visit',
        column: col('endDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'restaurant',
        constraint: 'restaurant_kind_check_6aec14ff',
        expression: "\"kind\" IN ('RESTAURANT', 'TRIP', 'EVENT')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'photo',
        index: 'photo_visitId_idx_fcfcb8fb',
        columns: ['visitId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurant',
        index: 'restaurant_kind_idx_c9ca668f',
        columns: ['kind'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'photo',
        foreignKey: {
          name: 'photo_visitId_fkey',
          columns: ['visitId'],
          references: { schema: 'public', table: 'visit', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
