/*
 * This file is part of CabasVert.
 *
 * Copyright 2017, 2018 Didier Villevalois
 *
 * CabasVert is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * CabasVert is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with CabasVert.  If not, see <http://www.gnu.org/licenses/>.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { catchError, take, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { Logger } from '../toolkit/providers/logger';
import { LogLevel } from '../toolkit/providers/log.model';
import { Configuration, defaultConfiguration } from './configuration';

@Injectable()
export class ConfigurationService {

  // LoggerService can't be injected as it depends on this service
  // Manually construct a logger instance
  private _logger = new Logger('Configuration', { 'Configuration': LogLevel.DEBUG });

  private configData: Configuration;

  constructor(private http: HttpClient) {
  }

  async loadConfiguration() {
    this._logger.groupCollapsed('Loading configuration...');

    let fromFile = await this.http.get<Configuration>(environment.configFileName)
      .pipe(
        take(1),
        tap({
          error: error => {
            console.error(`Error while loading configuration file: ${error.message}`);
          },
        }),
        catchError(() => of({})),
      )
      .toPromise();

    let defaults = defaultConfiguration();

    this.configData = this.merge(this.merge({}, defaults), fromFile);

    this._logger.info('Loaded configuration:', this.configData);
    this._logger.groupEnd();
  }

  async tryLoadDevCredentials() {
    if (environment.production) return null;

    this._logger.info('Loading development credentials...');

    return await this.http.get<Configuration>(`credentials.dev.json`)
      .pipe(
        take(1),
        catchError(() => of(null)),
      )
      .toPromise();
  }

  private merge(target, source) {
    for (let i in source) {
      if (source.hasOwnProperty(i)) {
        if (typeof source[i] === 'object' && source[i] !== null) {
          target[i] = this.merge(target[i] || {}, source[i]);
        } else {
          target[i] = source[i];
        }
      }
    }
    return target;
  }

  get base() {
    return this.configData.base;
  }

  get log() {
    return this.configData.log;
  }
}
