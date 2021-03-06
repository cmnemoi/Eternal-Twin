import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { SharedModule } from "../../shared/shared.module";
import { RegisterComponent } from "./register.component";
import { RegisterEmailComponent } from "./register-email.component";
import { RegisterRoutingModule } from "./register-routing.module";
import { RegisterUsernameComponent } from "./register-username.component";

@NgModule({
  declarations: [RegisterComponent, RegisterEmailComponent, RegisterUsernameComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RegisterRoutingModule,
    SharedModule,
  ],
})
export class RegisterModule {
}
