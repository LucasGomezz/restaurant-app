#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/018b160800ebbc62e75821d0785357c0c2c23c15b684fbf57bf5a1dc18f1a7cb/contract';
import startContract from '../../snapshots/018b160800ebbc62e75821d0785357c0c2c23c15b684fbf57bf5a1dc18f1a7cb/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/427091ebe0379a1fce082b4a54f143ed16d2169fdcaeec1caa4ecdccbaebd14a/contract';
import endContract from '../../snapshots/427091ebe0379a1fce082b4a54f143ed16d2169fdcaeec1caa4ecdccbaebd14a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'visit',
        column: col('placeImageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
