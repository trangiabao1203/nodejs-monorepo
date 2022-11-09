import {
  JobBudgetRequestAdded,
  JobBudgetRequestAddedtDocument,
} from './schemas/job-budget-request-added.schema';
import { BaseService } from '@jobhopin/core';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class JobBudgetRequestAddedService extends BaseService<JobBudgetRequestAddedtDocument> {
  constructor(
    @InjectModel(JobBudgetRequestAdded.name)
    private readonly mainModel: Model<JobBudgetRequestAddedtDocument>,
  ) {
    super(mainModel);
  }
}
