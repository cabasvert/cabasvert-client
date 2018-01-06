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

import { Injectable, InjectionToken } from "@angular/core"
import { Container, inject, injectable } from "inversify"

export const MyLibContainer = new InjectionToken<Container>('MyLibContainer')

// Test services
// ServiceA (in Angular) calls ServiceB (in Inversify) calls ServiceC (back in Angular)

// In the library 'mylib'

export function initContainer(s: AServiceC) {
  let container = new Container()
  container.bind<ServiceB>(ServiceB).toSelf()
  container.bind<AServiceC>(AServiceC).toConstantValue(s)
  return container
}

export abstract class AServiceC {
  greet(name: string): string {
    return ''
  }
}

@injectable()
export class ServiceB {

  constructor(@inject(AServiceC) private service: AServiceC) {
  }

  greet(name: string): string {
    return this.service.greet(name)
  }
}

// In the Angular application

// import { AServiceC } from 'mylib'

@Injectable()
export class ServiceC extends AServiceC {
  greet(name: string): string {
    return `${name}, I'm your father!`
  }
}

@Injectable()
export class ServiceA {

  constructor(private service: ServiceB) {
  }

  greet(name: string): string {
    return this.service.greet(name)
  }
}
