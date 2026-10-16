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
import { FileInfo, FormComponent, Rows } from "@dwtechs/ngx-crud-builder";
import {
  Branding,
  brandingFactory,
} from "app/passwords/data-access/branding/branding.model";
import { BrandingService } from "app/passwords/data-access/branding/branding.service";
import { map, Observable, of, switchMap } from "rxjs";

/** The logo control holds files, not the stored file name; logoSource is a UI-only switch. */
type BrandingForm = Omit<Branding, "logoFile"> & {
  logoFile: FileInfo[];
  logoSource: "url" | "file";
};

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
    // biome-ignore lint/style/noNonNullAssertion: The getAll() call is expected to always return a non-null value
    stream: () => this.brandingService.httpCalls.getAll!(),
  });

  // The form only reads its model when created, so it is rendered once the row is loaded
  public readonly isLoaded = computed(() => this.brandingResource.hasValue());

  private readonly brandingForm = viewChild(FormComponent);

  // The lib resets hidden controls, so the stored image cannot be read back from the form value
  private readonly storedLogoFile = linkedSignal(
    () => this.brandingResource.value()?.rows[0]?.logoFile ?? "",
  );

  // Writable copy of the fetched row; stays editable until the resource reloads
  public readonly model = linkedSignal<BrandingForm>(() =>
    this.toForm(this.brandingResource.value()?.rows[0] ?? brandingFactory()),
  );

  public onSubmitted(value: BrandingForm): void {
    // logoFile is written only by the logo routes; logoSource is UI-only
    const { logoFile: submittedFiles, logoSource, ...row } = value;
    // Hidden controls are reset to null by the lib
    const logoFile = submittedFiles ?? [];
    const id = row.id;
    // A stored URL wins over the uploaded image, so it must be cleared in file mode
    row.logoUrl = logoSource === "file" ? "" : (row.logoUrl ?? "");

    // A freshly picked image carries its File
    const newFile = logoFile.find((f) => f.file)?.file;
    const hasStoredFile = !!this.storedLogoFile();
    const logoCall: Observable<Rows<Branding> | undefined> =
      id === null
        ? of(undefined)
        : logoSource === "file"
          ? newFile
            ? (this.brandingService.httpCalls.updateFiles?.([newFile], id) ??
              of(undefined))
            : of(undefined)
          : hasStoredFile
            ? this.brandingService.deleteLogo(id)
            : of(undefined);

    this.brandingService.httpCalls
      .update?.(row as Branding)
      .pipe(
        switchMap((res) =>
          logoCall.pipe(
            map((logoRes) => ({
              updated: res.rows[0],
              logo: logoRes?.rows[0],
            })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ updated, logo }) => {
        if (!updated) return;
        const merged = { ...updated, ...logo };
        const stored =
          logoSource === "url" ? "" : (logo?.logoFile ?? this.storedLogoFile());
        this.storedLogoFile.set(stored);
        const logoFiles = this.brandingService.logoFiles(stored);
        this.model.update((m) => ({ ...m, ...merged, logoFile: logoFiles }));
        this.brandingForm()
          ?.form()
          ?.patchValue({ logoUrl: merged.logoUrl, logoFile: logoFiles });
      });
  }

  private toForm(row: Branding): BrandingForm {
    return {
      ...row,
      logoFile: this.brandingService.logoFiles(row.logoFile),
      logoSource: !row.logoUrl && row.logoFile ? "file" : "url",
    };
  }
}
