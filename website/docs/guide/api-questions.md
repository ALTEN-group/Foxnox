# Security Questions

Security questions are the catalog users pick from when they set up recovery answers (see [Security Questions workflow](/guide/workflow-security-questions)). This API manages the `security_question` rows; the admin UI exposes it on the **Security questions** page.

## How It Works

Only questions that are `active` and not archived are offered to users. Archiving a question hides it from the setup page; answers users already saved keep working.

The catalog resolves each label from `security_question_trans` (requested language, then `en`) and falls back to the `question` column. The seeded questions have `en`/`fr` translations, so editing `question` on a seeded row does not change what users see until its translations are changed in the database. A question created through this API has no translation, so `question` is shown as is.

Categories are not managed by this API: `categoryId` must reference a `security_question_category` row (seeded: `1` personal, `2` family, `3` work, `4` favorites, `5` education).

## Search Security Questions

```
POST /foxnox/questions/search
Content-Type: application/json
Authorization: ******

{
  "filters": {
    "archived": { "value": false, "matchMode": "=" }
  }
}
```

## Get Security Question History

```
GET /foxnox/questions/:id/history
Authorization: ******
```

## Create Security Questions

```
POST /foxnox/questions/
Content-Type: application/json
Authorization: ******

{
  "rows": [
    { "question": "What was the name of your first school?", "categoryId": 5, "active": true }
  ]
}
```

### Security question fields

| Field | Range | Description |
|---|---|---|
| `question` | 1–255 chars | Default text of the question |
| `categoryId` | integer ≥ 1 | Existing `security_question_category` id |
| `active` | boolean | Offered to users when `true` (database default: `false`) |

## Update Security Questions

```
PUT /foxnox/questions/
Content-Type: application/json
Authorization: ******

{
  "rows": [
    { "id": 12, "active": false }
  ]
}
```

## Archive Security Questions

```
POST /foxnox/questions/archive
Content-Type: application/json
Authorization: ******

{
  "rows": [
    { "id": 12 }
  ]
}
```

**Response (204 No Content).**

## Get Entity Schema

```
GET /foxnox/questions/schema
Authorization: ******
```
