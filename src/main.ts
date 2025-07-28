import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom }  from '@angular/core';
import { HttpClientModule }     from '@angular/common/http';
import { RouterModule }         from '@angular/router';

import { AppComponent }         from './app/app.component';
import { routes }               from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      HttpClientModule,
      RouterModule.forRoot(routes)
    )
  ]
}).catch(console.error);


