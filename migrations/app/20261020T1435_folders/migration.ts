#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/92378754b671ac8dfa7c968602a7298c50d43ee231d0222b8b5d575bcd033208/contract';
import endContract from '../../snapshots/92378754b671ac8dfa7c968602a7298c50d43ee231d0222b8b5d575bcd033208/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d0aebb6fa76aa33f77c82ec7b292e027b2e8f23f2e9576296c64a337b3e967a3/contract';
import startContract from '../../snapshots/d0aebb6fa76aa33f77c82ec7b292e027b2e8f23f2e9576296c64a337b3e967a3/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'folder',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('endDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('icon', 'text', {
            notNull: true,
            default: lit('📁'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'folderInvite',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('folderId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('id', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'folderInvite_role_check_61370bc4',
            "\"role\" IN ('OWNER', 'EDITOR', 'VIEWER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'folderMember',
        columns: [
          col('folderId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('joinedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'folderMember_role_check_61370bc4',
            "\"role\" IN ('OWNER', 'EDITOR', 'VIEWER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'folderPlace',
        columns: [
          col('addedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('folderId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('placeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'folderMember',
        constraint: 'folderMember_folderId_userId_key',
        columns: ['folderId', 'userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'folderPlace',
        constraint: 'folderPlace_folderId_placeId_key',
        columns: ['folderId', 'placeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'folderInvite',
        index: 'folderInvite_folderId_idx_5985e562',
        columns: ['folderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'folderMember',
        index: 'folderMember_folderId_idx_5985e562',
        columns: ['folderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'folderMember',
        index: 'folderMember_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'folderPlace',
        index: 'folderPlace_folderId_idx_5985e562',
        columns: ['folderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'folderPlace',
        index: 'folderPlace_placeId_idx_918e92e1',
        columns: ['placeId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'folderInvite',
        foreignKey: {
          name: 'folderInvite_folderId_fkey',
          columns: ['folderId'],
          references: { schema: 'public', table: 'folder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'folderMember',
        foreignKey: {
          name: 'folderMember_folderId_fkey',
          columns: ['folderId'],
          references: { schema: 'public', table: 'folder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'folderMember',
        foreignKey: {
          name: 'folderMember_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'profile', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'folderPlace',
        foreignKey: {
          name: 'folderPlace_folderId_fkey',
          columns: ['folderId'],
          references: { schema: 'public', table: 'folder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'folderPlace',
        foreignKey: {
          name: 'folderPlace_placeId_fkey',
          columns: ['placeId'],
          references: { schema: 'public', table: 'restaurant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'folder' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'folderInvite' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'folderMember' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'folderPlace' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
