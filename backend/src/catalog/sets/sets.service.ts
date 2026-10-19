import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CardSet } from '../schemas/card-set.schema';
import { ONE_PIECE_SLUG } from '../sync/catalog-sync.service';

@Injectable()
export class SetsService {
  constructor(
    @InjectModel(CardSet.name) private readonly setModel: Model<CardSet>,
  ) {}

  async findAll(tcgSlug = ONE_PIECE_SLUG) {
    const data = await this.setModel
      .find({ tcgSlug })
      .sort({ releaseDate: -1, name: 1 })
      .lean();
    return { data, total: data.length };
  }

  async findOne(externalId: string) {
    const data = await this.setModel.findOne({ externalId }).lean();
    if (!data) {
      throw new NotFoundException(`No hay un set con id ${externalId}`);
    }
    return { data };
  }

  count(tcgSlug = ONE_PIECE_SLUG) {
    return this.setModel.countDocuments({ tcgSlug });
  }
}
