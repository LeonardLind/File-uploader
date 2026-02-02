import { useEffect, useMemo, useState } from "react";
import type { MetadataItem } from "../types/gallery";
import { deriveStatus, type Status, type ViewFilter } from "../utils/galleryUtils";
import { HexLoader } from "./HexLoader";
import { fetchSignedUrl } from "../utils/signedUrl";

type EditPaneProps = {
  file: MetadataItem;
  apiUrl: string;
  uniqueValues: {
    species: string[];
    plot: string[];
    experiencePoint: string[];
    sensorId: string[];
    deploymentId: string[];
  };
  onClose: () => void;
  onSave: (payload: {
    species?: string;
    species_source?: "iucn" | "domesticated";
    domesticated_common_name?: string | null;
    plot?: string;
    experiencePoint?: string;
    sensorId?: string;
    deploymentId?: string;
    status: Status;
    id_state: string;
    displayState?: string;
    highlight?: boolean;
  }) => void;
  onDelete: (fileId: string) => void;
  onAlert: (title: string, message: string) => void;
  currentView: ViewFilter;
};

type IucnSuggestion = {
  scientific_name: string;
  common_name?: string;
  class_name?: string;
  order_name?: string;
  family_name?: string;
  genus_name?: string;
  species_name?: string;
  sis_id?: number | null;
};

type InatSuggestion = {
  scientific_name: string;
  common_name?: string;
  rank?: string;
  id?: number;
};

type DomesticatedOption = {
  common_name: string;
  scientific_name: string;
};

const MIN_SPECIES_QUERY = 3;
const SPECIES_DEBOUNCE_MS = 250;
const DOMESTICATED_TRIGGER = "domesticated"; // typing this activates domestic list
const DOMESTICATED_SPECIES: DomesticatedOption[] = [
  { common_name: "Cat", scientific_name: "Felis catus" },
  { common_name: "Dog", scientific_name: "Canis familiaris" },
  { common_name: "Cattle", scientific_name: "Bos taurus" },
  { common_name: "Pig", scientific_name: "Sus scrofa domesticus" },
  { common_name: "Sheep", scientific_name: "Ovis aries" },
  { common_name: "Goat", scientific_name: "Capra hircus" },
  { common_name: "Horse", scientific_name: "Equus caballus" },
  { common_name: "Donkey", scientific_name: "Equus africanus asinus" },
  { common_name: "Chicken", scientific_name: "Gallus gallus domesticus" },
  { common_name: "Duck", scientific_name: "Anas platyrhynchos domesticus" },
  { common_name: "Goose", scientific_name: "Anser anser domesticus" },
  { common_name: "Turkey", scientific_name: "Meleagris gallopavo domesticus" },
  { common_name: "Rabbit", scientific_name: "Oryctolagus cuniculus domesticus" },
  { common_name: "Ferret", scientific_name: "Mustela putorius furo" },
  { common_name: "Llama", scientific_name: "Lama glama" },
  { common_name: "Alpaca", scientific_name: "Vicugna pacos" },
];
type RequiredFieldKey = "species" | "plot" | "experiencePoint" | "sensorId" | "deploymentId";
type FieldKey = RequiredFieldKey | "idState";
const REQUIRED_FIELD_KEYS: RequiredFieldKey[] = [
  "species",
  "plot",
  "experiencePoint",
  "sensorId",
  "deploymentId",
];

export function EditPane({ file, apiUrl, uniqueValues, onClose, onSave, onDelete, onAlert, currentView }: EditPaneProps) {
  const defaultStage = useMemo<Status>(() => {
    if (currentView === "draft") return "id";
    if (currentView === "id") return "done";
    return deriveStatus(file);
  }, [currentView, file]);

  const [species, setSpecies] = useState(file.species ?? "");
  const [plot, setPlot] = useState(file.plot ?? "");
  const [experiencePoint, setExperiencePoint] = useState(file.experiencePoint ?? "");
  const [sensorId, setSensorId] = useState(file.sensorId ?? "");
  const [deploymentId, setDeploymentId] = useState(file.deploymentId ?? "");
  const [status, setStatus] = useState<Status>(defaultStage);
  const [idState, setIdState] = useState(file.id_state || "Unknown");
  const [active, setActive] = useState(file.displayState !== "Inactive");
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [inatSuggestions, setInatSuggestions] = useState<InatSuggestion[]>([]);
  const [iucnSuggestions, setIucnSuggestions] = useState<IucnSuggestion[]>([]);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [inatLoading, setInatLoading] = useState(false);
  const [inatError, setInatError] = useState<string | null>(null);
  const [iucnLoading, setIucnLoading] = useState(false);
  const [iucnError, setIucnError] = useState<string | null>(null);
  const [iucnHint, setIucnHint] = useState<string | null>(null);
  const [speciesSelectedFromIucn, setSpeciesSelectedFromIucn] = useState(false);
  const [speciesSelectedFromDomesticated, setSpeciesSelectedFromDomesticated] = useState(false);
  const [speciesSource, setSpeciesSource] = useState<"iucn" | "domesticated" | undefined>(
    file.species_source
  );
  const [domesticatedCommonName, setDomesticatedCommonName] = useState<string | null | undefined>(
    file.domesticated_common_name
  );
  const [searchMode, setSearchMode] = useState<"inat" | "iucn" | "domesticated">("inat");
  const [iucnQuery, setIucnQuery] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const locked = deriveStatus(file) === "display"; //Just safety check if ui change in future
  const allFieldsFilled = [species, plot, experiencePoint, sensorId, deploymentId].every(
    (val) => !!val && val.trim() !== ""
  );

  useEffect(() => {
    setSpecies(file.species ?? "");
    setPlot(file.plot ?? "");
    setExperiencePoint(file.experiencePoint ?? "");
    setSensorId(file.sensorId ?? "");
    setDeploymentId(file.deploymentId ?? "");
    setStatus(defaultStage);
    setIdState(file.id_state || "Unknown");
    setActive(file.displayState !== "Inactive");
    setVideoLoading(true);
    setVideoDuration(null);
    setVideoUrl(null);
    setInatSuggestions([]);
    setIucnSuggestions([]);
    setSpeciesOpen(false);
    setInatError(null);
    setIucnError(null);
    setIucnHint(null);
    setSpeciesSelectedFromIucn(file.species_source === "iucn");
    setSpeciesSelectedFromDomesticated(file.species_source === "domesticated");
    setSpeciesSource(file.species_source);
    setDomesticatedCommonName(file.domesticated_common_name);
    setSearchMode("inat"); //inat = iNaturalist
    setIucnQuery("");
    setFieldErrors({});
  }, [file, defaultStage]);

  // Load a signed video URL for the preview player.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setVideoLoading(true);
    setVideoUrl(null);

    (async () => {
      try {
        const url = await fetchSignedUrl({
          apiUrl,
          key: file.fileId,
          type: "default",
          signal: controller.signal,
        });
        if (!active) return;
        setVideoUrl(url);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn("Failed to load signed video URL", err);
          setVideoLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [apiUrl, file.fileId]);

  const speciesQuery = species.trim();
  const showDomesticatedOption = useMemo(() => {
    if (speciesQuery.length < MIN_SPECIES_QUERY) return false;
    const lower = speciesQuery.toLowerCase();
    return DOMESTICATED_TRIGGER.startsWith(lower);
  }, [speciesQuery]);
  const domesticatedFilter = useMemo(() => {
    if (searchMode !== "domesticated") return "";
    const lower = speciesQuery.toLowerCase();
    if (lower.startsWith(DOMESTICATED_TRIGGER)) {
      return lower.replace(DOMESTICATED_TRIGGER, "").trim();
    }
    return lower;
  }, [searchMode, speciesQuery]);
  const filteredDomesticated = useMemo(() => {
    if (searchMode !== "domesticated") return [];
    if (!domesticatedFilter) return DOMESTICATED_SPECIES;
    return DOMESTICATED_SPECIES.filter((item) => {
      const common = item.common_name.toLowerCase();
      const scientific = item.scientific_name.toLowerCase();
      return common.startsWith(domesticatedFilter) || scientific.startsWith(domesticatedFilter);
    });
  }, [domesticatedFilter, searchMode]);
  const filteredSuggestions = useMemo(() => {
    if (speciesQuery.length < MIN_SPECIES_QUERY) return [];
    const lower = speciesQuery.toLowerCase();
    return inatSuggestions.filter((item) => {
      const displayName = (item.common_name || item.scientific_name).toLowerCase();
      return (
        displayName.startsWith(lower) ||
        item.scientific_name.toLowerCase().startsWith(lower)
      );
    });
  }, [speciesQuery, inatSuggestions]);

   // When typing species, we call iNaturalist autocomplete
  useEffect(() => {
    if (locked) return;
    if (searchMode !== "inat") return;
    if (speciesQuery.length < MIN_SPECIES_QUERY) {
      setInatSuggestions([]);
      setInatLoading(false);
      setInatError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setInatLoading(true);
      setInatError(null);
      try {
        const res = await fetch(
          `${apiUrl}/api/iucn/inat-autocomplete?q=${encodeURIComponent(speciesQuery)}`,
          { signal: controller.signal }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load species");
        }
        // Store results in state so dropdown can show them
        const results = Array.isArray(data?.result) ? data.result : [];
        setInatSuggestions(results);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setInatError(err instanceof Error ? err.message : "Failed to load species");
        setInatSuggestions([]);
      } finally {
        setInatLoading(false);
      }
    }, SPECIES_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [apiUrl, locked, searchMode, speciesQuery]);

   // After choosing from iNaturalist, we try to verify in IUCN
  useEffect(() => {
    if (locked) return;
    if (searchMode !== "iucn") return;
    const query = iucnQuery.trim();
    if (!query) return;

    if (query.length < MIN_SPECIES_QUERY) {
      setIucnSuggestions([]);
      setIucnHint(null);
      setIucnLoading(false);
      return;
    }
     // IUCN needs 2 words: "Genus species"
    const parts = query.split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      setIucnSuggestions([]);
      setIucnLoading(false);
      setIucnError(null);
      setIucnHint("Enter genus and species (e.g., Panthera tigris).");
      return;
    }

    const controller = new AbortController();
    setIucnLoading(true);
    setIucnError(null);
    setIucnHint(null);

    (async () => {
      try {
        // Ask backend to search IUCN
        const res = await fetch(
          `${apiUrl}/api/iucn/scientific-name?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load IUCN matches");
        }
        const results = Array.isArray(data?.result) ? data.result : [];
        setIucnSuggestions(results);
        if (results.length === 0) {
          setIucnHint("No IUCN match found. Adjust the species name and try again.");
        } else {
          const exact = results.find(
            (item: IucnSuggestion) =>
              item.scientific_name.toLowerCase() === query.toLowerCase()
          );
          if (exact && results.length === 1) {
            handleSpeciesSelect(exact);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setIucnError(err instanceof Error ? err.message : "Failed to load IUCN matches");
        setIucnSuggestions([]);
      } finally {
        setIucnLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [apiUrl, locked, searchMode, iucnQuery]);

  const handleSpeciesSelect = (item: IucnSuggestion) => {
    setSpecies(item.scientific_name);
    setSpeciesSelectedFromIucn(true);
    setSpeciesSelectedFromDomesticated(false);
    setSpeciesSource("iucn");
    setDomesticatedCommonName(undefined);
    setSpeciesOpen(false);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.species;
      return next;
    });
  };

  const handleInatSelect = (item: InatSuggestion) => {
    setSpecies(item.scientific_name);
    setSpeciesSelectedFromIucn(false);
    setSpeciesSelectedFromDomesticated(false);
    setSpeciesSource(undefined);
    setDomesticatedCommonName(undefined);
    setSearchMode("iucn");
    setIucnQuery(item.scientific_name);
    setIucnSuggestions([]);
    setIucnError(null);
    setIucnHint(null);
    setSpeciesOpen(true);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.species;
      return next;
    });
  };

  const handleDomesticatedTrigger = () => {
    setSpecies("Domesticated");
    setSpeciesSelectedFromIucn(false);
    setSpeciesSelectedFromDomesticated(false);
    setSpeciesSource(undefined);
    setDomesticatedCommonName(undefined);
    setSearchMode("domesticated");
    setIucnQuery("");
    setIucnSuggestions([]);
    setIucnError(null);
    setIucnHint(null);
    setSpeciesOpen(true);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.species;
      return next;
    });
  };

  const handleDomesticatedSelect = (item: DomesticatedOption) => {
    setSpecies(item.scientific_name);
    setSpeciesSelectedFromIucn(false);
    setSpeciesSelectedFromDomesticated(true);
    setSpeciesSource("domesticated");
    setDomesticatedCommonName(item.common_name);
    setSpeciesOpen(false);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.species;
      return next;
    });
  };

  const clearFieldError = (key: FieldKey) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const markErrors = (entries: [FieldKey, string][]) => {
    if (!entries.length) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      entries.forEach(([field, message]) => {
        next[field] = message;
      });
      return next;
    });
  };

  const errorClass = (key: FieldKey) =>
    fieldErrors[key] ? "border-red-500 ring-1 ring-red-500/60" : "";

  const save = () => {
    // Validate required fields before saving.
    setFieldErrors({});
    const payloadIdState = idState || "Unknown";
    const currentStatus = deriveStatus(file);
    const speciesVerified =
      speciesSelectedFromIucn ||
      speciesSelectedFromDomesticated ||
      currentStatus === "done";
    const requiredFields: [FieldKey, string][] = [];
    REQUIRED_FIELD_KEYS.forEach((key) => {
      const value = { species, plot, experiencePoint, sensorId, deploymentId }[key];
      if (!value || !value.trim()) {
        requiredFields.push([key, "Required field"]);
      }
    });
    if (status === "done") {
      const stageErrors: [FieldKey, string][] = [...requiredFields];
      if (!speciesVerified) {
        stageErrors.push(["species", "Select a Latin name from IUCN or mark as domesticated"]);
      }
      if (payloadIdState !== "Confirmed") {
        stageErrors.push(["idState", "Set ID State to Confirmed"]);
      }
      if (stageErrors.length) {
        markErrors(stageErrors);
        onAlert(
          "Incomplete for Done",
          "Fill all fields, set ID State to Confirmed, and pick an IUCN Latin name or mark as domesticated."
        );
        return;
      }
    }
    if (status === "done" && !speciesVerified) {
      onAlert("Species required", "Select a Latin name from IUCN or mark the species as domesticated.");
      return;
    }
    onSave({
      species,
      species_source: speciesSource,
      domesticated_common_name: speciesSource === "domesticated" ? domesticatedCommonName ?? null : null,
      plot,
      experiencePoint,
      sensorId,
      deploymentId,
      status,
      id_state: payloadIdState,
      displayState: active ? "Active" : "Inactive",
      highlight: false,
    });
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-neutral-900 shadow-md p-2.5 h-full flex flex-col gap-2.5 md:p-3 2xl:p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-sm md:text-base font-semibold text-white">Edit metadata</h2>
          <p className="text-slate-400 text-[11px] md:text-xs truncate">{file.filename}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(file.fileId)}
            className="px-2.5 py-1 rounded-md border border-red-600 text-red-200 font-semibold hover:bg-red-600/10 transition text-[11px] md:text-xs"
          >
            Delete
          </button>
          <button
            onClick={save}
            className="px-3 py-1 rounded-md border border-lime-500 text-lime-100 font-semibold hover:bg-lime-400/10 transition text-[11px] md:text-xs"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-[11px] md:text-xs rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
          >
            Close
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_250px] gap-2 h-full">
        <div className="flex flex-col gap-2.5">
          <div className="bg-black rounded-lg overflow-hidden border border-slate-800 relative flex-1 min-h-[220px]">
            {videoLoading && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
                <HexLoader size={64} label="Loading video" />
              </div>
            )}
            <video
              src={videoUrl || undefined}
              controls
              className="w-full h-full object-contain bg-black"
              onLoadedMetadata={(e) => {
                const dur = (e.target as HTMLVideoElement).duration;
                setVideoDuration(isFinite(dur) ? dur : null);
                if (isFinite(dur) && dur <= 5) {
                  setVideoLoading(false);
                }
              }}
              onTimeUpdate={(e) => {
                const vid = e.target as HTMLVideoElement;
                const dur = videoDuration ?? vid.duration;
                const threshold = isFinite(dur) && dur > 0 ? Math.min(5, dur) : 5;
                if (vid.currentTime >= threshold - 0.05) {
                  setVideoLoading(false);
                }
              }}
              onLoadedData={(e) => {
                const vid = e.target as HTMLVideoElement;
                const dur = videoDuration ?? vid.duration;
                if (isFinite(dur) && dur <= 5) {
                  setVideoLoading(false);
                }
              }}
              onError={() => setVideoLoading(false)}
            />
          </div>
        </div>

        <aside className="bg-neutral-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] text-slate-400">Species</label>
              {speciesSelectedFromIucn && (
                <span className="text-[10px] uppercase tracking-wide text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Verified by IUCN
                </span>
              )}
              {speciesSelectedFromDomesticated && (
                <span className="text-[10px] uppercase tracking-wide text-amber-200 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Domesticated
                </span>
              )}
            </div>
            <div className="relative">
              <input
                value={species}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  const nextLower = nextValue.trim().toLowerCase();
                  const isDomesticated = nextLower.startsWith(DOMESTICATED_TRIGGER);
                  setSpecies(nextValue);
                  setSpeciesSelectedFromIucn(false);
                  setSpeciesSelectedFromDomesticated(false);
                  setSpeciesSource(undefined);
                  setDomesticatedCommonName(undefined);
                  setSearchMode(isDomesticated ? "domesticated" : "inat");
                  setIucnQuery("");
                  setIucnSuggestions([]);
                  setIucnError(null);
                  setIucnHint(null);
                  setSpeciesOpen(true);
                  clearFieldError("species");
                }}
  onFocus={() => {
    if (!locked) setSpeciesOpen(true);
  }}
                onBlur={() => {
                  setTimeout(() => setSpeciesOpen(false), 120);
                }}
                className={`w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.5 text-[11px] md:text-[12px] text-white ${errorClass("species")}`}
                placeholder="Enter species"
                disabled={locked}
              />
              {fieldErrors.species && (
                <p className="text-[10px] text-red-400 mt-1">{fieldErrors.species}</p>
              )}
              {speciesOpen && !locked && speciesQuery.length >= MIN_SPECIES_QUERY && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-700 bg-neutral-900 shadow-lg max-h-48 overflow-y-auto custom-scroll">
                  {searchMode === "inat" && inatLoading && (
                    <div className="px-2 py-2 text-[11px] text-slate-400">Searching...</div>
                  )}
                  {searchMode === "inat" && !inatLoading && inatError && (
                    <div className="px-2 py-2 text-[11px] text-red-400">{inatError}</div>
                  )}
                  {searchMode === "inat" && !inatLoading && !inatError && filteredSuggestions.length === 0 && (
                    <div className="px-2 py-2 text-[11px] text-slate-400">No matches.</div>
                  )}
                  {searchMode === "inat" && !inatLoading && !inatError && showDomesticatedOption && (
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-[11px] text-amber-200 hover:bg-neutral-800/80 transition"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleDomesticatedTrigger();
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-amber-100">Domesticated</span>
                        <span className="text-[10px] text-amber-300/80">curated list</span>
                      </div>
                      <div className="text-[10px] text-amber-300/80">
                        Select to choose dog, livestock, poultry.
                      </div>
                    </button>
                  )}
                  {searchMode === "inat" &&
                    !inatLoading &&
                    !inatError &&
                    filteredSuggestions.map((item) => (
                      <button
                        key={`${item.id ?? ""}-${item.scientific_name}`}
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-[11px] text-slate-200 hover:bg-neutral-800/80 transition"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleInatSelect(item);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-100">
                            {item.common_name || item.scientific_name}
                          </span>
                          {item.rank && <span className="text-[10px] text-slate-400">{item.rank}</span>}
                        </div>
                        {item.common_name && (
                          <div className="text-[10px] text-slate-400">{item.scientific_name}</div>
                        )}
                      </button>
                    ))}
                  {searchMode === "domesticated" && filteredDomesticated.length === 0 && (
                    <div className="px-2 py-2 text-[11px] text-slate-400">No domesticated matches.</div>
                  )}
                  {searchMode === "domesticated" &&
                    filteredDomesticated.map((item) => (
                      <button
                        key={item.scientific_name}
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-[11px] text-slate-200 hover:bg-neutral-800/80 transition"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleDomesticatedSelect(item);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-100">{item.common_name}</span>
                          <span className="text-[10px] text-slate-400">Domesticated</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{item.scientific_name}</div>
                      </button>
                    ))}
                  {searchMode === "iucn" && iucnLoading && (
                    <div className="px-2 py-2 text-[11px] text-slate-400">Checking IUCN...</div>
                  )}
                  {searchMode === "iucn" && !iucnLoading && iucnError && (
                    <div className="px-2 py-2 text-[11px] text-red-400">{iucnError}</div>
                  )}
                  {searchMode === "iucn" && !iucnLoading && !iucnError && iucnHint && (
                    <div className="px-2 py-2 text-[11px] text-slate-400">{iucnHint}</div>
                  )}
                  {searchMode === "iucn" &&
                    !iucnLoading &&
                    !iucnError &&
                    !iucnHint &&
                    iucnSuggestions.map((item) => (
                      <button
                        key={`${item.sis_id ?? ""}-${item.scientific_name}`}
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-[11px] text-slate-200 hover:bg-neutral-800/80 transition"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSpeciesSelect(item);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-100">
                            {item.common_name || item.scientific_name}
                          </span>
                          {item.class_name && (
                            <span className="text-[10px] text-slate-400">{item.class_name}</span>
                          )}
                        </div>
                        {item.common_name && (
                          <div className="text-[10px] text-slate-400">{item.scientific_name}</div>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Stage</label>
            <select
              value={status}
              onChange={(e) => {
                const nextStatus = e.target.value as Status;
                const currentStatus = deriveStatus(file);
                if (
                  nextStatus === "done" &&
                  !(speciesSelectedFromIucn || speciesSelectedFromDomesticated) &&
                  currentStatus !== "done" &&
                  currentStatus !== "display"
                ) {
                  onAlert(
                    "Species required",
                    "Select a Latin name from IUCN or mark the species as domesticated before moving to Done."
                  );
                  return;
                }
                if (nextStatus === "done" && (!allFieldsFilled || idState !== "Confirmed")) {
                  const stageErrors: [FieldKey, string][] = [];
                  REQUIRED_FIELD_KEYS.forEach((key) => {
                    const value = { species, plot, experiencePoint, sensorId, deploymentId }[key];
                    if (!value || !value.trim()) {
                      stageErrors.push([key, "Required for this stage"]);
                    }
                  });
                  if (idState !== "Confirmed") stageErrors.push(["idState", "Must be Confirmed"]);
                  markErrors(stageErrors);
                  onAlert(
                    "Done requires confirmed metadata",
                    "All fields must be filled and ID State must be Confirmed before moving to this stage."
                  );
                  return;
                }
                setStatus(nextStatus);
              }}
              className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white"
            >
              <option value="draft">Draft</option>
              <option value="id">ID</option>
              <option value="done" disabled={!allFieldsFilled || idState !== "Confirmed"}>
                Done
              </option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">ID State</label>
            <select
              value={idState}
              onChange={(e) => {
                setIdState(e.target.value);
                clearFieldError("idState");
              }}
              className={`w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white ${errorClass("idState")}`}
            >
              {["Unknown", "Genus", "AI ID", "Guess", "Confirmed"].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {fieldErrors.idState && (
              <p className="text-[10px] text-red-400">{fieldErrors.idState}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Plot</label>
            <select
              value={plot}
              onChange={(e) => {
                setPlot(e.target.value);
                clearFieldError("plot");
              }}
              className={`w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white ${errorClass("plot")}`}
              disabled={locked}
            >
              <option value="">Select plot</option>
              {uniqueValues.plot.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {fieldErrors.plot && <p className="text-[10px] text-red-400">{fieldErrors.plot}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Experience</label>
            <select
              value={experiencePoint}
              onChange={(e) => {
                setExperiencePoint(e.target.value);
                clearFieldError("experiencePoint");
              }}
              className={`w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white ${errorClass("experiencePoint")}`}
              disabled={locked}
            >
              <option value="">Select experience</option>
              {uniqueValues.experiencePoint.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {fieldErrors.experiencePoint && (
              <p className="text-[10px] text-red-400">{fieldErrors.experiencePoint}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Sensor</label>
            <select
              value={sensorId}
              onChange={(e) => {
                setSensorId(e.target.value);
                clearFieldError("sensorId");
              }}
              className={`w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white ${errorClass("sensorId")}`}
              disabled={locked}
            >
              <option value="">Select sensor</option>
              {uniqueValues.sensorId.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {fieldErrors.sensorId && (
              <p className="text-[10px] text-red-400">{fieldErrors.sensorId}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Deployment</label>
            <select
              value={deploymentId}
              onChange={(e) => {
                setDeploymentId(e.target.value);
                clearFieldError("deploymentId");
              }}
              className={`w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white ${errorClass("deploymentId")}`}
              disabled={locked}
            >
              <option value="">Select deployment</option>
              {uniqueValues.deploymentId.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {fieldErrors.deploymentId && (
              <p className="text-[10px] text-red-400">{fieldErrors.deploymentId}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
