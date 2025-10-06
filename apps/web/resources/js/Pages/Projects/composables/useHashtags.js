import { ref } from 'vue';

export const useHashtags = (hashtagsRef) => {
  const hashtagsInputRef = ref(null);
  const hashtagSuggestions = ref([]);

  const sanitizeHashtag = (raw) => {
    if (typeof raw !== 'string') return '';
    return raw.replace(/[,]+/g, ' ').trim().replace(/\s+/g, ' ');
  };

  const clearHashtagInput = () => {
    const inputEl = hashtagsInputRef.value?.$refs?.focusInput;
    if (inputEl) inputEl.value = '';
  };

  const addHashtag = (raw, { moveFocus = true } = {}) => {
    const value = sanitizeHashtag(raw);
    if (!value) return;
    if (!hashtagsRef.value.includes(value)) {
      hashtagsRef.value = [...hashtagsRef.value, value];
    }
    if (moveFocus) clearHashtagInput();
  };

  const handleHashtagKeydown = (event) => {
    if (event.key === ',') {
      event.preventDefault();
      addHashtag(event.target.value);
    }
  };

  const handleHashtagBlur = (event) => {
    addHashtag(event.target.value, { moveFocus: false });
    clearHashtagInput();
  };

  const handleHashtagPaste = (event) => {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!pasted) return;
    if (pasted.includes(',')) {
      event.preventDefault();
      pasted.split(',').forEach((entry) => addHashtag(entry, { moveFocus: false }));
      clearHashtagInput();
    }
  };

  const handleHashtagComplete = (event) => {
    const query = sanitizeHashtag(event.query ?? '');
    hashtagSuggestions.value = query ? [query] : [];
  };

  return {
    hashtagsInputRef,
    hashtagSuggestions,
    sanitizeHashtag,
    addHashtag,
    handleHashtagKeydown,
    handleHashtagBlur,
    handleHashtagPaste,
    handleHashtagComplete,
  };
};

