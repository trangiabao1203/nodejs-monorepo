import { BadRequestException, ExceptionMessage } from '../exceptions';

export interface IValidateError {
  [property: string]: string[];
}

export class ValidateException extends BadRequestException<IValidateError> {
  constructor(data: IValidateError) {
    super(ExceptionMessage.INVALID_INPUT, data);
  }
}
