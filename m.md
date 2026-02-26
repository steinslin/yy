# WEDO 服务器接口文档（采集入库 / 出库）

服务端需实现的 HTTP 接口，Base URL 默认 `http://192.168.6.166:5000`。  
本文档面向**实现服务器接口的同事**，仅描述请求/响应约定。**共 7 个接口**（见下方路由一览）。

---

## 通用约定

- **Content-Type**：`application/json; charset=utf-8`
- **成功**：响应 body 中 **`code == 0`** 表示成功；出库拉凭证成功为 `code == 0` 且带 `data.new_receipt`；其余（如 1、400）表示业务失败。
- 插件向服务器发起的**所有请求**都会在 body 中附带 **device_info**（采集上报由采集模块合并，日志由各模块合并，其余由 HttpHelper 自动合并），服务端可按需使用或用于日志排查。
- 档位相关接口：`/api/products/get` 与 `/api/products/collect` 使用同一套档位字段命名（见下表）。

**档位字段说明**（products 与 collect 共用）：

| 字段 | 含义 | 示例值 |
|------|------|--------|
| **app_id** | 应用包名（CFBundleIdentifier） | `com.lastwar.ios` |
| **product_id** | 内购商品 ID（= StoreKit 的 productIdentifier） | `prodios_1` |
| **name** | 商品展示名（仅 UI 显示） | `Hot Package1` |
| **price** | 价格字符串 | `0.99` |
| **quantity** | 数量 | `99` |
| **app_name** | 应用展示名 | `Last War` |

**路由一览**：

| 路由 | 说明 |
|------|------|
| `POST /api/products/collect` | 采集商品信息并上传至服务器 |
| `POST /api/products/get` | 获取商品信息列表 |
| `POST /api/receipts/upload` | 上传内购凭证到服务器 |
| `POST /api/receipts/get` | 获取内购凭证 |
| `POST /api/receipts/consume` | 消费凭证 |
| `POST /api/receipts/invalid` | 上报无效凭证 |
| `POST /api/device_log` | 设备日志上报（含 device_info） |

---

## 一、采集入库

### 1. POST `/api/products/collect`

采集商品信息并上传至服务器。

**请求体示例**：
```json
{
  "app_id": "com.lastwar.ios",
  "app_name": "Last War",
  "products": [
    {
      "product_id": "prodios_1",
      "name": "Hot Package1",
      "price": "0.99",
      "quantity": 99
    }
  ]
}
```
会附带 **device_info**。

**返回体（成功）**：`{ "code": 0, "message": "ok" }`

**异常返回**：`code != 0`（如 `1`）+ `message`（如 "products 为空"）。

**异常时插件行为**：不弹窗，仅写本地日志「上传失败: message」，档位仍会写入本地 plist 供入库使用。

---

### 2. POST `/api/products/get`

获取商品信息列表。请求体可传 **app_id** 按应用过滤；不传则返回全部。

**请求体示例**：
```json
{
  "app_id": "com.lastwar.ios"
}
```

**返回体示例**：
```json
{
  "code": 0,
  "message": "Success",
  "products": [
    {
      "product_id": "prodios_1",
      "name": "Hot Package1",
      "price": "0.99",
      "quantity": 99,
      "app_id": "com.lastwar.ios",
      "app_name": "Last War"
    }
  ]
}
```

**异常返回**：`code != 0` + `message`。

---

### 3. POST `/api/receipts/upload`

上传内购凭证到inventory数据库中。
提示：这里需要查询app_products表获取游戏相关字段后存到inventory表。

**请求体字段**：

| 字段 | 含义 | 必传 | 说明 |
|------|------|------|------|
| **app_id** | 应用包名（同 products） | 是 | CFBundleIdentifier |
| **product_id** | 内购商品 ID | 是 | StoreKit productIdentifier |
| **transaction_date** | 交易时间 | 是 | 格式 `yyyy-MM-dd HH:mm:ss` |
| **transaction_id** | 交易号（苹果 transactionIdentifier） | 是 | 唯一标识一笔交易 |
| **new_receipt** | 新凭证 Base64 | 是 | appStoreReceiptURL 获取的整单凭证 |
| **receipt** | 旧凭证 Base64 | 否 | 单笔 transaction 的 transactionReceipt |

**请求体示例**（会附带 **device_info**）：
```json
{
  "app_id": "com.lastwar.ios",
  "product_id": "prodios_1",
  "transaction_date": "2026-02-11 17:30:26",
  "transaction_id": "470003053702685",
  "new_receipt": "base64...",
  "receipt": "base64..."
}
```

**返回体（成功）**：`{ "code": 0, "message": "上传成功" }`

**异常返回**：`code != 0`（如 `1`）+ `message`。

---

## 二、出库

### 1. POST `/api/receipts/get`

读取inventory表获取一条状态可出库的凭证，然后将状态标记为出库中

**请求体字段**：

| 字段 | 含义 | 必传 |
|------|------|------|
| **app_id** | 应用包名（同 products 的 app_id） | 是 |
| **product_id** | 内购商品 ID，用于匹配凭证 | 是 |
| **name** | 商品展示名，仅辅助 | 否 |

**请求体示例**：
```json
{
  "app_id": "com.lastwar.ios",
  "product_id": "prodios_1",
  "name": "Hot Package1"
}
```

**返回体字段（成功时 data 内）**：

| 字段 | 含义 |
|------|------|
| **receipt_id** | 凭证记录 ID（同条凭证上报 invalid/consume 时传此 id） |
| **transaction_id** | 交易号（如苹果 transactionIdentifier） |
| **created_at** | 交易时间，格式 `yyyy-MM-dd HH:mm:ss` |
| **new_receipt** | 新凭证 Base64 字符串，不可为 null |
| **receipt** | 旧凭证 Base64 字符串 |

**返回体示例（成功）**：
```json
{
  "code": 0,
  "data": {
    "receipt_id": "1",
    "transaction_id": "470003053702685",
    "created_at": "2026-02-11 17:30:26",
    "new_receipt": "MIIUKQYJKoZIhvcNAQcCoIIU...",
    "receipt": "ewoJInNpZ25hdHVyZSIgPSAiQkVJ..."
  }
}
```

**返回体（无可用凭证）**：`{ "code": 400, "message": "暂无可用凭证，请先在入库完成购买并上传凭证" }`（HTTP 状态码仍为 200）
---

### 2. POST `/api/receipts/invalid`

更新inventory表凭证状态status为出库失败，并添加remark为err_code+err_msg

**请求体字段**：

| 字段 | 含义 | 必传 |
|------|------|------|
| **id** | 凭证记录 ID（即 receipts/get 返回的 receipt_id） | 是 |
| **err_code** | 错误码，如 `no_receipt` | 是 |
| **err_msg** | 错误描述 | 是 |
| **token** | 可选 | 否 |

**请求体示例**：
```json
{
  "id": "1",
  "err_code": "no_receipt",
  "err_msg": "wrong_product"
}
```

**返回体（成功）**：`{ "code": 0 }`

---

### 3. POST `/api/receipts/consume`

更新inventory表凭证状态为出库成功

**请求体字段**：

| 字段 | 含义 | 必传 |
|------|------|------|
| **id** | 凭证记录 ID（即 receipts/get 返回的 receipt_id） | 是 |
| **token** | 可选 | 否 |

**请求体示例**：
```json
{
  "id": "1"
}
```

**返回体（成功）**：`{ "code": 0 }`

---

## 三、设备日志

### POST `/api/device_log`

设备侧调试/运行日志上报，插件内所有“上传日志”统一走此接口，便于服务端排查问题。**插件实际行为与下述说明一致**：出库插件发送 `message`、`tag=chuku`、`level=info` 或 `error` 及 **device_info**；采集入库插件发送 `message`、`tag=ruku` 及 **device_info**（入库侧不传 `level`）。请求体**必含 device_info**，以及下列业务字段。

**请求体字段说明**：

| 字段 | 含义 | 是否必传 | 说明 |
|------|------|----------|------|
| **message** | 日志正文 | 是 | 一条日志的文本内容，描述当时发生的事件或状态。 |
| **tag** | 日志来源标识 | 是 | 区分来自哪个插件/模块，见下表枚举。 |
| **level** | 日志级别 | 否 | 出库插件会传；采集入库侧部分调用不传。见下表枚举。 |
| **device_info** | 设备信息 | 是 | 与其余接口一致，见本文档「五、device_info 结构」。 |

**tag 枚举**（服务端可按 tag 过滤或分类存储）：  
- **chuku**：来自**出库插件**（mytweakchuku）。  
- **ruku**：来自**采集入库插件**（mrtweak）。

| 取值 | 含义 | 谁上报、何时上报 | 典型 message 内容 |
|------|------|------------------|-------------------|
| **chuku** | 出库插件（mytweakchuku）的日志标识。 | 出库插件在关键节点上报：如 finishTransaction 时（假交易消耗/未消耗、系统交易成功或失败）、出库请求失败、无凭证时交付空收据、出库成功交付给游戏、Midas 回调 setResultMsg/setIapError 等。会带 **level**（info/error）及 **device_info**。 | `finishTransaction: 假交易已消耗，已上报 consumption`、`出库成功交付: state=Purchased identifier=xxx`、`无凭证(错误档位): 已上报 invalid...`、`Midas setIapError（消费失败原因）: xxx` |
| **ruku** | 采集入库插件（mrtweak）的日志标识。 | 采集入库侧通过 HttpHelper 的 `sendDebugLogToServer:` 上报，**不会**带 `level` 字段；调用时机由业务决定（如调试输出、异常信息等）。会带 **device_info**。 | 由调用方传入的任意 message 文本，无固定格式。 |

**level 枚举**（仅出库插件会带，采集侧可能不传）：

| 取值 | 含义 |
|------|------|
| `info` | 一般信息，如流程节点、成功状态。 |
| `error` | 错误或异常，如请求失败、无凭证、消费失败原因等。 |

**message 内容举例**（仅供参考，实际以插件为准）：

- 出库流程：`finishTransaction: 假交易已消耗，已上报 consumption`、`出库成功交付: state=Purchased identifier=xxx`、`无凭证(错误档位): 已上报 invalid，交付空收据以触发支付失败弹窗 product=xxx`。
- 错误类：`出库请求失败或无效数据: error=xxx product=xxx`、`Midas setIapError（消费失败原因）: xxx`。

**请求体示例**（会附带 **device_info**）：
```json
{
  "message": "finishTransaction: 假交易已消耗，已上报 consumption",
  "tag": "chuku",
  "level": "info"
}
```

**返回体（成功）**：`{ "code": 0 }`

**异常返回**：建议始终返回 `code: 0`，因插件不解析 device_log 的失败；若返回 `code != 0`，插件无重试、无弹窗，仅请求结束。

**异常时插件行为**：不解析响应 body，不弹窗、不重试；仅发起一次 POST 即结束。

---

## 四、接口与插件行为核对（7 个接口）

| 接口 | 插件传参是否按文档 | 文档约定响应后插件行为 |
|------|--------------------|------------------------|
| **products/collect** | 是。入库采集发送 `app_id`、`app_name`、`products[]`（含 `product_id`、`name`、`price`、`quantity`）及 device_info。 | 成功：写本地档位；失败：仅写本地日志「上传失败: message」。 |
| **products/get** | 是。主界面与浮窗均发送 `app_id`（及 device_info）。 | 成功：用 `products`/`data` 刷新列表；失败：主界面弹窗 `message`，浮窗仅不刷新列表。 |
| **receipts/upload** | 是。仅发送规范字段：`app_id`、`product_id`、`transaction_date`、`transaction_id`、`new_receipt`、`receipt`（及 token、device_info）。 | 成功：弹窗 message、回调成功；失败：弹窗 message，凭证可恢复上传。 |
| **receipts/get** | 是。出库发送 `app_id`、`product_id`、`name`、`token` 及 device_info。 | 成功且 `data.new_receipt` 非空：交付凭证给游戏；否则：上报 invalid、交付空收据或设交易 Failed。 |
| **receipts/invalid** | 是。发送 `id`、`err_code`、`err_msg`、`token` 及 device_info。 | 仅发请求，不解析业务返回。 |
| **receipts/consume** | 是。发送 `id`、`token` 及 device_info。 | 仅发请求，不解析业务返回。 |
| **device_log** | 是。发送 `message`、`tag`（chuku/ruku）、出库带 `level`，以及 device_info。 | 不解析返回，不重试。 |

---

## 五、返回约定小结

**成功**：统一为 `code: 0`；部分接口带 `message` 或 `data`。

**异常返回格式**（HTTP 状态码建议仍为 200，由 body 区分业务成败）：
- **`code`**：非 0 表示业务失败（如 `1`、`400`）。
- **`message`**：错误说明，供插件弹窗或写日志（**统一使用 message**，勿用 msg）。

| 场景 | 成功 | 异常返回 | 插件异常行为（概要） |
|------|------|----------|----------------------|
| products/collect | `code == 0`, `message` | `code != 0` + `message` | 仅写本地日志「上传失败: message」 |
| products/get | `code == 0` + `data`/`products` | `code != 0` + `message` | 主界面弹窗 message；浮窗仅不刷新列表 |
| receipts/upload | `code == 0`, `message` | `code != 0` + `message` | 弹窗 message；凭证可恢复上传 |
| receipts/get | `code == 0` + `data.new_receipt` 非空 | `code == 400` + `message` 或无 data | 交易设 Failed 或上报 invalid + 交付空收据 |
| receipts/invalid、receipts/consume | `code == 0` | 建议仍 `code: 0`；若 `code != 0` + `message` | 仅打日志，不重试 |
| device_log | `code == 0` | 建议始终 `code: 0` | 不解析、不弹窗、不重试 |

---

## 六、device_info 结构

所有请求 body 中均可能包含 **device_info**，服务端可按需使用：

| 字段 | 说明 |
|------|------|
| device_ip | 设备 IP（WiFi 优先） |
| device_udid | 设备 UDID |
| device_name | 设备名称 |
| device_model | 机型 |
| device_system | 系统版本 |
| device_vendor_id | identifierForVendor |

curl -X POST "http://192.168.8.158:3000/api/receipts/get" \
  -H "Content-Type: application/json" \
  -d "{\"app_id\": \"com.lastwar.ios\", \"product_id\": \"prodios_1\"}"