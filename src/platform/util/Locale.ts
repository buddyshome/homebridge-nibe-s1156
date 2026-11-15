import {type Logger} from '../PlatformDomain.ts';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const ENCODING = 'utf8';

export class Locale {
    
  private readonly texts: {
    [id: string]: string;
  };
    
  /**
   * @param langDir folder with the <lang>.yaml files (dist/lang at runtime, lang/ in tests)
   */
  constructor(lang: string, log: Logger, langDir: string) {
    try {
      const langFile = path.resolve(langDir, `${lang}.yaml`);
      this.texts = this.flattenObject(yaml.load(fs.readFileSync(langFile, ENCODING)));
    } catch (e1) {
      log.error(`Failed to load language file: ${e1}`);
      throw e1;
    }
  }

  public text(key: string, defaultValue: string | undefined) {
    return this.texts[key] || defaultValue;
  }

  private flattenObject(ob: any) {
    const toReturn = {};
    
    for (const i in ob) {
      if (!Object.prototype.hasOwnProperty.call(ob, i)) {
        continue;
      }
    
      if ((typeof ob[i]) === 'object' && ob[i] !== null) {
        const flatObject = this.flattenObject(ob[i]);
        for (const x in flatObject) {
          if (!Object.prototype.hasOwnProperty.call(flatObject, x)) {
            continue;
          }
    
          toReturn[i + '.' + x] = flatObject[x];
        }
      } else {
        toReturn[i] = ob[i];
      }
    }
    return toReturn;
  }
}