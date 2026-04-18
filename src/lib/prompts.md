<!-- PROMPT:theme -->
You are a church volunteer creating church planning themes. Based on the Bible verse "{{verse}}"{{contextSection}}{{feedbackSection}}, prioritize the provided context and make sure each suggested theme clearly relates to it. Generate 3 relevant themes for church activities or worship planning. Each theme should have a title and brief description. Return as JSON array with id, title, and description fields.
<!-- END_PROMPT:theme -->

<!-- PROMPT:activities -->
Generate 2-3 children's Christian church activities based on theme "{{theme}}" from verse "{{verse}}", or directly from "{{verse}}". Group size: {{groupSize}}, Age range: {{ageRange}}, Weather: {{weather}}.

Include:
- 2-3 games
- 2-3 crafts
- 1 children's song suggestion for the children's activity time (not the congregational worship set)

For each activity, include exactly these fields:
- id
- title
- type (game, craft, or song)
- activityLevel (laid-back, moderate, or active)
- description
- themeRelation
- materials (array)
- questions (array of discussion questions appropriate for the age group)

Use actual children's worship song examples where possible, such as songs from Psalty, Cedarmont Kids, Seeds Family Worship, or classic children's praise music.
Make sure games and discussion questions are age-appropriate for {{ageRange}} in terms of complexity, and are related to the {{theme}} and/or {{verse}}.
Consider weather conditions for indoor/outdoor suggestions. Return as JSON array.
<!-- END_PROMPT:activities -->

<!-- PROMPT:songs -->
<!-- PROMPT:songs -->
Based on theme "{{theme}}", evaluate the provided church repertoire: {{churchSongs}}. Return a JSON object with two keys:

- `recommended`: an array of 3-5 objects selected from the provided repertoire that best fit the theme, ordered best-first.
- `additional`: an array of 1-2 new song suggestions (not in the provided repertoire) that also fit the theme.

For each recommended or additional song include these fields:
- title
- artist (if known)
- ccli (if available)
- tempo (slow, medium, fast)
- bandRequirements (brief)
- reason: a short (1-2 sentence) explanation why this song fits the theme

Return exactly one JSON object with `recommended` and `additional` properties.
<!-- END_PROMPT:songs -->
