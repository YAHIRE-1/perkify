import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SiweMessage, generateNonce } from 'siwe';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateNonceForAddress(address: string): Promise<{ nonce: string }> {
    const normalized = address.toLowerCase();
    const nonce = generateNonce();

    let user = await this.usersRepository.findOne({
      where: { walletAddress: normalized },
    });

    if (!user) {
      user = this.usersRepository.create({
        walletAddress: normalized,
        role: Role.HUNTER,
        nonce,
      });
    } else {
      user.nonce = nonce;
    }

    await this.usersRepository.save(user);
    return { nonce };
  }

  async verifySiweSignature(
    message: string,
    signature: string,
  ): Promise<{ accessToken: string; user: Partial<User> }> {

    // ===== LOG #1: qué llegó crudo del frontend =====
    console.log('=== MENSAJE RECIBIDO EN SERVICE ===');
    console.log(JSON.stringify(message));
    console.log('LINEAS:', message?.split('\n').length);
    console.log('====================================');
    // ==================================================

    let siweMessage: SiweMessage;
    try {
      siweMessage = new SiweMessage(message);
    } catch (err) {
      // ===== LOG #2: error real del constructor (antes estaba oculto) =====
      console.error('ERROR AL CONSTRUIR SiweMessage:', err);
      // ======================================================================
      throw new BadRequestException('Mensaje SIWE malformado');
    }

    const address = siweMessage.address.toLowerCase();

    const user = await this.usersRepository.findOne({
      where: { walletAddress: address },
    });

    if (!user || !user.nonce) {
      throw new UnauthorizedException('Nonce no encontrado, solicita uno nuevo');
    }

    const expectedDomain = this.configService.get<string>('SIWE_DOMAIN');

    // ===== LOG #3: estado justo antes de verify() =====
    console.log('SIWE_DOMAIN configurado:', expectedDomain);
    console.log('domain dentro del mensaje parseado:', siweMessage.domain);
    console.log('chainId parseado:', siweMessage.chainId, typeof siweMessage.chainId);
    console.log('nonce en DB:', user.nonce);
    console.log('nonce en mensaje:', siweMessage.nonce);
    console.log('issuedAt parseado:', siweMessage.issuedAt);
    // ====================================================

    try {
      const result = await siweMessage.verify({
        signature,
        nonce: user.nonce,
        domain: expectedDomain,
      });

      if (!result.success) {
        throw new UnauthorizedException('Firma inválida');
      }
    } catch (err) {
      // ===== LOG #4: error real de verify() (el que nos interesa) =====
      console.error('ERROR EN verify():', err);
      // ===================================================================
      throw new UnauthorizedException(
        err instanceof Error ? err.message : 'Firma inválida',
      );
    }

    user.nonce = null;
    await this.usersRepository.save(user);

    const payload: JwtPayload = {
      sub: user.id,
      address: user.walletAddress,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      },
    };
  }
}