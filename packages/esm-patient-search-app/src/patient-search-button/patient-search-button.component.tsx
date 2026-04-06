import React, { useCallback, useState } from 'react';
import { Button } from '@carbon/react';
import { Search } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import PatientSearchOverlay from '../patient-search-overlay/patient-search-overlay.component';

interface PatientSearchButtonProps {
  buttonProps?: object;
  buttonText?: string;
  isOpen?: boolean;
  searchQuery?: string;
  searchQueryUpdatedAction?: (query: string) => void;
  selectPatientAction?: (patientUuid: string, patient: fhir.Patient) => void;
  workspaceTitle?: string;
}

/**
 * This patient search button is an extension that other apps can include
 * to add patient search functionality. It opens the search UI in an overlay.
 *
 * @returns
 */
const PatientSearchButton: React.FC<PatientSearchButtonProps> = ({
  buttonText,
  workspaceTitle,
  selectPatientAction,
  searchQueryUpdatedAction,
  buttonProps,
  isOpen = false,
  searchQuery = '',
}) => {
  const { t } = useTranslation();
  const [isOverlayOpen, setIsOverlayOpen] = useState(isOpen);

  const handleOpenOverlay = useCallback(() => {
    setIsOverlayOpen(true);
    void (searchQueryUpdatedAction && searchQueryUpdatedAction(''));
  }, [searchQueryUpdatedAction]);

  const handleCloseOverlay = useCallback(() => {
    setIsOverlayOpen(false);
  }, []);

  return (
    <>
      <Button
        aria-label={t('searchPatientButton', 'Search Patient Button')}
        onClick={handleOpenOverlay}
        renderIcon={(props) => <Search size={20} {...props} />}
        {...buttonProps}>
        {buttonText ? buttonText : t('searchPatient', 'Search patient')}
      </Button>

      {isOverlayOpen && (
        <PatientSearchOverlay
          onClose={handleCloseOverlay}
          query={searchQuery}
          header={workspaceTitle}
          handleSearchTermUpdated={searchQueryUpdatedAction}
          nonNavigationSelectPatientAction={selectPatientAction}
        />
      )}
    </>
  );
};

export default PatientSearchButton;
