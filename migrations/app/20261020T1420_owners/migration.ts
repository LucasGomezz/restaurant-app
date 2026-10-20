#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d0aebb6fa76aa33f77c82ec7b292e027b2e8f23f2e9576296c64a337b3e967a3/contract';
import endContract from '../../snapshots/d0aebb6fa76aa33f77c82ec7b292e027b2e8f23f2e9576296c64a337b3e967a3/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fd4977cbaf2b60e69bf6feab66b088a4b7cc3f839268a9a664d04f15c04d9f84/contract';
import startContract from '../../snapshots/fd4977cbaf2b60e69bf6feab66b088a4b7cc3f839268a9a664d04f15c04d9f84/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({ schema: 'public', table: 'category', constraint: 'category_name_key' }),
      this.addColumn({
        schema: 'public',
        table: 'category',
        column: col('ownerId', '"uuid"', { codecRef: { codecId: 'pg/uuid@1', typeParams: {} } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'restaurant',
        column: col('ownerId', '"uuid"', { codecRef: { codecId: 'pg/uuid@1', typeParams: {} } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'category',
        constraint: 'category_ownerId_name_key',
        columns: ['ownerId', 'name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'category',
        index: 'category_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restaurant',
        index: 'restaurant_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'category',
        foreignKey: {
          name: 'category_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'profile', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restaurant',
        foreignKey: {
          name: 'restaurant_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'profile', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
