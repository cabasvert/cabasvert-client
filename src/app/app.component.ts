import { Component, ViewChild } from "@angular/core"
import { SplashScreen } from "@ionic-native/splash-screen"
import { StatusBar } from "@ionic-native/status-bar"

import { TranslateService } from "@ngx-translate/core"
import { Nav, Platform } from "ionic-angular"
import { LoginPage } from "../modules/main/login/login-page"
import { MainPage } from "../modules/main/main-page"
import { AuthService } from "../toolkit/providers/auth-service"

const PUBLIC_PAGES = ['/login', '/reset-password']

@Component({
  templateUrl: 'app.html',
})
export class MyApp {

  @ViewChild(Nav) nav: Nav

  rootPage: any

  constructor(private platform: Platform,
              private statusBar: StatusBar,
              private splashScreen: SplashScreen,
              private translate: TranslateService,
              private auth: AuthService) {

    platform.ready()
      .then(() => {
        statusBar.styleBlackTranslucent()
        statusBar.backgroundColorByHexString('#126019')

        this.initTranslation()
      })
      .then(() => {
        let url = platform.url()
        let [, fragment] = url.split('#')

        let publicPage = fragment && PUBLIC_PAGES.some(pageName => fragment.startsWith(pageName))
        console.info(`URL: ${url} - Page fragment: ${fragment} - Public page: ${publicPage}`)

        if (!publicPage) {
          this.auth.tryLoadCredentialsAndLogin().then(granted => {
            if (!granted) return this.nav.setRoot(LoginPage)
            else if (!fragment || fragment === '/') return this.nav.setRoot(MainPage)
          })
        }
      })
      .then(
        () => {
          splashScreen
            .hide()
        },
      )
  }

  initTranslation() {
    var userLang = navigator.language.split('-')[0]
    userLang = /(fr|en)/gi.test(userLang) ? userLang : 'fr'

    // Default language if file not found
    this.translate.setDefaultLang('fr')

    // Change userLang = 'fr' to check instantly
    this.translate.use(userLang)

    this.translate.get('language', null).subscribe(localizedValue =>
      console.info(`Selected language: ${localizedValue}`),
    )
  }
}
