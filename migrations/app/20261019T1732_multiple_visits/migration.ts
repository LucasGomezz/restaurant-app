#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/121180e63ca79a0b4c9033f6f67fcd699f994083b139a7fe1980ca7c85838a7e/contract';
import endContract from '../../snapshots/121180e63ca79a0b4c9033f6f67fcd699f994083b139a7fe1980ca7c85838a7e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/5a63566a1dd521307545005e9be6dfde8c8aa783f4161c953227220b8d97a959/contract';
import startContract from '../../snapshots/5a63566a1dd521307545005e9be6dfde8c8aa783f4161c953227220b8d97a959/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'visit',
        constraint: 'visit_restaurantId_key',
      }),
      this.createIndex({
        schema: 'public',
        table: 'visit',
        index: 'visit_restaurantId_idx_cf3ee7d0',
        columns: ['restaurantId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
