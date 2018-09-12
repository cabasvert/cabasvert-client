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

import { formatDate } from '@angular/common';
import { Component, Inject, LOCALE_ID } from '@angular/core';
import { Validators } from '@angular/forms';

import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { map, switchMap } from 'rxjs/operators';
import { DynamicFormService, DynamicGroup } from '../../toolkit/dynamic-form/dynamic-form.service';
import { ControlConfig, FormConfig } from '../../toolkit/dynamic-form/models/form-config.interface';
import { objectAssignNoNulls } from '../../utils/objects';
import { filterNotNull } from '../../utils/observables';
import { SeasonService } from '../seasons/season.service';
import { Contract, ContractFormulas, ContractKind } from './contract.model';

@Component({
  selector: 'page-edit-contracts',
  templateUrl: './contracts-edit-page.html',
})
export class ContractsEditPage {

  config: FormConfig = {
    controls: [
      {
        name: 'season',
        label: 'REF.SEASON',
        kind: 'select',
        options: () => this.seasonService.lastSeasons$(2),
        optionLabel: season => season.name,
        optionValue: season => season.id,
        validator: Validators.required,
      },
      {
        name: 'sections',
        kind: 'array',
        controls: [ContractKind.VEGETABLES, ContractKind.EGGS].map((kind, index) => ({
          name: index.toString(),
          label: kind === 'legumes' ? 'REF.VEGETABLES' : 'REF.EGGS',
          icon: ContractKind.icon(kind),
          kind: 'group',
          controls: [
            {
              name: 'kind',
              kind: 'hidden-input',
              type: 'text',
            },
            {
              name: 'formulaIndex',
              label: 'CONTRACT.FORMULA',
              kind: 'select',
              options: () => ContractFormulas.formulas,
              optionLabel: f => this.translateService.instant(f.label),
              optionValue: (f, i) => i,
              validator: Validators.required,
            },
            {
              name: 'firstWeek',
              label: 'CONTRACT.FIRST_WEEK',
              kind: 'select',
              options:
                f => f.get('season').value$.pipe(
                  filterNotNull(),
                  switchMap(sid => this.seasonService.seasonById$(sid)),
                  map(s => s.seasonWeeks()),
                ),
              optionLabel: w => this.formatWeek(w),
              optionValue: w => w.seasonWeek,
              validator: Validators.required,
              disabled: (f, g) => g.get('formulaIndex').value$.pipe(
                map(i => ContractFormulas.formulaForIndex(i).isNoneFormula()),
              ),
            },
            {
              name: 'lastWeek',
              label: 'CONTRACT.LAST_WEEK',
              kind: 'select',
              options:
                f => f.get('season').value$.pipe(
                  filterNotNull(),
                  switchMap(sid => this.seasonService.seasonById$(sid)),
                  map(s => s.seasonWeeks()),
                ),
              nullOption: true,
              optionLabel: w => !w ? null : this.formatWeek(w),
              optionValue: w => !w ? null : w.seasonWeek,
              disabled: (f, g) => g.get('formulaIndex').value$.pipe(
                map(i => ContractFormulas.formulaForIndex(i).isNoneFormula()),
              ),
            },
          ],
        } as ControlConfig)),
      },
      {
        name: 'validation',
        label: 'CONTRACT.VALIDATION',
        icon: 'checkmark',
        kind: 'group',
        controls: [
          {
            name: 'wish',
            label: 'CONTRACT.WISH',
            kind: 'checkbox',
            value: true,
          },
          {
            name: 'validatedBy',
            label: 'CONTRACT.VALIDATED_BY',
            kind: 'input',
            type: 'text',
            validator: Validators.required,
            disabled: (f, g) => g.get('wish').value$,
          },
          {
            name: 'paperCopies',
            label: 'CONTRACT.PAPER_COPIES',
            icon: 'paper',
            kind: 'group',
            controls: [
              {
                name: 'forAssociation',
                label: 'CONTRACT.FOR_ASSOCIATION',
                kind: 'checkbox',
                value: false,
              },
              {
                name: 'forFarmer',
                label: 'CONTRACT.FOR_PRODUCER',
                kind: 'checkbox',
                value: false,
              },
            ],
            disabled: (f, g) => g.get('wish').value$,
          },
          {
            name: 'cheques',
            label: 'CONTRACT.CHEQUES',
            icon: 'cash',
            kind: 'group',
            controls: [
              {
                name: 'vegetables',
                label: 'REF.VEGETABLES',
                kind: 'checkbox',
                value: false,
                disabled: f => f.get('sections.0.formulaIndex').value$.pipe(
                  map(i => ContractFormulas.formulaForIndex(i).isNoneFormula()),
                ),
              },
              {
                name: 'eggs',
                label: 'REF.EGGS',
                kind: 'checkbox',
                value: false,
                disabled: f => f.get('sections.1.formulaIndex').value$.pipe(
                  map(i => ContractFormulas.formulaForIndex(i).isNoneFormula()),
                ),
              },
            ],
            disabled: (f, g) => g.get('wish').value$,
          },
        ],
      },
    ],
  };

  form: DynamicGroup;

  title: string;
  contract: Contract;

  constructor(private navParams: NavParams,
              private modalController: ModalController,
              private dynamicFormService: DynamicFormService,
              private seasonService: SeasonService,
              @Inject(LOCALE_ID) private locale: string,
              private translateService: TranslateService) {

    this.form = this.dynamicFormService.createForm(this.config);

    if (this.navParams.data) {
      this.title = this.navParams.data.title;
      this.contract = this.clone(this.navParams.data.contract);

      // Compute formula index in formulas list
      this.formulasToForm(this.contract);

      this.form.patchValue(this.contract);
    }
  }

  private clone(contract) {
    return JSON.parse(JSON.stringify(contract));
  }

  private formatWeek(week) {
    return formatDate(week.distributionDate, 'shortDate', this.locale) +
      ' (' + week.seasonWeek + ')';
  }

  async cancel() {
    await this.modalController.dismiss(null, 'cancel');
  }

  async save() {
    // Recompute formula
    this.formulasFromForm(this.form.value);

    let data = objectAssignNoNulls({}, this.contract, this.form.value);
    await this.modalController.dismiss(data, 'save');
  }

  formulasToForm(contracts) {
    contracts.sections.forEach(s => {
      s.formulaIndex = ContractFormulas.formulaIndexFor(s.formula);
    });
  }

  formulasFromForm(contracts) {
    contracts.sections.forEach(s => {
      s.formula = ContractFormulas.formulaForIndex(s.formulaIndex).value;
    });
  }
}