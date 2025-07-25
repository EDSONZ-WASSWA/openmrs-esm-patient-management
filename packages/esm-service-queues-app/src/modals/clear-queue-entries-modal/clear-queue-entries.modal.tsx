import React, { useCallback, useState } from 'react';
import { Button, ButtonSkeleton, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useMutateQueueEntries } from '../../hooks/useQueueEntries';
import { type QueueEntry } from '../../types';
import { batchClearQueueEntries } from './clear-queue-entries.resource';
import styles from './clear-queue-entries.scss';

interface ClearQueueEntriesModalProps {
  queueEntries: Array<QueueEntry>;
  closeModal: () => void;
}

const ClearQueueEntriesModal: React.FC<ClearQueueEntriesModalProps> = ({ queueEntries, closeModal }) => {
  const { t } = useTranslation();
  const { mutateQueueEntries } = useMutateQueueEntries();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClearQueueBatchRequest = useCallback(() => {
    setIsSubmitting(true);
    batchClearQueueEntries(queueEntries).then(
      () => {
        closeModal();
        showSnackbar({
          isLowContrast: true,
          title: t('clearQueue', 'Clear queue'),
          kind: 'success',
          subtitle: t('queuesClearedSuccessfully', 'Queues cleared successfully'),
        });
        mutateQueueEntries();
      },
      (error) => {
        showSnackbar({
          title: t('errorClearingQueues', 'Error clearing queues'),
          kind: 'error',
          isLowContrast: false,
          subtitle: error?.message,
        });
        closeModal();
      },
    );
  }, [closeModal, mutateQueueEntries, t, queueEntries]);

  return (
    <div>
      <ModalHeader
        closeModal={closeModal}
        label={t('serviceQueue', 'Service queue')}
        title={t('clearAllQueueEntries', 'Clear all queue entries?')}
      />
      <ModalBody>
        <p className={styles.subHeading} id="subHeading">
          {t(
            'clearAllQueueEntriesWarningMessage',
            'Clearing all queue entries will remove all the patients from the queues',
          )}
          .
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        {isSubmitting === true ? (
          <ButtonSkeleton />
        ) : (
          <Button kind="danger" onClick={handleClearQueueBatchRequest}>
            {t('clearQueue', 'Clear queue')}
          </Button>
        )}
      </ModalFooter>
    </div>
  );
};

export default ClearQueueEntriesModal;
