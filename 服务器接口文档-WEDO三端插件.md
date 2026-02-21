# WEDO 服务器接口文档（采集入库 / 出库）

服务端需实现的 HTTP 接口，Base URL 默认 `http://192.168.6.166:5000`。

**通用约定**：
- Content-Type：`application/json; charset=utf-8`
- 无真实登录：业务以设备标识为主，请求中的 `token` 一般为**设备 IP**（WiFi 优先）
- 插件可能自动在 body 中附带 `device_info`（device_ip、device_udid、device_name 等），服务端可按需使用

---

## 一、采集入库（WEDO 采集入库）

单一插件，合并「采集」与「入库」：打开 App 时自动拉取内购档位并上报、写入本地 plist；入库界面优先从本地 plist 读档位，无本地数据时才请求 `/api/caijiruku/products`。支持真实内购与凭证上传。

---

### 1. POST `/api/caijiruku/login`

**功能**：插件内「伪登录」入口。用户点击登录后调用，用于通过校验并写入本地“已登录”状态；不要求真实账号体系，服务端返回成功即可。

**请求体示例**：
```json
{
  "token": "192.168.1.100",
  "client": "ios",
  "device_id": "xxxx",
  "version": "0.9-6"
}
```

**返回体示例（最低可用）**：
```json
{
  "code": 200,
  "data": {
    "userInfo": {}
  }
}
```
说明：`code == 200` 且 `data.userInfo` 存在即可，`userInfo` 可为空对象，插件仅据此认为登录成功。

---

### 2. POST `/api/caijiruku/collect`

**功能**：采集上报。App 拉取到内购商品信息后，将档位列表上报到服务端；同时插件会写入本地 plist（按 productId 去重），供入库界面使用。

**请求体示例**：
```json
{
  "bundleId": "com.example.game",
  "bundleName": "游戏名",
  "products": [
    {
      "productId": "com.example.product_1",
      "productName": "礼包A",
      "productDescription": "描述",
      "price": "6.00",
      "currency": "CNY",
      "currencySymbol": "¥"
    }
  ]
}
```

**返回体示例**：
```json
{
  "code": 0,
  "message": "ok"
}
```
失败时插件会记“上传失败”日志；可返回 `code != 0` 及 `message` 说明原因。

---

### 3. POST `/api/caijiruku/products`

**功能**：拉取商品/礼包列表。主界面在**无本地 plist 档位**时才会请求；浮窗列表会直接请求。返回的列表用于展示可购买档位（title、gold、money、num 等）。

**请求体示例**：
```json
{
  "token": "192.168.1.100",
  "game_id": "1"
}
```
或浮窗场景：
```json
{
  "token": "192.168.1.100",
  "productIdentifier": "com.example.game"
}
```

**返回体示例**：
```json
{
  "code": 200,
  "data": [
    {
      "title": "com.example.product_1",
      "gold": "礼包A",
      "money": "6",
      "num": "99",
      "buy_id": "com.example.product_1"
    }
  ],
  "msg": ""
}
```
`data` 为数组，每项需含 `title`（商品 ID）、`gold`（展示名）、`money`、`num` 等入库界面所需字段。

---

### 4. POST `/api/caijiruku/receipts`

**功能**：上传内购凭证。用户在入库侧完成购买（或使用已有凭证）后，将凭证上传到服务端保存，供出库拉取使用。

**请求体示例**：
```json
{
  "token": "192.168.1.100",
  "localizedTitle": "com.example.product_1",
  "productIdentifier": "com.example.game",
  "transactionDate": "2026-02-11 17:30:26",
  "transactionIdentifier": "470003053702685",
  "transactionReceipt": "base64...",
  "newTransactionReceipt": "base64..."
}
```
可能附带 `device_info` 等字段。

**返回体示例**：
```json
{
  "code": 200,
  "message": "上传成功"
}
```
若需让插件清除本地并提示重新登录，可返回 `auth: false`（按插件实现处理）。

---

## 二、出库（WEDO 出库）

---

### 1. POST `/api/chuku/login`

**功能**：与采集入库类似，为出库侧「伪登录」入口，仅需返回成功即可。

**请求体示例**：同 caijiruku，含 `token`、`client`、`device_id`、`version` 等。

**返回体示例（最低可用）**：
```json
{
  "code": 200,
  "data": {
    "userInfo": {}
  }
}
```

---

### 2. POST `/api/chuku/products`

**功能**：出库浮窗拉取礼包列表，用于展示可出库的档位。

**请求体示例**：
```json
{
  "token": "192.168.1.100",
  "productIdentifier": "com.example.game"
}
```

**返回体示例**：
```json
{
  "code": 200,
  "data": [
    {
      "title": "com.example.product_1",
      "gold": "礼包A",
      "money": "6",
      "num": "99"
    }
  ]
}
```
格式与 caijiruku/products 的 `data` 一致即可。

---

### 3. POST `/api/chuku/receipt`

**功能**：出库拉单笔凭证。根据请求中的 `bundle_id`、`title`（商品 ID）从已上传的凭证中匹配一条（**必须同 bundle_id 且同 product_id**），返回后该凭证从可用池中移除。若无匹配凭证则返回失败，插件会走失败逻辑（如上报 invalid）。

**请求体示例**：
```json
{
  "token": "192.168.1.100",
  "bundle_id": "com.example.game",
  "product_name": "礼包A",
  "title": "com.example.product_1"
}
```

**返回体示例（成功）**：
```json
{
  "code": 200,
  "data": {
    "id": "1",
    "identifier": "470003053702685",
    "start_time": "2026-02-11 17:30:26",
    "new_receipt": "MIIUKQYJKoZIhvcNAQcCoIIU...",
    "receipt": "ewoJInNpZ25hdHVyZSIgPSAiQkVJ..."
  }
}
```
`new_receipt`、`receipt` 为 Base64 字符串，不可为 `null`，否则插件会判为失败。

**返回体示例（无可用凭证）**：
```json
{
  "code": 400,
  "message": "暂无可用凭证，请先在入库完成购买并上传凭证"
}
```

---

### 4. POST `/api/chuku/receipt/invalid`

**功能**：出库侧上报「无效凭证」（如拉到的凭证无法使用），仅记录或统计用。

**请求体**：插件会带 `id`、`err_code`、`err_msg` 等，具体以插件为准。

**返回体示例**：
```json
{
  "code": 200
}
```

---

### 5. POST `/api/chuku/receipt/consumption`

**功能**：出库侧上报「凭证已消费成功」，用于服务端记账或统计。

**请求体**：插件会带凭证 `id` 等，具体以插件为准。

**返回体示例**：
```json
{
  "code": 200
}
```

---

## 三、返回约定小结

| 场景           | 成功                     | 失败                         |
|----------------|--------------------------|------------------------------|
| 采集 collect   | `code == 0`, `message`   | `code != 0`                  |
| 其余接口       | `code == 200`            | `code != 200`，可带 `message` |
| 出库 receipt   | 必须带有效 `data.new_receipt`（非空字符串） | 无凭证或无效时 `code == 400` |

---

## 四、device_info（可选）

插件可能在部分请求 body 中自动合并以下字段，服务端可按需使用：

| 字段             | 说明                |
|------------------|---------------------|
| device_ip        | 设备 IP（WiFi 优先） |
| device_udid      | 设备 UDID           |
| device_name      | 设备名称            |
| device_model     | 机型                |
| device_system    | 系统版本            |
| device_vendor_id | identifierForVendor |

---

## 五、插件安装说明

| 组合                   | 说明 |
|------------------------|------|
| 采集入库               | 单插件即可完成采集 + 入库；档位优先本地 plist，无则请求 products。 |
| 采集入库 + 出库 同机装 | **会冲突**（均 hook 支付等），不建议同时安装。 |
| 建议                   | 需要出库时，只装出库插件；需要采集+入库时，只装采集入库插件。 |

---

## 六、已移除的接口

以下接口已从服务端移除，插件内若有调用会得到 404，可按需在插件中删除对应请求：

- `POST /api/caijiruku/support`（原用于“支持游戏”校验，插件侧已未使用）
- `POST /api/caijiruku/log`（原用于设备调试日志上报，插件侧未调用）
- `POST /api/chuku/support`
- `POST /api/chuku/log`
