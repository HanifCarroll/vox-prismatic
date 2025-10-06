export const POST_TYPE_HINTS = {
    story: 'Tell a vivid narrative with stakes, tension, and a takeaway for the reader.',
    how_to: 'Structure as clear, ordered steps that lead to a practical takeaway.',
    myth_bust: 'Open with the myth, debunk it fast, and replace it with the surprising truth.',
    listicle: 'Deliver a punchy numbered list with scannable, high-utility points.',
    case_study: 'Highlight the problem, actions, and measurable results with proof where possible.',
    announcement: 'Lead with the headline, spotlight the impact, and spell out what happens next.',
};

export const postTypePresetOptions = [
    { value: '', label: 'No preset' },
    { value: 'story', label: 'Story', hint: POST_TYPE_HINTS.story },
    { value: 'how_to', label: 'How-to', hint: POST_TYPE_HINTS.how_to },
    { value: 'myth_bust', label: 'Myth-bust', hint: POST_TYPE_HINTS.myth_bust },
    { value: 'listicle', label: 'Listicle', hint: POST_TYPE_HINTS.listicle },
    { value: 'case_study', label: 'Case study', hint: POST_TYPE_HINTS.case_study },
    { value: 'announcement', label: 'Announcement', hint: POST_TYPE_HINTS.announcement },
];

const PRESET_LINE_REGEX = /^Preset:\s*([a-z0-9_-]+)/i;

export function composePresetInstruction(customInstructions, postType) {
    const trimmed = typeof customInstructions === 'string' ? customInstructions.trim() : '';
    const slug = typeof postType === 'string' ? postType.trim().toLowerCase() : '';
    const hint = slug ? POST_TYPE_HINTS[slug] : undefined;

    if (!hint) {
        return trimmed;
    }

    const presetLine = `Preset: ${slug} — ${hint}`;

    if (trimmed === '') {
        return presetLine;
    }

    const lines = trimmed.split(/\r?\n/);
    if (lines.some((line) => {
        const match = line.match(PRESET_LINE_REGEX);
        return match ? match[1].toLowerCase() === slug : false;
    })) {
        return trimmed;
    }

    return `${presetLine}\n${trimmed}`;
}

export function findPresetHint(slug) {
    const normalized = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
    return normalized ? POST_TYPE_HINTS[normalized] ?? '' : '';
}
