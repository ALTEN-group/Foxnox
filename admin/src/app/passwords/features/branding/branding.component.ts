import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  linkedSignal,
  viewChild,
} from "@angular/core";
import { rxResource, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { TABLES } from "@core/app-config/app.tables";
import { SnackbarService } from "@core/utils/snackbar/snackbar.service";
import {
  FileInfo,
  FormComponent,
  FormFieldInteractionEvent,
} from "@dwtechs/ngx-crud-builder";
import {
  Branding,
  brandingFactory,
} from "app/passwords/data-access/branding/branding.model";
import { BrandingService } from "app/passwords/data-access/branding/branding.service";

/** The logo control holds files, not the stored file name. */
type BrandingForm = Omit<Branding, "logoFile"> & { logoFile: FileInfo[] };

/**
 * Component to display and manage the single workflow-page/email branding record as a form
 */
@Component({
  selector: "adm-branding",
  templateUrl: "./branding.component.html",
  imports: [FormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandingComponent {
  private readonly brandingService = inject(BrandingService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly config = this.brandingService.config;

  public readonly tableInformation = TABLES.branding;

  private readonly brandingResource = rxResource({
    stream: () => this.brandingService.httpCalls.getAll!(),
  });

  // The form only reads its model when created, so it is rendered once the row is loaded
  public readonly isLoaded = computed(() => this.brandingResource.hasValue());

  private readonly brandingForm = viewChild(FormComponent);

  // Writable copy of the fetched row; stays editable until the resource reloads
  public readonly model = linkedSignal<BrandingForm>(() =>
    this.toForm(this.brandingResource.value()?.rows[0] ?? brandingFactory()),
  );

  public onFieldInteraction(event: FormFieldInteractionEvent): void {
    if (event.key !== "logoFile" || event.interactionType !== "uploadFile")
      return;
    const file = (event.value as FileInfo[]).at(-1)?.file;
    const id = this.model().id;
    if (!file || id === null) return;

    this.brandingService.httpCalls
      .updateFiles?.([file], id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ rows: [row] }) => {
        if (!row) return;
        // The upload clears logoUrl server-side; the file control already shows the chosen image.
        this.brandingForm()?.form()?.patchValue({ logoUrl: row.logoUrl });
      });
  }

  public onSubmitted(value: BrandingForm): void {
    // logoFile is written only by the logo upload route
    const { logoFile: _logoFile, ...row } = value;
    this.brandingService.httpCalls
      .update?.(row as Branding)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        const [updated] = res.rows;
        if (updated) {
          this.model.update((m) => ({ ...m, ...updated, logoFile: m.logoFile }));
        }
      });
  }

  private toForm(row: Branding): BrandingForm {
    return { ...row, logoFile: this.brandingService.logoFiles(row.logoFile) };
  }
}
