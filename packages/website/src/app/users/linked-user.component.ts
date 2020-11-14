import { Component, Input } from "@angular/core";
import { ObjectType } from "@eternal-twin/core/lib/core/object-type";
import { HammerfestLink } from "@eternal-twin/core/lib/link/hammerfest-link";
import { TwinoidLink } from "@eternal-twin/core/lib/link/twinoid-link";

@Component({
  selector: "etwin-linked-user",
  templateUrl: "./linked-user.component.html",
  styleUrls: [],
})
export class LinkedUserComponent {
  public readonly ObjectType = ObjectType;

  @Input()
  public link!: HammerfestLink | TwinoidLink;

  constructor() {
  }
}