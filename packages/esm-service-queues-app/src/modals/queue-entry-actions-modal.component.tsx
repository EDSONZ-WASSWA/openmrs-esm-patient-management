import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Checkbox,
  ContentSwitcher,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  RadioButton,
  RadioButtonGroup,
  Select,
  SelectItem,
  Stack,
  Switch,
  TextArea,
  TimePicker,
  TimePickerSelect,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { OpenmrsDatePicker, showSnackbar, type FetchResponse, useConfig } from '@openmrs/esm-framework';
import { time12HourFormatRegexPattern } from '../constants';
import { convertTime12to24, type amPm } from '../helpers/time-helpers';
import { useMutateQueueEntries } from '../hooks/useQueueEntries';
import { useQueues } from '../hooks/useQueues';
import { type ConfigObject } from '../config-schema';
import { type QueueEntry } from '../types';
import styles from './queue-entry-actions.scss';

interface QueueEntryActionModalProps {
  queueEntry: QueueEntry;
  closeModal: () => void;
  modalParams: ModalParams;
}

interface FormState {
  selectedQueue: string;
  selectedPriority: string;
  selectedStatus: string;
  prioritycomment: string;
  modifyDefaultTransitionDateTime: boolean;
  transitionDate: Date;
  transitionTime: string;
  transitionTimeFormat: amPm;
}

interface ModalParams {
  modalTitle: string;
  modalInstruction: string;
  submitButtonText: string;
  submitSuccessTitle: string;
  submitSuccessText: string;
  submitFailureTitle: string;
  submitAction: (queueEntry: QueueEntry, formState: FormState) => Promise<FetchResponse<any>>;
  disableSubmit: (queueEntry, formState) => boolean;
  isTransition: boolean; // is transition or edit?
}

// Modal for performing a queue entry action that requires additional form fields / inputs from user
// Used by EditQueueEntryModal and TransitionQueueEntryModal
export const QueueEntryActionModal: React.FC<QueueEntryActionModalProps> = ({
  queueEntry,
  closeModal,
  modalParams,
}) => {
  const config = useConfig<ConfigObject>();
  const { t } = useTranslation();
  const { mutateQueueEntries } = useMutateQueueEntries();
  const {
    modalTitle,
    modalInstruction,
    submitButtonText,
    submitSuccessTitle,
    submitSuccessText,
    submitFailureTitle,
    submitAction,
    disableSubmit,
    isTransition,
  } = modalParams;

  const initialTransitionDate = isTransition ? new Date() : new Date(queueEntry.startedAt);
  const [formState, setFormState] = useState<FormState>({
    selectedQueue: queueEntry.queue.uuid,
    selectedPriority: queueEntry.priority.uuid,
    selectedStatus: queueEntry.status.uuid,
    prioritycomment: queueEntry.priorityComment ?? '',
    modifyDefaultTransitionDateTime: false,
    transitionDate: initialTransitionDate,
    transitionTime: dayjs(initialTransitionDate).format('hh:mm'),
    transitionTimeFormat: dayjs(initialTransitionDate).hour() < 12 ? 'AM' : 'PM',
  });
  const { queues } = useQueues();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedQueue = queues.find((q) => q.uuid == formState.selectedQueue);

  const statuses = selectedQueue?.allowedStatuses;
  const hasNoStatusesConfigured = selectedQueue && statuses.length == 0;
  const priorities = selectedQueue?.allowedPriorities;
  const hasNoPrioritiesConfigured = selectedQueue && priorities.length == 0;

  const setSelectedQueueUuid = (selectedQueueUuid: string) => {
    const newSelectedQueue = queues.find((q) => q.uuid == selectedQueueUuid);
    const { allowedStatuses, allowedPriorities } = newSelectedQueue;
    const newQueueHasCurrentPriority = allowedPriorities.find((s) => s.uuid == formState.selectedPriority);
    const defaultStatusUuid = config.concepts.defaultStatusConceptUuid;
    const newQueueHasDefaultStatus = allowedStatuses.find((s) => s.uuid == defaultStatusUuid);
    const newStatus = newQueueHasDefaultStatus ? defaultStatusUuid : allowedStatuses[0]?.uuid;

    setFormState({
      ...formState,
      selectedQueue: selectedQueueUuid,
      selectedStatus: newStatus,
      selectedPriority: newQueueHasCurrentPriority ? formState.selectedPriority : allowedPriorities[0]?.uuid,
    });
  };

  const setSelectedPriorityUuid = (selectedPriorityUuid: string) => {
    setFormState({ ...formState, selectedPriority: selectedPriorityUuid });
  };

  const setSelectedStatusUuid = (selectedStatusUuid: string) => {
    setFormState({ ...formState, selectedStatus: selectedStatusUuid });
  };

  const setPriorityComment = (prioritycomment: string) => {
    setFormState({ ...formState, prioritycomment });
  };

  const setTransitionDate = (transitionDate: Date) => {
    setFormState({ ...formState, transitionDate });
  };

  const setTransitionTime = (transitionTime: string) => {
    setFormState({ ...formState, transitionTime });
  };

  const setTransitionTimeFormat = (transitionTimeFormat: amPm) => {
    setFormState({ ...formState, transitionTimeFormat });
  };

  const setModifyDefaultTransitionDateTime = (modifyDefaultTransitionDateTime) => {
    setFormState({ ...formState, modifyDefaultTransitionDateTime });
  };

  const submitForm = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    submitAction(queueEntry, formState)
      .then(({ status }) => {
        if (status === 200) {
          showSnackbar({
            isLowContrast: true,
            title: submitSuccessTitle,
            kind: 'success',
            subtitle: submitSuccessText,
          });
          mutateQueueEntries();
          closeModal();
        } else {
          throw { message: t('unexpectedServerResponse', 'Unexpected Server Response') };
        }
      })
      .catch((error) => {
        showSnackbar({
          title: submitFailureTitle,
          kind: 'error',
          subtitle: error?.message,
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  // non-null if the selected date+time is invalid
  const timeInvalidMessage = useMemo(() => {
    const now = new Date();
    const startAtDate = new Date(formState.transitionDate);
    const [hour, minute] = convertTime12to24(formState.transitionTime, formState.transitionTimeFormat);
    startAtDate.setHours(hour, minute, 0, 0);

    const previousQueueEntryStartTimeStr = queueEntry.previousQueueEntry?.startedAt;
    const previousQueueEntryStartTime = previousQueueEntryStartTimeStr
      ? new Date(previousQueueEntryStartTimeStr)
      : null;

    if (startAtDate > now) {
      return t('timeCannotBeInFuture', 'Time cannot be in the future');
    }
    if (startAtDate <= previousQueueEntryStartTime) {
      return t(
        'timeCannotBePriorToPreviousQueueEntry',
        'Time cannot be before start of previous queue entry: {{time}}',
        {
          time: previousQueueEntryStartTime.toLocaleString(),
          interpolation: { escapeValue: false },
        },
      );
    }
    return null;
  }, [
    formState.transitionDate,
    formState.transitionTime,
    formState.transitionTimeFormat,
    queueEntry.previousQueueEntry?.startedAt,
    t,
  ]);

  const selectedPriorityIndex = priorities?.findIndex((p) => p.uuid == formState.selectedPriority);

  return (
    <>
      <ModalHeader closeModal={closeModal} title={modalTitle} />
      <ModalBody>
        <div className={styles.queueEntryActionModalBody}>
          <Stack gap={4}>
            <h5>{queueEntry.display}</h5>
            <p>{modalInstruction}</p>
            <section>
              <div className={styles.sectionTitle}>{t('serviceQueue', 'Service queue')}</div>
              <Select
                labelText={t('selectQueue', 'Select a queue')}
                id="queue"
                invalidText="Required"
                value={formState.selectedQueue}
                onChange={(event) => setSelectedQueueUuid(event.target.value)}>
                {queues?.map(({ uuid, display, location }) => (
                  <SelectItem
                    key={uuid}
                    text={
                      uuid == queueEntry.queue.uuid
                        ? t('currentValueFormatted', '{{value}} (Current)', {
                            value: `${display} - ${location?.display}`,
                            interpolation: { escapeValue: false },
                          })
                        : `${display} - ${location?.display}`
                    }
                    value={uuid}
                  />
                ))}
              </Select>
            </section>

            <section>
              <div className={styles.sectionTitle}>{t('queueStatus', 'Queue status')}</div>
              {hasNoStatusesConfigured ? (
                <InlineNotification
                  kind={'error'}
                  lowContrast
                  subtitle={t('configureStatus', 'Please configure status to continue.')}
                  title={t('noStatusConfigured', 'No status configured')}
                />
              ) : (
                <RadioButtonGroup
                  name="status"
                  valueSelected={formState.selectedStatus}
                  onChange={(uuid) => {
                    setSelectedStatusUuid(uuid);
                  }}>
                  {statuses?.map(({ uuid, display }) => (
                    <RadioButton
                      key={uuid}
                      name={display}
                      labelText={
                        uuid == queueEntry.status.uuid
                          ? t('currentValueFormatted', '{{value}} (Current)', {
                              value: display,
                              interpolation: { escapeValue: false },
                            })
                          : display
                      }
                      value={uuid}
                    />
                  ))}
                </RadioButtonGroup>
              )}
            </section>

            <section>
              <div className={styles.sectionTitle}>{t('queuePriority', 'Queue priority')}</div>
              {hasNoPrioritiesConfigured ? (
                <InlineNotification
                  className={styles.inlineNotification}
                  kind={'error'}
                  lowContrast
                  subtitle={t('configurePriorities', 'Please configure priorities to continue.')}
                  title={t('noPrioritiesConfigured', 'No priorities configured')}
                />
              ) : (
                <ContentSwitcher
                  size="sm"
                  selectedIndex={selectedPriorityIndex}
                  onChange={(event) => {
                    setSelectedPriorityUuid(event.name as string);
                  }}>
                  {priorities?.map(({ uuid, display }) => (
                    <Switch
                      role="radio"
                      name={uuid}
                      text={
                        uuid == queueEntry.priority.uuid
                          ? t('currentValueFormatted', '{{value}} (Current)', {
                              value: display,
                              interpolation: { escapeValue: false },
                            })
                          : display
                      }
                      key={uuid}
                      value={uuid}
                    />
                  ))}
                </ContentSwitcher>
              )}
            </section>

            <section>
              <div className={styles.sectionTitle}>{t('priorityComment', 'Priority comment')}</div>
              <TextArea
                labelText=""
                value={formState.prioritycomment}
                onChange={(e) => setPriorityComment(e.target.value)}
                placeholder={t('enterCommentHere', 'Enter comment here')}
              />
            </section>

            <section>
              <div className={styles.sectionTitle}>{t('timeOfTransition', 'Time of transition')}</div>
              <Checkbox
                labelText={t('now', 'Now')}
                id={'modifyTransitionTime'}
                checked={!formState.modifyDefaultTransitionDateTime}
                onChange={(_, { checked }) => {
                  setModifyDefaultTransitionDateTime(!checked);
                }}
              />
              <div className={styles.dateTimeFields}>
                <OpenmrsDatePicker
                  value={formState.transitionDate}
                  maxDate={new Date()}
                  onChange={setTransitionDate}
                  id="datePickerInput"
                  data-testid="datePickerInput"
                  labelText={t('date', 'Date')}
                  isDisabled={!formState.modifyDefaultTransitionDateTime}
                />

                <TimePicker
                  labelText={t('time', 'Time')}
                  onChange={(event) => setTransitionTime(event.target.value)}
                  pattern={time12HourFormatRegexPattern}
                  value={formState.transitionTime}
                  invalid={timeInvalidMessage != null}
                  invalidText={timeInvalidMessage}
                  disabled={!formState.modifyDefaultTransitionDateTime}>
                  <TimePickerSelect
                    id="visitStartTimeSelect"
                    onChange={(event) => setTransitionTimeFormat(event.target.value as amPm)}
                    value={formState.transitionTimeFormat}
                    labelText={t('time', 'Time')}
                    aria-label={t('time', 'Time')}>
                    <SelectItem value="AM" text="AM" />
                    <SelectItem value="PM" text="PM" />
                  </TimePickerSelect>
                </TimePicker>
              </div>
            </section>
          </Stack>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button disabled={isSubmitting || disableSubmit(queueEntry, formState)} onClick={submitForm}>
          {submitButtonText}
        </Button>
      </ModalFooter>
    </>
  );
};

export default QueueEntryActionModal;
