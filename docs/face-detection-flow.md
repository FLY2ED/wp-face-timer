# 얼굴 인식 데이터 처리 흐름

## 📌 개요

WP Face Timer의 핵심 기능인 AI 기반 얼굴 인식 데이터 처리 시스템입니다. 프론트엔드에서 얼굴 인식 데이터를 실시간으로 분석하고, 세션 종료 시 가공된 통계 데이터만 서버로 전송합니다.

## 🎯 주요 목표

1. **프라이버시 보호**: 원시 얼굴 데이터는 클라이언트에서만 처리
2. **효율성**: 네트워크 트래픽 최소화 및 서버 부하 감소
3. **정확성**: 클라이언트 측 실시간 분석 및 검증
4. **분석 가능성**: 세션별 통계 데이터 저장 및 분석

## 📊 프론트엔드 데이터 구조

### 수집되는 얼굴 인식 데이터

```typescript
interface FaceDetectionData {
  // 기본 상태 정보
  isDrowsy: boolean;          // 졸음 감지
  isAttentive: boolean;       // 집중 여부
  emotion: string;            // 감정 상태 (neutral, happy, sad 등)

  // 얼굴 측정값
  ear: number;                // Eye Aspect Ratio (눈 개폐 정도)
  mar: number;                // Mouth Aspect Ratio (입 벌림 정도)
  isYawning: boolean;         // 하품 여부

  // 시선 및 머리 방향
  gazeDirection: 'left' | 'right' | 'up' | 'down' | 'center' | 'unknown';
  headPose: {
    yaw: number;              // 좌우 회전 (-45 ~ 45도)
    pitch: number;            // 상하 회전 (-30 ~ 30도)
    roll: number;             // 기울기 (-30 ~ 30도)
  };

  // 생체 신호
  blinkRate: number;          // 분당 눈 깜빡임 횟수

  // 종합 지표
  attentionScore: number;     // 집중도 점수 (0-100)
  fatigueLevel: 'low' | 'medium' | 'high';  // 피로도 수준
  confidence: number;         // 감지 신뢰도 (0-100)
}
```

### 데이터 처리 방식

- **클라이언트 수집**: 100ms 간격 (초당 10회)
- **클라이언트 분석**: 실시간 집중도/피로도 계산
- **서버 전송**: 세션 종료 시 통계 데이터만 전송

## 🔄 데이터 처리 파이프라인

```
┌─────────────────────────────────────────────────────┐
│           Frontend (React + @vladmandic/human)       │
│                                                      │
│  1. 웹캠 캡처 → 2. 얼굴 감지 → 3. 특징 추출       │
│                      ↓                               │
│  4. 실시간 분석 → 5. 통계 집계 → 6. 세션 관리     │
│                                                      │
│  ⚡ 클라이언트에서 모든 얼굴 분석 처리              │
└──────────────────────┬──────────────────────────────┘
                      │
                      ▼ HTTP (세션 종료 시)
┌─────────────────────────────────────────────────────┐
│                 API Gateway (Nginx)                  │
└──────────────────────┬──────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              NestJS Backend Entry                    │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │        1. Session Statistics Validation       │  │
│  │          세션 통계 데이터 검증               │  │
│  └─────────────────┬─────────────────────────────┘  │
│                    │                                 │
│  ┌───────────────────────────────────────────────┐  │
│  │         2. Session Data Storage               │  │
│  │           세션 정보 및 통계 저장             │  │
│  └─────────────────┬─────────────────────────────┘  │
│                    │                                 │
│  ┌───────────────────────────────────────────────┐  │
│  │         3. Ranking & Achievement              │  │
│  │          랭킹 업데이트 및 업적 체크          │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                    PostgreSQL                        │
│                                                      │
│  - timer_sessions (세션 정보 + 통계 요약)           │
│  - statistics (일/주/월 집계 데이터)               │
│  - ranking_snapshots (랭킹 데이터)                  │
└──────────────────────────────────────────────────────┘
```

## 💾 세션 종료 시 전송되는 데이터

### 1. 세션 통계 데이터 구조

```typescript
interface SessionStatistics {
  sessionId: string;
  taskId: string;
  startTime: Date;
  endTime: Date;
  duration: number;  // seconds
  pauseCount: number;
  totalPauseTime: number;  // seconds

  // 집계된 얼굴 분석 통계
  faceStats: {
    // 집중도 관련
    averageAttentionScore: number;  // 0-100
    highAttentionTime: number;      // seconds
    lowAttentionTime: number;       // seconds

    // 피로도 관련
    fatigueDistribution: {
      low: number;     // percentage
      medium: number;  // percentage
      high: number;    // percentage
    };

    // 감정 분포
    emotionDistribution: {
      positive: number;  // percentage
      neutral: number;   // percentage
      negative: number;  // percentage
    };

    // 졸음 지표
    drowsyPercentage: number;  // 0-100
    yawningCount: number;

    // 데이터 품질
    detectionRate: number;  // 얼굴 감지 성공률 (0-100)
    averageConfidence: number;  // 평균 신뢰도 (0-100)
  };
}

```

### 2. 서버 데이터 검증

```typescript
@Injectable()
export class SessionStatisticsValidationService {
  validateSessionStats(data: SessionStatistics): boolean {
    // 필수 필드 검증
    if (!data.sessionId || !data.taskId || !data.startTime || !data.endTime) {
      throw new BadRequestException('Missing required session fields');
    }

    // 시간 유효성 검증
    if (data.endTime <= data.startTime) {
      throw new BadRequestException('Invalid session time range');
    }

    // 통계 범위 검증
    this.validateStatRanges(data.faceStats);

    return true;
  }

  private validateStatRanges(stats: SessionStatistics['faceStats']): void {
    // 백분율 합계 검증
    const fatigueSum = stats.fatigueDistribution.low +
                      stats.fatigueDistribution.medium +
                      stats.fatigueDistribution.high;

    if (Math.abs(fatigueSum - 100) > 0.01) {
      throw new BadRequestException('Invalid fatigue distribution');
    }

    const emotionSum = stats.emotionDistribution.positive +
                      stats.emotionDistribution.neutral +
                      stats.emotionDistribution.negative;

    if (Math.abs(emotionSum - 100) > 0.01) {
      throw new BadRequestException('Invalid emotion distribution');
    }

    // 범위 검증 (0-100)
    if (stats.averageAttentionScore < 0 || stats.averageAttentionScore > 100 ||
        stats.drowsyPercentage < 0 || stats.drowsyPercentage > 100 ||
        stats.detectionRate < 0 || stats.detectionRate > 100 ||
        stats.averageConfidence < 0 || stats.averageConfidence > 100) {
      throw new BadRequestException('Statistics values out of range');
    }
  }
}
```

## ⚡ 세션 종료 처리

### 1. Session Completion Endpoint

```typescript
@Controller('sessions')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly statisticsService: StatisticsService,
    private readonly rankingService: RankingService,
  ) {}

  @Post(':sessionId/complete')
  @UseGuards(JwtAuthGuard)
  async completeSession(
    @Param('sessionId') sessionId: string,
    @Body() statistics: SessionStatistics,
    @CurrentUser() user: User,
  ): Promise<SessionCompleteResponse> {
    // 1. 통계 데이터 검증
    await this.sessionService.validateStatistics(statistics);

    // 2. 세션 업데이트 및 통계 저장
    const session = await this.sessionService.completeSession(
      sessionId,
      statistics,
      user.id,
    );

    // 3. 일/주/월 통계 업데이트
    await this.statisticsService.updateAggregates(user.id, statistics);

    // 4. 랭킹 업데이트
    await this.rankingService.updateUserRanking(user.id);

    // 5. 업적 체크
    const newAchievements = await this.checkAchievements(user.id, session);

    return {
      session,
      newAchievements,
      updatedRank: await this.rankingService.getUserRank(user.id),
    };
  }
}
```

## 📡 클라이언트 측 얼굴 분석 처리

### 1. Frontend 실시간 분석

```typescript
// Frontend (React)
class FaceAnalysisService {
  private dataBuffer: FaceDetectionData[] = [];
  private sessionStats: SessionStatistics;

  constructor() {
    this.resetSessionStats();
  }

  // 실시간 얼굴 데이터 처리
  processFaceData(data: FaceDetectionData): void {
    // 버퍼에 저장
    this.dataBuffer.push(data);

    // 5초마다 통계 업데이트
    if (this.dataBuffer.length >= 50) {
      this.updateStatistics();
      this.dataBuffer = [];
    }

    // 실시간 경고 체크
    this.checkAlerts(data);
  }

  // 통계 업데이트
  private updateStatistics(): void {
    const stats = this.sessionStats.faceStats;

    // 집중도 계산
    const avgAttention = this.dataBuffer.reduce(
      (sum, d) => sum + d.attentionScore, 0
    ) / this.dataBuffer.length;

    stats.averageAttentionScore =
      (stats.averageAttentionScore + avgAttention) / 2;

    // 피로도 분포 업데이트
    this.dataBuffer.forEach(d => {
      if (d.fatigueLevel === 'low') stats.fatigueDistribution.low++;
      else if (d.fatigueLevel === 'medium') stats.fatigueDistribution.medium++;
      else stats.fatigueDistribution.high++;
    });

    // 감정 분포 업데이트
    this.dataBuffer.forEach(d => {
      const emotion = this.normalizeEmotion(d.emotion);
      stats.emotionDistribution[emotion]++;
    });

    // 졸음 지표
    const drowsyCount = this.dataBuffer.filter(d => d.isDrowsy).length;
    stats.drowsyPercentage = (drowsyCount / this.dataBuffer.length) * 100;

    // 하품 횟수
    stats.yawningCount += this.dataBuffer.filter(d => d.isYawning).length;
  }

  // 세션 종료 시 최종 통계 반환
  getSessionStatistics(): SessionStatistics {
    // 퍼센티지로 정규화
    const total = this.sessionStats.faceStats.fatigueDistribution;
    const sum = total.low + total.medium + total.high;

    if (sum > 0) {
      total.low = (total.low / sum) * 100;
      total.medium = (total.medium / sum) * 100;
      total.high = (total.high / sum) * 100;
    }

    // 감정 분포도 동일하게 처리
    const emotion = this.sessionStats.faceStats.emotionDistribution;
    const emotionSum = emotion.positive + emotion.neutral + emotion.negative;

    if (emotionSum > 0) {
      emotion.positive = (emotion.positive / emotionSum) * 100;
      emotion.neutral = (emotion.neutral / emotionSum) * 100;
      emotion.negative = (emotion.negative / emotionSum) * 100;
    }

    return this.sessionStats;
  }

  // 실시간 경고 체크 (클라이언트에서 처리)
  private checkAlerts(data: FaceDetectionData): void {
    // 졸음 감지
    if (data.isDrowsy) {
      this.showAlert('DROWSINESS', '졸음이 감지되었습니다. 휴식을 취하세요.');
    }

    // 집중도 저하
    if (data.attentionScore < 30) {
      this.showAlert('LOW_ATTENTION', '집중도가 낮아졌습니다.');
    }

    // 피로도 높음
    if (data.fatigueLevel === 'high') {
      this.showAlert('HIGH_FATIGUE', '피로도가 높습니다. 잠시 휴식을 취하세요.');
    }
  }
}
```

## 📊 서버 측 데이터 저장

### 1. 세션 데이터 저장 서비스

```typescript
@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly statisticsService: StatisticsService,
    private readonly cacheManager: Cache,
  ) {}

  async completeSession(
    sessionId: string,
    statistics: SessionStatistics,
    userId: string,
  ): Promise<TimerSession> {
    // 1. 세션 업데이트
    const session = await this.sessionRepository.update(sessionId, {
      endTime: statistics.endTime,
      duration: statistics.duration,
      pauseCount: statistics.pauseCount,
      totalPauseTime: statistics.totalPauseTime,
      status: 'COMPLETED',
      faceStatsSummary: statistics.faceStats,  // 통계만 저장
    });

    // 2. Redis 캐시 정리
    await this.cacheManager.del(`session:${sessionId}`);

    // 3. 일별 통계 업데이트
      await this.updateSessionStatistics(sessionId, compressed);

      // 4. 일일 통계 업데이트
      await this.statisticsService.updateDaily(sessionId, compressed);

    } catch (error) {
      Logger.error(`Batch processing failed: ${error.message}`);
      throw error;
    }
  }

  private compressData(dataPoints: FaceDetectionData[]): CompressedData[] {
    // 시간 간격별 그룹화 (1초 단위)
    const grouped = this.groupByTimeInterval(dataPoints, 1000);

    return grouped.map(group => ({
      timestamp: group[0].timestamp,
      count: group.length,

      // 평균값
      avgAttention: this.average(group.map(d => d.attentionScore)),
      avgConfidence: this.average(group.map(d => d.confidence)),
      avgEar: this.average(group.map(d => d.ear)),
      avgMar: this.average(group.map(d => d.mar)),

      // 최빈값
      dominantEmotion: this.mode(group.map(d => d.emotion)),
      dominantGaze: this.mode(group.map(d => d.gazeDirection)),
      dominantFatigue: this.mode(group.map(d => d.fatigueLevel)),

      // 카운트
      drowsyCount: group.filter(d => d.isDrowsy).length,
      yawnCount: group.filter(d => d.isYawning).length,

      // 원시 데이터 (선택적 저장)
      rawData: process.env.STORE_RAW_DATA === 'true' ? group : null,
    }));
  }

  @Process('cleanup-old-data')
  @Cron('0 2 * * *') // 매일 새벽 2시
  async handleCleanup(): Promise<void> {
    const retentionDays = parseInt(process.env.FACE_DATA_RETENTION_DAYS || '90');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // 오래된 원시 데이터 삭제
    const deleted = await this.faceDataRepository.deleteOldData(cutoffDate);
    Logger.log(`Cleaned up ${deleted} old face detection records`);
  }
}
```

### 2. 데이터 압축 전략

```typescript
@Injectable()
export class DataCompressionService {
  compressForStorage(data: FaceDetectionData[]): CompressedBatch {
    // 1. 시계열 압축 (Delta Encoding)
    const timestamps = this.deltaEncode(data.map(d => d.timestamp));

    // 2. 수치 데이터 압축 (Quantization)
    const quantized = {
      attentionScores: this.quantize(data.map(d => d.attentionScore), 10),
      ears: this.quantize(data.map(d => d.ear), 100),
      mars: this.quantize(data.map(d => d.mar), 100),
    };

    // 3. 카테고리 데이터 압축 (Dictionary Encoding)
    const dictEncoded = {
      emotions: this.dictionaryEncode(data.map(d => d.emotion)),
      gazeDirections: this.dictionaryEncode(data.map(d => d.gazeDirection)),
      fatigueLevels: this.dictionaryEncode(data.map(d => d.fatigueLevel)),
    };

    // 4. 불린 데이터 압축 (Bit Packing)
    const packed = {
      isDrowsy: this.bitPack(data.map(d => d.isDrowsy)),
      isAttentive: this.bitPack(data.map(d => d.isAttentive)),
      isYawning: this.bitPack(data.map(d => d.isYawning)),
    };

    return {
      timestamps,
      quantized,
      dictEncoded,
      packed,
      originalCount: data.length,
    };
  }

  decompressFromStorage(compressed: CompressedBatch): FaceDetectionData[] {
    // 역변환 로직
    const timestamps = this.deltaDecode(compressed.timestamps);
    const attentionScores = this.dequantize(compressed.quantized.attentionScores, 10);
    // ... 나머지 역변환

    return timestamps.map((timestamp, i) => ({
      timestamp,
      attentionScore: attentionScores[i],
      // ... 나머지 필드 복원
    }));
  }
}
```

## 📊 통계 집계 및 분석

### 1. 실시간 통계

```typescript
@Injectable()
export class RealtimeStatisticsService {
  async calculateSessionStats(sessionId: string): Promise<SessionStatistics> {
    // Redis에서 버퍼 데이터 가져오기
    const buffer = await this.cacheManager.get<ProcessedData[]>(
      `session:${sessionId}:face-data`
    );

    if (!buffer || buffer.length === 0) {
      return this.getEmptyStats();
    }

    // 시간대별 분석
    const timeAnalysis = this.analyzeByTimeWindow(buffer);

    // 패턴 감지
    const patterns = this.detectPatterns(buffer);

    // 이상치 감지
    const anomalies = this.detectAnomalies(buffer);

    return {
      summary: {
        totalDataPoints: buffer.length,
        duration: this.calculateDuration(buffer),
        averageAttention: this.calculateAverage(buffer, 'attentionScore'),
        averageConfidence: this.calculateAverage(buffer, 'confidence'),
      },
      timeAnalysis,
      patterns,
      anomalies,
      recommendations: this.generateRecommendations(patterns, anomalies),
    };
  }

  private detectPatterns(data: ProcessedData[]): Pattern[] {
    const patterns = [];

    // 1. 주기적 패턴 감지 (예: 규칙적인 집중도 하락)
    const attentionCycle = this.detectCyclicalPattern(
      data.map(d => d.data.attentionScore)
    );
    if (attentionCycle) {
      patterns.push({
        type: 'ATTENTION_CYCLE',
        period: attentionCycle.period,
        strength: attentionCycle.strength,
      });
    }

    // 2. 추세 감지 (예: 점진적 피로도 증가)
    const fatigueTrend = this.detectTrend(
      data.map(d => d.data.fatigueLevel === 'high' ? 1 : 0)
    );
    if (fatigueTrend.slope > 0.1) {
      patterns.push({
        type: 'INCREASING_FATIGUE',
        slope: fatigueTrend.slope,
        confidence: fatigueTrend.confidence,
      });
    }

    // 3. 상관관계 감지
    const correlation = this.calculateCorrelation(
      data.map(d => d.data.attentionScore),
      data.map(d => d.data.blinkRate)
    );
    if (Math.abs(correlation) > 0.5) {
      patterns.push({
        type: 'ATTENTION_BLINK_CORRELATION',
        correlation,
      });
    }

    return patterns;
  }
}
```

### 2. 일일 집계

```typescript
@Injectable()
export class DailyAggregationService {
  @Cron('0 * * * *') // 매시간
  async aggregateHourlyStats(): Promise<void> {
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);

    const sessions = await this.getActiveSessionsForHour(currentHour);

    for (const session of sessions) {
      const rawData = await this.getFaceDataForSession(
        session.id,
        currentHour,
        new Date()
      );

      if (rawData.length === 0) continue;

      const aggregated = {
        sessionId: session.id,
        userId: session.userId,
        hour: currentHour,

        // 기본 통계
        dataPoints: rawData.length,
        averageAttention: this.average(rawData, 'attentionScore'),
        averageConfidence: this.average(rawData, 'confidence'),

        // 분포 통계
        attentionDistribution: this.calculateDistribution(
          rawData.map(d => d.attentionScore)
        ),

        // 카운트 통계
        drowsinessCount: rawData.filter(d => d.isDrowsy).length,
        yawnCount: rawData.filter(d => d.isYawning).length,

        // 감정 분포
        emotionBreakdown: this.groupBy(rawData, 'emotion'),

        // 피로도 분포
        fatigueBreakdown: this.groupBy(rawData, 'fatigueLevel'),

        // 생산성 지표
        productivityScore: this.calculateProductivityScore(rawData),
      };

      await this.saveHourlyStats(aggregated);
    }
  }

  private calculateProductivityScore(data: FaceDetectionData[]): number {
    let score = 100;

    // 집중도 기반 (-40점)
    const avgAttention = this.average(data, 'attentionScore');
    score -= Math.max(0, 40 - avgAttention * 0.4);

    // 졸음 빈도 (-30점)
    const drowsinessRate = data.filter(d => d.isDrowsy).length / data.length;
    score -= drowsinessRate * 30;

    // 자세 유지 (-20점)
    const poorPostureRate = data.filter(d =>
      Math.abs(d.headPose.yaw) > 20 || Math.abs(d.headPose.pitch) > 15
    ).length / data.length;
    score -= poorPostureRate * 20;

    // 일관성 보너스 (+10점)
    const attentionStdDev = this.standardDeviation(
      data.map(d => d.attentionScore)
    );
    if (attentionStdDev < 15) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }
}
```

## 🔍 패턴 분석 알고리즘

### 1. 집중도 패턴 분석

```typescript
@Injectable()
export class AttentionPatternAnalyzer {
  analyzeAttentionPatterns(data: FaceDetectionData[]): AttentionAnalysis {
    // 1. 집중 구간 식별
    const focusZones = this.identifyFocusZones(data);

    // 2. 집중력 저하 트리거 분석
    const distractionTriggers = this.identifyDistractionTriggers(data);

    // 3. 최적 집중 시간대 찾기
    const optimalTimes = this.findOptimalFocusTimes(data);

    // 4. 집중 지속 시간 분석
    const focusDurations = this.analyzeFocusDurations(focusZones);

    return {
      focusZones,
      distractionTriggers,
      optimalTimes,
      focusDurations,
      recommendations: this.generateRecommendations({
        focusZones,
        distractionTriggers,
        optimalTimes,
        focusDurations,
      }),
    };
  }

  private identifyFocusZones(data: FaceDetectionData[]): FocusZone[] {
    const zones = [];
    let currentZone = null;
    const FOCUS_THRESHOLD = 70;
    const MIN_DURATION = 60000; // 1분

    for (let i = 0; i < data.length; i++) {
      const point = data[i];

      if (point.attentionScore >= FOCUS_THRESHOLD) {
        if (!currentZone) {
          currentZone = {
            start: point.timestamp,
            scores: [point.attentionScore],
          };
        } else {
          currentZone.scores.push(point.attentionScore);
        }
      } else if (currentZone) {
        currentZone.end = data[i - 1].timestamp;
        currentZone.duration = currentZone.end - currentZone.start;
        currentZone.averageScore = this.average(currentZone.scores);

        if (currentZone.duration >= MIN_DURATION) {
          zones.push(currentZone);
        }
        currentZone = null;
      }
    }

    return zones;
  }
}
```

### 2. 피로도 예측

```typescript
@Injectable()
export class FatiguePredictionService {
  predictFatigue(historical: FaceDetectionData[]): FatiguePrediction {
    // 특징 추출
    const features = this.extractFeatures(historical);

    // 피로도 증가율 계산
    const fatigueRate = this.calculateFatigueRate(historical);

    // 예측 모델 (간단한 선형 회귀)
    const prediction = this.linearRegression(features, fatigueRate);

    // 휴식 권장 시점 계산
    const recommendedBreakTime = this.calculateBreakTime(prediction);

    return {
      currentLevel: this.getCurrentFatigueLevel(historical),
      predictedLevel: prediction.level,
      timeToHighFatigue: prediction.timeToHigh,
      recommendedBreakTime,
      confidence: prediction.confidence,
    };
  }

  private extractFeatures(data: FaceDetectionData[]): Features {
    const recent = data.slice(-100); // 최근 100개 데이터

    return {
      avgBlinkRate: this.average(recent.map(d => d.blinkRate)),
      blinkRateTrend: this.calculateTrend(recent.map(d => d.blinkRate)),
      yawnFrequency: recent.filter(d => d.isYawning).length / recent.length,
      attentionDecline: this.calculateDecline(recent.map(d => d.attentionScore)),
      drowsinessRate: recent.filter(d => d.isDrowsy).length / recent.length,
      earTrend: this.calculateTrend(recent.map(d => d.ear)),
    };
  }
}
```

## 🎯 성능 최적화

### 1. 데이터 샘플링

```typescript
@Injectable()
export class DataSamplingService {
  // 적응형 샘플링: 변화가 큰 구간은 더 자주 샘플링
  adaptiveSample(data: FaceDetectionData[]): FaceDetectionData[] {
    const sampled = [];
    let lastSampled = null;

    for (const point of data) {
      if (!lastSampled) {
        sampled.push(point);
        lastSampled = point;
        continue;
      }

      // 변화량 계산
      const change = this.calculateChange(lastSampled, point);

      // 변화가 크면 샘플링 간격 줄임
      const samplingInterval = change > 0.3 ? 100 : 500; // ms

      if (point.timestamp - lastSampled.timestamp >= samplingInterval) {
        sampled.push(point);
        lastSampled = point;
      }
    }

    return sampled;
  }

  private calculateChange(prev: FaceDetectionData, curr: FaceDetectionData): number {
    const attentionChange = Math.abs(curr.attentionScore - prev.attentionScore) / 100;
    const earChange = Math.abs(curr.ear - prev.ear) * 2;
    const emotionChange = curr.emotion !== prev.emotion ? 0.5 : 0;

    return Math.max(attentionChange, earChange, emotionChange);
  }
}
```

### 2. 인덱싱 최적화

```sql
-- 시계열 쿼리 최적화
CREATE INDEX idx_face_detection_session_timestamp
ON face_detection_data(session_id, timestamp DESC);

-- 통계 쿼리 최적화
CREATE INDEX idx_face_detection_attention
ON face_detection_data(session_id, attention_score)
WHERE attention_score < 50;

-- 파티셔닝 (월별)
CREATE TABLE face_detection_data_2024_01
PARTITION OF face_detection_data
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## 🔒 보안 및 프라이버시

### 1. 데이터 익명화

```typescript
@Injectable()
export class DataAnonymizationService {
  anonymize(data: FaceDetectionData): AnonymizedData {
    return {
      // 개인 식별 정보 제거
      sessionHash: this.hashSession(data.sessionId),

      // 정밀도 감소
      attentionScore: Math.round(data.attentionScore / 10) * 10,

      // 카테고리화
      blinkRateCategory: this.categorizeBlinkRate(data.blinkRate),

      // 시간 정보 일반화
      timeSlot: this.getTimeSlot(data.timestamp),

      // 민감 정보 제외
      emotion: data.emotion === 'sad' || data.emotion === 'angry'
        ? 'negative'
        : data.emotion,
    };
  }

  private categorizeBlinkRate(rate: number): string {
    if (rate < 10) return 'low';
    if (rate < 20) return 'normal';
    return 'high';
  }
}
```

### 2. 데이터 접근 제어

```typescript
@Injectable()
export class DataAccessControlService {
  async canAccessFaceData(
    userId: string,
    sessionId: string
  ): Promise<boolean> {
    // 세션 소유자 확인
    const session = await this.sessionRepository.findOne(sessionId);

    if (!session) {
      return false;
    }

    // 본인 데이터만 접근 가능
    return session.userId === userId;
  }

  // GDPR 준수: 데이터 삭제 요청
  async deleteUserFaceData(userId: string): Promise<void> {
    await this.faceDataRepository.delete({ userId });
    await this.cacheManager.del(`user:${userId}:*`);
  }
}
```

## 📈 모니터링 및 알림

### 1. 실시간 알림 시스템

```typescript
@Injectable()
export class AlertingService {
  private alertRules = [
    {
      name: 'DROWSINESS_ALERT',
      condition: (data) => data.isDrowsy,
      threshold: 3, // 3회 연속
      action: 'NOTIFY_USER',
    },
    {
      name: 'LOW_ATTENTION_ALERT',
      condition: (data) => data.attentionScore < 30,
      threshold: 10, // 10회 연속
      action: 'SUGGEST_BREAK',
    },
    {
      name: 'POSTURE_ALERT',
      condition: (data) => Math.abs(data.headPose.yaw) > 30,
      threshold: 20,
      action: 'POSTURE_REMINDER',
    },
  ];

  async checkAlerts(data: FaceDetectionData, sessionId: string): Promise<Alert[]> {
    const alerts = [];

    for (const rule of this.alertRules) {
      const count = await this.getConsecutiveCount(sessionId, rule.name);

      if (rule.condition(data)) {
        await this.incrementCount(sessionId, rule.name);

        if (count >= rule.threshold) {
          alerts.push({
            type: rule.name,
            action: rule.action,
            timestamp: Date.now(),
          });

          await this.resetCount(sessionId, rule.name);
        }
      } else {
        await this.resetCount(sessionId, rule.name);
      }
    }

    return alerts;
  }
}
```

## 🚀 확장 계획

1. **기계 학습 모델 통합**
   - 개인화된 집중도 예측
   - 이상 패턴 자동 감지

2. **실시간 대시보드**
   - WebSocket 기반 실시간 차트
   - 팀 단위 모니터링 (향후)

3. **고급 분석**
   - 시계열 예측 (ARIMA)
   - 클러스터링을 통한 사용자 그룹화

4. **하드웨어 통합**
   - 웨어러블 디바이스 연동
   - 다중 카메라 지원