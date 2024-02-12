import { KeycloakUserDto } from '@app/modules/keycloak/dto/keycloak-user.dto';
import { QUEUES, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { Process, Processor } from '@nestjs/bull';
import * as Sentry from '@sentry/node';
import { DeleteUserDto } from '@user/dto/delete-user.dto';
import { UserDelete } from '@user/dto/user-delete.dto';
import { Job } from 'bull';
import { KeycloakService } from '../../keycloak/keycloak.service';
import { UserRepository } from '../user.repository';

@Processor(QUEUES.USER_DELETE)
export class UserQueueConsumer {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly keycloakService: KeycloakService,
  ) {}

  @Process()
  async deleteUser({ data }: Job<UserDelete>): Promise<void> {
    let keycloakUser: KeycloakUserDto;
    try {
      const { id } = data;
      const deleteUser: DeleteUserDto = {
        email: `${id}@test.com`,
        contactNumber: '',
        countryCode: '',
        dateOfBirth: null,
        firstName: 'Anonymous',
        lastName: '',
        nicNumber: '',
        nationalityCode: '',
        passportNumber: '',
        registrationStatus: REGISTRATION_STATUS[STATUS_CODE.PENDING_ACCOUNT],
        isDeleted: true,
      };
      const dbUser = await this.userRepository.getUser(id);
      try {
        keycloakUser = await this.keycloakService.getUser(dbUser.email);
      } catch {
        keycloakUser = null;
      }

      if (keycloakUser) await this.keycloakService.deleteUser(id);
      if (dbUser) await this.userRepository.updateUser(id, deleteUser);
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(error); //pushes the job to fail queue when error throws
    }
  }
}
