export class CreateAuditLogDto {
  userId?: string;
  action!: string;
  entity?: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
}