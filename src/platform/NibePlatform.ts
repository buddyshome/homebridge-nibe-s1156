import type { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from 'homebridge' with { 'resolution-mode': 'import' };
import * as path from 'path';
import { MyUplinkApiFetcher } from './myuplink/MyUplinkApiFetcher.ts';
import type * as dataDomain from './DataDomain.ts';
import { type Data, type DataFetcher } from './DataDomain.ts';
import { Locale } from './util/Locale.ts';
import { toHapName } from './util/HapName.ts';
import {
  type AccessoryContext,
  type AccessoryDefinition,
  type AccessoryInstance,
  type ServiceResolver,
  type ServiceType,
} from './AccessoryDomain.ts';
import { TemperatureSensorAccessory } from './nibeaccessory/TemperatureSensorAccessory.ts';
import { HotWaterAccessory } from './nibeaccessory/HotWaterAccessory.ts';
import { NewFirmwareAccessory } from './nibeaccessory/NewFirmwareAccessory.ts';

export const PLATFORM_NAME = 'Nibe-s1156';
export const PLUGIN_NAME = 'homebridge-nibe-s1156';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class NibePlatform implements DynamicPlatformPlugin {

  private readonly dataFetcher: DataFetcher;
  private readonly accessories: AccessoryInstance[] = [];
  private readonly renamedAccessories: PlatformAccessory[] = [];
  private readonly accessoryDefinitions: AccessoryDefinition[];
  private readonly locale: Locale;
  private readonly serviceResolver: ServiceResolver;
  private readonly log: Logger;
  private readonly config: PlatformConfig;
  private readonly api: API;

  constructor(log: Logger, config: PlatformConfig, api: API) {
    this.log = log;
    this.config = config;
    this.api = api;
    this.locale = new Locale(config.language, log, path.resolve(__dirname, '../lang'));

    this.serviceResolver = {
      resolveCharacteristic(type: any) {
        return api.hap.Characteristic[type];
      },
      resolveService(type: ServiceType) {
        return api.hap.Service[type];
      },
    } as ServiceResolver;

    this.dataFetcher = new MyUplinkApiFetcher({
      clientId: config.identifier,
      clientSecret: config.secret,
      interval: config.pollingPeriod || 60,
      language: config.language,
      showApiResponse: config.showApiResponse || false,
    }, log);

    this.accessoryDefinitions = [
      new TemperatureSensorAccessory('40067', 'average-outdoor-temperature-40067', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('54', 'Average temper­ature (BT1)', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('40004', 'outdoor-temperature-40004', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('4', 'Current outdoor temper­ature (BT1)', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('44362', 'outdoor-temperature-44362', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('40025', 'ventilation-exhaust-air-40025', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('40026', 'ventilation-extract-air-40026', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('40075', 'ventilation-supply-air-40075', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('40183', 'ventilation-outdoor-40183', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('40013', 'hot-water-top-40013', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('12', 'Hot water char­ging (BT6)', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('38', 'Pool (BT51)', 2, this.locale, this.serviceResolver, this.log),
      new TemperatureSensorAccessory('24632', 'Pool supply line (BT59)', 2, this.locale, this.serviceResolver, this.log),
      new HotWaterAccessory('hot-water', 4, this.locale, this.serviceResolver, this.log,
        async (deviceId: string, paramId: string, value: any) => {
          return await this.dataFetcher.setValue(deviceId, paramId, value);
        },
      ),
      new NewFirmwareAccessory('new-firmware', 2, this.locale, this.serviceResolver, this.log),
    ];


    this.log.debug('Finished initializing platform');

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      if (this.renamedAccessories.length > 0) {
        // Persist the fixed names so HAP does not warn about the cached names on the next start.
        this.api.updatePlatformAccessories(this.renamedAccessories);
        this.renamedAccessories.length = 0;
      }
      this.dataFetcher.start();
      this.dataFetcher
        .on<dataDomain.Data>('data', (data) => {
          this.handleData(data);
        }).on('error', (data) => {
          this.log.error('Error:', data);
        });
    });

    this.api.on('shutdown', () => {
      this.dataFetcher.stop();
    });
  }

  public handleData(data: Data): void {
    const touchedAccessoriesIds = Array<string>();

    this.accessoryDefinitions.forEach(accessoryDefinition => {
      const isApplicable = accessoryDefinition.isApplicable(data);
      const accessoryId = accessoryDefinition.buildIdentifier(data);
      const isDisabled = this.isDisabled(accessoryId);

      if (isApplicable && !isDisabled) {
        const platformAccessory = this.accessories.find(a => a.context.accessoryId === accessoryId);
        if (platformAccessory) {
          this.updateAccessory(accessoryDefinition, platformAccessory, data);
        } else {
          this.createAccessory(accessoryId, accessoryDefinition, data);
        }
        touchedAccessoriesIds.push(accessoryId);
      }
    });

    this.removeNotExistingAccessories(data.system.systemId, data.device.id, touchedAccessoriesIds);
  }

  private createAccessory(accessoryId: string, accessoryDefinition: AccessoryDefinition, data: Data) {
    this.log.info('Adding new accessory: [%s]', accessoryId);
    const platformAccessory = new this.api.platformAccessory<AccessoryContext>(
      accessoryDefinition.buildName(data),
      this.api.hap.uuid.generate(PLUGIN_NAME + '-' + accessoryId),
    ) as AccessoryInstance;
    accessoryDefinition.create(platformAccessory, data);
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [platformAccessory as PlatformAccessory<AccessoryContext>]);
    this.accessories.push(platformAccessory);
  }

  private updateAccessory(accessoryDefinition: AccessoryDefinition, platformAccessory: AccessoryInstance, data: Data) {
    if (!accessoryDefinition.isCurrentVersion(platformAccessory)) {
      this.log.info('Old version of accessory, recreating: [%s]',
        platformAccessory.context.accessoryId);
      accessoryDefinition.create(platformAccessory, data);
      // Persist the new version/name so the accessory is not recreated on every start.
      this.api.updatePlatformAccessories([platformAccessory as unknown as PlatformAccessory]);
    }

    this.log.debug('Updating accessory: [%s]', platformAccessory.context.accessoryId);
    accessoryDefinition.update(platformAccessory, data);
  }

  private isDisabled(accessoryId: string) {
    if (this.config.disabledAccessories &&
      this.config.disabledAccessories.some(da => (da.indexOf(';') > 0 ? da.substring(0, da.indexOf(';')) : da) === accessoryId)) {
      this.log.debug('Disabled accessory: [%s]', accessoryId);
      return true;
    }
    return false;
  }

  private removeNotExistingAccessories(systemId: string, deviceId: string, existingAccessoriesIds: string[]) {
    this.accessories
      .filter(accessory => accessory.context.systemId === systemId)
      .filter(accessory => accessory.context.deviceId === deviceId)
      .filter(accessory => !existingAccessoriesIds.includes(accessory.context.accessoryId))
      .forEach(accessory => this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory as PlatformAccessory<AccessoryContext>]));
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(`Loading accessory from cache: [${accessory.displayName}], UUID: [${accessory.UUID}]`);
    const validName = toHapName(accessory.displayName);
    if (validName !== accessory.displayName) {
      accessory.displayName = validName;
      accessory.getService(this.api.hap.Service.AccessoryInformation)
        ?.updateCharacteristic(this.api.hap.Characteristic.Name, validName);
      this.log.info(`Renamed cached accessory to valid HomeKit name: [${validName}]`);
      this.renamedAccessories.push(accessory);
    }
    this.accessories.push(accessory as unknown as AccessoryInstance);
  }
}
