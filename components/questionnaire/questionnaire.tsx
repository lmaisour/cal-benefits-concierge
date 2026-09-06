"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import type { UserProfile } from "@/lib/eligibility/types";
import {
  ALL_INTEREST_VALUES,
  INTEREST_OPTIONS,
  allInterestsSelected,
} from "@/lib/questionnaire/interests";
import {
  applyHousingStatus,
  applyInterests,
  applyOptionalBoolean,
  applyOptionalNumber,
  applyOptionalString,
  applyZip,
  applyZevOwnership,
} from "@/lib/questionnaire/profile";
import {
  clampStepId,
  getNextStepId,
  getPreviousStepId,
  getProgress,
  getVisibleStepIds,
  isRequiredStep,
  type QuestionnaireStepId,
} from "@/lib/questionnaire/steps";
import {
  clearQuestionnaireState,
  getQuestionnaireServerSnapshot,
  getQuestionnaireSnapshot,
  markSkipped,
  parseQuestionnaireSnapshot,
  subscribeQuestionnaire,
  unmarkSkipped,
  writeQuestionnaireState,
} from "@/lib/questionnaire/storage";
import {
  ageError,
  householdSizeError,
  incomeError,
  parseIntegerInRange,
  parseNonNegativeNumber,
  vehiclePriceError,
  zipError,
} from "@/lib/questionnaire/validation";
import { CompletionScreen } from "@/components/questionnaire/completion-screen";
import { MultiSelectQuestion } from "@/components/questionnaire/multi-select-question";
import { NumberQuestion } from "@/components/questionnaire/number-question";
import { OptionsQuestion } from "@/components/questionnaire/options-question";
import { QuestionnaireProgress } from "@/components/questionnaire/progress";
import { QuestionShell } from "@/components/questionnaire/question-shell";
import { TextQuestion } from "@/components/questionnaire/text-question";

/** Southern California Edison is stored as `SCE` for a consistent profile value. */
const ELECTRIC_PRESETS = ["PG&E", "SCE", "SDG&E", "LADWP", "SMUD"] as const;
/** `NONE` means the household has no gas service — not a missing answer. */
const GAS_PRESETS = ["SoCalGas", "PG&E", "SDG&E", "NONE"] as const;

const SKIP = "__skip__";
const OTHER = "__other__";

const HOUSING_OPTIONS = [
  { value: "owner", label: "Own" },
  { value: "renter", label: "Rent" },
  { value: "other", label: "Other" },
] as const;

const PROPERTY_OPTIONS = [
  { value: "single_family", label: "Single-family home" },
  { value: "condo", label: "Condo" },
  { value: "townhome", label: "Townhome" },
  { value: "apartment", label: "Apartment" },
  { value: "multifamily", label: "Multifamily property" },
  { value: "mobile_home", label: "Mobile/manufactured home" },
  { value: "other", label: "Other" },
] as const;

const YES_NO_SKIP = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: SKIP, label: "Prefer not to say" },
] as const;

const YES_NO_UNSURE = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: SKIP, label: "Not sure" },
] as const;

export function Questionnaire() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const helperId = useId();
  const errorId = useId();

  const snapshot = useSyncExternalStore(
    subscribeQuestionnaire,
    getQuestionnaireSnapshot,
    getQuestionnaireServerSnapshot,
  );
  const stored = parseQuestionnaireSnapshot(snapshot);
  const profile = stored?.profile ?? {};
  const stepId = stored?.stepId ?? "zip";
  const completed = stored?.completed ?? false;
  const skipped = stored?.skipped ?? [];

  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const zipDraft = drafts?.zip ?? profile.zip ?? "";
  const sizeDraft =
    drafts?.size ??
    (profile.household_size !== undefined ? String(profile.household_size) : "");
  const incomeDraft =
    drafts?.income ??
    (profile.household_income !== undefined ? String(profile.household_income) : "");
  const ageDraft = drafts?.age ?? (profile.age !== undefined ? String(profile.age) : "");
  const priceDraft =
    drafts?.price ??
    (profile.vehicle_price !== undefined ? String(profile.vehicle_price) : "");
  const electricFromProfile = electricChoiceFromProfile(profile.electric_utility);
  const gasFromProfile = gasChoiceFromProfile(profile.gas_utility);
  const electricChoice =
    drafts?.electricChoice ??
    (skipped.includes("electric_utility") ? SKIP : electricFromProfile.choice);
  const otherElectric = drafts?.otherElectric ?? electricFromProfile.other;
  const gasChoice =
    drafts?.gasChoice ??
    (skipped.includes("gas_utility") ? SKIP : gasFromProfile.choice);
  const otherGas = drafts?.otherGas ?? gasFromProfile.other;

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepId, completed]);

  function persist(next: {
    profile?: UserProfile;
    stepId?: QuestionnaireStepId;
    completed?: boolean;
    skipped?: string[];
  }) {
    const nextProfile = next.profile ?? profile;
    writeQuestionnaireState({
      profile: nextProfile,
      stepId: clampStepId(nextProfile, next.stepId ?? stepId),
      completed: next.completed ?? completed,
      skipped: next.skipped ?? skipped,
    });
  }

  function setZipDraft(value: string) {
    setDrafts((current) => ({ ...current, zip: value }));
  }
  function setSizeDraft(value: string) {
    setDrafts((current) => ({ ...current, size: value }));
  }
  function setIncomeDraft(value: string) {
    setDrafts((current) => ({ ...current, income: value }));
  }
  function setAgeDraft(value: string) {
    setDrafts((current) => ({ ...current, age: value }));
  }
  function setPriceDraft(value: string) {
    setDrafts((current) => ({ ...current, price: value }));
  }
  function setElectricChoice(value: string | undefined) {
    setDrafts((current) => ({ ...current, electricChoice: value }));
  }
  function setOtherElectric(value: string) {
    setDrafts((current) => ({ ...current, otherElectric: value }));
  }
  function setGasChoice(value: string | undefined) {
    setDrafts((current) => ({ ...current, gasChoice: value }));
  }
  function setOtherGas(value: string) {
    setDrafts((current) => ({ ...current, otherGas: value }));
  }

  function startOver() {
    setDrafts({
      zip: "",
      size: "",
      income: "",
      age: "",
      price: "",
      otherElectric: "",
      otherGas: "",
    });
    clearQuestionnaireState();
    setError(null);
  }

  function goBack() {
    if (completed) {
      const last = getVisibleStepIds(profile).at(-1);
      persist({ completed: false, stepId: last ?? "zip" });
      return;
    }
    const previous = getPreviousStepId(profile, stepId);
    if (previous) {
      setError(null);
      persist({ stepId: previous });
    }
  }

  function advance(nextProfile: UserProfile, nextSkipped = skipped) {
    setError(null);
    const next = getNextStepId(nextProfile, stepId);
    if (next === "complete") {
      persist({ profile: nextProfile, completed: true, skipped: nextSkipped });
      return;
    }
    persist({ profile: nextProfile, stepId: next, skipped: nextSkipped });
  }

  function continueFromStep() {
    const result = commitCurrentStep();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    advance(result.profile, result.skipped);
  }

  function skipNumberField(field: "household_income" | "age") {
    if (field === "household_income") {
      setIncomeDraft("");
    }
    if (field === "age") {
      setAgeDraft("");
    }
    advance(
      applyOptionalNumber(profile, field, undefined),
      markSkipped(skipped, field),
    );
  }

  function commitCurrentStep():
    | { ok: true; profile: UserProfile; skipped: string[] }
    | { ok: false; error: string } {
    switch (stepId) {
      case "zip": {
        const message = zipError(zipDraft);
        if (message) {
          return { ok: false, error: message };
        }
        return { ok: true, profile: applyZip(profile, zipDraft.trim()), skipped };
      }
      case "household_size": {
        const message = householdSizeError(sizeDraft);
        if (message) {
          return { ok: false, error: message };
        }
        return {
          ok: true,
          profile: applyOptionalNumber(
            profile,
            "household_size",
            parseIntegerInRange(sizeDraft, 1, 20),
          ),
          skipped,
        };
      }
      case "household_income": {
        if (incomeDraft.trim() === "") {
          return {
            ok: true,
            profile: applyOptionalNumber(profile, "household_income", undefined),
            skipped,
          };
        }
        const message = incomeError(incomeDraft);
        if (message) {
          return { ok: false, error: message };
        }
        return {
          ok: true,
          profile: applyOptionalNumber(
            profile,
            "household_income",
            parseNonNegativeNumber(incomeDraft),
          ),
          skipped: unmarkSkipped(skipped, "household_income"),
        };
      }
      case "housing_status":
        if (!profile.housing_status) {
          return { ok: false, error: "Choose whether you own or rent." };
        }
        return { ok: true, profile, skipped };
      case "property_type":
        if (!profile.property_type) {
          return { ok: false, error: "Choose the type of home you live in." };
        }
        return { ok: true, profile, skipped };
      case "age": {
        if (ageDraft.trim() === "") {
          return {
            ok: true,
            profile: applyOptionalNumber(profile, "age", undefined),
            skipped,
          };
        }
        const message = ageError(ageDraft);
        if (message) {
          return { ok: false, error: message };
        }
        return {
          ok: true,
          profile: applyOptionalNumber(profile, "age", parseIntegerInRange(ageDraft, 18, 120)),
          skipped: unmarkSkipped(skipped, "age"),
        };
      }
      case "electric_utility":
        return {
          ok: true,
          profile: applyElectric(profile, electricChoice, otherElectric),
          skipped:
            !electricChoice || electricChoice === SKIP
              ? markSkipped(skipped, "electric_utility")
              : unmarkSkipped(skipped, "electric_utility"),
        };
      case "gas_utility":
        return {
          ok: true,
          profile: applyGas(profile, gasChoice, otherGas),
          skipped:
            !gasChoice || gasChoice === SKIP
              ? markSkipped(skipped, "gas_utility")
              : unmarkSkipped(skipped, "gas_utility"),
        };
      case "vehicle_price": {
        if (priceDraft.trim() === "") {
          return {
            ok: true,
            profile: applyOptionalNumber(profile, "vehicle_price", undefined),
            skipped,
          };
        }
        const message = vehiclePriceError(priceDraft);
        if (message) {
          return { ok: false, error: message };
        }
        return {
          ok: true,
          profile: applyOptionalNumber(
            profile,
            "vehicle_price",
            parseNonNegativeNumber(priceDraft),
          ),
          skipped,
        };
      }
      default:
        if (isRequiredStep(stepId)) {
          return { ok: false, error: "Please answer this question to continue." };
        }
        return { ok: true, profile, skipped };
    }
  }

  const visibleStep = stepId;
  const progress = getProgress(profile, visibleStep);
  const describedBy = [helperId, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <section className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      {!completed ? (
        <div className="mb-8">
          <QuestionnaireProgress current={progress.current} total={progress.total} />
        </div>
      ) : null}

      {completed ? (
        <CompletionScreen
          profile={profile}
          headingRef={headingRef}
          onBack={goBack}
          onStartOver={startOver}
        />
      ) : (
        <StepBody
          stepId={visibleStep}
          profile={profile}
          skipped={skipped}
          persist={persist}
          headingRef={headingRef}
          helperId={helperId}
          errorId={errorId}
          error={error}
          describedBy={describedBy}
          zipDraft={zipDraft}
          setZipDraft={setZipDraft}
          sizeDraft={sizeDraft}
          setSizeDraft={setSizeDraft}
          incomeDraft={incomeDraft}
          setIncomeDraft={setIncomeDraft}
          ageDraft={ageDraft}
          setAgeDraft={setAgeDraft}
          priceDraft={priceDraft}
          setPriceDraft={setPriceDraft}
          electricChoice={electricChoice}
          setElectricChoice={setElectricChoice}
          otherElectric={otherElectric}
          setOtherElectric={setOtherElectric}
          gasChoice={gasChoice}
          setGasChoice={setGasChoice}
          otherGas={otherGas}
          setOtherGas={setOtherGas}
          onSubmit={continueFromStep}
          onSkipIncome={() => skipNumberField("household_income")}
          onSkipAge={() => skipNumberField("age")}
          onBack={goBack}
          onStartOver={startOver}
          canGoBack={getPreviousStepId(profile, visibleStep) !== null}
          continueLabel={
            visibleStep === getVisibleStepIds(profile).at(-1) ? "Finish" : "Continue"
          }
        />
      )}
    </section>
  );
}

function StepBody({
  stepId,
  profile,
  skipped,
  persist,
  headingRef,
  helperId,
  errorId,
  error,
  describedBy,
  zipDraft,
  setZipDraft,
  sizeDraft,
  setSizeDraft,
  incomeDraft,
  setIncomeDraft,
  ageDraft,
  setAgeDraft,
  priceDraft,
  setPriceDraft,
  electricChoice,
  setElectricChoice,
  otherElectric,
  setOtherElectric,
  gasChoice,
  setGasChoice,
  otherGas,
  setOtherGas,
  onSubmit,
  onSkipIncome,
  onSkipAge,
  onBack,
  onStartOver,
  canGoBack,
  continueLabel,
}: {
  stepId: QuestionnaireStepId;
  profile: UserProfile;
  skipped: string[];
  persist: (next: {
    profile?: UserProfile;
    skipped?: string[];
  }) => void;
  headingRef: Ref<HTMLHeadingElement>;
  helperId: string;
  errorId: string;
  error: string | null;
  describedBy?: string;
  zipDraft: string;
  setZipDraft: (value: string) => void;
  sizeDraft: string;
  setSizeDraft: (value: string) => void;
  incomeDraft: string;
  setIncomeDraft: (value: string) => void;
  ageDraft: string;
  setAgeDraft: (value: string) => void;
  priceDraft: string;
  setPriceDraft: (value: string) => void;
  electricChoice: string | undefined;
  setElectricChoice: (value: string | undefined) => void;
  otherElectric: string;
  setOtherElectric: (value: string) => void;
  gasChoice: string | undefined;
  setGasChoice: (value: string | undefined) => void;
  otherGas: string;
  setOtherGas: (value: string) => void;
  onSubmit: () => void;
  onSkipIncome: () => void;
  onSkipAge: () => void;
  onBack: () => void;
  onStartOver: () => void;
  canGoBack: boolean;
  continueLabel: string;
}) {
  const copy = STEP_COPY[stepId];
  const optionalHint = isRequiredStep(stepId)
    ? undefined
    : "You can skip this question if you prefer.";

  return (
    <QuestionShell
      title={copy.title}
      titleRef={headingRef}
      helper={copy.helper}
      helperId={copy.helper ? helperId : undefined}
      error={error}
      errorId={error ? errorId : undefined}
      onSubmit={onSubmit}
      onBack={onBack}
      onStartOver={onStartOver}
      canGoBack={canGoBack}
      continueLabel={continueLabel}
      optionalHint={optionalHint}
    >
      {stepId === "zip" ? (
        <TextQuestion
          id="zip"
          label="ZIP code"
          value={zipDraft}
          onChange={setZipDraft}
          inputMode="numeric"
          maxLength={5}
          autoComplete="postal-code"
          describedBy={describedBy}
          placeholder="e.g. 91331"
        />
      ) : null}

      {stepId === "household_size" ? (
        <NumberQuestion
          id="household_size"
          label="Household size"
          value={sizeDraft}
          onChange={setSizeDraft}
          min={1}
          max={20}
          inputMode="numeric"
          stepper
          describedBy={describedBy}
        />
      ) : null}

      {stepId === "household_income" ? (
        <div className="space-y-4">
          <NumberQuestion
            id="household_income"
            label="Annual household income"
            value={incomeDraft}
            onChange={setIncomeDraft}
            prefix="$"
            describedBy={describedBy}
            placeholder="e.g. 65000"
          />
          <SkipButton label="Prefer not to say" onClick={onSkipIncome} />
        </div>
      ) : null}

      {stepId === "housing_status" ? (
        <OptionsQuestion
          name="housing_status"
          legend={copy.title}
          options={[...HOUSING_OPTIONS]}
          value={profile.housing_status}
          describedBy={describedBy}
          onChange={(value) =>
            persist({
              profile: applyHousingStatus(
                profile,
                value as "owner" | "renter" | "other",
              ),
            })
          }
        />
      ) : null}

      {stepId === "property_type" ? (
        <OptionsQuestion
          name="property_type"
          legend={copy.title}
          options={[...PROPERTY_OPTIONS]}
          value={profile.property_type}
          describedBy={describedBy}
          onChange={(value) =>
            persist({
              profile: {
                ...profile,
                property_type: value as NonNullable<UserProfile["property_type"]>,
              },
            })
          }
        />
      ) : null}

      {stepId === "age" ? (
        <div className="space-y-4">
          <NumberQuestion
            id="age"
            label="Age"
            value={ageDraft}
            onChange={setAgeDraft}
            min={18}
            max={120}
            inputMode="numeric"
            describedBy={describedBy}
          />
          <SkipButton label="Prefer not to say" onClick={onSkipAge} />
        </div>
      ) : null}

      {stepId === "has_children" ? (
        <BooleanOptions
          name="has_children"
          legend={copy.title}
          options={YES_NO_SKIP}
          value={profile.has_children}
          skipped={skipped.includes("has_children")}
          describedBy={describedBy}
          onChange={(value) =>
            persist({
              profile: applyOptionalBoolean(profile, "has_children", value),
              skipped:
                value === undefined
                  ? markSkipped(skipped, "has_children")
                  : unmarkSkipped(skipped, "has_children"),
            })
          }
        />
      ) : null}

      {stepId === "veteran" ? (
        <BooleanOptions
          name="veteran"
          legend={copy.title}
          options={YES_NO_SKIP}
          value={profile.veteran}
          skipped={skipped.includes("veteran")}
          describedBy={describedBy}
          onChange={(value) =>
            persist({
              profile: applyOptionalBoolean(profile, "veteran", value),
              skipped:
                value === undefined
                  ? markSkipped(skipped, "veteran")
                  : unmarkSkipped(skipped, "veteran"),
            })
          }
        />
      ) : null}

      {stepId === "disability" ? (
        <BooleanOptions
          name="disability"
          legend={copy.title}
          options={YES_NO_SKIP}
          value={profile.disability}
          skipped={skipped.includes("disability")}
          describedBy={describedBy}
          onChange={(value) =>
            persist({
              profile: applyOptionalBoolean(profile, "disability", value),
              skipped:
                value === undefined
                  ? markSkipped(skipped, "disability")
                  : unmarkSkipped(skipped, "disability"),
            })
          }
        />
      ) : null}

      {stepId === "electric_utility" ? (
        <div className="space-y-4">
          <OptionsQuestion
            name="electric_utility"
            legend={copy.title}
            describedBy={describedBy}
            value={electricChoice}
            options={[
              { value: "PG&E", label: "PG&E" },
              { value: "SCE", label: "Southern California Edison" },
              { value: "SDG&E", label: "SDG&E" },
              { value: "LADWP", label: "LADWP" },
              { value: "SMUD", label: "SMUD" },
              { value: OTHER, label: "Other" },
              { value: SKIP, label: "Not sure" },
            ]}
            onChange={setElectricChoice}
          />
          {electricChoice === OTHER ? (
            <TextQuestion
              id="electric_utility_other"
              label="Electric utility name (optional)"
              value={otherElectric}
              onChange={setOtherElectric}
              placeholder="Utility name"
            />
          ) : null}
        </div>
      ) : null}

      {stepId === "gas_utility" ? (
        <div className="space-y-4">
          <OptionsQuestion
            name="gas_utility"
            legend={copy.title}
            describedBy={describedBy}
            value={gasChoice}
            options={[
              { value: "SoCalGas", label: "SoCalGas" },
              { value: "PG&E", label: "PG&E" },
              { value: "SDG&E", label: "SDG&E" },
              { value: OTHER, label: "Other" },
              { value: SKIP, label: "Not sure" },
              { value: "NONE", label: "I don’t have natural gas service" },
            ]}
            onChange={setGasChoice}
          />
          {gasChoice === OTHER ? (
            <TextQuestion
              id="gas_utility_other"
              label="Gas utility name (optional)"
              value={otherGas}
              onChange={setOtherGas}
              placeholder="Utility name"
            />
          ) : null}
        </div>
      ) : null}

      {stepId === "interests" ? (
        <MultiSelectQuestion
          legend={copy.title}
          describedBy={describedBy}
          options={[...INTEREST_OPTIONS]}
          values={profile.interests ?? []}
          everythingChecked={allInterestsSelected(profile.interests)}
          onToggle={(value) => {
            const current = new Set(profile.interests ?? []);
            if (current.has(value)) {
              current.delete(value);
            } else {
              current.add(value);
            }
            persist({ profile: applyInterests(profile, [...current]) });
          }}
          onToggleEverything={() => {
            if (allInterestsSelected(profile.interests)) {
              persist({ profile: applyInterests(profile, undefined) });
            } else {
              persist({ profile: applyInterests(profile, [...ALL_INTEREST_VALUES]) });
            }
          }}
        />
      ) : null}

      {stepId === "owned_zev_before" ? (
        <BooleanOptions
          name="owned_zev_before"
          legend={copy.title}
          options={YES_NO_UNSURE}
          value={profile.owned_zev_before}
          skipped={skipped.includes("owned_zev_before")}
          describedBy={describedBy}
          onChange={(value) =>
            persist({
              profile: applyZevOwnership(profile, value),
              skipped:
                value === undefined
                  ? markSkipped(skipped, "owned_zev_before")
                  : unmarkSkipped(skipped, "owned_zev_before"),
            })
          }
        />
      ) : null}

      {stepId === "vehicle_condition" ? (
        <OptionsQuestion
          name="vehicle_condition"
          legend={copy.title}
          describedBy={describedBy}
          value={
            profile.vehicle_condition ??
            (skipped.includes("vehicle_condition") ? SKIP : undefined)
          }
          options={[
            { value: "new", label: "New" },
            { value: "used", label: "Used" },
            { value: SKIP, label: "Not sure" },
          ]}
          onChange={(value) =>
            persist({
              profile: applyOptionalString(
                profile,
                "vehicle_condition",
                value === SKIP ? undefined : (value as "new" | "used"),
              ),
              skipped:
                value === SKIP
                  ? markSkipped(skipped, "vehicle_condition")
                  : unmarkSkipped(skipped, "vehicle_condition"),
            })
          }
        />
      ) : null}

      {stepId === "vehicle_price" ? (
        <NumberQuestion
          id="vehicle_price"
          label="Approximate vehicle price"
          value={priceDraft}
          onChange={setPriceDraft}
          prefix="$"
          describedBy={describedBy}
          placeholder="e.g. 35000"
        />
      ) : null}

      {stepId === "willing_to_retire_vehicle" ? (
        <BooleanOptions
          name="willing_to_retire_vehicle"
          legend={copy.title}
          options={YES_NO_UNSURE}
          value={profile.willing_to_retire_vehicle}
          skipped={skipped.includes("willing_to_retire_vehicle")}
          describedBy={describedBy}
          onChange={(value) =>
            persist({
              profile: applyOptionalBoolean(
                profile,
                "willing_to_retire_vehicle",
                value,
              ),
              skipped:
                value === undefined
                  ? markSkipped(skipped, "willing_to_retire_vehicle")
                  : unmarkSkipped(skipped, "willing_to_retire_vehicle"),
            })
          }
        />
      ) : null}
    </QuestionShell>
  );
}

function BooleanOptions({
  name,
  legend,
  options,
  value,
  skipped = false,
  onChange,
  describedBy,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  value: boolean | undefined;
  skipped?: boolean;
  onChange: (value: boolean | undefined) => void;
  describedBy?: string;
}) {
  const selected =
    value === true ? "yes" : value === false ? "no" : skipped ? SKIP : undefined;
  return (
    <OptionsQuestion
      name={name}
      legend={legend}
      options={[...options]}
      value={selected}
      describedBy={describedBy}
      onChange={(next) => {
        if (next === SKIP) {
          onChange(undefined);
          return;
        }
        onChange(next === "yes");
      }}
    />
  );
}

function SkipButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-base font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </button>
  );
}

function applyElectric(
  profile: UserProfile,
  choice: string | undefined,
  other: string,
): UserProfile {
  if (!choice || choice === SKIP) {
    return applyOptionalString(profile, "electric_utility", undefined);
  }
  if (choice === OTHER) {
    const trimmed = other.trim();
    return applyOptionalString(profile, "electric_utility", trimmed === "" ? "Other" : trimmed);
  }
  return applyOptionalString(profile, "electric_utility", choice);
}

function applyGas(
  profile: UserProfile,
  choice: string | undefined,
  other: string,
): UserProfile {
  if (!choice || choice === SKIP) {
    return applyOptionalString(profile, "gas_utility", undefined);
  }
  if (choice === OTHER) {
    const trimmed = other.trim();
    return applyOptionalString(profile, "gas_utility", trimmed === "" ? "Other" : trimmed);
  }
  return applyOptionalString(profile, "gas_utility", choice);
}

function electricChoiceFromProfile(value: string | undefined): {
  choice: string | undefined;
  other: string;
} {
  if (value === undefined) {
    return { choice: undefined, other: "" };
  }
  if ((ELECTRIC_PRESETS as readonly string[]).includes(value)) {
    return { choice: value, other: "" };
  }
  return { choice: OTHER, other: value === "Other" ? "" : value };
}

function gasChoiceFromProfile(value: string | undefined): {
  choice: string | undefined;
  other: string;
} {
  if (value === undefined) {
    return { choice: undefined, other: "" };
  }
  if ((GAS_PRESETS as readonly string[]).includes(value)) {
    return { choice: value, other: "" };
  }
  return { choice: OTHER, other: value === "Other" ? "" : value };
}

type Drafts = {
  zip?: string;
  size?: string;
  income?: string;
  age?: string;
  price?: string;
  electricChoice?: string;
  otherElectric?: string;
  gasChoice?: string;
  otherGas?: string;
};


const STEP_COPY: Record<QuestionnaireStepId, { title: string; helper?: string }> = {
  zip: {
    title: "What’s your ZIP code?",
    helper: "We use your ZIP to identify local, utility, and regional programs.",
  },
  household_size: {
    title: "How many people are in your household?",
    helper: "Include yourself and other people normally included in your household.",
  },
  household_income: {
    title: "About how much is your household’s annual income?",
    helper: "An estimate is okay. Many programs use income limits.",
  },
  housing_status: {
    title: "Do you own or rent your home?",
  },
  property_type: {
    title: "What type of home do you live in?",
  },
  age: {
    title: "What is your age?",
  },
  has_children: {
    title: "Do you have children in your household?",
  },
  veteran: {
    title: "Are you a veteran?",
  },
  disability: {
    title: "Do you or someone in your household have a disability or qualifying medical condition?",
    helper: "Some utility and assistance programs use this information.",
  },
  electric_utility: {
    title: "Who provides your electricity?",
  },
  gas_utility: {
    title: "Who provides your natural gas?",
  },
  interests: {
    title: "What kinds of savings are you interested in?",
    helper: "Select all that apply. This helps us organize results later — it does not decide eligibility.",
  },
  owned_zev_before: {
    title: "Have you ever owned or leased a zero-emission vehicle?",
  },
  vehicle_condition: {
    title: "Are you considering a new or used vehicle?",
  },
  vehicle_price: {
    title: "What price range are you considering?",
    helper: "An estimate is okay. You can skip this question.",
  },
  willing_to_retire_vehicle: {
    title: "Do you have an older vehicle you may be willing to retire or scrap?",
  },
};
