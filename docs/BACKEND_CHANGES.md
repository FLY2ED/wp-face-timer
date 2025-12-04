# 백엔드 변경사항 (2025-12-05)

## 요약
로그인 버그 수정 및 `/auth/me` 엔드포인트 추가

## 변경 파일 및 내용

### 1. `src/auth/auth.controller.ts`

#### 변경 1: Import에 `Get` 추가
```typescript
import {
  Controller,
  Post,
  Get,  // 추가
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
```

#### 변경 2: login 메서드에서 `LocalAuthGuard` 제거
```typescript
// 변경 전
@Public()
@UseGuards(LocalAuthGuard)
@Post('login')
...
async login(
  @Body() loginDto: LoginDto,
  @Request() req,
): Promise<AuthResponseDto> {
  return this.authService.login(req.user);
}

// 변경 후
@Public()
@Post('login')
...
async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
  return this.authService.login(loginDto);
}
```

#### 변경 3: `/auth/me` 엔드포인트 추가 (파일 끝, `}` 위에 추가)
```typescript
@Get('me')
@ApiBearerAuth()
@ApiOperation({ summary: 'Get current user profile' })
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Current user profile',
})
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: 'Unauthorized',
})
async getMe(@CurrentUser() user: User): Promise<Omit<User, 'password'>> {
  const { password, ...userWithoutPassword } = user as any;
  return userWithoutPassword;
}
```

---

### 2. `src/auth/auth.service.ts`

#### 변경: `generateAuthResponse` 메서드에서 password 제거
```typescript
// 변경 전
return {
  accessToken,
  refreshToken: refreshToken.token,
  user: user,
  expiresIn,
};

// 변경 후
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { password, ...userWithoutPassword } = user as any;

return {
  accessToken,
  refreshToken: refreshToken.token,
  user: userWithoutPassword,
  expiresIn,
};
```

---

### 3. `src/users/entities/user.entity.ts`

#### 변경: password 컬럼에서 `select: false` 제거
```typescript
// 변경 전
@Column({ select: false })
password: string;

// 변경 후
@Column({ length: 255 })
password: string;
```

---

### 4. `src/users/users.service.ts`

#### 변경: `findByEmailWithPassword` 메서드 단순화
```typescript
// 변경 전
async findByEmailWithPassword(email: string): Promise<User | null> {
  if (!email) {
    return null;
  }
  return await this.userRepository
    .createQueryBuilder('user')
    .where('user.email = :email', { email })
    .addSelect('user.password')
    .getOne();
}

// 변경 후
async findByEmailWithPassword(email: string): Promise<User | null> {
  if (!email) {
    return null;
  }
  return await this.userRepository.findOne({
    where: { email },
  });
}
```

---

## 적용 방법

백엔드 pull 후 이 문서를 Claude에게 보여주고 "이 변경사항들을 적용해줘"라고 하면 됩니다.

## 주의사항

- `select: false`를 제거했으므로 DB 스키마 sync 시 기존 유저 데이터가 있으면 문제가 생길 수 있음
- 필요시 `TRUNCATE TABLE users CASCADE;` 실행 후 재시작
