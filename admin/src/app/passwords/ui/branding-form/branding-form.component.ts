import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import {
  FormComponent,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";
import { CardModule } from "@openng/optimus-ui/card";
import {
  Branding,
  BrandingForm,
} from "app/passwords/data-access/branding/branding.model";

/**
 * The branding form: renders the field config, keeps the edited value in `model` and
 * emits it on submit. Persisting is left to the parent.
 */
@Component({
  selector: "adm-branding-form",
  templateUrl: "./branding-form.component.html",
  imports: [FormComponent, CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .branding-form__card .p-card-body {
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
    }

    /* The lib sets margin-top: 1rem on its actions row, inside its own encapsulation */
    .branding-form__card .actions-container {
      margin-top: 0;
    }
  `,
})
export class BrandingFormComponent {
  public readonly heading = input.required<string>();
  public readonly config = input.required<StrictCrudItemOptions<Branding>[]>();
  public readonly model = model.required<BrandingForm>();
  public readonly submitted = output<BrandingForm>();

  private readonly form = viewChild(FormComponent);

  /** Pushes values into the live controls, which do not follow later `model` changes. */
  public patchValue(value: Partial<Record<keyof BrandingForm, unknown>>): void {
    this.form()?.form()?.patchValue(value);
  }
}
