import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { APP_CONFIG } from "@core/app-config/app-config.token";
import { AuthenticationService } from "@core/auth/auth.service";
import { ThemeToggleButtonComponent } from "@core/ui/theme-toggle-button/theme-toggle-button.component";
import { LoadingService } from "@core/utils/loading/loading.service";
import { RoutingListener } from "@core/utils/routing.listener";
import { SharedModule } from "@openng/optimus-ui/api";
import { AutoFocusModule } from "@openng/optimus-ui/autofocus";
import { ButtonModule } from "@openng/optimus-ui/button";
import { CardModule } from "@openng/optimus-ui/card";
import { InputGroupModule } from "@openng/optimus-ui/inputgroup";
import { InputGroupAddonModule } from "@openng/optimus-ui/inputgroupaddon";
import { InputTextModule } from "@openng/optimus-ui/inputtext";
import { LoginBackgroundComponent } from "app/login/ui/login-background/login-background.component";
import { LoginFoxComponent } from "app/login/ui/login-fox/login-fox.component";
import { map, Observable, timer } from "rxjs";

/** Minimum time the post-login greeting stays on screen. */
const WELCOME_MIN_DURATION_MS = 1000;

@Component({
  selector: "app-login",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    CardModule,
    AutoFocusModule,
    LoginBackgroundComponent,
    LoginFoxComponent,
    InputGroupAddonModule,
    InputGroupModule,
    ThemeToggleButtonComponent,
  ],
})
export class LoginComponent implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthenticationService);
  private readonly loadingService = inject(LoadingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routingListener = inject(RoutingListener);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly route = inject(ActivatedRoute);

  public readonly userServerUrl = this.appConfig.gatelinApi;
  /** Foxnox password-recovery workflow (Handlebars SSR). */
  public readonly forgotPasswordUrl = `${this.appConfig.webBase}/recover`;

  public isPasswordHidden = true;
  public isLoading = false;
  /** Set when leaving the login page; switches the card for the greeting. */
  public readonly greeting = signal<string | null>(null);
  private greetingShownAt = 0;

  public formGroup: FormGroup = new FormGroup({
    email: new FormControl("", [Validators.required, Validators.email]),
    password: new FormControl("", [Validators.required]),
  });

  get email() {
    return this.formGroup.get("email");
  }

  get password() {
    return this.formGroup.get("password");
  }

  ngOnInit() {
    const ticket = this.route.snapshot.queryParamMap.get("ticket");
    if (ticket) {
      this.isLoading = true;
      this.loadingService.start();
      this.authService
        .resumeLogin(ticket)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((ok) => {
          if (!ok) this.formGroup.setErrors({ incorrect: true });
          this.loadingService.stop();
          this.isLoading = false;
        });
    }
  }

  ngAfterViewInit() {
    this.formGroup.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formGroup.setErrors(null);
      });

    this.routingListener.navigationStart$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.greetingShownAt = Date.now();
        this.greeting.set(
          this.buildGreeting(this.authService.user()?.firstName),
        );
      });
  }

  /** Resolves once the greeting has been visible for the minimum duration. */
  public greetingDone(): Observable<boolean> {
    const elapsed = Date.now() - this.greetingShownAt;
    return timer(Math.max(WELCOME_MIN_DURATION_MS - elapsed, 0)).pipe(
      map(() => true),
    );
  }

  private buildGreeting(firstName?: string): string {
    const hour = new Date().getHours();
    const hello =
      hour >= 5 && hour < 18
        ? $localize`:@@Login_GreetingDay:Bonjour`
        : $localize`:@@Login_GreetingEvening:Bonsoir`;
    return firstName ? `${hello}, ${firstName}` : hello;
  }

  public login(): void {
    if (this.formGroup.invalid) {
      return;
    }

    if (this.email && this.password) {
      this.isLoading = true;
      this.loadingService.start();
      this.authService
        .login(this.email.value, this.password.value)
        .subscribe((res: boolean) => {
          if (!res) this.formGroup.setErrors({ incorrect: true });
          this.loadingService.stop();
          this.isLoading = false;
        });
    }
  }
}
