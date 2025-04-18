import axios, {AxiosError} from 'axios';
import {EventEmitter} from 'events';
import * as dataDomain from '../DataDomain';
import {Data, DataFetcher} from '../DataDomain';
import {Logger} from '../PlatformDomain';
import * as api from './MyUplinkApiModel';
import {Cache} from '../util/Cache';
import moment from 'moment';

interface Options {
    clientId: string;
    clientSecret: string;
    interval: number;
    language: string;
    showApiResponse: boolean;
}

interface Session extends api.Session {
    expires_at?: number;
}

const consts = {
  baseUrl: 'https://api.myuplink.com',
  scope: 'READSYSTEM WRITESYSTEM',
  grantType: 'client_credentials',
  timeout: 45000,
  userAgent: 'homebridge-nibe',
  renewBeforeExpiry: 5 * 60 * 1000,
  allowedParameters: [4,12,38,54,40067,40004,44362,40013,40014,40008,40025,40026,40075,40183,48132,43437],
};

export class MyUplinkApiFetcher extends EventEmitter implements DataFetcher {
  private options: Options;
  private log: Logger;
  private interval: NodeJS.Timeout | null | undefined;
  private active: boolean | undefined;
  private systems: api.System[] | null | undefined;
  private auth: Session | null | undefined;
  private cache: Cache = new Cache();
  private currentlySetting: [] = [];

  constructor(options: Options, log: Logger) {
    super();

    this.options = options;
    this.log = log;

    axios.defaults.baseURL = consts.baseUrl;
    axios.defaults.headers.common['user-agent'] = consts.userAgent;
    axios.defaults.timeout = consts.timeout;
  }

  start(): void {
    if (this.interval != null) {
      return;
    }

    this.active = false;

    const exec = (): void => {
      if (this.active) {
        return;
      }
      this.active = true;
      this.fetch().then(() => {
        this.active = false;
      });
    };
    this.interval = setInterval(exec, <number>this.options.interval * 1000);

    exec();
  }

  stop(): void {
    if (this.interval == null) {
      return;
    }
    clearInterval(this.interval);
    this.interval = null;
  }

  private async fetch(): Promise<void> {
    this.log.debug('Fetch data.');
    try {
      if (this.isTokenExpired()) {
        this.log.debug('Token is expired / expires soon - refreshing');
        const token = await this.getToken();
        this.setSession(token);
      }

      if (this.systems == null) {
        this.systems = await this.fetchSystems();
      }

      for (const system of this.systems) {
        const subscriptions = await this.fetchPremiumSubscriptions(system.systemId);

        for (const device of system.devices) {
          const deviceInfo = await this.fetchDeviceInfo(device.id);
          try {
            const parameters = await this.fetchData(device);

            const data = MyUplinkApiFetcher.mapData(system, subscriptions, device, deviceInfo, parameters);
            if (data) {
              this.log.debug(`Prepared data:\n${JSON.stringify(data)}`);
              this._onData(data);
            }
          } catch (error) {
            this._onError(error);
          }
        }
      }

      this.log.debug('All data fetched.');
    } catch (error) {
      this._onError(error);
    }
  }

  private async getToken(): Promise<Session> {
    this.log.debug('token()');
    const body = {
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      grant_type: consts.grantType,
      scope: consts.scope,
    };

    const url = '/oauth/token';
    try {
      const now = Date.now();
      const { data } = await axios.post<Session>(
        url, new URLSearchParams(body).toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      if(this.options.showApiResponse) {
        this.log.info('Nibe data from '+url+': ' +JSON.stringify(data));
      }

      const expiresIn = data.expires_in ?? 3600;
      data.expires_at = now + expiresIn * 1000;
      return data;
    } catch (error) {
      throw this.checkError(url, error);
    }
  }

  private async fetchSystems(): Promise<api.System[]> {
    this.log.debug('Fetch units.');
    const response = await this.cache.get<api.SystemMeResponse>(
      '/v2/systems/me',
      30,
      'MINUTES',
      async () => {
        return await this.getFromMyUplink<api.SystemMeResponse>('/v2/systems/me');
      },
    );

    this.log.debug(`${response.systems.length} units fetched.`);

    return response.systems;
  }

  private async fetchDeviceInfo(id): Promise<api.DeviceInfo> {
    this.log.debug('Fetch device info.');
    return await this.getFromMyUplink<api.DeviceInfo>(`/v2/devices/${id}`);
  }

  private async fetchPremiumSubscriptions(id): Promise<string[]> {
    this.log.debug('Fetch premium subscriptions info.');
    const response = await this.cache.get<api.Subscriptions>(
      `/v2/systems/${id}/subscriptions`,
      10,
      'MINUTES',
      async () => {
        return await this.getFromMyUplink<api.Subscriptions>(`/v2/systems/${id}/subscriptions`);
      },
    );

    if (!response) {
      return [];
    }

    return response.subscriptions
      .filter(s => moment(s.validUntil).isAfter(moment()))
      .map(s => s.type);
  }

  private async fetchData(device: api.Device): Promise<api.Parameter[]> {
    this.log.debug('Fetch units.');
    const response = await this.getFromMyUplink<api.Parameter[]>(
      `/v2/devices/${device.id}/points`, {
        parameters: consts.allowedParameters.join(','),
      },
    );
    this.log.debug(`${response.length} parameters fetched.`);
    return response;
  }

  static mapData(system: api.System, subscriptions: string[], device: api.Device, deviceInfo: api.DeviceInfo, response: api.Parameter[]): Data {
    return {
      system: {
        systemId: system.systemId,
        name: system.name,
        premiumSubscriptions: subscriptions,
      },
      device: {
        id: device.id,
        name: device.product.name,
        serialNumber: device.product.serialNumber,
        firmwareUpdateAvailable: deviceInfo.firmware?.currentFwVersion !== deviceInfo.firmware?.desiredFwVersion,
      },
      parameters: response.map(p => {
        return {
          id: p.parameterId,
          name: p.parameterName,
          unit: p.parameterUnit,
          value: p.value,
        };
      }),
    };
  }

  private async getFromMyUplink<T>(url: string, params: object = {}): Promise<T> {
    this.log.debug(`GET ${url}, params: ${JSON.stringify(params)}`);
    try {
      const { data } = await axios.get<T>(url, {
        headers: {
          Authorization: 'Bearer ' + this.getSession('access_token'),
        },
        params,
      });

      if(this.options.showApiResponse) {
        this.log.info('Nibe data from '+url+': ' +JSON.stringify(data));
      }

      return data;
    } catch (error) {
      throw this.checkError(url, error);
    }
  }

  public async setValue(deviceId: string, paramId: string, value: any): Promise<void> {
    const key = deviceId+paramId+JSON.stringify(value);
    if (this.currentlySetting[key]) {
      return;
    }
    this.active = true;
    this.currentlySetting[key] = true;
    const url = `/v2/devices/${deviceId}/points`;
    const body = {};
    body[paramId] = value;
    this.log.debug(`PUT ${url}, params: ${JSON.stringify(body)}`);
    try {
      axios.patch(url, body, {
        headers: {
          Authorization: 'Bearer ' + this.getSession('access_token'),
        },
      }).then(result => {
        if(this.options.showApiResponse) {
          this.log.info('Nibe data from '+url+': ' +JSON.stringify(result.data));
        }
      }).finally(() => {
        delete this.currentlySetting[key];
        this.active = false;
        this.fetch();
      });

    } catch (error) {
      this.log.error(`error from ${url}: ${JSON.stringify(error)}`);
    }
  }

  private checkError(url: string, error: unknown): unknown {
    this.log.error(`error from ${url}`);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response != null) {
        if (axiosError.response.status === 401) {
          this.clearSession();
        }
        if (axiosError.response.data != null) {
          const responseText = JSON.stringify(axiosError.response.data, null, ' ');
          const errorMessage = `${axiosError.response.statusText}: ${responseText}`;
          return new Error(errorMessage);
        } else {
          return new Error(axiosError.response.statusText);
        }
      }
    }
    return error;
  }

  private getSession(key: keyof Session): string | number | undefined | null {
    this.log.debug('Get session.');
    return this.auth ? this.auth[key] : null;
  }

  private setSession(auth: Session): void {
    this.log.debug('Set session.');
    this.auth = auth;
  }

  private clearSession(): void {
    this.log.debug('Clear session.');
    this.setSession({});
  }

  private isTokenExpired(): boolean {
    const expired = (Number(this.getSession('expires_at')) || 0) < Date.now() + consts.renewBeforeExpiry;
    this.log.debug('Is token expired: ' + expired);
    return expired;
  }

  private _onData(data: dataDomain.Data): void {
    this.emit('data', data);
  }

  private _onError(error: unknown): void {
    this.emit('error', error);
  }

}