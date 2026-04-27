<!-- PROMPT:theme -->
You are a church volunteer identifying themes from Bible verses for church planning. Your PRIMARY source is the provided Bible verse references (listed as a numbered list in `{{verses}}`).

Start by reading the actual text of each verse carefully and openly. A single verse can carry many angles — pastoral comfort, theological truth, ethical challenge, doxological praise, prophetic call, or personal invitation. Consider its original historical and literary context, what it was speaking to its first listeners, and how its message carries forward into modern life and a contemporary congregation. Explore the full range of what the text genuinely speaks to before narrowing down.

From that exploration, select the 3 to 4 most distinct and useful themes for church planning — ones that are grounded in what the verse actually says, cover different angles where possible, and are accessible for guiding discussion with children, youth, and adults alike.

If additional context or feedback is provided ({{contextSection}}{{feedbackSection}}), use it as a shaping lens to prioritise which angles are most relevant — but it must not override or replace what the verses actually say.

Selection rules:
- CRITICAL: Every theme must be directly grounded in at least one of the provided verses. A theme that does not reference any of the provided verses is not allowed.
- CRITICAL: Use ONLY the exact verse references provided as the basis of each theme. Do NOT substitute, replace, or use alternative verses as the primary reference (e.g. if John 3:16 is given, use John 3:16 — do not use John 3:17, John 3:18, or any other reference as the main basis).
- Supporting references from other Bible passages are allowed only as brief secondary reinforcement in the description — the theme must still clearly cite at least one of the provided verses. Never build a theme whose foundation is an outside verse alone.
- Aim for variety: prefer themes that cover different dimensions of the text (e.g. one theological, one pastoral, one practical/ethical) rather than variations of the same angle.

When multiple verses are provided, prioritise themes in this order (fill slots from the top down):
1. Themes that draw on ALL provided verses AND connect to the provided context or feedback — highest priority, aim for at least one.
2. Themes that draw on ALL provided verses regardless of context — aim for at least two themes across priorities 1 and 2 combined.
3. Themes grounded in a single verse, covering a distinct angle not already represented.
4. Themes grounded in a single verse with supporting outside references — lowest priority, only if slots remain.

When only one verse is provided, all themes must be grounded in that verse and should each explore a different dimension of its meaning.
- Return a JSON array of objects. Each object must include the fields: `id` (short unique id), `title` (short), `description` (3-4 sentences — cover: what the verse was speaking to its original listeners in their historical context and its theological meaning; what the verse itself says; and how this theme bridges into modern life and is relevant to the congregation today. The aim is to guide discussion and help people understand the theme — not to outline a sermon.), and `covers` (an array of zero-based verse indexes indicating which input verses this theme applies to).

Example output (exact JSON structure):
[
	{ "id": "t1", "title": "Grace and Forgiveness", "description": "Romans 5:8 speaks to people who feel unworthy of love, declaring that God acted for us while we were still in our sin — not after we cleaned up our lives. Theologically, this is the heart of grace: God's favour given freely, not earned. For the congregation, this theme is an invitation to stop striving for acceptance and to instead live from the security of being already loved and forgiven. It opens up honest conversation about where we struggle to receive grace and where we find it hard to extend it to others.", "covers": [0,1] },
	{ "id": "t2", "title": "Hope in God\'s Promise", "description": "Lamentations 3:22-23 was written in the middle of devastation, speaking to people who had lost almost everything — and yet it insists that God\'s mercies are new every morning. Theologically, biblical hope is not optimism but a trust anchored in God\'s unchanging character, not in circumstances. This theme meets the congregation in seasons of waiting, grief, or uncertainty, reminding them that God\'s faithfulness is not conditional on things going well. It invites reflection on where we are tempted to lose hope and what it looks like to hold on.", "covers": [0,1] },
	{ "id": "t3", "title": "Individual Repentance", "description": "Psalm 51:10 is David\'s cry after his own moral failure, speaking to anyone who knows they\'ve fallen short and longs for a fresh start with God. Theologically, repentance is not just guilt — it\'s a turning, a reorientation of the whole person back toward God. This theme is personally relevant to a congregation, calling each person to honest self-examination rather than surface-level religion. It creates space to talk about what true repentance looks like and what it means to experience genuine renewal.", "covers": [0] }
]

Return only valid JSON — do not include extra commentary.
<!-- END_PROMPT:theme -->

<!-- PROMPT:activities -->
Generate children's Christian church activities based on theme "{{theme}}" from verse "{{verse}}", or directly from "{{verse}}". Group size: {{groupSize}}, Age range: {{ageRange}}, Weather: {{weather}}.

CRITICAL — group size must shape every game suggestion:
- If group size is 1: suggest only solo or one-on-one (child + leader) activities. Do NOT suggest any game that requires more than 2 people.
- If group size is 2–4: suggest small-group or paired activities. Avoid games that require teams or large numbers.
- If group size is 5 or more: group games are appropriate.

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
- themeRelation (1–3 sentences explaining specifically how this activity connects to the theme "{{theme}}" — name the theme concept directly, not just "this activity teaches about God")
- materials (array)
- questions (array of 2–4 discussion questions that connect the specific activity back to the theme "{{theme}}" — questions must be age-appropriate for {{ageRange}} in language and concept, but must clearly reference the theme's core idea, not just the activity mechanics. Do not write generic questions like "Did you enjoy this?" — each question should help children reflect on or articulate something the theme is teaching them.)

Use actual children's worship song examples where possible, such as songs from Psalty, Cedarmont Kids, Seeds Family Worship, or classic children's praise music.
Make sure games, crafts, and discussion questions are all age-appropriate for {{ageRange}} in terms of complexity and motor skill requirements — crafts must use materials and techniques a child of that age can realistically handle independently. All activities must be suitable for a group of {{groupSize}} — do not suggest games requiring more players than are available.
Consider weather conditions for indoor/outdoor suggestions. The weather field may include precipitation amounts (e.g. "2.5mm expected (3h window)" or "1.2mm in last 1h"). If any rainfall is noted — or if the description says ground may be wet — do NOT suggest games that require outdoor space, running, or jumping. Even a small amount of recent rain means the ground could be slippery or muddy. Return as JSON array.
<!-- END_PROMPT:activities -->

<!-- PROMPT:songs -->
Based on theme "{{theme}}", select the most fitting songs from the church repertoire: {{churchSongs}}.

Return a JSON object with two keys:

- `recommended`: an array of 3-5 objects selected from the provided repertoire that best fit the theme, ordered best-first.
- `additional`: an array of 1-2 new song suggestions (not in the provided repertoire) that also fit the theme.

For each song include these fields:
- title
- artist (if known)
- ccli (if available)
- tempo (slow, medium, fast)
- bandRequirements (brief)

Return exactly one JSON object with `recommended` and `additional` properties.
<!-- END_PROMPT:songs -->
