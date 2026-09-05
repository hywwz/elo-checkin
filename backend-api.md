# elo 打卡小程序 · 后端接口文档

> 版本：v1  
> 日期：2026-09-05  
> 适用前端：uni-app + Vue3 微信小程序（页面目录 `src/pages`）  
> 当前前端仍使用本地 mock 数据，本文档定义接入真实后端后需要提供的接口。

---

## 1. 通用约定

### 1.1 请求地址

```
正式环境：https://api.elo.example.com/v1
测试环境：https://api-test.elo.example.com/v1
```

### 1.2 请求格式

- `Content-Type: application/json`
- 时间字段：日期使用 `YYYY-MM-DD`，时刻使用 `HH:mm`（24 小时制）
- 时区：Asia/Shanghai，由后端统一处理
- 星期取值：`1=周一，2=周二，3=周三，4=周四，5=周五，6=周六，7=周日`

### 1.3 鉴权

除 `注册 / 登录` 外，所有接口都需要：

```
Authorization: Bearer <token>
```

`token` 由登录接口返回，前端保存于本地；失效时返回 `401`，前端跳转登录页。

### 1.4 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

约定：

- `code = 0` 表示成功
- `code != 0` 表示业务失败
- 同时使用 HTTP 状态码：`200 / 400 / 401 / 404 / 500`

错误示例：

```json
{
  "code": 10001,
  "message": "账号或密码错误",
  "data": null
}
```

### 1.5 常用业务错误码

| code | 含义 |
| --- | --- |
| 10001 | 账号或密码错误 |
| 10002 | 账号已存在 |
| 10003 | 账号不存在 |
| 10004 | 参数校验失败 |
| 10005 | 目标不存在或不属于当前用户 |
| 10006 | 今日已打卡，请勿重复提交 |
| 10007 | 当前不是该目标的打卡日 |
| 10008 | 目标频率配置错误 |

---

## 2. 数据结构

### 2.1 User（用户）

```json
{
  "id": "user_123",
  "account": "design@elo.cn",
  "nickname": "陈晨",
  "avatar": "https://cdn.elo.example.com/a.png",
  "createdAt": "2026-09-05T08:00:00+08:00"
}
```

### 2.2 Goal（打卡目标）

频率共有三种模式，由 `freq.mode` 区分：

| mode | 含义 | 附加字段 |
| --- | --- | --- |
| `daily` | 每天打卡 | 无 |
| `count` | 每周弹性 N 次 | `count`：每周目标次数，1-7 |
| `days` | 指定周几 | `days`：星期数组，如 `[1,3,5]` |

```json
{
  "id": "goal_123",
  "name": "学习",
  "task": "背 20 个单词",
  "freq": {
    "mode": "days",
    "days": [1, 3, 5]
  },
  "reminderTime": "21:30",
  "createdAt": "2026-09-05T08:00:00+08:00",
  "updatedAt": "2026-09-05T08:00:00+08:00"
}
```

完整可选示例：

```json
// 每天
{ "mode": "daily" }

// 每周弹性 3 次
{ "mode": "count", "count": 3 }

// 每周一、三、五
{ "mode": "days", "days": [1, 3, 5] }
```

### 2.3 CheckIn（打卡记录）

```json
{
  "id": "checkin_123",
  "goalId": "goal_123",
  "date": "2026-09-05",
  "createdAt": "2026-09-05T21:32:00+08:00"
}
```

业务规则：

- 一个用户、一个目标、一天最多一条打卡记录（唯一键：userId + goalId + date）。
- `daily`：每天都可打。
- `count`：任意星期都可以打，本周累计达到 `count` 次即完成周目标；允许继续超额打卡。
- `days`：只在目标指定的星期允许打卡，非打卡日返回 `10007`。

### 2.4 主页今日目标（GET /goals 的返回项）

```json
{
  "id": "goal_123",
  "name": "学习",
  "task": "背 20 个单词",
  "freq": {
    "mode": "count",
    "count": 3
  },
  "reminderTime": "21:30",
  "doneToday": true,
  "weeklyDone": 2,
  "visibleOnDate": true
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `doneToday` | 查询日期当天是否已打卡 |
| `weeklyDone` | 当前自然周内已完成次数（用于 count 模式展示 `本周已完成 2/3`） |
| `visibleOnDate` | 在查询日期是否需要展示（days 模式非打卡日为 false） |

---

## 3. 认证接口

### 3.1 注册

`POST /auth/register`

请求：

```json
{
  "account": "user@elo.cn",
  "nickname": "小陈",
  "password": "elo@2026"
}
```

校验规则：

- `account`：必填，长度 ≥ 3；若为邮箱则需格式正确；也可支持手机号。
- `nickname`：可选，长度 ≤ 16；不填时默认取账号前缀（如 `user@elo.cn` → `user`）。
- `password`：必填，长度 ≥ 8。

成功响应：

```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "user_123",
      "account": "user@elo.cn",
      "nickname": "小陈"
    }
  }
}
```

前端流程：注册成功后回到登录页并自动填入刚注册的账号。

### 3.2 登录

`POST /auth/login`

请求：

```json
{
  "account": "user@elo.cn",
  "password": "elo@2026"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": "user_123",
      "account": "user@elo.cn",
      "nickname": "陈晨"
    }
  }
}
```

前端流程：登录成功后 `reLaunch` 到打卡主页。

### 3.3 获取当前用户信息

`GET /users/me`

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "user_123",
    "account": "user@elo.cn",
    "nickname": "陈晨",
    "avatar": "https://cdn.elo.example.com/a.png"
  }
}
```

用途：打卡主页“早上好，陈晨”、头像等信息由该接口提供。

---

## 4. 目标接口

### 4.1 获取目标列表（含今日状态）

`GET /goals`

查询参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `date` | string | 否 | 指定日期，默认当天；格式 `YYYY-MM-DD` |

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "goals": [
      {
        "id": "goal_123",
        "name": "学习",
        "task": "背 20 个单词",
        "freq": { "mode": "count", "count": 3 },
        "reminderTime": "21:30",
        "doneToday": false,
        "weeklyDone": 1,
        "visibleOnDate": true
      }
    ]
  }
}
```

主页显示逻辑：

- `visibleOnDate = true` 才展示；否则主页显示“今天没有需要打卡的目标”。
- `count` 模式主页展示“本周已完成 `weeklyDone / count` 次”。
- `days` 模式由后端判断是否为打卡日。

### 4.2 创建目标

`POST /goals`

请求：

```json
{
  "name": "学习",
  "task": "背 20 个单词",
  "freq": {
    "mode": "count",
    "count": 3
  },
  "reminderTime": "21:30"
}
```

校验：

- `name`：必填。
- `task`：必填，具体动作。
- `freq.mode`：`daily / count / days` 三选一。
- `mode=count`：`count` 必填，范围 1-7。
- `mode=days`：`days` 必填，不能为空，值必须在 1-7 内。
- `reminderTime`：`HH:mm` 格式。

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "goal": {
      "id": "goal_123",
      "name": "学习",
      "task": "背 20 个单词",
      "freq": { "mode": "count", "count": 3 },
      "reminderTime": "21:30"
    }
  }
}
```

前端流程：创建成功后返回打卡主页并刷新列表。

### 4.3 获取单个目标

`GET /goals/{goalId}`

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "goal": {
      "id": "goal_123",
      "name": "学习",
      "task": "背 20 个单词",
      "freq": { "mode": "days", "days": [1, 3, 5] },
      "reminderTime": "21:30"
    }
  }
}
```

用途：进入“修改目标”页时预填当前目标。

### 4.4 修改目标

`PUT /goals/{goalId}`

请求体与创建目标相同，使用完整覆盖：

```json
{
  "name": "睡前冥想",
  "task": "静坐呼吸 15 分钟",
  "freq": {
    "mode": "daily"
  },
  "reminderTime": "22:15"
}
```

成功响应：返回更新后的 Goal 对象，结构同创建接口。

### 4.5 删除目标（建议提供）

`DELETE /goals/{goalId}`

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

说明：当前 UI 暂无删除按钮，但目标管理属于常用能力，建议后端先支持。

---

## 5. 打卡记录接口

### 5.1 完成今日打卡

`POST /checkins`

请求：

```json
{
  "goalId": "goal_123",
  "date": "2026-09-05"
}
```

`date` 可选，默认当天。

后端必须校验：

- 目标属于当前用户；
- 当天该目标未打卡；
- 若为 `days` 模式，当天必须在目标指定星期内。

成功响应：

```json
{
  "code": 0,
  "message": "打卡成功",
  "data": {
    "checkin": {
      "id": "checkin_123",
      "goalId": "goal_123",
      "date": "2026-09-05"
    }
  }
}
```

### 5.2 取消今日打卡

`DELETE /checkins/today`

请求：

```json
{
  "goalId": "goal_123"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "已取消",
  "data": null
}
```

### 5.3 查询某日打卡状态

`GET /checkins?date=2026-09-05`

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "records": [
      {
        "id": "checkin_123",
        "goalId": "goal_123",
        "date": "2026-09-05"
      }
    ]
  }
}
```

用途：主页当天勾选状态、防重复提交。

### 5.4 目标周进度

`GET /goals/{goalId}/week-progress?date=2026-09-05`

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "weekStart": "2026-08-31",
    "weekEnd": "2026-09-06",
    "weeklyDone": 2,
    "weeklyTarget": 3,
    "completed": false
  }
}
```

用途：`count` 模式展示“本周已完成 2/3 次”。

---

## 6. 统计接口

### 6.1 统计汇总

`GET /statistics`

查询参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `period` | string | 是 | `this_month` 本月 / `last_month` 上月 / `this_year` 今年 |

响应（字段与当前统计页保持一致）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "periodLabel": "本月打卡率",
    "delta": "较上月 +8%",
    "rate": 86,
    "title": "本月已打卡 26 天",
    "desc": "目标 30 次 · 剩余 4 次，继续保持节奏",
    "totals": {
      "value": 63,
      "unit": "天",
      "label": "累计坚持"
    },
    "streak": {
      "value": 12,
      "unit": "天",
      "label": "最长连续"
    },
    "trend": {
      "title": "最近 7 天",
      "caption": "柱高 = 当天完成任务数",
      "max": 5,
      "items": [
        { "label": "六", "value": 2 },
        { "label": "日", "value": 3 },
        { "label": "一", "value": 3 },
        { "label": "二", "value": 4 },
        { "label": "三", "value": 5 },
        { "label": "四", "value": 3 },
        { "label": "五", "value": 2 }
      ]
    },
    "goals": [
      {
        "name": "学习",
        "completed": 24,
        "target": 30
      },
      {
        "name": "冥想",
        "completed": 15,
        "target": 20
      },
      {
        "name": "早睡",
        "completed": 21,
        "target": 30
      }
    ]
  }
}
```

统计口径建议：

- `this_month`：本月自然月，`trend` 返回最近 7 天。
- `last_month`：上月自然月，`trend` 返回最近 7 天。
- `this_year`：当年自然年，`trend.items` 返回 12 个月，`trend.caption` 为“柱高 = 当月打卡天数”。
- 日目标按自然日完成计数；周目标只统计“完成一次”，不因重复超额叠加天数字段。
- “连续/累计”建议按有打卡记录的日期计算。

---

## 7. 前端页面与接口对应表

| 页面 | 主要接口 | 页面本地当前行为 |
| --- | --- | --- |
| 登录页 | `POST /auth/login`、`GET /users/me` | 当前为预填模拟登录 |
| 注册页 | `POST /auth/register` | 当前仅校验后返回登录页 |
| 打卡主页 | `GET /goals`、`GET /checkins`、`POST /checkins`、`DELETE /checkins/today` | 本地存储目标与打卡记录 |
| 设置目标页 | `POST /goals` | 本地追加保存 |
| 修改目标页 | `GET /goals/{id}`、`PUT /goals/{id}` | 本地替换保存 |
| 统计页 | `GET /statistics?period=...` | 当前为静态演示数据 |

---

## 8. 后端建议

1. 数据库表建议：`users`、`goals`、`checkins` 三张表即可支撑当前全部需求。
2. 唯一约束：
   - `users.account` 唯一；
   - `checkins(user_id, goal_id, date)` 唯一。
3. 首页一次请求的降级方案：先实现 `GET /goals` + `GET /checkins`，如性能压力大可后续提供 `GET /home/today` 聚合接口。
4. 密码加密使用 bcrypt；token 使用 JWT 并设置过期时间。
5. 微信小程序后续如需真实订阅消息提醒，可增加“提醒任务”表，建议单独再评估，不属于当前目标 CRUD 范围。
