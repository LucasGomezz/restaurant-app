#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/c012549ba8efdd30bee648204a87e9e7ab2f639e02201094e78a2c7cffa9121a/contract';
import startContract from '../../snapshots/c012549ba8efdd30bee648204a87e9e7ab2f639e02201094e78a2c7cffa9121a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/cad3aad7bb5541bc21254cb6f743fe20f4accae3c2b6a938df649fd44e275776/contract';
import endContract from '../../snapshots/cad3aad7bb5541bc21254cb6f743fe20f4accae3c2b6a938df649fd44e275776/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.enableRowLevelSecurity({ schema: 'public', table: 'dish' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'photo' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'restaurant' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'visit' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
