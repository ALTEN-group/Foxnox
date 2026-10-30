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
  BRANDING_PREVIEW_CATEGORIES,
  BRANDING_PREVIEW_LANGS,
  BrandingForm,
  BrandingPreviewCategory,
  BrandingPreviewLang,
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

    .branding-preview__selects {
      display: flex;
      gap: 0.5rem;
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
    }
  `,
})
export class BrandingPreviewComponent {
  private readonly brandingService = inject(BrandingService);
  private readonly sanitizer = inject(DomSanitizer);

  public readonly model = input.required<BrandingForm>();

  public readonly categories = BRANDING_PREVIEW_CATEGORIES;
  public readonly category = signal(BRANDING_PREVIEW_CATEGORIES[0]);
  public readonly langs = BRANDING_PREVIEW_LANGS;
  public readonly lang = signal<BrandingPreviewLang>("en");
  public readonly page = signal<BrandingPreviewPage>(
    BRANDING_PREVIEW_CATEGORIES[0].pages[0].value,
  );

  public selectCategory(category: BrandingPreviewCategory): void {
    this.category.set(category);
    this.page.set(category.pages[0].value);
  }

  public readonly usesUploadedImage = computed(
    () =>
      this.model().logoSource === "file" ||
      this.model().faviconSource === "file",
  );

  private readonly request = computed(() => {
    const m = this.model();
    return {
      page: this.page(),
      lang: this.lang(),
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

  // Fields stay usable, but links must not navigate the frame away from the preview.
  public lockLinks(frame: HTMLIFrameElement): void {
    frame.contentDocument?.addEventListener("click", (e) => {
      if ((e.target as Element | null)?.closest("a")) e.preventDefault();
    });
  }

  // The HTML comes from our own authenticated API and is shown in a script-less sandboxed iframe.
  public readonly html = toSignal(
    toObservable(this.request).pipe(
      debounceTime(300),
      switchMap(({ page, lang, branding }) =>
        this.brandingService.preview(page, lang, branding).pipe(
          map(({ html }) => this.sanitizer.bypassSecurityTrustHtml(html)),
          // Keep the last good preview when a request fails
          catchError(() => EMPTY),
        ),
      ),
    ),
  );
}
