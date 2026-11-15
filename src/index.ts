import type { API } from 'homebridge' with { 'resolution-mode': 'import' };

import {NibePlatform, PLATFORM_NAME} from './platform/NibePlatform.ts';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, NibePlatform);
};