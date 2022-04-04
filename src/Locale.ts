import { Logger } from 'homebridge';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const DEFAULT_LANG = 'en';
const ENCODING = 'utf8';

export class Locale {

    private texts : unknown;

    constructor(private readonly lang: string, private readonly log: Logger) {
        try {
            this.texts = yaml.load(fs.readFileSync(path.resolve(__dirname, `./lang/${lang}.yaml`), ENCODING));
        } catch (e1) {
            log.error(`Failed to load language file: ${e1}`);
            try {
                this.texts = yaml.load(fs.readFileSync(path.resolve(__dirname, `./lang/${DEFAULT_LANG}.yaml`), ENCODING));
            } catch (e2) {
                log.error(`Failed to load default language file: ${e2}`);
                throw e2;
            }
        }
    }

    public text(key: string, defaultValue: string) {
        if (this.texts instanceof Object) {
            const value: string = (<any>this.texts)[key];
            return value === null ? defaultValue : value;
        }

        return defaultValue;
    }
}