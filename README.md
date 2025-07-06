# BionicPRO Security Enhanced

Улучшенная версия системы BionicPRO с реализацией PKCE и безопасного API для отчетов.

## Тестирование

### Пользователи для тестирования

| Пользователь | Пароль | Роль | Доступ к отчетам |
|--------------|---------|------|------------------|
| prothetic1   | prothetic123 | prothetic_user | ✅ |
| prothetic2   | prothetic123 | prothetic_user | ✅ |
| prothetic3   | prothetic123 | prothetic_user | ✅ |
| user1        | password123  | user | ❌ |
| user2        | password123  | user | ❌ |
| admin1       | admin123     | administrator | ❌ |

## Пошаговая инструкция для проверки

### 1. Запуск системы
```bash
# Клонируйте репозиторий
git clone <repository-url>
cd architecture-bionicpro

# Запустите все сервисы
docker-compose up -d --build

# Проверьте статус (все контейнеры должны быть "Up")
docker-compose ps
```

### 2. Проверка основных функций

#### A) Проверка API
```bash
# Health check (должен вернуть {"status":"OK"})
curl http://localhost:8000/health

# Без токена (должен вернуть 401)
curl http://localhost:8000/reports
```

#### B) Получение токена и тестирование
```bash
# Получить токен для пользователя с ролью prothetic_user
TOKEN=$(curl -s -X POST http://localhost:8080/realms/reports-realm/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=reports-frontend" \
  -d "username=prothetic1" \
  -d "password=prothetic123" | jq -r '.access_token')

# Успешный запрос (должен вернуть данные отчета)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/reports
```

### 3. Проверка UI и PKCE

1. **Откройте браузер**: http://localhost:3000
2. **Откройте Developer Tools** (F12) → Network
3. **Нажмите "Login"**
4. **Проверьте параметры PKCE** в запросах:
   - `code_challenge` (строка)
   - `code_challenge_method=S256`
5. **Войдите как `prothetic1`** (пароль: `prothetic123`)
6. **Нажмите "View Report"** - должен отобразиться отчет
7. **Нажмите "Download Report"** - должен скачаться JSON

### 4. Проверка безопасности

#### A) Тест доступа по ролям
```bash
# Получить токен для пользователя БЕЗ роли prothetic_user
USER_TOKEN=$(curl -s -X POST http://localhost:8080/realms/reports-realm/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=reports-frontend" \
  -d "username=user1" \
  -d "password=password123" | jq -r '.access_token')

# Должен вернуть 403 Forbidden
curl -H "Authorization: Bearer $USER_TOKEN" http://localhost:8000/reports
```

#### B) Тест в UI
1. **Выйдите** из системы (обновите страницу)
2. **Войдите как `user1`** (пароль: `password123`)
3. **Нажмите "View Report"** - должна появиться ошибка 403

### Ожидаемые результаты

**Успешные тесты**:
- Все контейнеры запущены
- API возвращает данные для `prothetic1`
- UI отображает отчет для `prothetic1`
- PKCE параметры присутствуют в запросах
- Скачивание отчета работает

**Тесты безопасности**:
- 401 для запросов без токена
- 403 для `user1` (нет роли `prothetic_user`)
- UI показывает ошибку для `user1`

## Безопасность

### PKCE Implementation
- Использует SHA256 для генерации code challenge
- Автоматическая генерация code verifier
- Валидация на стороне Keycloak

### JWT Validation
- Проверка подписи через JWKS endpoint
- Валидация issuer и audience
- Проверка времени жизни токена

### RBAC (Role-Based Access Control)
- Только пользователи с ролью `prothetic_user` могут получать отчеты
- Middleware для проверки ролей
- Возврат соответствующих HTTP кодов ошибок
