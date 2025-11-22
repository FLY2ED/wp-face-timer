# WP Face Timer - 백엔드 개발 문서

## 🎯 프로젝트 개요

**WP Face Timer**는 AI 기반 얼굴 인식 기술을 활용한 개인 생산성 관리 도구입니다. 웹캠을 통해 사용자의 얼굴을 실시간으로 감지하여 자동으로 작업 시간을 기록하고, 집중도와 피로도를 분석합니다.

### 핵심 기능
- 🎥 **AI 얼굴 인식 자동 타이머**: 얼굴이 감지되면 자동 시작, 자리를 비우면 자동 일시정지
- 📊 **상세한 통계 분석**: 작업별 시간 추적, 집중도/피로도 분석
- ⏱️ **스마트 시간 관리**: 작업(Task)별 시간 기록 및 관리

## 🛠 기술 스택

### Backend
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Cache**: Redis
- **Authentication**: JWT (JSON Web Token)

### Frontend (참고)
- **Framework**: React + Vite
- **UI Library**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand, React Context
- **Face Detection**: @vladmandic/human (WebGL 기반 AI 모델)
- **Language**: TypeScript

## 📚 문서 목록

### 1. [API 명세서](./backend-api-specification.md)
- RESTful API 엔드포인트 정의
- Request/Response DTO 스키마
- API 버전 관리
- 에러 코드 및 응답 형식

### 2. [데이터베이스 스키마](./database-schema.md)
- TypeORM Entity 정의
- PostgreSQL 테이블 구조
- 관계 설정 및 인덱싱 전략
- Migration 가이드

### 3. [시스템 아키텍처](./system-architecture.md)
- NestJS 모듈 구조
- 레이어드 아키텍처 설계
- 서비스 간 통신
- Redis 캐싱 전략

### 4. [얼굴 인식 데이터 처리](./face-detection-flow.md)
- 프론트엔드 데이터 수신 및 검증
- 실시간 데이터 처리 파이프라인
- 집중도/피로도 분석 알고리즘
- 데이터 저장 최적화

### 5. [인증 시스템](./authentication-guide.md)
- JWT 기반 인증 구현
- Guards & Interceptors
- 토큰 갱신 전략
- 보안 best practices

## 🏗 프로젝트 구조

```
backend/
├── src/
│   ├── auth/                 # 인증 모듈
│   ├── users/                # 사용자 관리
│   ├── timer/                # 타이머 세션 관리
│   ├── tasks/                # 작업 관리
│   ├── statistics/           # 통계 분석 (확장 가능)
│   ├── common/              # 공통 유틸리티
│   └── config/              # 설정 파일
├── test/                    # 테스트
└── migration/              # DB 마이그레이션
```

## 🚀 빠른 시작

### 환경 요구사항
- Node.js 18.x 이상
- PostgreSQL 14.x 이상
- Redis 7.x 이상

### 환경 변수 설정
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=wp_face_timer

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# App
PORT=3000
NODE_ENV=development
```

### 설치 및 실행
```bash
# 패키지 설치
npm install

# 데이터베이스 마이그레이션
npm run migration:run

# 개발 서버 실행
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod
```

## 📈 확장 계획

### 단기 (v1.0)
- [x] 기본 타이머 기능
- [x] 얼굴 인식 연동
- [x] 사용자 인증
- [ ] 기본 통계

### 중기 (v2.0)
- [ ] 고급 통계 분석
- [ ] 데이터 내보내기
- [ ] 모바일 앱 연동
- [ ] 팀 협업 기능 (선택적)

### 장기 (v3.0)
- [ ] AI 기반 생산성 코칭
- [ ] 타사 도구 통합 (Jira, Notion 등)
- [ ] 음성 명령 지원
- [ ] 멀티 플랫폼 지원

## 💡 주요 고려사항

### 성능 최적화
- Redis를 활용한 세션 데이터 캐싱
- PostgreSQL 인덱싱 최적화
- 대용량 통계 데이터 처리를 위한 배치 작업

### 보안
- JWT 토큰 보안
- API Rate Limiting
- SQL Injection 방지 (TypeORM 파라미터 바인딩)
- XSS/CSRF 방어

### 확장성
- 모듈화된 NestJS 구조
- 통계 시스템 플러그인 아키텍처
- 마이크로서비스 전환 가능한 설계