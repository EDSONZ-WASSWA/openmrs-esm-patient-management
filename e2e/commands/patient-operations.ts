import { type APIRequestContext, expect } from '@playwright/test';
import { type Patient } from '../types';

export const generateRandomPatient = async (api: APIRequestContext, locationUuid?: string): Promise<Patient> => {
  const identifierRes = await api.post('idgen/identifiersource/8549f706-7e85-4c1d-9424-217d50a2988b/identifier', {
    data: {},
  });
  await expect(identifierRes.ok()).toBeTruthy();
  const { identifier } = await identifierRes.json();

  const patientRes = await api.post('patient', {
    // TODO: This is not configurable right now. It probably should be.
    data: {
      identifiers: [
        {
          identifier,
          identifierType: '05a29f94-c0ed-11e2-94be-8c13b969e334',
          location: locationUuid || process.env.E2E_LOGIN_DEFAULT_LOCATION_UUID,
          preferred: true,
        },
      ],
      person: {
        addresses: [
          {
            address1: 'Bom Jesus Street',
            address2: '',
            cityVillage: 'Recife',
            country: 'Brazil',
            postalCode: '50030-310',
            stateProvince: 'Pernambuco',
          },
        ],
        attributes: [],
        birthdate: '2020-02-01',
        birthdateEstimated: false,
        dead: false,
        gender: 'M',
        names: [
          {
            familyName: `Smith${Math.floor(Math.random() * 10000)}`,
            givenName: `John${Math.floor(Math.random() * 10000)}`,
            middleName: '',
            preferred: true,
          },
        ],
      },
    },
  });
  await expect(patientRes.ok()).toBeTruthy();
  return await patientRes.json();
};

export const getPatient = async (api: APIRequestContext, uuid: string): Promise<Patient> => {
  const patientRes = await api.get(`patient/${uuid}?v=full`);
  return await patientRes.json();
};

export const deletePatient = async (api: APIRequestContext, uuid: string) => {
  const response = await api.delete(`patient/${uuid}`, { data: {} });
  await expect(response.ok()).toBeTruthy();
};
