export class CancelledPassDto {
  cancelledDate: Date;
  passesCount: number;
  user: User;
}

export class User {
  id: string;
  lastName: string;
  firstName: string;
  nationalityCode: string;
}
