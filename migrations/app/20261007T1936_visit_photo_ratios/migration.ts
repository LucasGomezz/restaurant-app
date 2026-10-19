#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8f449a0d28d054d44f2cf8638047aaa992d18eece3c799e725caf5a8dfe521bd/contract';
import endContract from '../../snapshots/8f449a0d28d054d44f2cf8638047aaa992d18eece3c799e725caf5a8dfe521bd/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cad3aad7bb5541bc21254cb6f743fe20f4accae3c2b6a938df649fd44e275776/contract';
import startContract from '../../snapshots/cad3aad7bb5541bc21254cb6f743fe20f4accae3c2b6a938df649fd44e275776/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'visit',
        column: col('coupleImageRatio', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'visit',
        column: col('placeImageRatio', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
