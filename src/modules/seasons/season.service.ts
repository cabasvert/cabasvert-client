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

import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { timer } from 'rxjs/observable/timer';
import {
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  switchMap,
  take,
} from 'rxjs/operators';
import { DatabaseService } from '../../toolkit/providers/database-service';
import { filterNotNull } from '../../utils/observables';
import { Season, SeasonWeek } from './season.model';

@Injectable()
export class SeasonService implements OnDestroy {

  private static readonly today$: Observable<Date> =
    timer(0, 60 * 1000).pipe(
      map(() => Date.today()),
      distinctUntilChanged((d1, d2) => d1.getDate() === d2.getDate()),
      publishReplay(1),
      refCount(),
    );

  private _seasonMapper = doc => new Season(this, doc);
  private _seasonIndexer = season => season.id;

  public readonly allSeasons$: Observable<Season[]>;
  public readonly allSeasonsIndexed$: Observable<Map<string, Season>>;
  public readonly lastSeason$: Observable<Season>;
  public readonly todaysSeasonWeek$: Observable<SeasonWeek>;

  private _subscription = new Subscription();

  constructor(private mainDatabase: DatabaseService) {

    // All seasons
    let query = {
      selector: {
        type: 'season',
      },
      use_index: 'type',
    };

    let db$ = this.mainDatabase.withIndex$({ index: { fields: ['type'], ddoc: 'type' } });

    this.allSeasons$ = db$.pipe(
      switchMap(db => db.findAll$(query)),
      map((ss: any[]) => ss.map(this._seasonMapper)),
      publishReplay(1),
      refCount(),
    );

    this.allSeasonsIndexed$ = this.allSeasons$.pipe(
      map(
        ss => ss.reduce(
          (acc, s) => {
            acc[this._seasonIndexer(s)] = s;
            return acc;
          },
          {},
        ),
      ),
      publishReplay(1),
      refCount(),
    );

    this.lastSeason$ = this.lastSeasons$(1).pipe(map(ss => ss[0]));

    this.todaysSeasonWeek$ = SeasonService.today$.pipe(
      switchMap(today => this.seasonWeekForDate$(today)),
      filterNotNull(),
      publishReplay(1),
      refCount(),
    );

    this._subscription.add(this.todaysSeasonWeek$.subscribe());
    this._subscription.add(this.allSeasons$.subscribe());
    this._subscription.add(this.allSeasonsIndexed$.subscribe());
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  lastSeasons$(count: number = -1): Observable<Season[]> {
    return this.allSeasons$.pipe(
      map(ss => ss.sort(this._byDescendingSeasonId)),
      map(ss => count === -1 ? ss : ss.slice(0, count)),
    );
  }

  private _bySeasonId = (s1, s2) => s1.id.localeCompare(s2.id);
  private _byDescendingSeasonId = (s1, s2) => -this._bySeasonId(s1, s2);

  seasonForDate$(date: Date = new Date()): Observable<Season> {
    return this.allSeasons$.pipe(map(ss => ss.find(s => s.contains(date))));
  }

  seasonWeekForDate$(date: Date = new Date()): Observable<SeasonWeek> {
    return this.seasonForDate$(date).pipe(filterNotNull(), map(s => s.seasonWeek(date)));
  }

  seasonById$(id: string): Observable<Season> {
    return this.allSeasonsIndexed$.pipe(map(ss => ss.get(id)));
  }

  seasonNameById$(id: string): Observable<string> {
    return this.seasonById$(id).pipe(map(s => s.name));
  }
}
