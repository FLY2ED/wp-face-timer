# API 명세서

## 📌 개요

WP Face Timer 백엔드 API는 RESTful 원칙을 따르며, NestJS 프레임워크를 기반으로 구현됩니다.

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://timer.naldadev.com/api/v1
```

### 인증
- JWT Bearer Token 방식 사용
- Header: `Authorization: Bearer {token}`

### 응답 형식
```typescript
// 성공 응답
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}

// 에러 응답
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

## 🔐 인증 API

### 회원가입
```http
POST /auth/register
```

**Request Body:**
```typescript
{
  "email": string;       // 이메일
  "password": string;    // 비밀번호 (최소 8자)
  "name": string;        // 사용자 이름
  "timezone": string;    // 시간대 (예: "Asia/Seoul")
}
```

**Response:**
```typescript
{
  "user": {
    "id": string;
    "email": string;
    "name": string;
    "createdAt": string;
  },
  "tokens": {
    "accessToken": string;
    "refreshToken": string;
  }
}
```

### 로그인
```http
POST /auth/login
```

**Request Body:**
```typescript
{
  "email": string;
  "password": string;
}
```

**Response:**
```typescript
{
  "user": {
    "id": string;
    "email": string;
    "name": string;
    "avatar": string | null;
  },
  "tokens": {
    "accessToken": string;
    "refreshToken": string;
  }
}
```

### 토큰 갱신
```http
POST /auth/refresh
```

**Request Body:**
```typescript
{
  "refreshToken": string;
}
```

**Response:**
```typescript
{
  "accessToken": string;
  "refreshToken": string;
}
```

### 로그아웃
```http
POST /auth/logout
```

**Headers:** `Authorization: Bearer {token}`

**Response:**
```typescript
{
  "message": "Successfully logged out"
}
```

## 👤 사용자 API

### 프로필 조회
```http
GET /users/profile
```

**Headers:** `Authorization: Bearer {token}`

**Response:**
```typescript
{
  "id": string;
  "email": string;
  "name": string;
  "avatar": string | null;
  "timezone": string;
  "subscriptionTier": "FREE" | "PREMIUM";
  "settings": {
    "autoStartTimer": boolean;
    "breakReminder": boolean;
    "breakInterval": number;  // minutes
    "dailyGoal": number;      // minutes
  },
  "createdAt": string;
  "updatedAt": string;
}
```

### 프로필 수정
```http
PATCH /users/profile
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```typescript
{
  "name"?: string;
  "avatar"?: string;
  "timezone"?: string;
  "settings"?: {
    "autoStartTimer"?: boolean;
    "breakReminder"?: boolean;
    "breakInterval"?: number;
    "dailyGoal"?: number;
  }
}
```

## ⏱️ 타이머 세션 API

### 타이머 시작
```http
POST /timer/start
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```typescript
{
  "taskId": string;           // 작업 ID
  "initialFaceData"?: {       // 선택적: 초기 얼굴 인식 데이터
    "confidence": number;
    "attentionScore": number;
  }
}
```

**Response:**
```typescript
{
  "sessionId": string;
  "taskId": string;
  "startTime": string;  // ISO 8601
  "status": "ACTIVE";
}
```

### 타이머 일시정지
```http
POST /timer/pause
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```typescript
{
  "sessionId": string;
  "reason"?: "MANUAL" | "FACE_NOT_DETECTED" | "BREAK";
}
```

### 타이머 재개
```http
POST /timer/resume
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```typescript
{
  "sessionId": string;
}
```

### 타이머 종료
```http
POST /timer/stop
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```typescript
{
  "sessionId": string;
  "finalFaceData"?: {
    "averageAttention": number;
    "fatigueLevel": "LOW" | "MEDIUM" | "HIGH";
  }
}
```

**Response:**
```typescript
{
  "sessionId": string;
  "taskId": string;
  "startTime": string;
  "endTime": string;
  "duration": number;      // seconds
  "pauseCount": number;
  "totalPauseTime": number; // seconds
  "faceDetectionStats": {
    "averageAttention": number;
    "averageConfidence": number;
    "fatigueLevel": string;
  }
}
```

### 얼굴 인식 데이터 전송
```http
POST /timer/face-data
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```typescript
{
  "sessionId": string;
  "timestamp": string;      // ISO 8601
  "data": {
    "isDrowsy": boolean;
    "isAttentive": boolean;
    "emotion": string;
    "ear": number;          // Eye Aspect Ratio
    "mar": number;          // Mouth Aspect Ratio
    "isYawning": boolean;
    "gazeDirection": "left" | "right" | "up" | "down" | "center" | "unknown";
    "headPose": {
      "yaw": number;
      "pitch": number;
      "roll": number;
    };
    "blinkRate": number;    // per minute
    "attentionScore": number; // 0-100
    "fatigueLevel": "low" | "medium" | "high";
    "confidence": number;    // 0-100
  }
}
```

**Note:** 이 엔드포인트는 배치로 여러 데이터를 한 번에 전송할 수도 있습니다:
```typescript
{
  "sessionId": string;
  "dataPoints": Array<{
    "timestamp": string;
    "data": { ... }
  }>
}
```

### 세션 목록 조회
```http
GET /timer/sessions
```

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `startDate`: string (ISO 8601)
- `endDate`: string (ISO 8601)
- `taskId`?: string
- `page`?: number (default: 1)
- `limit`?: number (default: 20)

**Response:**
```typescript
{
  "sessions": Array<{
    "id": string;
    "taskId": string;
    "taskTitle": string;
    "startTime": string;
    "endTime": string;
    "duration": number;
    "pauseCount": number;
    "faceDetectionStats": { ... }
  }>;
  "pagination": {
    "page": number;
    "limit": number;
    "total": number;
    "totalPages": number;
  }
}
```

## 📋 작업(Task) API

### 작업 목록 조회
```http
GET /tasks
```

**Headers:** `Authorization: Bearer {token}`

**Response:**
```typescript
{
  "tasks": Array<{
    "id": string;
    "title": string;
    "icon": string;
    "color": string;
    "totalTime": number;      // 총 누적 시간 (seconds)
    "lastUsed": string | null;
    "isActive": boolean;
    "createdAt": string;
  }>
}
```

### 작업 생성
```http
POST /tasks
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```typescript
{
  "title": string;
  "icon"?: string;
  "color"?: string;
}
```

### 작업 수정
```http
PUT /tasks/:id
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```typescript
{
  "title"?: string;
  "icon"?: string;
  "color"?: string;
  "isActive"?: boolean;
}
```

### 작업 삭제
```http
DELETE /tasks/:id
```

**Headers:** `Authorization: Bearer {token}`

## ⏱️ 타이머 세션 API

### 세션 완료 (통계 데이터 전송)
```http
POST /timer/sessions/:sessionId/complete
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```typescript
{
  "endTime": string;  // ISO 8601
  "duration": number;  // seconds
  "pauseCount": number;
  "totalPauseTime": number;  // seconds

  // 클라이언트에서 집계한 얼굴 분석 통계
  "faceStats": {
    "averageAttentionScore": number;  // 0-100
    "highAttentionTime": number;      // seconds
    "lowAttentionTime": number;       // seconds

    "fatigueDistribution": {
      "low": number;     // percentage (0-100)
      "medium": number;  // percentage (0-100)
      "high": number;    // percentage (0-100)
    };

    "emotionDistribution": {
      "positive": number;  // percentage (0-100)
      "neutral": number;   // percentage (0-100)
      "negative": number;  // percentage (0-100)
    };

    "drowsyPercentage": number;  // 0-100
    "yawningCount": number;

    "detectionRate": number;      // 얼굴 감지 성공률 (0-100)
    "averageConfidence": number;   // 평균 신뢰도 (0-100)
  }
}
```

**Response:**
```typescript
{
  "session": {
    "id": string;
    "taskId": string;
    "startTime": string;
    "endTime": string;
    "duration": number;
    "status": "COMPLETED";
    "faceStatsSummary": { /* 전송한 통계 데이터 */ }
  };
  "newAchievements": Array<{
    "id": string;
    "type": string;
    "title": string;
    "description": string;
    "unlockedAt": string;
  }>;
  "updatedRank": {
    "daily": number;
    "weekly": number;
    "monthly": number;
  }
}
```

**Note:**
- 얼굴 인식 원시 데이터는 프라이버시 보호를 위해 클라이언트에서만 처리됩니다
- 서버는 세션 종료 시 집계된 통계 데이터만 수신합니다
- 실시간 얼굴 데이터 전송이 필요하지 않아 네트워크 부담이 감소합니다

## 📊 통계 API

### 일별 통계
```http
GET /statistics/daily
```

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `date`: string (YYYY-MM-DD, default: today)

**Response:**
```typescript
{
  "date": string;
  "totalDuration": number;    // seconds
  "sessionCount": number;
  "taskBreakdown": Array<{
    "taskId": string;
    "taskTitle": string;
    "duration": number;
    "percentage": number;
  }>;
  "hourlyDistribution": Array<{
    "hour": number;
    "duration": number;
  }>;
  "faceDetectionStats": {
    "averageAttention": number;
    "averageConfidence": number;
    "drowsyPercentage": number;
    "emotionBreakdown": Record<string, number>;
  }
}
```

### 주간 통계
```http
GET /statistics/weekly
```

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `startDate`: string (YYYY-MM-DD)

**Response:**
```typescript
{
  "weekStart": string;
  "weekEnd": string;
  "totalDuration": number;
  "dailyAverage": number;
  "dailyBreakdown": Array<{
    "date": string;
    "duration": number;
  }>;
  "taskBreakdown": Array<{
    "taskId": string;
    "taskTitle": string;
    "duration": number;
    "percentage": number;
  }>;
  "productivityTrend": number; // -100 to 100 (compared to previous week)
}
```

### 월간 통계
```http
GET /statistics/monthly
```

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `year`: number
- `month`: number (1-12)

**Response:**
```typescript
{
  "year": number;
  "month": number;
  "totalDuration": number;
  "workingDays": number;
  "dailyAverage": number;
  "weeklyBreakdown": Array<{
    "week": number;
    "duration": number;
  }>;
  "topTasks": Array<{
    "taskId": string;
    "taskTitle": string;
    "duration": number;
  }>;
  "goalAchievement": {
    "target": number;
    "achieved": number;
    "percentage": number;
  }
}
```

### 작업별 통계
```http
GET /statistics/tasks/:taskId
```

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `startDate`: string
- `endDate`: string

**Response:**
```typescript
{
  "task": {
    "id": string;
    "title": string;
  };
  "period": {
    "start": string;
    "end": string;
  };
  "totalDuration": number;
  "sessionCount": number;
  "averageSessionDuration": number;
  "longestSession": {
    "id": string;
    "date": string;
    "duration": number;
  };
  "dailyTrend": Array<{
    "date": string;
    "duration": number;
  }>;
  "timeOfDayAnalysis": Array<{
    "hourRange": string;
    "duration": number;
    "productivity": number;
  }>
}
```

### 커스텀 통계 (확장용)
```http
POST /statistics/custom
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```typescript
{
  "type": string;           // 통계 유형
  "parameters": {           // 유형별 파라미터
    "startDate": string;
    "endDate": string;
    "groupBy"?: "day" | "week" | "month";
    "metrics"?: string[];   // 원하는 메트릭
    "filters"?: {
      "tasks"?: string[];
      "minAttention"?: number;
    }
  }
}
```

**Note:** 이 엔드포인트는 향후 다양한 통계 요구사항을 수용하기 위한 확장 가능한 구조입니다.

## 🏆 랭킹 API

### 전체 랭킹 조회
```http
GET /rankings
```

**Query Parameters:**
- `period`: `daily` | `weekly` | `monthly` (기간 필터)
- `limit`: number (기본: 100, 최대: 500)
- `offset`: number (페이지네이션용, 기본: 0)

**Response:**
```typescript
{
  "rankings": Array<{
    "rank": number;
    "userId": string;
    "userName": string;
    "userAvatar": string | null;
    "totalTime": number;  // seconds
    "sessionCount": number;
    "averageSessionTime": number;  // seconds
    "change": number;  // 순위 변동 (+2, -1, 0 등)
    "isCurrentUser": boolean;
  }>;
  "period": {
    "type": "daily" | "weekly" | "monthly";
    "startDate": string;  // ISO 8601
    "endDate": string;    // ISO 8601
  };
  "pagination": {
    "total": number;
    "limit": number;
    "offset": number;
    "hasMore": boolean;
  };
  "currentUserRank": {
    "rank": number;
    "totalTime": number;
    "percentile": number;  // 상위 몇 %
  } | null;
}
```

### 내 랭킹 정보 조회
```http
GET /rankings/me
```

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `period`: `daily` | `weekly` | `monthly`

**Response:**
```typescript
{
  "daily": {
    "rank": number;
    "totalTime": number;
    "sessionCount": number;
    "percentile": number;
    "change": number;
  };
  "weekly": {
    "rank": number;
    "totalTime": number;
    "sessionCount": number;
    "percentile": number;
    "change": number;
  };
  "monthly": {
    "rank": number;
    "totalTime": number;
    "sessionCount": number;
    "percentile": number;
    "change": number;
  };
  "achievements": Array<{
    "id": string;
    "type": "first_place" | "top_10" | "top_100" | "streak" | "milestone";
    "title": string;
    "description": string;
    "unlockedAt": string | null;
    "icon": string;
  }>;
}
```

### 랭킹 통계
```http
GET /rankings/statistics
```

**Query Parameters:**
- `period`: `daily` | `weekly` | `monthly`

**Response:**
```typescript
{
  "totalParticipants": number;
  "averageTime": number;  // seconds
  "medianTime": number;   // seconds
  "topPerformers": {
    "top1Percent": number;   // 상위 1% 기준 시간
    "top10Percent": number;  // 상위 10% 기준 시간
    "top50Percent": number;  // 상위 50% 기준 시간
  };
  "peakHours": Array<{
    "hour": number;       // 0-23
    "activeUsers": number;
  }>;
}
```

## 🔍 에러 코드

| Code | Description |
|------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 잘못된 이메일 또는 비밀번호 |
| `AUTH_TOKEN_EXPIRED` | 만료된 토큰 |
| `AUTH_TOKEN_INVALID` | 유효하지 않은 토큰 |
| `AUTH_UNAUTHORIZED` | 인증되지 않은 요청 |
| `USER_NOT_FOUND` | 사용자를 찾을 수 없음 |
| `USER_ALREADY_EXISTS` | 이미 존재하는 이메일 |
| `TASK_NOT_FOUND` | 작업을 찾을 수 없음 |
| `SESSION_NOT_FOUND` | 세션을 찾을 수 없음 |
| `SESSION_ALREADY_ACTIVE` | 이미 활성화된 세션 |
| `VALIDATION_ERROR` | 입력값 검증 실패 |
| `SERVER_ERROR` | 서버 내부 오류 |

## 📝 API 버전 관리

- 현재 버전: `v1`
- 버전은 URL 경로에 포함 (`/api/v1/...`)
- 주요 변경사항이 있을 경우 새 버전 출시
- 이전 버전은 최소 6개월간 유지

## 🚦 Rate Limiting

| Tier | Requests per minute | Requests per day |
|------|-------------------|------------------|
| Default | 60 | 5,000 |

Rate limit 초과 시 `429 Too Many Requests` 응답과 함께 다음 헤더 반환:
- `X-RateLimit-Limit`: 한도
- `X-RateLimit-Remaining`: 남은 요청 수
- `X-RateLimit-Reset`: 리셋 시간 (Unix timestamp)

## 🔒 보안 고려사항

1. **HTTPS 필수**: 프로덕션 환경에서는 반드시 HTTPS 사용
2. **CORS 설정**: 허용된 도메인만 API 접근 가능
3. **입력값 검증**: 모든 요청 데이터는 서버에서 검증
4. **SQL Injection 방지**: TypeORM 파라미터 바인딩 사용
5. **Rate Limiting**: DDoS 공격 방지
6. **토큰 보안**:
   - Access Token: 15분 만료
   - Refresh Token: 7일 만료
   - Refresh Token은 HttpOnly Cookie로 전송 권장