import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ _id: false })
export class ProductImage {
  @Prop()
  small?: string;

  @Prop()
  medium?: string;

  @Prop()
  large?: string;
}

@Schema({ _id: false })
export class ProductSetSnapshot {
  @Prop({ required: true })
  externalId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop()
  code?: string;
}

@Schema({ collection: 'products', timestamps: true, versionKey: false })
export class Product {
  @Prop({ required: true, unique: true })
  externalId: number;

  @Prop({ required: true, index: true })
  type: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, index: true })
  tcgSlug: string;

  @Prop({ type: ProductSetSnapshot, required: true })
  set: ProductSetSnapshot;

  @Prop()
  code?: string;

  @Prop({ type: [ProductImage], default: [] })
  images: ProductImage[];

  @Prop({ type: Object, default: {} })
  attributes: Record<string, string>;

  @Prop()
  rarity?: string;

  @Prop()
  color?: string;

  @Prop()
  cardType?: string;

  @Prop()
  cost?: string;

  @Prop()
  power?: string;

  @Prop()
  life?: string;

  @Prop()
  artist?: string;

  @Prop()
  cardNumber?: string;

  @Prop()
  subtypes?: string;

  @Prop()
  cardAttribute?: string;

  @Prop({ type: Object })
  markets?: Record<string, unknown>;

  @Prop()
  sourceCreatedAt?: Date;

  @Prop()
  sourceUpdatedAt?: Date;

  @Prop({ required: true })
  syncedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ tcgSlug: 1, type: 1, 'set.code': 1, code: 1, name: 1 });
ProductSchema.index({ tcgSlug: 1, 'set.externalId': 1 });
ProductSchema.index({ tcgSlug: 1, code: 1 });
ProductSchema.index({ tcgSlug: 1, color: 1 });
ProductSchema.index({ tcgSlug: 1, rarity: 1 });
ProductSchema.index({ tcgSlug: 1, cardType: 1 });
