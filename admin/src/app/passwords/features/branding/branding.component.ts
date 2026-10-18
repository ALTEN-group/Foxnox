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
import { FileInfo, Rows } from "@dwtechs/ngx-crud-builder";
import {
  Branding,
  brandingFactory,
  BrandingForm,
} from "app/passwords/data-access/branding/branding.model";
import { BrandingService } from "app/passwords/data-access/branding/branding.service";
import { BrandingFormComponent } from "app/passwords/ui/branding-form/branding-form.component";
import { BrandingPreviewComponent } from "app/passwords/ui/branding-preview/branding-preview.component";
import { map, Observable, of, switchMap } from "rxjs";

const radiusToNumber = (radius: string): number => Number.parseInt(radius, 10);

/**
 * Loads and saves the single workflow-page/email branding record, shown as a form and a live preview
 */
@Component({
  selector: "adm-branding",
  templateUrl: "./branding.component.html",
  imports: [BrandingFormComponent, BrandingPreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandingComponent {
  private readonly brandingService = inject(BrandingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackbarService = inject(SnackbarService);

  public readonly config = this.brandingService.config;

  public readonly tableInformation = TABLES.branding;

  private readonly brandingResource = rxResource({
    // biome-ignore lint/style/noNonNullAssertion: The getAll() call is expected to always return a non-null value
    stream: () => this.brandingService.httpCalls.getAll!(),
  });

  // The form only reads its model when created, so it is rendered once the row is loaded
  public readonly isLoaded = computed(() => this.brandingResource.hasValue());

  private readonly brandingForm = viewChild(BrandingFormComponent);

  // The lib resets hidden controls, so the stored image cannot be read back from the form value
  private readonly storedLogoFile = linkedSignal(
    () => this.brandingResource.value()?.rows[0]?.logoFile ?? "",
  );
  private readonly storedFaviconFile = linkedSignal(
    () => this.brandingResource.value()?.rows[0]?.faviconFile ?? "",
  );

  // Writable copy of the fetched row; stays editable until the resource reloads
  public readonly model = linkedSignal<BrandingForm>(() =>
    this.toForm(this.brandingResource.value()?.rows[0] ?? brandingFactory()),
  );

  public onSubmitted(value: BrandingForm): void {
    // The file fields are written only by the image routes; the source fields are UI-only
    const {
      logoFile: submittedFiles,
      logoSource,
      faviconFile: submittedFavicon,
      faviconSource,
      radius,
      ...rest
    } = value;
    const row = { ...rest, radius: `${radius}px` };
    const id = row.id;
    // A stored URL wins over the uploaded image, so it must be cleared in file mode
    row.logoUrl = logoSource === "file" ? "" : (row.logoUrl ?? "");
    row.faviconUrl = faviconSource === "file" ? "" : (row.faviconUrl ?? "");

    const logoCall = this.imageCall(
      id,
      logoSource,
      submittedFiles,
      !!this.storedLogoFile(),
      (files, rowId) =>
        this.brandingService.httpCalls.updateFiles?.(files, rowId) ??
        of(undefined),
      (rowId) => this.brandingService.deleteLogo(rowId),
    );
    const faviconCall = this.imageCall(
      id,
      faviconSource,
      submittedFavicon,
      !!this.storedFaviconFile(),
      (files, rowId) => this.brandingService.uploadFavicon(files, rowId),
      (rowId) => this.brandingService.deleteFavicon(rowId),
    );

    this.brandingService.httpCalls
      .update?.(row as Branding)
      .pipe(
        switchMap((res) =>
          logoCall.pipe(
            switchMap((logoRes) =>
              faviconCall.pipe(
                map((faviconRes) => ({
                  updated: res.rows[0],
                  logo: logoRes?.rows[0],
                  favicon: faviconRes?.rows[0],
                })),
              ),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ updated, logo, favicon }) => {
        if (!updated) return;
        // Each image call returns the whole row as it stood right after it, so the last one wins
        const merged = { ...updated, ...logo, ...favicon };
        const storedLogo =
          logoSource === "url" ? "" : (logo?.logoFile ?? this.storedLogoFile());
        const storedFavicon =
          faviconSource === "url"
            ? ""
            : (favicon?.faviconFile ?? this.storedFaviconFile());
        this.storedLogoFile.set(storedLogo);
        this.storedFaviconFile.set(storedFavicon);
        const logoFiles = this.brandingService.logoFiles(storedLogo);
        const faviconFiles = this.brandingService.logoFiles(storedFavicon);
        this.model.update((m) => ({
          ...m,
          ...merged,
          radius: radiusToNumber(merged.radius),
          logoFile: logoFiles,
          faviconFile: faviconFiles,
        }));
        this.brandingForm()?.patchValue({
          logoUrl: merged.logoUrl,
          logoFile: logoFiles,
          faviconUrl: merged.faviconUrl,
          faviconFile: faviconFiles,
        });
        this.snackbarService.displaySuccess("Branding saved");
      });
  }

  /** Uploads a freshly picked image, or deletes the stored one when the URL source is chosen. */
  private imageCall(
    id: number | null,
    source: "url" | "file",
    submitted: FileInfo[] | null,
    hasStored: boolean,
    upload: (
      files: File[],
      id: number,
    ) => Observable<Rows<Branding> | undefined>,
    remove: (id: number) => Observable<Rows<Branding> | undefined>,
  ): Observable<Rows<Branding> | undefined> {
    if (id === null) return of(undefined);
    if (source === "url") return hasStored ? remove(id) : of(undefined);
    // Hidden controls are reset to null by the lib; a freshly picked image carries its File
    const newFile = (submitted ?? []).find((f) => f.file)?.file;
    return newFile ? upload([newFile], id) : of(undefined);
  }

  private toForm(row: Branding): BrandingForm {
    return {
      ...row,
      radius: radiusToNumber(row.radius),
      logoFile: this.brandingService.logoFiles(row.logoFile),
      logoSource: !row.logoUrl && row.logoFile ? "file" : "url",
      faviconFile: this.brandingService.logoFiles(row.faviconFile),
      faviconSource: !row.faviconUrl && row.faviconFile ? "file" : "url",
    };
  }
}
