import { FormControl, FormGroup } from "@angular/forms";
import { policyCriteriaValidator } from "./policy-criteria.validator";

describe("policyCriteriaValidator", () => {
  it("reports an error when no password criterion is selected", () => {
    const form = new FormGroup(
      {
        number: new FormControl(false),
        symbol: new FormControl(false),
        lowerCase: new FormControl(false),
        upperCase: new FormControl(false),
      },
      { validators: policyCriteriaValidator },
    );

    expect(form.errors).toEqual({
      policyCriteria: {
        message: "Select at least one password criterion.",
      },
    });
  });

  it("updates validity when a password criterion is selected or cleared", () => {
    const symbol = new FormControl(true);
    const form = new FormGroup(
      {
        number: new FormControl(false),
        symbol,
        lowerCase: new FormControl(false),
        upperCase: new FormControl(false),
      },
      { validators: policyCriteriaValidator },
    );

    expect(form.errors).toBeNull();

    symbol.setValue(false);

    expect(form.errors).toEqual({
      policyCriteria: {
        message: "Select at least one password criterion.",
      },
    });
  });
});
