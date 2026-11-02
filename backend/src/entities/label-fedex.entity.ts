import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Data label cetak (import Excel FedEx) — dipakai menu Print Label 10x5cm */
@Entity('label_fedex')
export class LabelFedex {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 32 })
  mawb!: string;

  @Column({ type: 'int', nullable: true })
  pcs_mawb?: number | null;

  @Column({ type: 'varchar', length: 32 })
  hawb!: string;

  @Column({ type: 'int', nullable: true })
  pcs_hawb?: number | null;

  @Column({ type: 'int', nullable: true })
  part?: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  airlines_name?: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  flight_no?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  route?: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
