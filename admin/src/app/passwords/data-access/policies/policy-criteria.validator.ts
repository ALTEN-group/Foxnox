import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export const policyCriteriaValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const hasCriterion = ["number", "symbol", "lowerCase", "upperCase"].some(
    (key) => group.get(key)?.value === true,
  );

  return hasCriterion
    ? null
    : {
        policyCriteria: {
          message: $localize`:@@Policies_AtLeastOneCriterion:Select at least one password criterion.`,
        },
      };
};
