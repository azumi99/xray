import { Field, Float, ObjectType } from '@nestjs/graphql';

/**
 * Data dari database eksternal rdwarehouse_jkt.imp_hostawb
 * (dicocokkan berdasarkan MasterAWB/HostAWB). Dipakai untuk memperkaya
 * halaman detail AWB.
 */
@ObjectType('HostawbData')
export class HostawbData {
  @Field(() => String, { nullable: true })
  mawb!: string | null;

  @Field(() => String, { nullable: true })
  hawb!: string | null;

  @Field(() => String, { nullable: true })
  airlinesCode!: string | null;

  @Field(() => String, { nullable: true })
  flightNo!: string | null;

  @Field(() => String, { nullable: true })
  dateOfFlight!: string | null;

  @Field(() => String, { nullable: true })
  origin!: string | null;

  @Field(() => Float, { nullable: true })
  quantity!: number | null;

  @Field(() => Float, { nullable: true })
  weight!: number | null;

  @Field(() => Float, { nullable: true })
  volume!: number | null;

  @Field(() => String, { nullable: true })
  hsCode!: string | null;

  @Field(() => String, { nullable: true })
  descriptionGoods!: string | null;

  @Field(() => String, { nullable: true })
  shipperName!: string | null;

  @Field(() => String, { nullable: true })
  shipperCity!: string | null;

  @Field(() => String, { nullable: true })
  consigneeName!: string | null;

  @Field(() => String, { nullable: true })
  consigneeCity!: string | null;

  @Field(() => String, { nullable: true })
  bc11!: string | null;

  @Field(() => String, { nullable: true })
  tglBc!: string | null;

  @Field(() => String, { nullable: true })
  sppb!: string | null;

  @Field(() => String, { nullable: true })
  tglSppb!: string | null;

  @Field(() => String, { nullable: true })
  dateEntry!: string | null;

  @Field(() => String, { nullable: true })
  timeEntry!: string | null;

  @Field(() => String, { nullable: true })
  bagNumber!: string | null;
}
