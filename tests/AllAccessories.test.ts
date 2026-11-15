import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {deviceInfo, langDir, loadData, mockAccessory, serviceResolver, testDevice, testLogger, testSystem} from './test-utils.ts';
import {Locale} from '../src/platform/util/Locale.ts';
import {MyUplinkApiFetcher} from '../src/platform/myuplink/MyUplinkApiFetcher.ts';
import {AccessoryDefinition, type AccessoryInstance} from '../src/platform/AccessoryDomain.ts';
import {type Data} from '../src/platform/DataDomain.ts';
import {type Logger} from '../src/platform/PlatformDomain.ts';

describe('Test common accessory functionalities', () => {

  class TestAccessory extends AccessoryDefinition {
    constructor(locale: Locale, log: Logger) {
      super('test', 1, locale, serviceResolver, log);
    }

    isApplicable(data: Data): boolean {
      return true;
    }
  }

  const accessoryDefinition = new TestAccessory(
    new Locale('en', testLogger, langDir),
    testLogger,
  );

  const data = MyUplinkApiFetcher.mapData(testSystem, [], testDevice, deviceInfo, loadData('F1145-10-PC'));

  test('TestAccessory: create should set context and parameters', () => {
    const platformAccessory = mockAccessory();
    const startEpoch = Date.now();
    accessoryDefinition.create(platformAccessory as AccessoryInstance, data);

    assert.equal(platformAccessory.context.accessoryId, 'emmy-r-test::test');
    assert.equal(platformAccessory.context.version, 1);
    assert.equal(platformAccessory.context.systemId, '42f23d18');
    assert.equal(platformAccessory.context.systemName, 'Dom');
    assert.equal(platformAccessory.context.deviceId, 'emmy-r-test');
    assert.equal(platformAccessory.context.deviceName, 'F1145-10 PC');
    assert.ok(platformAccessory.context.lastUpdate >= startEpoch);

    assert.equal(platformAccessory.getValue('AccessoryInformation', 'Manufacturer'), 'Nibe');
    assert.equal(platformAccessory.getValue('AccessoryInformation', 'Model'), 'F1145-10 PC (Dom)');
    assert.equal(platformAccessory.getValue('AccessoryInformation', 'SerialNumber'), '666');
  });
});

