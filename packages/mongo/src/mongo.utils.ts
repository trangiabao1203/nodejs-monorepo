import { ICondition, IPopulate, IPopulateOption, ISort, toInt } from '@joktec/core';
import { IMongoRequest, IMongoProject, IMongoSorter, MongoSchema, IMongoAggregation } from './models';
import { PopulateOptions, QueryOptions } from 'mongoose';
import { omit, isNil, pick, isDate } from 'lodash';
import dot from 'dot-object';
import { isMoment } from 'moment';

export const UPDATE_OPTIONS: QueryOptions = {
  runValidators: true,
  new: true,
};

export const DELETE_OPTIONS: QueryOptions = {
  rawResult: false,
};

export const UPSERT_OPTIONS: QueryOptions = {
  upsert: true,
  new: true,
  runValidators: true,
};

export const preHandleCondition = <T extends MongoSchema>(condition: ICondition<T>): ICondition<T> => {
  if (condition && typeof condition === 'object') {
    const keys = Object.keys(condition);
    for (const key of keys) {
      if (key === 'id') {
        condition['_id'] = condition['id'];
        delete condition['id'];
      } else if (typeof condition[key] === 'object') {
        if (isNil(condition[key])) {
          condition[key] = null;
          continue;
        }

        if (condition[key].hasOwnProperty('$like')) {
          condition[key]['$regex'] = new RegExp(condition[key]['$like'], 'i');
          delete condition[key]['$like'];
        } else if (condition[key].hasOwnProperty('$unlike')) {
          condition[key] = {
            $not: { $regex: new RegExp(condition[key]['$unlike'], 'i') },
          };
          delete condition[key]['$unlike'];
        }

        condition[key] = preHandleCondition(condition[key]);
      }
    }
  }
  return condition;
};

export const preHandleQuery = <T extends MongoSchema>(
  query: IMongoRequest<T>,
  isSoftDelete: boolean = true,
): ICondition<T> => {
  const { condition = {}, keyword, near } = query;
  const overrideCondition: ICondition<T> = preHandleCondition(condition);
  if (keyword) overrideCondition['$text'] = { $search: keyword };
  if (isSoftDelete) overrideCondition['deletedAt'] = { $eq: null };
  if (near) {
    const { lat, lng, distance, field = 'location' } = near;
    overrideCondition[field] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: toInt(distance, 1000),
      },
    };
  }
  return overrideCondition;
};

export const preHandleBody = <T extends object>(body: object): Partial<T> => {
  const processBody = omit(body, ['_id', 'createdAt', 'updatedAt', 'deletedAt', '__v', '__t']);
  const result: Partial<T> = {};

  for (const key in processBody) {
    if (Object.prototype.hasOwnProperty.call(processBody, key)) {
      const value = processBody[key];
      if (Array.isArray(value)) {
        result[key] = value.map(item => (typeof item === 'object' && !isNil(item) ? preHandleBody(item) : item));
      } else if (isDate(value)) {
        result[key] = value;
      } else if (isMoment(value)) {
        result[key] = value.toDate();
      } else if (typeof value === 'object' && !isNil(value)) {
        result[key] = preHandleBody(value);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
};

export const preHandleUpdateBody = <T extends object>(body: object): Partial<T> => {
  const fields = Object.keys(body).filter(key => !key.startsWith('$'));
  const operatorFields = Object.keys(body).filter(key => key.startsWith('$'));

  const processBody: any = pick(body, operatorFields);
  if (!processBody.hasOwnProperty('$set')) processBody['$set'] = {};

  dot.keepArray = true;
  processBody['$set'] = {
    ...dot.dot(preHandleBody(pick(body, fields))),
    ...dot.dot(preHandleBody(processBody['$set'])),
  };

  return processBody;
};

export const buildProjection = (select: string): IMongoProject => {
  return select.split(',').reduce((acc, field) => {
    const trimField = field.trim();
    if (!trimField) return acc;
    if (trimField.startsWith('-')) acc[trimField.slice(1)] = 0;
    else acc[trimField] = 1;
    return acc;
  }, {});
};

export const buildSorter = (sort: ISort<any>): IMongoSorter => {
  return Object.entries(sort).reduce((acc, [field, order]) => {
    acc[field] = order === 'asc' ? 1 : -1;
    return acc;
  }, {});
};

/**
 * Convert populate object to mongoose populate options
 * @param populate
 * @param isSoftDelete
 */
export const convertPopulate = <T extends MongoSchema>(
  populate: IPopulate<T> = {},
  isSoftDelete: boolean = true,
): PopulateOptions[] => {
  return Object.keys(populate).map<PopulateOptions>(path => {
    const populateOptions: PopulateOptions = { path };
    const populateMatch = {};
    const options: '*' | IPopulateOption = populate[path];
    if (options !== '*') {
      if (options.select) populateOptions.select = buildProjection(options.select);
      if (options.model) populateOptions.model = options.model;
      if (options.populate) populateOptions.populate = convertPopulate(options.populate);
      if (options.match) Object.assign(populateMatch, populateOptions.match);
    }
    populateOptions.match = preHandleQuery({ condition: populateMatch }, isSoftDelete);
    return populateOptions;
  });
};

export const buildAggregation = <T extends MongoSchema>(
  query: IMongoRequest<T>,
  isSoftDelete: boolean = true,
): IMongoAggregation[] => {
  const condition: ICondition<T> = preHandleQuery(query, isSoftDelete);
  const aggregations: IMongoAggregation[] = [{ $match: condition }];

  if (query.sort) aggregations.push({ $sort: buildSorter(query.sort) });
  if (query.limit && query.page) {
    aggregations.push({ $skip: (query.page - 1) * query.limit });
    aggregations.push({ $limit: query.limit });
  }
  if (query.select) aggregations.push({ $project: buildProjection(query.select) });
  if (query.aggregations?.length) aggregations.push(...query.aggregations);

  return aggregations;
};
