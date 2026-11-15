import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {deviceInfo, langDir, loadData, mockAccessory, serviceResolver, testDevice, testLogger, testSystem} from './test-utils.ts';
import {Locale} from '../src/platform/util/Locale.ts';
import {MyUplinkApiFetcher} from '../src/platform/myuplink/MyUplinkApiFetcher.ts';
import {type AccessoryInstance} from '../src/platform/AccessoryDomain.ts';
import {NewFirmwareAccessory} from '../src/platform/nibeaccessory/NewFirmwareAccessory.ts';

describe('Test NewFirmwareAccessory', () => {

  const accessoryDefinition = new NewFirmwareAccessory(
    'new-firmware',
    1,
    new Locale('en', testLogger, langDir),
    serviceResolver,
    testLogger,
  );

  const data = MyUplinkApiFetcher.mapData(testSystem, [], testDevice, deviceInfo, loadData('F1145-10-PC'));

  test('NewFirmwareAccessory: should be applicable', () => {
    assert.ok(accessoryDefinition.isApplicable(data));
  });

  test('NewFirmwareAccessory: create should set parameters', () => {
    const platformAccessory = mockAccessory();
    accessoryDefinition.create(platformAccessory as AccessoryInstance, data);

    assert.equal(platformAccessory.getValue('OccupancySensor', 'OccupancyDetected'), 1);
    assert.equal(platformAccessory.getValue('OccupancySensor', 'Name'), 'Update F1145-10 PC');
  });
});