import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginPayload, LogoutPayload } from './auth.types.js';
import { User } from '../../entities/user.entity.js';

@Resolver(() => User)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => LoginPayload)
  login(@Args('email') email: string, @Args('password') password: string) {
    return this.authService.login(email, password);
  }

  @Mutation(() => LogoutPayload)
  logout(@Context('req') req: Request) {
    const user = (req as Request & { user?: { id: number } }).user;
    return user ? this.authService.logout(user.id) : { success: true };
  }

  @Mutation(() => Boolean)
  async changePassword(
    @Args('currentPassword') currentPassword: string,
    @Args('newPassword') newPassword: string,
    @Context('req') req: Request,
  ) {
    const user = await this.authService.me(this.extractToken(req));
    if (!user) return false;
    return this.authService.changePassword(user.id, currentPassword, newPassword);
  }

  @Query(() => User, { nullable: true })
  me(@Context('req') req: Request) {
    return this.authService.me(this.extractToken(req));
  }

  private extractToken(req: Request): string | undefined {
    const authorization = req.headers.authorization;
    if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
    return (req.headers.token as string | undefined) ?? undefined;
  }
}
