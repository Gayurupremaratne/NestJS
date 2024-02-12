import { Job, Queue } from 'bull';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import * as Sentry from '@sentry/node';
import { MailService } from '../..//modules/mail/mail.service';
import { QUEUES } from '@common/constants';

@Processor(QUEUES.MAIL)
export class MailConsumer {
  constructor(
    @InjectQueue(QUEUES.MAIL) private readonly mail: Queue,
    private readonly mailService: MailService,
  ) {}

  /**
   * PSend order confirmation email
   *
   * @param {Job} job
   * @memberof MailConsumer
   */
  @Process()
  async sendQueueEmail(job: Job) {
    try {
      const { mailOptions, templateName, templateVars } = job.data;

      //send mail
      await this.mailService.sendMail(mailOptions, { templateName, templateVars });
    } catch (error) {
      Sentry.captureException(error);
      job.failedReason = error.message;
      job.moveToFailed(error, true);
      throw new Error(error.message);
    }
  }
}
