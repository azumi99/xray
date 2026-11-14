import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository, getDataSourceToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../entities/user.entity.js';
import { LoginPayload, LogoutPayload } from './auth.types.js';

@Injectable()
export class AuthService {
  /** Repository users gudang CAS (awbxray_cas) — tabel users terpisah per gudang:
   *  user BGD hanya di awbxray_bgd, user CAS hanya di awbxray_cas. Login mencari
   *  email di kedua tabel; admin (all) tinggal di salah satunya. */
  private readonly casUserRepo: Repository<User>;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwt: JwtService,
    @Inject(getDataSourceToken('cas')) casSource: DataSource,
  ) {
    this.casUserRepo = casSource.getRepository(User);
  }

  private toAuthUser(user: User): User {
    const { password: _password, ...authUser } = user as User & { password?: string };
    return authUser as User;
  }

  async login(email: string, password: string): Promise<LoginPayload> {
    // Cari user di tabel gudang BGD lalu CAS — tabel terpisah per hak akses.
    let user: User | null = null;
    for (const repo of [this.userRepo, this.casUserRepo]) {
      const found = await repo
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email })
        .getOne();
      if (found && (await bcrypt.compare(password, found.password))) {
        user = found;
        break;
      }
    }
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email, tv: user.token_version, wh: user.warehouse ?? 'bgd' });
    return { token, user };
  }

  async logout(userId: number): Promise<LogoutPayload> {
    await this.userRepo.increment({ id: userId }, 'token_version', 1);
    return { success: true };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.userRepo.update(userId, { password: await bcrypt.hash(newPassword, 12) });
    return true;
  }

  async me(token?: string | null): Promise<User | null> {
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync(token);
      if (typeof payload.sub !== 'number') return null;
      // User bisa di tabel BGD maupun CAS (tabel terpisah per gudang) — cari keduanya.
      const user =
        (await this.userRepo.findOneBy({ id: payload.sub })) ??
        (await this.casUserRepo.findOneBy({ id: payload.sub }));
      if (!user || (payload.tv ?? 0) !== user.token_version) return null;
      return user;
    } catch {
      return null;
    }
  }
}
