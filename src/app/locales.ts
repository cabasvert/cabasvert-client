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

import { registerLocaleData } from '@angular/common';

import localeEnGb from '@angular/common/locales/en-GB';
import localeEs from '@angular/common/locales/es';
import localeEnGb_Extra from '@angular/common/locales/extra/en-GB';
import localeEs_Extra from '@angular/common/locales/extra/es';
import localeFr_Extra from '@angular/common/locales/extra/fr';
import localeFr from '@angular/common/locales/fr';
import { environment } from '../environments/environment';

export function registerLocales() {
  registerLocaleData(localeEs, localeEs_Extra);
  registerLocaleData(localeFr, localeFr_Extra);
  registerLocaleData(localeEnGb, localeEnGb_Extra);
}

export function inferLocale() {
  return environment.localeOverride ? environment.localeOverride : navigator.language;
}
