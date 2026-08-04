import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
} from 'idb';

export type OfflineOwner = {
  id?: string;

  userId?: string;

  fullName?: string | null;

  birthDate?: string | null;

  identityNumber?: string | null;

  phone?: string | null;

  email?: string | null;

  nationality?: string | null;

  country?: string | null;

  address?: string | null;

  photoUrl?: string | null;

  user?: {
    id?: string;

    fullName?: string | null;

    phone?: string | null;

    email?: string | null;

    photoUrl?: string | null;
  } | null;
};

export type OfflineDriver = {
  id: string;

  userId?: string;

  fullName: string;

  birthDate?: string | null;

  identityNumber?: string | null;

  drivingLicenseNumber?: string | null;

  phone?: string | null;

  email?: string | null;

  nationality?: string | null;

  country?: string | null;

  address?: string | null;

  photoUrl?: string | null;

  user?: {
    id?: string;

    fullName?: string | null;

    phone?: string | null;

    email?: string | null;

    photoUrl?: string | null;
  } | null;
};

export type OfflineDriverLink = {
  id?: string;

  isActive?: boolean;

  startDate?: string;

  endDate?: string | null;

  driver?: OfflineDriver | null;
};

export type OfflineGpsDevice = {
  id?: string;

  imei?: string;

  isActive?: boolean;
};

export type OfflineTheftReport = {
  id?: string;

  type?: string;

  status?: string;

  reportNumber?: string | null;

  reportedAt?: string;
};

export type OfflineAuthorization = {
  id?: string;

  status?: string;

  startDateTime?: string;

  endDateTime?: string;

  driver?: {
    id?: string;

    fullName?: string;

    identityNumber?: string | null;

    drivingLicenseNumber?: string | null;

    phone?: string | null;

    photoUrl?: string | null;
  } | null;
};

export type OfflineMotorcycle = {
  id: string;

  nationalCode: string;

  qrToken: string;

  plateNumber: string;

  chassisNumber: string;

  brand: string;

  model?: string | null;

  color?: string | null;

  photoUrl?: string | null;

  type: string;

  status: string;

  owner?: OfflineOwner | null;

  driverLinks?: OfflineDriverLink[];

  gpsDevices?: OfflineGpsDevice[];

  theftReports?: OfflineTheftReport[];

  authorizations?: OfflineAuthorization[];

  createdAt?: string;

  updatedAt?: string;

  synchronizedAt: string;
};

export type OfflinePoliceCheck = {
  offlineId: string;

  motorcycleId?: string;

  policeOfficerId?: string;

  plateNumber?: string;

  chassisNumber?: string;

  nationalCode?: string;

  locationText?: string;

  latitude?: number;

  longitude?: number;

  result: string;

  notes?: string;

  createdAt: string;

  synchronized: boolean;
};

type OfflineMetadata = {
  key: string;

  value: string;
};

interface PoliceOfflineDatabase
  extends DBSchema {
  motorcycles: {
    key: string;

    value: OfflineMotorcycle;

    indexes: {
      'by-plate': string;

      'by-national-code': string;

      'by-chassis': string;

      'by-qr-token': string;
    };
  };

  policeChecks: {
    key: string;

    value: OfflinePoliceCheck;

    indexes: {
      'by-synchronized': number;

      'by-created-at': string;
    };
  };

  metadata: {
    key: string;

    value: OfflineMetadata;
  };
}

const DATABASE_NAME =
  'leban-police-offline';

const DATABASE_VERSION = 1;

let databasePromise:
  | Promise<
      IDBPDatabase<PoliceOfflineDatabase>
    >
  | null = null;

function getDatabase() {
  if (!databasePromise) {
    databasePromise =
      openDB<PoliceOfflineDatabase>(
        DATABASE_NAME,
        DATABASE_VERSION,
        {
          upgrade(database) {
            if (
              !database.objectStoreNames.contains(
                'motorcycles',
              )
            ) {
              const motorcycleStore =
                database.createObjectStore(
                  'motorcycles',
                  {
                    keyPath: 'id',
                  },
                );

              motorcycleStore.createIndex(
                'by-plate',
                'plateNumber',
                {
                  unique: false,
                },
              );

              motorcycleStore.createIndex(
                'by-national-code',
                'nationalCode',
                {
                  unique: false,
                },
              );

              motorcycleStore.createIndex(
                'by-chassis',
                'chassisNumber',
                {
                  unique: false,
                },
              );

              motorcycleStore.createIndex(
                'by-qr-token',
                'qrToken',
                {
                  unique: false,
                },
              );
            }

            if (
              !database.objectStoreNames.contains(
                'policeChecks',
              )
            ) {
              const checksStore =
                database.createObjectStore(
                  'policeChecks',
                  {
                    keyPath: 'offlineId',
                  },
                );

              checksStore.createIndex(
                'by-synchronized',
                'synchronized',
              );

              checksStore.createIndex(
                'by-created-at',
                'createdAt',
              );
            }

            if (
              !database.objectStoreNames.contains(
                'metadata',
              )
            ) {
              database.createObjectStore(
                'metadata',
                {
                  keyPath: 'key',
                },
              );
            }
          },
        },
      );
  }

  return databasePromise;
}

function normalizeSearchValue(
  value: string,
) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export async function replaceOfflineMotorcycles(
  motorcycles: Omit<
    OfflineMotorcycle,
    'synchronizedAt'
  >[],
) {
  const database =
    await getDatabase();

  const transaction =
    database.transaction(
      [
        'motorcycles',
        'metadata',
      ],
      'readwrite',
    );

  const synchronizedAt =
    new Date().toISOString();

  await transaction
    .objectStore('motorcycles')
    .clear();

  for (
    const motorcycle of motorcycles
  ) {
    await transaction
      .objectStore('motorcycles')
      .put({
        ...motorcycle,

        nationalCode:
          motorcycle.nationalCode?.toUpperCase(),

        plateNumber:
          motorcycle.plateNumber?.toUpperCase(),

        chassisNumber:
          motorcycle.chassisNumber?.toUpperCase(),

        qrToken:
          motorcycle.qrToken?.trim(),

        synchronizedAt,
      });
  }

  await transaction
    .objectStore('metadata')
    .put({
      key: 'lastMotorcycleSync',

      value: synchronizedAt,
    });

  await transaction.done;

  return {
    count: motorcycles.length,

    synchronizedAt,
  };
}

export async function getAllOfflineMotorcycles() {
  const database =
    await getDatabase();

  return database.getAll(
    'motorcycles',
  );
}

export async function searchOfflineMotorcycle(
  searchValue: string,
) {
  const normalized =
    normalizeSearchValue(
      searchValue,
    );

  if (!normalized) {
    return null;
  }

  const motorcycles =
    await getAllOfflineMotorcycles();

  return (
    motorcycles.find(
      (motorcycle) => {
        const plate =
          normalizeSearchValue(
            motorcycle.plateNumber ??
              '',
          );

        const nationalCode =
          normalizeSearchValue(
            motorcycle.nationalCode ??
              '',
          );

        const chassis =
          normalizeSearchValue(
            motorcycle.chassisNumber ??
              '',
          );

        const qrToken =
          normalizeSearchValue(
            motorcycle.qrToken ??
              '',
          );

        return (
          plate === normalized ||
          nationalCode ===
            normalized ||
          chassis === normalized ||
          qrToken === normalized ||
          chassis.endsWith(
            normalized,
          )
        );
      },
    ) ?? null
  );
}

export async function saveOfflinePoliceCheck(
  check: Omit<
    OfflinePoliceCheck,
    | 'offlineId'
    | 'createdAt'
    | 'synchronized'
  >,
) {
  const database =
    await getDatabase();

  const offlineCheck: OfflinePoliceCheck =
    {
      ...check,

      offlineId:
        crypto.randomUUID(),

      createdAt:
        new Date().toISOString(),

      synchronized: false,
    };

  await database.put(
    'policeChecks',
    offlineCheck,
  );

  return offlineCheck;
}

export async function getPendingPoliceChecks() {
  const database =
    await getDatabase();

  const checks =
    await database.getAll(
      'policeChecks',
    );

  return checks.filter(
    (check) =>
      !check.synchronized,
  );
}

export async function markPoliceCheckAsSynchronized(
  offlineId: string,
) {
  const database =
    await getDatabase();

  const check =
    await database.get(
      'policeChecks',
      offlineId,
    );

  if (!check) {
    return;
  }

  await database.put(
    'policeChecks',
    {
      ...check,

      synchronized: true,
    },
  );
}

export async function getOfflineMetadata(
  key: string,
) {
  const database =
    await getDatabase();

  const metadata =
    await database.get(
      'metadata',
      key,
    );

  return (
    metadata?.value ?? null
  );
}

export async function getOfflineStatistics() {
  const database =
    await getDatabase();

  const motorcycles =
    await database.count(
      'motorcycles',
    );

  const allChecks =
    await database.getAll(
      'policeChecks',
    );

  const pendingChecks =
    allChecks.filter(
      (check) =>
        !check.synchronized,
    ).length;

  const lastSync =
    await getOfflineMetadata(
      'lastMotorcycleSync',
    );

  return {
    motorcycles,

    checks: allChecks.length,

    pendingChecks,

    lastSync,
  };
}

export async function clearPoliceOfflineDatabase() {
  const database =
    await getDatabase();

  const transaction =
    database.transaction(
      [
        'motorcycles',
        'policeChecks',
        'metadata',
      ],
      'readwrite',
    );

  await transaction
    .objectStore('motorcycles')
    .clear();

  await transaction
    .objectStore('policeChecks')
    .clear();

  await transaction
    .objectStore('metadata')
    .clear();

  await transaction.done;
}