import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId, UpdateDateColumn } from 'typeorm';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';
import { HostawbData } from '../modules/awb/hostawb.types.js';

/** Anggota grup colly (awb + house): foto label AWB + X-ray tampak depan/samping */
@ObjectType('CollyMember')
export class CollyMember {
  @Field(() => ID)
  id!: number;

  @Field(() => Int)
  colly_index!: number;

  /** contoh: colly-2-of-5 */
  @Field(() => String, { nullable: true })
  colly_label!: string | null;

  @Field(() => String, { nullable: true })
  status!: string | null;

  @Field(() => String, { nullable: true })
  photo_airwaybill?: string | null;

  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => String, { nullable: true })
  top_photo?: string | null;

  @Field(() => String, { nullable: true })
  side_photo?: string | null;
}

@Entity('airwaybill_xray_details')
@ObjectType()
export class AirwaybillXrayDetail {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: number;

  @RelationId((detail: AirwaybillXrayDetail) => detail.airwaybill)
  @Field(() => ID)
  id_airwaybill!: number;

  @Column({ type: 'varchar', length: 500 })
  @Field()
  xray_photo!: string;

  @CreateDateColumn()
  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @ManyToOne(() => AirwaybillXray, (awb) => awb.airwaybillXrayDetails, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'id_airwaybill' })
  airwaybill?: any;
}

@Entity('airwaybill_xrays')
@ObjectType()
export class AirwaybillXray {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: number;

  @Column({ type: 'varchar', length: 500 })
  @Field()
  airwaybill_number!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @Field(() => String, { nullable: true })
  photo_airwaybill!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @Field(() => String, { nullable: true })
  hawb!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Field(() => String, { nullable: true })
  kurir!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Field(() => String, { nullable: true })
  tanggal!: string | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  pengirim!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Field(() => String, { nullable: true })
  penerima_nama!: string | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  penerima_alamat!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  @Field(() => String, { nullable: true })
  penerima_kota!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @Field(() => String, { nullable: true })
  penerima_kode_pos!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  penerima_telepon!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Field(() => String, { nullable: true })
  berat!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  jumlah_koli!: string | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  isi_barang!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Field(() => String, { nullable: true })
  nilai_deklarasi!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  tipe_pajak!: string | null;

  @Column({ type: 'boolean', nullable: false, default: false })
  @Field(() => Boolean, { nullable: true })
  cod!: boolean;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'waiting' })
  @Field(() => String, { nullable: true })
  status!: string;

  @CreateDateColumn()
  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @UpdateDateColumn()
  @Field(() => GraphQLDateTime)
  updated_at!: Date;

  @Field(() => Int)
  xray_photos_count!: number;

  /** Label colly live: posisi insert dalam grup awb+house, format `colly-1-of-6` (bukan kolom DB) */
  @Field(() => String, { nullable: true })
  colly_label?: string | null;

  /** Total colly dalam grup (awb + house) */
  @Field(() => Int, { nullable: true })
  colly_total?: number | null;

  /** Semua anggota grup colly ini (urut created_at ASC) — untuk section per-colly di detail */
  @Field(() => [CollyMember], { nullable: true })
  colly_members?: CollyMember[] | null;

  @Field(() => Boolean, { nullable: true })
  already_exists?: boolean;

  /** Jumlah record yang di-insert oleh batch mode (mode scan batch) */
  @Field(() => Int, { nullable: true })
  batch_count?: number | null;

  /** Data enrich dari database hostawb (di-resolve via HostawbService) */
  @Field(() => HostawbData, { nullable: true })
  hostawb?: HostawbData | null;

  @OneToMany(() => AirwaybillXrayDetail, (detail) => detail.airwaybill)
  @Field(() => [AirwaybillXrayDetail])
  airwaybillXrayDetails!: AirwaybillXrayDetail[];
}
