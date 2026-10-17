import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { DomSanitizer } from "@angular/platform-browser";
import { CardModule } from "@openng/optimus-ui/card";
import { SelectModule } from "@openng/optimus-ui/select";
import {
  BRANDING_PREVIEW_PAGES,
  BrandingForm,
  BrandingPreviewPage,
} from "app/passwords/data-access/branding/branding.model";
import { BrandingService } from "app/passwords/data-access/branding/branding.service";
import { catchError, debounceTime, EMPTY, map, switchMap } from "rxjs";

/**
 * Live preview of a workflow page, rendered by the server from the unsaved form value.
 * A pending image upload is not previewed, only the stored file.
 */
@Component({
  selector: "adm-branding-preview",
  templateUrl: "./branding-preview.component.html",
  imports: [FormsModule, CardModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .branding-preview__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .branding-preview__note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-right: auto;
      color: var(--p-text-muted-color, #64748b);
      font-size: 0.875rem;
    }

    .branding-preview__frame {
      display: block;
      width: 100%;
      height: 640px;
      border: 1px solid var(--p-content-border-color, #d7dde3);
      border-radius: 8px;
      pointer-events: none;
    }
  `,
})
export class BrandingPreviewComponent {
  private readonly brandingService = inject(BrandingService);
  private readonly sanitizer = inject(DomSanitizer);

  public readonly model = input.required<BrandingForm>();

  public readonly pages = BRANDING_PREVIEW_PAGES;
  public readonly page = signal<BrandingPreviewPage>("recover");

  public readonly usesUploadedImage = computed(
    () =>
      this.model().logoSource === "file" ||
      this.model().faviconSource === "file",
  );

  private readonly request = computed(() => {
    const m = this.model();
    return {
      page: this.page(),
      branding: {
        name: m.name,
        tagline: m.tagline,
        logoUrl: m.logoSource === "file" ? "" : m.logoUrl,
        logoAlt: m.logoAlt,
        mark: m.mark,
        primaryColor: m.primaryColor,
        secondaryColor: m.secondaryColor,
        primaryHoverColor: m.primaryHoverColor,
        backgroundColor: m.backgroundColor,
        brandNameColor: m.brandNameColor,
        cardTitleColor: m.cardTitleColor,
        labelColor: m.labelColor,
        buttonTextColor: m.buttonTextColor,
        fontFamily: m.fontFamily,
        radius: `${m.radius}px`,
        footerText: m.footerText,
        footerUrl: m.footerUrl,
        faviconUrl: m.faviconSource === "file" ? "" : m.faviconUrl,
      },
    };
  });

  // The HTML comes from our own authenticated API and is shown in a script-less sandboxed iframe.
  public readonly html = toSignal(
    toObservable(this.request).pipe(
      debounceTime(300),
      switchMap(({ page, branding }) =>
        this.brandingService.preview(page, branding).pipe(
          map(({ html }) => this.sanitizer.bypassSecurityTrustHtml(html)),
          // Keep the last good preview when a request fails
          catchError(() => EMPTY),
        ),
      ),
    ),
  );
}
