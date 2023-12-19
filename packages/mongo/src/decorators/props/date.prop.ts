import { IsDate, MaxDate, MinDate, Type, ValidationOptions } from '@joktec/core';
import { PropOptionsForString } from '@typegoose/typegoose/lib/types';
import { isArray, isNil } from 'lodash';
import { IPropOptions } from '../prop.decorator';

export type DatePropOptions = PropOptionsForString & {
  minDate?: Date | (() => Date) | readonly [Date | (() => Date), string];
  maxDate?: Date | (() => Date) | readonly [Date | (() => Date), string];
};

export function DateProps(opts: IPropOptions, isArrayType: boolean): PropertyDecorator[] {
  const decorators: PropertyDecorator[] = [];

  decorators.push(
    Type(() => Date),
    IsDate({ each: isArrayType }),
  );

  if (!isNil(opts.minDate)) {
    const minDate = isArray(opts.minDate) ? opts.minDate : [opts.minDate, undefined];
    const validatorOption: ValidationOptions = { each: isArrayType };
    if (minDate[1]) validatorOption.message = minDate[1];
    decorators.push(MinDate(minDate[0], validatorOption));
  }

  if (!isNil(opts.maxDate)) {
    const maxDate = isArray(opts.maxDate) ? opts.maxDate : [opts.maxDate, undefined];
    const validatorOption: ValidationOptions = { each: isArrayType };
    if (maxDate[1]) validatorOption.message = maxDate[1];
    decorators.push(MaxDate(maxDate[0], validatorOption));
  }

  return decorators;
}
