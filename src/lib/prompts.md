<!-- PROMPT:theme -->
You are creating church planning themes. Based on the Bible verse "{{verse}}"{{contextSection}}{{feedbackSection}}, prioritize the provided context and make sure each suggested theme clearly relates to it. Generate 3 relevant themes for church activities or worship planning. Each theme should have a title and brief description. Return as JSON array with id, title, and description fields.
<!-- END_PROMPT:theme -->

<!-- PROMPT:activities -->
Generate 2-3 children's church activities based on theme "{{theme}}" from verse "{{verse}}". Group size: {{groupSize}}, Age range: {{ageRange}}, Weather: {{weather}}.

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
Make sure games and discussion questions are age-appropriate for {{ageRange}}, with simple, theme-related questions.
Consider weather conditions for indoor/outdoor suggestions. Return as JSON array.
<!-- END_PROMPT:activities -->

<!-- PROMPT:songs -->
Based on theme "{{theme}}", select 4-5 songs from this church's repertoire: {{churchSongs}}. Also suggest 1 additional song that would fit this church's style.

For each song, include:
- Title
- Artist (if known)
- CCLI number (if available)
- Tempo (slow, medium, fast)
- Band requirements (e.g., "Piano only", "Full band", "Acoustic guitar")
- YouTube URL (if you know one)

Return as JSON array.
<!-- END_PROMPT:songs -->
