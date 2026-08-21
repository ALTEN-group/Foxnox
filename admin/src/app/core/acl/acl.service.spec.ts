import { TestBed } from "@angular/core/testing";
import { Permission } from "@core/auth/auth.dto";
import { SchemaService } from "@core/schema/schema.service";
import { of, throwError } from "rxjs";
import { AclService } from "./acl.service";

describe("AclService", () => {
  let service: AclService;
  let schemaService: { get: ReturnType<typeof vi.fn> };

  const permissions: Permission[] = [
    { route: 82, operations: [1], fields: [] }, // passwords.get
    { route: 96, operations: [1], fields: ["name"] }, // policies.create
    { route: 97, operations: [1], fields: ["length"] }, // policies.update
  ];

  beforeEach(() => {
    schemaService = { get: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AclService,
        { provide: SchemaService, useValue: schemaService },
      ],
    });

    service = TestBed.inject(AclService);
  });

  it("denies access until ACLs are stored", () => {
    expect(service.hasAccess("passwords", "get")).toBe(false);
    expect(service.areAclResolved()).toBe(false);
  });

  it("allows undefined functionality", () => {
    expect(service.hasAccess(undefined, "get")).toBe(true);
  });

  it("stores permissions and resolves access checks", () => {
    service.storeAccessLevels(permissions);

    expect(service.areAclResolved()).toBe(true);
    expect(service.hasAccess("passwords", "get")).toBe(true);
    expect(service.hasAccess("passwords", "create")).toBe(false);
    expect(service.hasAccess("policies", "create")).toBe(true);
    expect(service.hasAccess("policies", undefined)).toBe(false);
    expect(service.getEntityAcls("policies")?.create?.fields).toEqual(["name"]);
  });

  it("resets access levels", () => {
    service.storeAccessLevels(permissions);
    service.resetAccessLevels();

    expect(service.accessLevels()).toBeUndefined();
    expect(service.hasAccess("passwords", "get")).toBe(false);
  });

  it("updates fields for a mapped route id", () => {
    service.storeAccessLevels(permissions);
    service.updateFieldsForRoute(96, ["name", "description"]);

    expect(service.getEntityAcls("policies")?.create?.fields).toEqual([
      "name",
      "description",
    ]);
  });

  it("enriches create/update fields from schema when permission fields are empty", () => {
    service.storeAccessLevels([
      { route: 96, operations: [], fields: [] },
      { route: 97, operations: [], fields: [] },
    ]);
    schemaService.get.mockReturnValue(
      of([
        { key: "name", operations: ["INSERT", "UPDATE"] },
        { key: "secret", operations: ["INSERT"] },
        { key: "length", operations: ["UPDATE"] },
      ]),
    );

    let done = false;
    service.enrichAclWithSchema("policies").subscribe(() => {
      done = true;
    });

    expect(done).toBe(true);
    expect(schemaService.get).toHaveBeenCalledWith("policies");
    expect(service.getEntityAcls("policies")?.create?.fields).toEqual([
      "name",
      "secret",
    ]);
    expect(service.getEntityAcls("policies")?.update?.fields).toEqual([
      "name",
      "length",
    ]);
  });

  it("keeps permission fields when they are non-empty", () => {
    service.storeAccessLevels(permissions);
    schemaService.get.mockReturnValue(
      of([{ key: "fromSchema", operations: ["INSERT", "UPDATE"] }]),
    );

    service.enrichAclWithSchema("policies").subscribe();

    expect(service.getEntityAcls("policies")?.create?.fields).toEqual(["name"]);
    expect(service.getEntityAcls("policies")?.update?.fields).toEqual(["length"]);
  });

  it("swallows schema errors", () => {
    service.storeAccessLevels(permissions);
    schemaService.get.mockReturnValue(throwError(() => new Error("boom")));

    let completed = false;
    service.enrichAclWithSchema("policies").subscribe({
      next: () => {
        completed = true;
      },
    });

    expect(completed).toBe(true);
  });
});
