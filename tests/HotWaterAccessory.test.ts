import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {deviceInfo, langDir, loadData, mockAccessory, serviceResolver, testDevice, testLogger, testSystem} from './test-utils.ts';
import {Locale} from '../src/platform/util/Locale.ts';
import {MyUplinkApiFetcher} from '../src/platform/myuplink/MyUplinkApiFetcher.ts';
import {type AccessoryInstance} from '../src/platform/AccessoryDomain.ts';
import {HotWaterAccessory} from '../src/platform/nibeaccessory/HotWaterAccessory.ts';

describe('Test HotWaterAccessory', () => {

  const accessoryDefinition = new HotWaterAccessory(
    'hot-water',
    1,
    new Locale('en', testLogger, langDir),
    serviceResolver,
    testLogger,
    async (deviceId: string, paramId: string, value: any) => {
      return Promise.resolve();
    },
  );

  const data = MyUplinkApiFetcher.mapData(testSystem, [], testDevice, deviceInfo, loadData('F1145-10-PC'));

  test('HotWaterAccessory: should be applicable', () => {
    assert.ok(accessoryDefinition.isApplicable(data));
  });

  test('HotWaterAccessory: create should set parameters', () => {
    const platformAccessory = mockAccessory();
    accessoryDefinition.create(platformAccessory as AccessoryInstance, data);

    assert.equal(platformAccessory.getValue('Thermostat', 'Name'), 'Nibe hot water temperature');
    assert.equal(platformAccessory.getValue('Thermostat', 'TargetHeatingCoolingState'), 3);
    assert.equal(platformAccessory.getValue('Thermostat', 'CurrentHeatingCoolingState'), 0);
    assert.equal(platformAccessory.getValue('Thermostat', 'CurrentTemperature'), 46.1);
    assert.equal(platformAccessory.getValue('Thermostat', 'TemperatureDisplayUnits'), 0);
    assert.equal(platformAccessory.getValue('Thermostat', 'TargetTemperature'), 59.2);
    assert.equal(platformAccessory.getValue('Thermostat', 'HeatingThresholdTemperature'), 59.2);
  });
});