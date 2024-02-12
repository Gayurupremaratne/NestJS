export interface MailPayload {
  templateName: string;
  templateVars: {
    [key: string]: string | any[];
  };
}

export interface MailResponse {
  accepted: string[];
  rejected: string[];
  envelopeTime: number;
  messageTime: number;
  messageSize: number;
  response: string;
  envelope: {
    from: string;
    to: string[];
  };
}
