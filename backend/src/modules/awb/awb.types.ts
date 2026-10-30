import { Field, ID, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AirwaybillXray } from '../../entities/airwaybill-xray.entity.js';
import { WatchedFile } from '../../entities/watched-file.entity.js';

export enum OrderByColumn { CREATED_AT = 'CREATED_AT', UPDATED_AT = 'UPDATED_AT', AIRWAYBILL_NUMBER = 'AIRWAYBILL_NUMBER' }
export enum SortOrder { ASC = 'ASC', DESC = 'DESC' }
registerEnumType(OrderByColumn, { name: 'OrderByColumn' });
registerEnumType(SortOrder, { name: 'SortOrder' });

@InputType()
export class QueryOrderByClause {
  @Field(() => OrderByColumn) column!: OrderByColumn;
  @Field(() => SortOrder) order!: SortOrder;
}

@ObjectType()
export class PaginatorInfo {
  @Field(() => Int) count!: number;
  @Field(() => Int) currentPage!: number;
  @Field(() => Int, { nullable: true }) firstItem!: number | null;
  @Field() hasMorePages!: boolean;
  @Field(() => Int, { nullable: true }) lastItem!: number | null;
  @Field(() => Int) lastPage!: number;
  @Field(() => Int) perPage!: number;
  @Field(() => Int) total!: number;
}

@ObjectType()
export class AirwaybillXrayPage {
  @Field(() => [AirwaybillXray]) data!: AirwaybillXray[];
  @Field(() => PaginatorInfo) paginatorInfo!: PaginatorInfo;
}

@InputType()
export class CreateAirwaybillXrayInput {
  @Field(() => String) airwaybill_number!: string;
  @Field(() => String, { nullable: true }) photo_airwaybill?: string;
  @Field(() => String, { nullable: true }) hawb?: string;
  @Field(() => String, { nullable: true }) kurir?: string;
  @Field(() => String, { nullable: true }) tanggal?: string;
  @Field(() => String, { nullable: true }) pengirim?: string;
  @Field(() => String, { nullable: true }) penerima_nama?: string;
  @Field(() => String, { nullable: true }) penerima_alamat?: string;
  @Field(() => String, { nullable: true }) penerima_kota?: string;
  @Field(() => String, { nullable: true }) penerima_kode_pos?: string;
  @Field(() => String, { nullable: true }) penerima_telepon?: string;
  @Field(() => String, { nullable: true }) berat?: string;
  @Field(() => String, { nullable: true }) jumlah_koli?: string;
  @Field(() => String, { nullable: true }) isi_barang?: string;
  @Field(() => String, { nullable: true }) nilai_deklarasi?: string;
  @Field(() => String, { nullable: true }) tipe_pajak?: string;
  @Field(() => Boolean, { nullable: true }) cod?: boolean;
}

@InputType()
export class SearchFilterInput {
  @Field(() => String, { nullable: true }) mawb?: string;
  @Field(() => String, { nullable: true }) hawb?: string;
  @Field(() => String, { nullable: true }) airlines?: string;
  @Field(() => String, { nullable: true }) origin?: string;
  @Field(() => String, { nullable: true }) dateFrom?: string;
  @Field(() => String, { nullable: true }) dateTo?: string;
}

@InputType()
export class CreateAirwaybillXrayDetailInput {
  @Field(() => ID) id_airwaybill!: string;
  @Field() xray_photo!: string;
}

@ObjectType()
export class WatchedFilePage {
  @Field(() => [WatchedFile]) data!: WatchedFile[];
}

@InputType()
export class CreateWatchedFileInput {
  @Field(() => String) filepath!: string;
  @Field(() => String, { nullable: true }) assign_id?: string;
}
