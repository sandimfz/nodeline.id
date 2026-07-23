# 10. Testing

## API Backend

### Unit Tests (Jest)

```bash
cd api

# Run all unit tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:cov

# Debug mode
pnpm test:debug
```

**Configuration:** Jest config di `api/package.json`:
- `rootDir`: `src`
- `testRegex`: `.*\.spec\.ts$`
- `transform`: `ts-jest`
- `moduleNameMapper`: Strip `.js` extension (ESM compatibility)
- `testEnvironment`: `node`

### E2E Tests

```bash
pnpm test:e2e
```

**Configuration:** `api/test/jest-e2e.json`

### Test Files Saat Ini

| File | Type | Status |
|------|------|--------|
| `app.controller.spec.ts` | Unit | ✅ Ada |
| `auth.service.spec.ts` | Unit | ✅ Ada |
| `products.service.spec.ts` | Unit | ✅ Ada |
| `roles.guard.spec.ts` | Unit | ✅ Ada |
| `app.e2e-spec.ts` | E2E | ✅ Ada |

### Menambahkan Test Baru

Buat file dengan pattern `*.spec.ts` di direktori yang sama dengan file yang di-test:

```typescript
// src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        // Mock DrizzleService...
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

---

## Admin Panel

### Type Checking

```bash
cd admin
pnpm typecheck    # tsc --noEmit
```

### Linting

```bash
pnpm lint         # ESLint
pnpm format       # Prettier
```

> **Catatan:** Admin panel belum memiliki test unit (tidak ada Jest/playwright setup).

---

## Client Frontend

### Linting

```bash
cd client
pnpm lint         # ESLint (next lint)
```

> **Catatan:** Client belum memiliki test unit/test integration. Perlu ditambahkan jika diperlukan (React Testing Library / Playwright).
