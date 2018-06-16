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

import { Injectable } from '@angular/core'
import { Observable } from "rxjs/Observable"
import { map, publishReplay, refCount, switchMap } from "rxjs/operators"

import { DatabaseService } from "../../toolkit/providers/database-service"

import { Member } from "../members/member.model"
import { Season } from "../seasons/season.model"
import { Contract, ContractKind, ContractSection } from "./contract.model"

@Injectable()
export class ContractService {

  private _perMemberIdProblemSeverity$: Observable<{[id: string]: string}>

  constructor(private mainDatabase: DatabaseService) {
    // Per member problem severity on all contracts
    this._perMemberIdProblemSeverity$ = this.getContracts$().pipe(
      map(cs => ContractService.computePerMemberIdProblemSeverity(cs)),
      publishReplay(1),
      refCount(),
    )
  }

  getSeasonContracts$(season: Season): Observable<Contract[]> {
    let query = {
      selector: {
        type: 'contract',
        season: season.id,
      }
    }

    let db$ = this.mainDatabase.withIndex$({
      index: {
        fields: ['type', 'season']
      }
    })
    return db$.pipe(switchMap(db => db.findAll$(query)))
  }

  getContracts$(member: Member = null): Observable<Contract[]> {
    let query = {
      selector: {
        type: 'contract',
      }
    }

    if (member) {
      query.selector['member'] = member._id
    }

    let db$ = this.mainDatabase.withIndex$({
      index: {
        fields: member ? ['type', 'member'] : ['type']
      }
    })
    return db$.pipe(switchMap(db => db.findAll$(query)))
  }

  putContracts$(contracts: Contract): Observable<string> {
    return this.mainDatabase.database$.pipe(switchMap(db => db.put$(contracts)))
  }

  removeContracts$(contracts: Contract): Observable<string> {
    return this.mainDatabase.database$.pipe(switchMap(db => db.remove$(contracts)))
  }

  perMemberIdProblemSeverity$(): Observable<{[id: string]: string}> {
    return this._perMemberIdProblemSeverity$
  }

  static computePerMemberIdProblemSeverity(cs: Contract[]): {[id: string]: string} {
    return cs.reduce((acc, c) => {
      let problems = ContractService.validateContract(c)
      let severity = ContractService.contractValidationSeverity(problems)

      if (severity) acc[c.member] = severity
      return acc
    }, {})
  }

  static contractValidationMessages(problems: { [key: string]: boolean }): string[] {
    var messages = []

    if (problems['wish'])
      messages.push("Contract is just a wish yet")
    if (problems['paperCopyForAssociation'])
      messages.push("Missing paper copy for association")
    if (problems['paperCopyForFarmer'])
      messages.push("Missing paper copy for farmer")
    if (problems['missingChequesForVegetables'])
      messages.push("Cheques for vegetables are missing")
    if (problems['missingChequesForEggs'])
      messages.push("Cheque for eggs is missing")

    return messages
  }

  static contractValidationSeverity(problems: { [key: string]: boolean }, otherSeverity: string = null): string {
    if (Object.keys(problems).length == 0) return otherSeverity
    if (problems['wish']
      || problems['missingChequesForVegetables']
      || problems['missingChequesForEggs'])
      return 'danger'
    else return otherSeverity ? otherSeverity : 'warning'
  }

  static validateContract(contract: Contract): { [key: string]: boolean } {
    var problems = {}

    if (contract.wish) {
      problems['wish'] = true
    }

    if (!contract.validation) {
      return problems
    }

    if (!contract.validation.paperCopies || !contract.validation.paperCopies.forAssociation)
      problems['paperCopyForAssociation'] = true
    if (!contract.validation.paperCopies || !contract.validation.paperCopies.forFarmer)
      problems['paperCopyForFarmer'] = true

    let vegetableSection = contract.sections.find(c => c.kind == ContractKind.VEGETABLES)
    let eggSection = contract.sections.find(c => c.kind == ContractKind.EGGS)

    if (!contract.validation.cheques ||
      (!contract.validation.cheques.vegetables && !ContractService.hasNoneFormula(vegetableSection)))
      problems['missingChequesForVegetables'] = true
    if (!contract.validation.cheques ||
      (!contract.validation.cheques.eggs && !ContractService.hasNoneFormula(eggSection)))
      problems['missingChequesForEggs'] = true

    if (!contract.validation.validatedBy)
      problems['wish'] = true

    return problems
  }

  public static hasNoneFormula(section: ContractSection) {
    let formula = section.formula
    return (formula instanceof Array && formula[0] == 0 && formula[1] == 0) || formula == 0
  }

  /* A regular formula is one where you get the same quantity every week */
  public static hasRegularFormula(section: ContractSection) {
    let formula = section.formula
    return (formula instanceof Array && formula[0] == formula[1]) || formula == parseInt('' + formula)
  }
}
