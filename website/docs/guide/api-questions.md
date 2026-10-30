# Security Questions

Security questions are the catalog users pick from when they set up recovery answers (see [Security Questions workflow](/guide/workflow-security-questions)). This API manages the `security_question` rows; the admin UI exposes it on the **Security questions** page.

## How It Works

Only questions that are `active` and not archived are offered to users. Archiving a question hides it from the setup page; answers users already saved keep working.

`question` is the identifier of the question. The text users see comes from `trans`, a map of language code to text stored on the question itself (requested language, then `en`); when neither is filled, `question` is shown as is.

`trans` is a plain column, read and written like any other field: an update replaces the whole map, so send every language you want to keep. Keys must be language tags (`en`, `fr`, `pt-BR`, …) and values are 255 characters at most; the database rejects anything else. Adding a language needs no schema or API change, but the workflow pages only serve the languages they have locales for (`en`, `fr`).

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

Each snapshot carries `trans`, so translation changes show up in the history like any other field. One save is one entry.

## Create Security Questions

```
POST /foxnox/questions/
Content-Type: application/json
Authorization: ******

{
  "rows": [
    {
      "question": "Last school name",
      "categoryId": 5,
      "active": true,
      "trans": {
        "en": "What was the name of your last school?",
        "fr": "Quel était le nom de votre dernière école ?"
      }
    }
  ]
}
```

### Security question fields

| Field | Range | Description |
|---|---|---|
| `question` | 1–255 chars | Identifier and fallback text of the question |
| `trans` | object | Localized texts keyed by language tag, 255 chars max per value |
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
