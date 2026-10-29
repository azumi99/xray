import { Field, ID, ObjectType } from '@nestjs/graphql';
import { User } from '../../entities/user.entity.js';

@ObjectType()
export class AuthUser {
  @Field(() => ID) id!: number;
  @Field() name!: string;
  @Field() email!: string;
}

@ObjectType()
export class LoginPayload {
  @Field() token!: string;
  @Field(() => AuthUser) user!: User;
}

@ObjectType()
export class LogoutPayload { @Field() success!: boolean; }
