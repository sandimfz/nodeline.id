import { IsUUID } from 'class-validator';

export class ManualAssignDto {
  @IsUUID()
  orderItemId: string;

  @IsUUID()
  stockUnitId: string;
}
