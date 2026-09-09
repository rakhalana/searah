"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteData, Place } from "@/lib/types";

// ============================================================
// MapView — Leaflet map wrapper (SSR-safe via dynamic import)
// Menampilkan rute (utama & alternatif), marker tempat makan,
// pin lokasi awal/tujuan, serta interaksi klik peta manual
// ============================================================

interface MapViewProps {
  route: RouteData | null;
  routes?: RouteData[];
  activeRouteIndex?: number;
  onSelectRouteIndex?: (index: number) => void;
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  pickingMode?: "origin" | "destination" | null;
  onMapPick?: (coord: { lat: number; lng: number }) => void;
  originCoord?: { lat: number; lng: number } | null;
  destinationCoord?: { lat: number; lng: number } | null;
}

// Sanitasi string untuk mencegah Cross-Site Scripting (XSS) di Leaflet popup
function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Custom food marker icon (Lingkaran Cokelat Bernomor)
function createFoodIcon(rank: number, isSelected: boolean) {
  return L.divIcon({
    className: "custom-map-marker",
    html: `<div class="marker-food-badge ${isSelected ? "is-selected" : ""}">
      ${rank}
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

// Custom Marker Titik Awal (Dot Hijau Solid) dan Titik Tujuan (Cincin Hijau)
function createEndpointIcon(type: "origin" | "destination") {
  const isOrigin = type === "origin";
  return L.divIcon({
    className: "custom-map-marker",
    html: isOrigin
      ? `<div class="marker-origin-dot" title="Titik Awal"></div>`
      : `<div class="marker-destination-ring" title="Titik Tujuan"></div>`,
    iconSize: isOrigin ? [14, 14] : [16, 16],
    iconAnchor: isOrigin ? [7, 7] : [8, 8],
    popupAnchor: [0, -10],
  });
}

export default function MapView({
  route,
  routes = [],
  activeRouteIndex = 0,
  onSelectRouteIndex,
  places,
  selectedPlace,
  onSelectPlace,
  pickingMode = null,
  onMapPick,
  originCoord = null,
  destinationCoord = null,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const endpointsLayerRef = useRef<L.LayerGroup | null>(null);

  // Refs untuk callback agar event listener selalu mendapatkan closure terbaru
  const pickingModeRef = useRef(pickingMode);
  const onMapPickRef = useRef(onMapPick);

  useEffect(() => {
    pickingModeRef.current = pickingMode;
    onMapPickRef.current = onMapPick;
  }, [pickingMode, onMapPick]);

  // Inisialisasi peta
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-2.5, 118], // Center of Indonesia
      zoom: 5,
      zoomControl: false,
    });

    // OpenStreetMap tiles dengan dark filter via CSS
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      className: "dark-tiles",
    }).addTo(map);

    // Zoom control di kanan bawah
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Layer groups
    routesLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    endpointsLayerRef.current = L.layerGroup().addTo(map);

    // Event click untuk mode pemilihan manual
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (pickingModeRef.current && onMapPickRef.current) {
        onMapPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update kursor peta saat mode pemilihan aktif
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (pickingMode) {
      mapContainerRef.current.style.cursor = "crosshair";
    } else {
      mapContainerRef.current.style.cursor = "";
    }
  }, [pickingMode]);

  // Render Marker Titik Awal (A) dan Tujuan (B)
  useEffect(() => {
    if (!mapRef.current || !endpointsLayerRef.current) return;
    endpointsLayerRef.current.clearLayers();

    const boundsPoints: L.LatLngExpression[] = [];

    if (originCoord) {
      const marker = L.marker([originCoord.lat, originCoord.lng], {
        icon: createEndpointIcon("origin"),
      });
      marker.bindPopup(
        `<div class="map-popup text-center"><strong>Titik Awal</strong><span class="text-xs text-slate-400">${originCoord.lat.toFixed(5)}, ${originCoord.lng.toFixed(5)}</span></div>`,
        { className: "custom-popup" }
      );
      endpointsLayerRef.current.addLayer(marker);
      boundsPoints.push([originCoord.lat, originCoord.lng]);
    }

    if (destinationCoord) {
      const marker = L.marker([destinationCoord.lat, destinationCoord.lng], {
        icon: createEndpointIcon("destination"),
      });
      marker.bindPopup(
        `<div class="map-popup text-center"><strong>Titik Tujuan</strong><span class="text-xs text-slate-400">${destinationCoord.lat.toFixed(5)}, ${destinationCoord.lng.toFixed(5)}</span></div>`,
        { className: "custom-popup" }
      );
      endpointsLayerRef.current.addLayer(marker);
      boundsPoints.push([destinationCoord.lat, destinationCoord.lng]);
    }

    // Jika belum ada rute tetapi ada titik yang dipilih, fokuskan ke titik tersebut
    if (boundsPoints.length > 0 && !route) {
      if (boundsPoints.length === 1) {
        mapRef.current.setView(boundsPoints[0], 14, { animate: true });
      } else {
        mapRef.current.fitBounds(L.latLngBounds(boundsPoints), {
          padding: [80, 80],
          maxZoom: 15,
        });
      }
    }
  }, [originCoord, destinationCoord, route]);

  // Render Rute (Utama & Alternatif)
  useEffect(() => {
    if (!mapRef.current || !routesLayerGroupRef.current) return;
    routesLayerGroupRef.current.clearLayers();

    const allRoutesToRender = routes.length > 0 ? routes : route ? [route] : [];
    if (allRoutesToRender.length === 0) return;

    let activeBounds: L.LatLngBounds | null = null;

    // 1. Gambar rute alternatif (tidak aktif) dengan garis abu-abu tipis
    allRoutesToRender.forEach((r, idx) => {
      if (idx === activeRouteIndex) return;

      const latLngs: L.LatLngExpression[] = r.geometry.coordinates.map(
        (coord) => [coord[1], coord[0]] as L.LatLngExpression
      );

      const altPolyline = L.polyline(latLngs, {
        color: "#5D6167",
        weight: 3.5,
        opacity: 0.65,
        dashArray: "4, 6",
      });

      const distKm = (r.distance_m / 1000).toFixed(1);
      const durMin = Math.ceil(r.duration_s / 60);

      altPolyline.bindTooltip(
        `Rute Alternatif ${idx + 1} (${distKm} km • ${durMin} mnt)`,
        { sticky: true }
      );

      altPolyline.on("click", () => {
        onSelectRouteIndex?.(idx);
      });

      routesLayerGroupRef.current!.addLayer(altPolyline);
    });

    // 2. Gambar rute aktif dengan hijau jalan raya solid (#2F8F5B)
    const activeRoute = allRoutesToRender[activeRouteIndex] || allRoutesToRender[0];
    if (activeRoute) {
      const latLngs: L.LatLngExpression[] = activeRoute.geometry.coordinates.map(
        (coord) => [coord[1], coord[0]] as L.LatLngExpression
      );

      const mainLine = L.polyline(latLngs, {
        color: "#2F8F5B",
        weight: 5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      });

      const distKm = (activeRoute.distance_m / 1000).toFixed(1);
      const durMin = Math.ceil(activeRoute.duration_s / 60);
      mainLine.bindTooltip(
        `Rute Aktif (${distKm} km • ${durMin} mnt)`,
        { sticky: true }
      );

      routesLayerGroupRef.current.addLayer(mainLine);
      activeBounds = mainLine.getBounds();
    }

    // Fit map to bounds rute aktif
    if (activeBounds) {
      mapRef.current.fitBounds(activeBounds, { padding: [50, 50] });
    }
  }, [route, routes, activeRouteIndex, onSelectRouteIndex]);

  // Render markers tempat makan bernomor (konsisten dengan rank badge list)
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    if (places.length === 0) return;

    places.forEach((place, index) => {
      const isSelected = selectedPlace?.id === place.id;
      const icon = createFoodIcon(index + 1, isSelected);

      const marker = L.marker([place.location.lat, place.location.lng], {
        icon,
      });

      // Sanitasi input teks untuk mencegah injeksi XSS
      const safeName = escapeHtml(place.name);
      const safeType = escapeHtml(getPlaceTypeLabel(place.type));
      const safeDistance = escapeHtml(formatDistance(place.distance_to_route_m));
      const safeDetour = escapeHtml(formatDistance(place.detour_distance_m));

      marker.bindPopup(
        `<div class="map-popup">
          <strong>${safeName}</strong>
          <span style="color: var(--text-muted); font-size: 11px;">${safeType}</span>
          <div style="margin-top: 4px; font-family: monospace; font-size: 11px; color: var(--text-muted);">
            ${safeDistance} dari rute · +${safeDetour} detour
          </div>
        </div>`,
        { className: "custom-popup" }
      );

      marker.on("click", () => onSelectPlace(place));

      markersLayerRef.current!.addLayer(marker);
    });
  }, [places, selectedPlace, onSelectPlace]);

  // Pan ke tempat yang dipilih
  useEffect(() => {
    if (!mapRef.current || !selectedPlace) return;
    mapRef.current.panTo(
      [selectedPlace.location.lat, selectedPlace.location.lng],
      { animate: true, duration: 0.5 }
    );
  }, [selectedPlace]);

  return (
    <div
      ref={mapContainerRef}
      id="map-container"
      className="w-full h-full rounded-2xl overflow-hidden"
    />
  );
}

// Helper functions
function getPlaceTypeLabel(type: string): string {
  switch (type) {
    case "makan":
      return "Tempat Makan";
    case "coffeeshop":
      return "Coffeeshop";
    case "ngopi_hemat":
      return "Ngopi Hemat";
    default:
      return "Tempat Makan";
  }
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
