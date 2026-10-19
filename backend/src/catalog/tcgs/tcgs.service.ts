import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tcg } from '../schemas/tcg.schema';

@Injectable()
export class TcgsService {
  constructor(@InjectModel(Tcg.name) private readonly tcgModel: Model<Tcg>) {}

  async findAll() {
    const data = await this.tcgModel.find().sort({ name: 1 }).lean();
    return { data, total: data.length };
  }

  async findOne(slug: string) {
    const data = await this.tcgModel.findOne({ slug }).lean();
    if (!data) {
      throw new NotFoundException(`No hay un TCG con slug ${slug}`);
    }
    return { data };
  }
}
