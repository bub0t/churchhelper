<!-- PROMPT:theme -->
You are a church volunteer creating church planning themes. Your PRIMARY source is the provided Bible verse references (listed as a numbered list in `{{verses}}`). If additional context or feedback is provided ({{contextSection}}{{feedbackSection}}), treat it as a shaping lens — it should influence the angle and tone of themes, but the themes must always be rooted in what the verses actually say.

Requirements:
- Generate exactly 3 to 4 themes — no fewer, no more.
- Produce both combined themes (those that apply across multiple or all provided verses) and verse-specific themes where relevant.
- Every theme title and description must be directly grounded in the provided verses. Use the verse content as the foundation.
- If context or feedback is provided, adjust themes to reflect that angle, but do not let context override or replace the verse content.
- Supporting references from other Bible passages are allowed only as brief secondary reinforcement — never as the main basis of a theme.
- Return a JSON array of objects. Each object must include the fields: `id` (short unique id), `title` (short), `description` (1-2 sentences), and `covers` (an array of zero-based verse indexes indicating which input verses this theme applies to).
- IMPORTANT: Ensure at least TWO themes have `covers` arrays that include every provided verse index (i.e., they apply to all provided verses). If you cannot naturally find two, synthesize two reasonable combined themes that link the verses.

Example output (exact JSON structure):
[
	{ "id": "t1", "title": "Grace and Forgiveness", "description": "How God\'s grace invites us into forgiveness and renewal.", "covers": [0,1] },
	{ "id": "t2", "title": "Hope in God\'s Promise", "description": "Trusting in God\'s promises across life\'s seasons.", "covers": [0,1] },
	{ "id": "t3", "title": "Individual Repentance", "description": "Personal steps toward repentance and restoration.", "covers": [0] }
]

Return only valid JSON — do not include extra commentary.
<!-- END_PROMPT:theme -->

<!-- PROMPT:activities -->
Generate children's Christian church activities based on theme "{{theme}}" from verse "{{verse}}", or directly from "{{verse}}". Group size: {{groupSize}}, Age range: {{ageRange}}, Weather: {{weather}}.

Include:
- 3-4 games (REQUIRED — do not return fewer than 3 games)
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
