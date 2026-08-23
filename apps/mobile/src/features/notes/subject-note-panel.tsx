import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

import { MAX_SUBJECT_NOTE_LENGTH } from './model';
import {
  loadSubjectNotes,
  removeSubjectNote,
  saveSubjectNote,
} from './storage';

export function SubjectNotePanel({
  subjectId,
  title,
}: {
  subjectId: number;
  title: string;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState<number>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const notes = await loadSubjectNotes();
      if (cancelled) {
        return;
      }

      const current = notes.find((note) => note.subjectId === subjectId);
      setDraft(current?.content ?? '');
      setSavedContent(current?.content ?? '');
      setUpdatedAt(current?.updatedAt);
      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const isDirty = draft.trim() !== savedContent.trim();

  async function save() {
    const content = draft.trim();
    if (!content && !savedContent) {
      return;
    }

    setIsSaving(true);
    try {
      if (!content) {
        await removeSubjectNote(subjectId);
        setSavedContent('');
        setUpdatedAt(undefined);
      } else {
        const note = {
          content,
          subjectId,
          title,
          updatedAt: Date.now(),
        };
        await saveSubjectNote(note);
        setSavedContent(content);
        setUpdatedAt(note.updatedAt);
      }
      setDraft(content);
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    setIsSaving(true);
    try {
      await removeSubjectNote(subjectId);
      setDraft('');
      setSavedContent('');
      setUpdatedAt(undefined);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>本地笔记</Text>
        {updatedAt ? (
          <Text style={styles.updatedAt}>
            {new Date(updatedAt).toLocaleDateString('zh-CN')}
          </Text>
        ) : null}
      </View>
      <Text style={styles.hint}>
        只保存在这台设备，不会上传，也不会与 Bangumi 同步。
      </Text>
      {isLoading ? (
        <Text style={styles.loading}>正在读取本地笔记…</Text>
      ) : (
        <TextInput
          accessibilityLabel="本地笔记"
          maxLength={MAX_SUBJECT_NOTE_LENGTH}
          multiline
          onChangeText={setDraft}
          placeholder="写下仅自己可见的备忘、吐槽或补番计划…"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          textAlignVertical="top"
          value={draft}
        />
      )}
      <View style={styles.footer}>
        <Text style={styles.counter}>
          {draft.length}/{MAX_SUBJECT_NOTE_LENGTH}
        </Text>
        <View style={styles.actions}>
          {savedContent ? (
            <Pressable
              accessibilityLabel="删除本地笔记"
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => void remove()}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.deleteText}>删除</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel="保存本地笔记"
            accessibilityRole="button"
            disabled={!isDirty || isSaving}
            onPress={() => void save()}
            style={({ pressed }) => [
              styles.saveButton,
              (!isDirty || isSaving) && styles.saveDisabled,
              pressed && isDirty && styles.pressed,
            ]}
          >
            <Text style={styles.saveText}>
              {isSaving ? '保存中…' : '保存'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  actions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  counter: { color: colors.subtle, fontSize: 11, flex: 1 },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  deleteText: { color: colors.accentRich, fontSize: 13, fontWeight: '700' },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hint: { color: colors.subtle, fontSize: 11, lineHeight: 16, marginTop: 4 },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    minHeight: 96,
    padding: 12,
  },
  loading: { color: colors.muted, fontSize: 13, marginTop: 12 },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  pressed: { opacity: 0.62 },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 18,
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  updatedAt: { color: colors.subtle, fontSize: 11 },
});
