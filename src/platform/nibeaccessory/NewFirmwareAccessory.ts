import {AccessoryDefinition, type AccessoryInstance, type ServiceResolver} from '../AccessoryDomain.ts';
import {type Data} from '../DataDomain.ts';
import {type Locale} from '../util/Locale.ts';
import {type Logger} from '../PlatformDomain.ts';

export class NewFirmwareAccessory extends AccessoryDefinition {

  constructor(
    name: string,
    version: number,
    locale: Locale,
    serviceResolver: ServiceResolver,
    log: Logger,
  ) {
    super(name, version, locale, serviceResolver, log);
  }

  isApplicable(data: Data): boolean {
    return true;
  }

  update(platformAccessory: AccessoryInstance, data: Data) {
    const service = this.getOrCreateService('OccupancySensor', platformAccessory);
    this.updateCharacteristic(service, 'OccupancyDetected', data.device.firmwareUpdateAvailable ? 1 : 0);
  }

  create(platformAccessory: AccessoryInstance, data: Data): void {
    super.create(platformAccessory, data);

    const service = this.getOrCreateService('OccupancySensor', platformAccessory);
    this.updateCharacteristic(service, 'Name', this.getText(this.name) + ' ' + data.device.name);
    this.updateCharacteristic(service, 'OccupancyDetected', 0);

    this.update(platformAccessory, data);
  }
}