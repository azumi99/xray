import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';

@Entity('watched_files')
@ObjectType()
export class WatchedFile {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: number;

  @Column({ type: 'varchar', length: 500 })
  @Field()
  filepath!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Field(() => String, { nullable: true })
  assign_id!: string | null;

  @CreateDateColumn()
  @Field(() => GraphQLDateTime)
  created_at!: Date;

  @Field(() => String, { nullable: true })
  link?: string | null;
}
