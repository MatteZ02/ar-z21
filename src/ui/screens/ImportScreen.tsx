import {useRouter} from 'expo-router';
import {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {applyImport, ImportResult} from '../../import/applyImport';
import {
  DuplicateChoice,
  ImportPlan,
  makeImportPlan,
  summarize,
  withChoice,
  withChoiceForAll,
} from '../../import/importPlan';
import {OpenedExport, pickRocoExport} from '../../import/openRocoExport';
import {ImportIssue} from '../../import/rocoExport';
import {useLibraryStore} from '../../store/libraryStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {AppButton} from '../components/AppButton';
import {ChoiceRow} from '../components/ChoiceRow';
import {ScreenFrame} from '../components/ScreenFrame';

type Step =
  | {kind: 'start'; message: string | null}
  | {kind: 'reading'}
  | {kind: 'preview'; fileName: string; plan: ImportPlan}
  | {kind: 'importing'}
  | {kind: 'done'; result: ImportResult; issues: ImportIssue[]};

const CHOICES: DuplicateChoice[] = ['skip', 'replace', 'keepBoth'];

const issueText = (issue: ImportIssue): string => {
  const texts = strings.importer.issues;
  switch (issue.kind) {
    case 'invalidAddress':
      return texts.invalidAddress(issue.name, issue.address);
    case 'unsupportedType':
      return texts.unsupportedType(issue.name);
    case 'missingPhoto':
      return texts.missingPhoto(issue.name);
    case 'unknownIcon':
      return texts.unknownIcon(issue.name, issue.icon);
    case 'functionSkipped':
      return texts.functionSkipped(issue.name, issue.number);
    case 'missingMember':
      return texts.missingMember(issue.name);
  }
};

// Imports locos, photos, functions and consists from a Roco Z21 app export
// (brief §7): choose the file, check the preview, decide about duplicate
// addresses, import, then read the report.
export const ImportScreen = () => {
  const {colors, spacing, radii, fontSizes} = useTheme();
  const router = useRouter();
  const {library} = useServices();
  const [step, setStep] = useState<Step>({kind: 'start', message: null});
  const opened = useRef<OpenedExport | null>(null);

  const closeExport = () => {
    opened.current?.close().catch(() => undefined);
    opened.current = null;
  };
  useEffect(() => closeExport, []);

  const choose = async () => {
    setStep({kind: 'reading'});
    closeExport();
    const picked = await pickRocoExport();
    if (picked.status === 'cancelled') {
      setStep({kind: 'start', message: null});
      return;
    }
    if (picked.status === 'invalid') {
      setStep({kind: 'start', message: strings.importer.invalid});
      return;
    }
    opened.current = picked.opened;
    setStep({
      kind: 'preview',
      fileName: picked.fileName,
      plan: makeImportPlan(
        picked.opened.data,
        useLibraryStore.getState().locos,
      ),
    });
  };

  const start = async (plan: ImportPlan) => {
    const current = opened.current;
    if (current === null) {
      return;
    }
    setStep({kind: 'importing'});
    const result = await applyImport(plan, library, current.storePhoto);
    const issues = current.data.issues;
    closeExport();
    setStep({kind: 'done', result, issues});
  };

  const textStyle = {color: colors.textPrimary, fontSize: fontSizes.body};
  const secondaryStyle = {
    color: colors.textSecondary,
    fontSize: fontSizes.small,
  };
  const heading = (text: string) => (
    <Text
      accessibilityRole="header"
      style={{
        color: colors.textPrimary,
        fontSize: fontSizes.large,
        fontWeight: '700',
      }}
    >
      {text}
    </Text>
  );

  const content = (() => {
    switch (step.kind) {
      case 'start':
        return (
          <>
            <Text style={textStyle}>{strings.importer.intro}</Text>
            {step.message !== null && (
              <Text
                accessibilityLiveRegion="polite"
                style={{
                  color: colors.statusShortCircuit,
                  fontSize: fontSizes.body,
                }}
              >
                {step.message}
              </Text>
            )}
            <AppButton
              label={strings.importer.choose}
              icon="file-import"
              onPress={() => {
                choose().catch(() => {
                  setStep({kind: 'start', message: strings.importer.invalid});
                });
              }}
            />
          </>
        );
      case 'reading':
      case 'importing':
        return (
          <View style={[styles.busy, {gap: spacing.md}]}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={textStyle}>
              {step.kind === 'reading'
                ? strings.importer.reading
                : strings.importer.importing}
            </Text>
          </View>
        );
      case 'preview': {
        const {plan} = step;
        const duplicates = plan.locos.filter(
          (entry) => entry.existing.length > 0,
        );
        const summary = summarize(plan);
        const update = (next: ImportPlan) => {
          setStep({...step, plan: next});
        };
        return (
          <>
            <Text style={textStyle}>
              {strings.importer.found(
                step.fileName,
                plan.locos.length,
                plan.consists.length,
              )}
            </Text>
            {duplicates.length > 0 && (
              <View style={{gap: spacing.md}}>
                {heading(strings.importer.duplicatesTitle(duplicates.length))}
                {duplicates.length > 1 && (
                  <ChoiceRow
                    label={strings.importer.allDuplicates}
                    options={CHOICES.map((value) => ({
                      value,
                      label: strings.importer.choices[value],
                    }))}
                    value={
                      duplicates.every(
                        (entry) => entry.choice === duplicates[0].choice,
                      )
                        ? duplicates[0].choice
                        : null
                    }
                    onChange={(choice) => {
                      update(withChoiceForAll(plan, choice));
                    }}
                  />
                )}
                {duplicates.map((entry) => (
                  <View
                    key={entry.loco.sourceId}
                    style={[
                      styles.card,
                      {
                        padding: spacing.sm,
                        gap: spacing.sm,
                        borderRadius: radii.md,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <Text style={[textStyle, styles.bold]}>
                      {strings.drive.addressPrefix}
                      {entry.loco.address} – {entry.loco.name}
                    </Text>
                    <Text style={secondaryStyle}>
                      {strings.importer.existing(
                        entry.existing.map((loco) => loco.name).join(', '),
                      )}
                    </Text>
                    <ChoiceRow
                      label={strings.importer.choiceHints[entry.choice]}
                      options={CHOICES.map((value) => ({
                        value,
                        label: strings.importer.choices[value],
                      }))}
                      value={entry.choice}
                      onChange={(choice) => {
                        update(withChoice(plan, entry.loco.sourceId, choice));
                      }}
                    />
                  </View>
                ))}
              </View>
            )}

            <View style={{gap: spacing.sm}}>
              {plan.locos
                .filter((entry) => entry.existing.length === 0)
                .map((entry) => (
                  <View
                    key={entry.loco.sourceId}
                    style={[styles.row, {gap: spacing.md}]}
                  >
                    <View style={styles.flex}>
                      <Text style={textStyle}>
                        {strings.drive.addressPrefix}
                        {entry.loco.address} – {entry.loco.name}
                      </Text>
                      {entry.loco.wasWagon && (
                        <Text style={secondaryStyle}>
                          {strings.importer.wagon}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
            </View>

            <Text style={secondaryStyle}>{strings.importer.stepsNote}</Text>
            <Text style={[textStyle, styles.bold]}>
              {strings.importer.summary(
                summary.added,
                summary.replaced,
                summary.skipped,
                summary.consists,
              )}
            </Text>
            <AppButton
              label={strings.importer.start}
              icon="check"
              onPress={() => {
                start(plan).catch(() => {
                  setStep({kind: 'start', message: strings.importer.invalid});
                });
              }}
            />
          </>
        );
      }
      case 'done': {
        const {result, issues} = step;
        const lines = [
          ...issues.map(issueText),
          ...result.failed.map((name) => strings.importer.issues.failed(name)),
        ];
        return (
          <>
            {heading(strings.importer.doneTitle)}
            <Text style={textStyle} accessibilityLiveRegion="polite">
              {strings.importer.done(
                result.added,
                result.replaced,
                result.skipped,
                result.consists,
              )}
            </Text>
            {lines.length > 0 && (
              <View style={{gap: spacing.xs}}>
                {heading(strings.importer.problemsTitle)}
                {lines.map((line, index) => (
                  <Text key={index} style={secondaryStyle}>
                    {line}
                  </Text>
                ))}
              </View>
            )}
            <AppButton
              label={strings.importer.toLibrary}
              icon="train-variant"
              onPress={() => {
                router.replace('/library');
              }}
            />
          </>
        );
      }
    }
  })();

  return (
    <ScreenFrame title={strings.importer.title}>
      <ScrollView
        contentContainerStyle={{padding: spacing.md, gap: spacing.lg}}
      >
        {content}
      </ScrollView>
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  busy: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  card: {
    borderWidth: 1,
  },
  bold: {
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
});
