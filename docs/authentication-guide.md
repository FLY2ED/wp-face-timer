# 인증 시스템 가이드

## 📌 개요

WP Face Timer는 JWT(JSON Web Token) 기반의 인증 시스템을 사용합니다. Access Token과 Refresh Token을 활용한 이중 토큰 전략으로 보안성과 사용성을 동시에 확보합니다.

## 🔐 인증 아키텍처

```
┌──────────────────────────────────────────────────────┐
│                   Client (React)                      │
│                                                       │
│  1. 로그인 요청 (email + password)                   │
│  2. Access Token을 메모리에 저장                      │
│  3. Refresh Token을 HttpOnly Cookie에 저장           │
└───────────────┬──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────┐
│                    API Gateway                        │
│                                                       │
│  - CORS 검증                                         │
│  - Rate Limiting                                     │
└───────────────┬──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────┐
│                  NestJS Backend                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │             Auth Controller                     │ │
│  │                                                 │ │
│  │  - /auth/register  (회원가입)                  │ │
│  │  - /auth/login     (로그인)                    │ │
│  │  - /auth/refresh   (토큰 갱신)                 │ │
│  │  - /auth/logout    (로그아웃)                  │ │
│  └──────────────┬──────────────────────────────────┘ │
│                 │                                     │
│  ┌──────────────▼──────────────────────────────────┐ │
│  │             Auth Service                        │ │
│  │                                                 │ │
│  │  - 비밀번호 해싱 (bcrypt)                      │ │
│  │  - JWT 토큰 생성/검증                          │ │
│  │  - Refresh Token 관리                          │ │
│  └──────────────┬──────────────────────────────────┘ │
│                 │                                     │
│  ┌──────────────▼──────────────────────────────────┐ │
│  │          Passport Strategies                    │ │
│  │                                                 │ │
│  │  - JWT Strategy (Access Token 검증)            │ │
│  │  - JWT Refresh Strategy (Refresh Token 검증)   │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────┬──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                    │
│                                                       │
│  - users 테이블 (사용자 정보)                        │
│  - refresh_tokens 테이블 (리프레시 토큰)            │
└──────────────────────────────────────────────────────┘
```

## 🎫 토큰 전략

### 토큰 종류 및 특징

| 구분 | Access Token | Refresh Token |
|-----|--------------|---------------|
| **용도** | API 접근 권한 | Access Token 재발급 |
| **유효 기간** | 15분 | 7일 |
| **저장 위치** | 메모리 (React State) | HttpOnly Cookie |
| **페이로드** | userId, email, roles | userId, tokenId |
| **갱신 방법** | Refresh Token 사용 | 재로그인 필요 |

### 토큰 구조

```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string;        // userId
  email: string;
  roles: string[];    // ['USER', 'ADMIN']
  iat: number;        // issued at
  exp: number;        // expiration
}

// Refresh Token Payload
interface RefreshTokenPayload {
  sub: string;        // userId
  tokenId: string;    // unique token identifier
  iat: number;
  exp: number;
}
```

## 💼 구현 상세

### 1. Auth Module 설정

```typescript
// auth.module.ts
@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '15m'),
        },
      }),
    }),
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    RefreshTokenRepository,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

### 2. Auth Service

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenRepo: RefreshTokenRepository,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // 1. 이메일 중복 검사
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 2. 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 3. 사용자 생성
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // 4. 토큰 생성
    const tokens = await this.generateTokens(user);

    // 5. Refresh Token 저장
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    // 1. 사용자 조회
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. 토큰 생성
    const tokens = await this.generateTokens(user);

    // 4. Refresh Token 저장
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      // 1. Refresh Token 검증
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // 2. DB에서 토큰 확인
      const storedToken = await this.refreshTokenRepo.findOne({
        token: refreshToken,
        userId: payload.sub,
        isRevoked: false,
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 3. 만료 확인
      if (new Date(storedToken.expiresAt) < new Date()) {
        await this.refreshTokenRepo.revoke(storedToken.id);
        throw new UnauthorizedException('Refresh token expired');
      }

      // 4. 사용자 조회
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // 5. 새 Access Token 생성
      const accessToken = this.generateAccessToken(user);

      // 6. Refresh Token Rotation (선택적)
      if (this.shouldRotateRefreshToken(storedToken)) {
        await this.refreshTokenRepo.revoke(storedToken.id);
        const newRefreshToken = this.generateRefreshToken(user);
        await this.saveRefreshToken(user.id, newRefreshToken);

        return {
          accessToken,
          refreshToken: newRefreshToken,
        };
      }

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    // Refresh Token 무효화
    await this.refreshTokenRepo.revokeByToken(refreshToken);

    // 모든 디바이스에서 로그아웃 (선택적)
    // await this.refreshTokenRepo.revokeAllByUserId(userId);
  }

  private async generateTokens(user: User): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private generateAccessToken(user: User): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles || ['USER'],
    };

    return this.jwtService.sign(payload);
  }

  private generateRefreshToken(user: User): string {
    const payload: RefreshTokenPayload = {
      sub: user.id,
      tokenId: uuidv4(),
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
    });
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const decoded = this.jwtService.decode(token) as RefreshTokenPayload;

    await this.refreshTokenRepo.save({
      userId,
      token,
      expiresAt: new Date(decoded.exp * 1000),
    });
  }

  private shouldRotateRefreshToken(token: RefreshToken): boolean {
    // 토큰 생성 후 1일이 지나면 rotation
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return token.createdAt < oneDayAgo;
  }

  private sanitizeUser(user: User): Partial<User> {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
```

### 3. JWT Strategies

```typescript
// jwt.strategy.ts (Access Token 검증)
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    return user;
  }
}

// jwt-refresh.strategy.ts (Refresh Token 검증)
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Cookie에서 Refresh Token 추출
          return request?.cookies?.refreshToken;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshTokenPayload): Promise<any> {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return {
      userId: payload.sub,
      refreshToken,
    };
  }
}
```

### 4. Guards

```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // @Public() 데코레이터 체크
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### 5. Decorators

```typescript
// current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

## 🔄 토큰 갱신 플로우

### 자동 토큰 갱신 (Frontend)

```typescript
// auth.interceptor.ts (Frontend)
class AuthInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> =
    new BehaviorSubject<string | null>(null);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Access Token 추가
    const token = this.authService.getAccessToken();

    if (token) {
      req = this.addToken(req, token);
    }

    return next.handle(req).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(req, next);
        }
        return throwError(error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((tokens: TokenPair) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(tokens.accessToken);
          return next.handle(this.addToken(request, tokens.accessToken));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(err);
        })
      );
    } else {
      // 토큰 갱신 중인 경우 대기
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(token => next.handle(this.addToken(request, token)))
      );
    }
  }

  private addToken(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}
```

## 🛡️ 보안 Best Practices

### 1. 비밀번호 정책

```typescript
// password.validator.ts
export class PasswordValidator {
  static validate(password: string): ValidationResult {
    const errors = [];

    // 최소 길이
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // 대문자 포함
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // 소문자 포함
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // 숫자 포함
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // 특수문자 포함
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static generateSalt(): string {
    return bcrypt.genSaltSync(10);
  }

  static async hash(password: string): Promise<string> {
    const salt = this.generateSalt();
    return bcrypt.hash(password, salt);
  }

  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

### 2. Rate Limiting

```typescript
// rate-limit.config.ts
export const authRateLimitConfig = {
  login: {
    windowMs: 15 * 60 * 1000,  // 15분
    max: 5,                     // 최대 5회 시도
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  },
  register: {
    windowMs: 60 * 60 * 1000,  // 1시간
    max: 3,                     // 최대 3회 가입
    message: 'Too many accounts created, please try again later',
  },
  refresh: {
    windowMs: 60 * 1000,       // 1분
    max: 10,                    // 최대 10회 갱신
    message: 'Too many refresh attempts',
  },
};

// auth.controller.ts
@Controller('auth')
export class AuthController {
  @Post('login')
  @UseGuards(RateLimitGuard('login'))
  async login(@Body() loginDto: LoginDto) {
    // ...
  }
}
```

### 3. CORS 설정

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
  });

  // Cookie 설정
  app.use(cookieParser());

  await app.listen(3000);
}
```

### 4. Security Headers

```typescript
// security.middleware.ts
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // XSS 방지
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Content Type Sniffing 방지
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Clickjacking 방지
    res.setHeader('X-Frame-Options', 'DENY');

    // HSTS
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );

    // CSP
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline';"
    );

    next();
  }
}
```

## 🔍 토큰 관리 전략

### 1. Refresh Token Rotation

```typescript
@Injectable()
export class RefreshTokenService {
  async rotateToken(oldToken: string): Promise<string> {
    // 1. 기존 토큰 검증
    const storedToken = await this.findByToken(oldToken);

    if (!storedToken || storedToken.isRevoked) {
      // 이미 사용된 토큰인 경우 - 토큰 탈취 의심
      await this.revokeAllUserTokens(storedToken.userId);
      throw new UnauthorizedException('Token reuse detected');
    }

    // 2. 새 토큰 생성
    const newToken = this.generateNewToken(storedToken.userId);

    // 3. 기존 토큰 무효화
    await this.revoke(oldToken);

    // 4. 새 토큰 저장
    await this.save(newToken);

    return newToken;
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true }
    );
  }
}
```

### 2. 토큰 블랙리스트

```typescript
@Injectable()
export class TokenBlacklistService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async blacklist(token: string, expiresIn: number): Promise<void> {
    const key = `blacklist:${token}`;
    await this.cacheManager.set(key, true, { ttl: expiresIn });
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    const result = await this.cacheManager.get(key);
    return !!result;
  }

  // JWT Guard에서 사용
  async validateToken(token: string): Promise<boolean> {
    if (await this.isBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }
    return true;
  }
}
```

## 📊 세션 관리

### 1. 활성 세션 추적

```typescript
@Injectable()
export class SessionService {
  async createSession(userId: string, metadata: SessionMetadata): Promise<void> {
    const session = {
      userId,
      ...metadata,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    await this.sessionRepo.save(session);

    // Redis에도 저장 (빠른 조회)
    await this.cacheManager.set(
      `session:${session.id}`,
      session,
      { ttl: 3600 }
    );
  }

  async getActiveSessions(userId: string): Promise<Session[]> {
    return this.sessionRepo.find({
      where: {
        userId,
        isActive: true,
      },
      order: {
        lastActivity: 'DESC',
      },
    });
  }

  async terminateSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, { isActive: false });
    await this.cacheManager.del(`session:${sessionId}`);
  }

  async terminateAllSessions(userId: string): Promise<void> {
    await this.sessionRepo.update(
      { userId, isActive: true },
      { isActive: false }
    );

    // Refresh Token도 모두 무효화
    await this.refreshTokenService.revokeAllUserTokens(userId);
  }
}
```

### 2. 디바이스 관리

```typescript
@Injectable()
export class DeviceService {
  async registerDevice(userId: string, deviceInfo: DeviceInfo): Promise<Device> {
    const device = {
      userId,
      ...deviceInfo,
      fingerprint: this.generateFingerprint(deviceInfo),
      trustLevel: 'UNTRUSTED',
      registeredAt: new Date(),
    };

    return this.deviceRepo.save(device);
  }

  async verifyDevice(userId: string, fingerprint: string): Promise<boolean> {
    const device = await this.deviceRepo.findOne({
      userId,
      fingerprint,
      trustLevel: 'TRUSTED',
    });

    return !!device;
  }

  private generateFingerprint(deviceInfo: DeviceInfo): string {
    const data = `${deviceInfo.userAgent}:${deviceInfo.ip}:${deviceInfo.browser}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
```

## 🚨 에러 처리

### 인증 관련 에러 코드

```typescript
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'AUTH001',
  TOKEN_EXPIRED = 'AUTH002',
  TOKEN_INVALID = 'AUTH003',
  REFRESH_TOKEN_EXPIRED = 'AUTH004',
  REFRESH_TOKEN_INVALID = 'AUTH005',
  USER_NOT_FOUND = 'AUTH006',
  USER_INACTIVE = 'AUTH007',
  EMAIL_ALREADY_EXISTS = 'AUTH008',
  WEAK_PASSWORD = 'AUTH009',
  TOO_MANY_ATTEMPTS = 'AUTH010',
  DEVICE_NOT_TRUSTED = 'AUTH011',
  SESSION_EXPIRED = 'AUTH012',
}

// 에러 응답 예시
{
  "success": false,
  "error": {
    "code": "AUTH001",
    "message": "Invalid email or password",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 🧪 테스트

### 인증 서비스 테스트

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const user = { id: '1', email: loginDto.email, password: 'hashedPassword' };

      mockUsersService.findByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrong' };

      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('refresh', () => {
    it('should return new access token for valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: '1', tokenId: 'token-id' };

      mockJwtService.verify.mockReturnValue(payload);
      mockRefreshTokenRepo.findOne.mockResolvedValue({
        token: refreshToken,
        userId: '1',
        expiresAt: new Date(Date.now() + 10000),
      });
      mockUsersService.findById.mockResolvedValue({ id: '1' });

      const result = await service.refresh(refreshToken);

      expect(result).toHaveProperty('accessToken');
    });
  });
});
```

## 🔐 보안 체크리스트

- [ ] HTTPS 전용 통신
- [ ] 비밀번호 복잡도 검증
- [ ] Rate Limiting 적용
- [ ] CSRF 보호
- [ ] XSS 방지 헤더
- [ ] SQL Injection 방지
- [ ] 토큰 만료 시간 적절 설정
- [ ] Refresh Token Rotation
- [ ] 세션 고정 공격 방지
- [ ] 안전한 쿠키 설정 (HttpOnly, Secure, SameSite)
- [ ] 감사 로깅
- [ ] 2FA 지원 (선택사항)

## 🚀 향후 개선사항

1. **Multi-Factor Authentication (MFA)**
   - TOTP 기반 2FA
   - SMS/Email OTP

2. **Social Login**
   - Google OAuth2
   - GitHub OAuth
   - Apple Sign In

3. **Passwordless Authentication**
   - Magic Link
   - WebAuthn/FIDO2

4. **Advanced Security**
   - Device Trust Score
   - Behavioral Analytics
   - Anomaly Detection

5. **Session Management**
   - Concurrent Session Limit
   - Session Activity Monitoring
   - Geo-location Verification