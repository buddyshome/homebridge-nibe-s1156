import {type Data} from '../DataDomain.ts';
import {AccessoryDefinition, type AccessoryInstance, type ServiceResolver} from '../AccessoryDomain.ts';
import {type Logger} from '../PlatformDomain.ts';
import {type Locale} from '../util/Locale.ts';

export class TemperatureSensorAccessory extends AccessoryDefinition {

  private readonly parameterId: string;

  constructor(
    parameterId: string,
    name: string,
    version: number,
    locale: Locale,
    serviceResolver: ServiceResolver,
    log: Logger,
  ) {
    super(name, version, locale, serviceResolver, log);
    this.parameterId = parameterId;
  }

  isApplicable(data: Data) {
    const result = this.findParameter(this.parameterId, data);
    if (result) {
      return true;
    }

    this.logNotApplicable(data);
    return false;
  }

  update(platformAccessory: AccessoryInstance, data: Data) {
    const service = this.getOrCreateService('TemperatureSensor', platformAccessory);
    const parameter = this.findParameter(this.parameterId, data);
    if (service && parameter) {
      this.updateCharacteristic(service, 'CurrentTemperature', parameter.value);
      super.update(platformAccessory, data);
      this.log.debug(`Accessory ${platformAccessory.context.accessoryId} updated to ${parameter.value}`);
    }
  }

  create(platformAccessory: AccessoryInstance, data: Data): void {
    super.create(platformAccessory, data);

    const service = this.getOrCreateService('TemperatureSensor', platformAccessory);
    this.updateCharacteristic(service, 'Name', this.getText(this.name));
    this.updateCharacteristic(service, 'CurrentTemperature', 0);

    this.update(platformAccessory, data);
  }
}