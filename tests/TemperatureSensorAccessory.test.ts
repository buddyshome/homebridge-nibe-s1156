import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {TemperatureSensorAccessory} from '../src/platform/nibeaccessory/TemperatureSensorAccessory.ts';
import {deviceInfo, langDir, loadData, mockAccessory, serviceResolver, testDevice, testLogger, testSystem} from './test-utils.ts';
import {Locale} from '../src/platform/util/Locale.ts';
import {MyUplinkApiFetcher} from '../src/platform/myuplink/MyUplinkApiFetcher.ts';
import {type AccessoryInstance} from '../src/platform/AccessoryDomain.ts';

describe('Test TemperatureSensorAccessory', () => {

  const accessoryDefinition = new TemperatureSensorAccessory(
    '40067',
    'average-outdoor-temperature-40067',
    1,
    new Locale('en', testLogger, langDir),
    serviceResolver,
    testLogger,
  );

  const data = MyUplinkApiFetcher.mapData(testSystem, [], testDevice, deviceInfo, loadData('F1145-10-PC'));

  test('TemperatureSensorAccessory: should be applicable', () => {
    assert.ok(accessoryDefinition.isApplicable(data));
  });

  test('TemperatureSensorAccessory: create should set parameters', () => {
    const platformAccessory = mockAccessory();
    accessoryDefinition.create(platformAccessory as AccessoryInstance, data);

    assert.equal(platformAccessory.getValue('TemperatureSensor', 'CurrentTemperature'), 22.9);
    assert.equal(platformAccessory.getValue('TemperatureSensor', 'Name'), 'Nibe average outdoor temperature');
  });
});