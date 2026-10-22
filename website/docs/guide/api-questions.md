# Security Questions

Security questions are the catalog users pick from when they set up recovery answers (see [Security Questions workflow](/guide/workflow-security-questions)). This API manages the `security_question` rows; the admin UI exposes it on the **Security questions** page.

## How It Works

Only questions that are `active` and not archived are offered to users. Archiving a question hides it from the setup page; answers users already saved keep working.

`question` is the identifier of the question. The text users see comes from `security_question_trans` (requested language, then `en`); when neither exists, `question` is shown as is.

The API exposes the `en` and `fr` translations (the languages served by the workflow pages) as the virtual fields `transEn` and `transFr`. They are returned by the search, and written to `security_question_trans` on create and update: a non-empty value is inserted or updated, an empty or `null` value deletes the translation, and an omitted field is left untouched. Other languages present in `security_question_trans` are not touched by this API. `GET /foxnox/questions/schema` lists `transEn` and `transFr` as selectable, insertable and updatable even though they are not columns of `security_question`.

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

Each snapshot carries `transEn` and `transFr`. A save writes the question and then its translations, which produces several raw entries; entries of the same author less than 2 seconds apart are merged so one save shows as one modification.

## Create Security Questions

```
POST /foxnox/questions/
Content-Type: application/json
Authorization: ******

{
  "rows": [
    { "question": "Last school name", "categoryId": 5, "active": true, "transEn": "What was the name of your last school?", "transFr": "Quel était le nom de votre dernière école ?" }
  ]
}
```

### Security question fields

| Field | Range | Description |
|---|---|---|
| `question` | 1–255 chars | Identifier and fallback text of the question |
| `transEn` | 0–255 chars | English text shown to users. Empty deletes it |
| `transFr` | 0–255 chars | French text shown to users. Empty deletes it |
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
