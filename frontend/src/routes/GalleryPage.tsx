// src/routes/GalleryPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getMetadataList } from "../app/services/api/galleryApi";
import type { MetadataItemDynamo, MetadataItem } from "../types/media";

import { GalleryFilters } from "../components/gallery/GalleryFilters";
import { GalleryGrid } from "../components/gallery/GalleryGrid";

/**
 * Convert DynamoDB metadata into clean JS objects.
 */
function normalizeItem(raw: MetadataItemDynamo): MetadataItem {
  const rawThumb = raw.thumbnailId?.S || "";
  const rawFile = raw.fileId?.S || "";

  // 🔥 Fix inconsistent DynamoDB paths
  let thumbnailId = rawThumb;

  if (!thumbnailId || thumbnailId.trim() === "") {
    // If missing → build one
    const base = rawFile.replace("uploads/", "");
    thumbnailId = `thumbnails/${base}.jpg`;
  } else {
    // If stored incorrectly → rewrite to thumbnails/
    if (thumbnailId.startsWith("uploads/")) {
      const base = thumbnailId.replace("uploads/", "");
      thumbnailId = `thumbnails/${base}`;
    }
  }

  return {
    id: rawFile,
    fileId: rawFile,
    filename: raw.filename?.S || "",

    species: raw.species?.S || "",
    plot: raw.plot?.S || "",
    deploymentId: raw.deploymentId?.S || "",
    sensorId: raw.sensorId?.S || "",
    experiencePoint: raw.experiencePoint?.S || "",

    thumbnailId, // 🔥 Always correct now

    updatedAt: raw.updatedAt?.S || "",
  };
}


export function GalleryPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<MetadataItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await getMetadataList();

        // 🔥 Fix DynamoDB shape → Normalize all items
        const normalized = result.map((r) => normalizeItem(r as any));
        setItems(normalized);
      } catch (err) {
        console.error("Failed to load gallery:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // 🔥 Fix species list (extract strings, unique)
  const speciesList = useMemo(() => {
    return Array.from(
      new Set(items.map((i) => i.species).filter((s) => s && s.trim() !== ""))
    ).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let out = [...items];

    if (search.trim().length > 0) {
      out = out.filter((i) =>
        i.species.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (selectedSpecies) {
      out = out.filter((i) => i.species === selectedSpecies);
    }

    // 🔥 Use updatedAt or createdAt
    out.sort((a, b) => {
      const tA = new Date(a.updatedAt).getTime();
      const tB = new Date(b.updatedAt).getTime();
      return sortOrder === "newest" ? tB - tA : tA - tB;
    });

    return out;
  }, [items, search, selectedSpecies, sortOrder]);

  function handleEdit(id: string) {
    navigate(`/staging?ids=${id}`);
  }

  return (
    <div className="flex flex-col w-full h-full bg-neutral-900 text-white">
      {/* Filters */}
      <GalleryFilters
        search={search}
        onSearch={setSearch}
        speciesList={speciesList}
        selectedSpecies={selectedSpecies}
        onSelectSpecies={setSelectedSpecies}
        sortOrder={sortOrder}
        onSort={setSortOrder}
      />

      {loading ? (
        <p className="text-slate-400 text-center pt-20">Loading...</p>
      ) : (
        <GalleryGrid
          items={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}
