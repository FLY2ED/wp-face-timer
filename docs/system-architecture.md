# 시스템 아키텍처

## 📌 개요

WP Face Timer 백엔드는 NestJS 프레임워크 기반의 모듈화된 아키텍처를 채택합니다. 확장성, 유지보수성, 테스트 용이성을 고려한 레이어드 아키텍처를 구현합니다.

## 🎯 개선된 아키텍처의 이점

### 프라이버시 보호
- 민감한 얼굴 데이터는 클라이언트에서만 처리
- 서버는 집계된 통계 데이터만 저장
- GDPR 및 개인정보보호법 준수 용이

### 성능 향상
- 실시간 데이터 전송 제거로 네트워크 부담 감소 (90% 이상)
- 서버 처리 부담 감소로 확장성 향상
- WebSocket 연결 불필요로 서버 리소스 절약

### 비용 절감
- 데이터베이스 저장 공간 대폭 감소
- 네트워크 트래픽 비용 감소
- 서버 인프라 비용 절감

### 단순화된 아키텍처
- WebSocket 게이트웨이 제거
- 배치 처리 큐 시스템 제거
- 시스템 복잡도 감소로 유지보수 용이

## 🏗️ 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                      │
│          (React Web App, Mobile App, Desktop App)            │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
                │  HTTPS                  │  WebSocket
                ▼                         ▼
┌──────────────────────────────────────────────────────────────┐
│                         API Gateway                           │
│                    (Nginx / AWS ALB)                          │
└───────────────┬──────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│                      NestJS Backend                           │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                    Controllers                        │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                     Services                          │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                   Repositories                        │    │
│  └──────────────────────────────────────────────────────┘    │
└────────┬──────────────────────┬──────────────────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │      Redis      │
│    (Primary)    │    │     (Cache)     │
└─────────────────┘    └─────────────────┘
```

## 📁 프로젝트 구조

```
backend/
├── src/
│   ├── main.ts                      # 애플리케이션 엔트리 포인트
│   ├── app.module.ts                # 루트 모듈
│   │
│   ├── common/                      # 공통 모듈
│   │   ├── config/                  # 설정 관리
│   │   │   ├── config.module.ts
│   │   │   ├── database.config.ts
│   │   │   ├── redis.config.ts
│   │   │   └── jwt.config.ts
│   │   │
│   │   ├── decorators/              # 커스텀 데코레이터
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── api-paginated.decorator.ts
│   │   │
│   │   ├── filters/                 # 예외 필터
│   │   │   ├── http-exception.filter.ts
│   │   │   └── validation.filter.ts
│   │   │
│   │   ├── guards/                  # 가드
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── rate-limit.guard.ts
│   │   │
│   │   ├── interceptors/            # 인터셉터
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   └── cache.interceptor.ts
│   │   │
│   │   ├── pipes/                   # 파이프
│   │   │   └── validation.pipe.ts
│   │   │
│   │   └── utils/                   # 유틸리티
│   │       ├── pagination.util.ts
│   │       ├── encryption.util.ts
│   │       └── date.util.ts
│   │
│   ├── modules/
│   │   ├── auth/                    # 인증 모듈
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── jwt-refresh.strategy.ts
│   │   │   ├── dto/
│   │   │   │   ├── register.dto.ts
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── refresh-token.dto.ts
│   │   │   └── entities/
│   │   │       └── refresh-token.entity.ts
│   │   │
│   │   ├── users/                   # 사용자 모듈
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   └── user-response.dto.ts
│   │   │   └── entities/
│   │   │       └── user.entity.ts
│   │   │
│   │   ├── tasks/                   # 작업 모듈
│   │   │   ├── tasks.module.ts
│   │   │   ├── tasks.controller.ts
│   │   │   ├── tasks.service.ts
│   │   │   ├── tasks.repository.ts
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   │
│   │   ├── timer/                   # 타이머 모듈
│   │   │   ├── timer.module.ts
│   │   │   ├── timer.controller.ts
│   │   │   ├── timer.service.ts
│   │   │   ├── timer.gateway.ts    # WebSocket Gateway
│   │   │   ├── repositories/
│   │   │   │   ├── session.repository.ts
│   │   │   │   └── face-data.repository.ts
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   └── processors/
│   │   │       └── face-data.processor.ts
│   │   │
│   │   ├── statistics/              # 통계 모듈
│   │   │   ├── statistics.module.ts
│   │   │   ├── statistics.controller.ts
│   │   │   ├── statistics.service.ts
│   │   │   ├── statistics.repository.ts
│   │   │   ├── aggregators/        # 통계 집계기
│   │   │   │   ├── daily.aggregator.ts
│   │   │   │   ├── weekly.aggregator.ts
│   │   │   │   └── monthly.aggregator.ts
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   │
│   │   ├── ranking/                 # 랭킹 모듈
│   │   │   ├── ranking.module.ts
│   │   │   ├── ranking.controller.ts
│   │   │   ├── ranking.service.ts
│   │   │   ├── ranking.repository.ts
│   │   │   ├── achievement.service.ts
│   │   │   ├── calculators/         # 랭킹 계산기
│   │   │   │   ├── daily.calculator.ts
│   │   │   │   ├── weekly.calculator.ts
│   │   │   │   └── monthly.calculator.ts
│   │   │   ├── dto/
│   │   │   │   ├── ranking-query.dto.ts
│   │   │   │   └── ranking-response.dto.ts
│   │   │   └── entities/
│   │   │       ├── ranking-snapshot.entity.ts
│   │   │       └── user-achievement.entity.ts
│   │   │
│   │   └── health/                  # 헬스체크 모듈
│   │       ├── health.module.ts
│   │       └── health.controller.ts
│   │
│   └── database/
│       ├── database.module.ts
│       ├── database.providers.ts
│       └── migrations/
│
├── test/                            # 테스트
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docker/                          # Docker 설정
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── .env.example                     # 환경변수 예시
├── nest-cli.json                    # NestJS CLI 설정
├── tsconfig.json                    # TypeScript 설정
└── package.json
```

## 🔧 핵심 모듈 설명

### 1. Auth Module (인증 모듈)

```typescript
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_TOKEN_EXPIRATION'),
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

**주요 기능:**
- JWT 토큰 발급 및 검증
- 리프레시 토큰 관리
- 비밀번호 해싱 (bcrypt)
- 인증 전략 구현

### 2. Timer Module (타이머 모듈)

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([TimerSession, SessionPause]),
    TasksModule,
    UsersModule,
    StatisticsModule,
    RankingModule,
  ],
  controllers: [TimerController],
  providers: [
    TimerService,
    SessionRepository,
    SessionStatisticsService,
  ],
  exports: [TimerService],
})
export class TimerModule {}
```

**주요 기능:**
- 타이머 세션 생명주기 관리
- 세션 통계 데이터 저장 및 검증
- 통계 및 랭킹 서비스 연동
- 업적 달성 체크

### 3. Statistics Module (통계 모듈)

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Statistics]),
    TimerModule,
    TasksModule,
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    }),
  ],
  controllers: [StatisticsController],
  providers: [
    StatisticsService,
    StatisticsRepository,
    DailyAggregator,
    WeeklyAggregator,
    MonthlyAggregator,
  ],
  exports: [StatisticsService],
})
export class StatisticsModule {}
```

**주요 기능:**
- 통계 데이터 집계 및 분석
- Redis 캐싱으로 성능 최적화
- 플러그인 형태의 집계기 구조
- 스케줄러를 통한 정기 집계

### 4. Ranking Module (랭킹 모듈)

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RankingSnapshot,
      UserAchievement,
      User,
      TimerSession,
    ]),
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [RankingController],
  providers: [
    RankingService,
    RankingRepository,
    AchievementService,
    DailyRankingCalculator,
    WeeklyRankingCalculator,
    MonthlyRankingCalculator,
    RankingScheduler,
  ],
  exports: [RankingService, AchievementService],
})
export class RankingModule {}
```

**주요 기능:**
- 실시간 랭킹 계산 및 캐싱
- 일간/주간/월간 랭킹 스냅샷 생성
- 업적 시스템 관리
- 순위 변동 추적

**랭킹 계산 스케줄:**
```typescript
@Injectable()
export class RankingScheduler {
  @Cron('0 0 * * *')  // 매일 자정
  async calculateDailyRanking() {
    await this.rankingService.generateDailySnapshot();
  }

  @Cron('0 0 * * 1')  // 매주 월요일 자정
  async calculateWeeklyRanking() {
    await this.rankingService.generateWeeklySnapshot();
  }

  @Cron('0 0 1 * *')  // 매월 1일 자정
  async calculateMonthlyRanking() {
    await this.rankingService.generateMonthlySnapshot();
  }

  @Cron('*/5 * * * *')  // 5분마다
  async updateRealtimeRanking() {
    await this.rankingService.updateRealtimeCache();
  }
}
```

**업적 시스템:**
```typescript
export interface Achievement {
  id: string;
  type: 'first_place' | 'top_10' | 'top_100' | 'streak' | 'milestone';
  conditions: {
    period?: 'daily' | 'weekly' | 'monthly';
    rank?: number;
    consecutiveDays?: number;
    totalHours?: number;
  };
  reward: {
    title: string;
    description: string;
    icon: string;
    points: number;
  };
}
```

## 📊 데이터 흐름

### 1. 일반 API 요청 흐름

```
Client Request
    │
    ▼
API Gateway
    │
    ▼
Rate Limiting Guard
    │
    ▼
JWT Auth Guard
    │
    ▼
Controller
    │
    ▼
Validation Pipe
    │
    ▼
Service Layer
    │
    ▼
Repository Layer
    │
    ├── PostgreSQL (Primary Data)
    └── Redis (Cache)
    │
    ▼
Response Interceptor
    │
    ▼
Client Response
```

### 2. 얼굴 인식 데이터 처리 흐름 (개선된 구조)

```
Frontend (React + @vladmandic/human)
    │
    ├── 실시간 얼굴 감지 & 분석
    │   ├── 웹캠 캡처 (100ms 간격)
    │   ├── 얼굴 특징 추출
    │   ├── 집중도/피로도 계산
    │   └── 클라이언트 통계 집계
    │
    └── 세션 종료 시
        │
        ▼ HTTP POST (통계 데이터만)
    API Gateway
        │
        ▼
    Session Controller
        │
        ▼
    Data Validation
        │
        ▼
    Session Service
        │
        ├── Session Update
        │   └── PostgreSQL
        │
        ├── Statistics Update
        │   └── Statistics Service
        │
        └── Ranking Update
            └── Ranking Service
```

## 🗄️ 캐싱 전략

### Redis 활용

```typescript
// 캐싱 구조
{
  // 활성 세션
  "session:{userId}": {
    sessionId: string,
    taskId: string,
    startTime: number,
    status: string
  },

  // 통계 캐시
  "stats:daily:{userId}:{date}": {
    data: DailyStats,
    ttl: 3600 // 1시간
  },

  // 랭킹 캐시
  "ranking:{period}": {
    data: Array<RankingEntry>,
    ttl: 300 // 5분
  },

  "ranking:user:{userId}:{period}": {
    rank: number,
    percentile: number,
    ttl: 300 // 5분
  },

  // 사용자 설정
  "user:settings:{userId}": {
    settings: UserSettings,
    ttl: 86400 // 24시간
  }
}
```

### 캐시 무효화 전략

1. **TTL 기반**: 통계 데이터는 TTL 설정
2. **이벤트 기반**: 데이터 변경 시 즉시 무효화
3. **스케줄 기반**: 정기적인 캐시 갱신

## 🔌 외부 서비스 통합

### 1. 이메일 서비스

```typescript
@Injectable()
export class EmailService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async sendWelcomeEmail(user: User): Promise<void> {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Welcome to WP Face Timer',
      template: './welcome',
      context: { name: user.name },
    });
  }
}
```

## ⚡ 성능 최적화

### 1. 데이터베이스 최적화

```typescript
// Query Optimization with TypeORM
@Injectable()
export class SessionRepository {
  async getSessionsWithStats(userId: string, date: Date) {
    return this.sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.task', 'task')
      .leftJoinAndSelect('session.pauses', 'pauses')
      .where('session.userId = :userId', { userId })
      .andWhere('DATE(session.startTime) = :date', { date })
      .select([
        'session.id',
        'session.startTime',
        'session.duration',
        'task.title',
        'COUNT(pauses.id) as pauseCount',
      ])
      .groupBy('session.id')
      .cache(60000) // 1분 캐싱
      .getRawMany();
  }
}
```

### 2. 배치 처리

```typescript
// Bull Queue를 사용한 배치 처리
@Processor('face-data-processing')
export class FaceDataProcessor {
  @Process('batch-insert')
  async handleBatchInsert(job: Job) {
    const { sessionId, dataPoints } = job.data;

    // 대량 삽입 최적화
    await this.faceDataRepo
      .createQueryBuilder()
      .insert()
      .into(FaceDetectionData)
      .values(dataPoints)
      .execute();
  }

  @Process('aggregate-stats')
  async handleAggregation(job: Job) {
    // 통계 집계 처리
  }
}
```

### 3. 연결 풀링

```typescript
// TypeORM 연결 설정
export const databaseConfig = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,

  // 연결 풀 설정
  extra: {
    max: 20,              // 최대 연결 수
    min: 5,               // 최소 연결 수
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // 쿼리 캐싱
  cache: {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
    duration: 30000, // 30초
  },
};
```

## 🔒 보안 아키텍처

### 1. 인증/인가 계층

```typescript
// 다층 보안 구조
@Controller('protected')
@UseGuards(RateLimitGuard)      // 1. Rate Limiting
@UseGuards(JwtAuthGuard)        // 2. JWT 인증
@UseGuards(RolesGuard)          // 3. 역할 기반 접근 제어
export class ProtectedController {
  @Get('admin')
  @Roles('ADMIN')               // 4. 세부 권한 체크
  getAdminData() {
    // ...
  }
}
```

### 2. 데이터 암호화

```typescript
@Injectable()
export class EncryptionService {
  private algorithm = 'aes-256-cbc';
  private key: Buffer;
  private iv: Buffer;

  constructor(configService: ConfigService) {
    this.key = crypto.scryptSync(
      configService.get('ENCRYPTION_KEY'),
      'salt',
      32
    );
    this.iv = Buffer.alloc(16, 0);
  }

  encrypt(text: string): string {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decrypt(encrypted: string): string {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

## 🧪 테스트 전략

### 1. 유닛 테스트

```typescript
describe('TimerService', () => {
  let service: TimerService;
  let repository: MockType<Repository<TimerSession>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TimerService,
        {
          provide: getRepositoryToken(TimerSession),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<TimerService>(TimerService);
    repository = module.get(getRepositoryToken(TimerSession));
  });

  it('should start a new timer session', async () => {
    // Test implementation
  });
});
```

### 2. 통합 테스트

```typescript
describe('Timer API Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/timer/start (POST)', () => {
    return request(app.getHttpServer())
      .post('/timer/start')
      .set('Authorization', 'Bearer ' + token)
      .send({ taskId: 'test-task' })
      .expect(201);
  });
});
```

## 📈 모니터링 & 로깅

### 1. 로깅 구조

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const userId = request.user?.id;

    Logger.log(
      `${method} ${url} - User: ${userId}`,
      'HTTP'
    );

    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - start;
        Logger.log(
          `${method} ${url} - ${responseTime}ms`,
          'HTTP'
        );
      }),
    );
  }
}
```

### 2. 메트릭 수집

```typescript
// Prometheus 메트릭
@Injectable()
export class MetricsService {
  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
  });

  private readonly activeSessionsGauge = new Gauge({
    name: 'active_timer_sessions',
    help: 'Number of active timer sessions',
  });

  recordHttpRequest(method: string, route: string, status: number, duration: number) {
    this.httpRequestDuration.labels(method, route, status.toString()).observe(duration);
  }

  setActiveSessions(count: number) {
    this.activeSessionsGauge.set(count);
  }
}
```

## 🚀 배포 아키텍처

### 1. Docker 컨테이너화

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 2. Kubernetes 배포

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wp-face-timer-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: wp-face-timer-backend
  template:
    metadata:
      labels:
        app: wp-face-timer-backend
    spec:
      containers:
      - name: backend
        image: wp-face-timer/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## 🔄 CI/CD 파이프라인

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          npm ci
          npm run test
          npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AWS ECS
        run: |
          # ECS 배포 스크립트
```

## 📊 확장성 고려사항

1. **마이크로서비스 전환 준비**
   - 모듈별 독립적 배포 가능한 구조
   - 메시지 큐를 통한 비동기 통신

2. **수평 확장**
   - Stateless 설계로 쉬운 스케일링
   - Redis를 통한 세션 공유

3. **부하 분산**
   - 읽기 전용 DB 복제본 활용
   - CDN을 통한 정적 자원 제공