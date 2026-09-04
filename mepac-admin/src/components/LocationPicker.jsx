import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    MapPin,
    Search,
    Crosshair,
    Layers,
    Maximize2,
    X,
    Check,
    Copy,
    Sliders,
    Navigation,
    Info,
    RotateCcw
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationPicker.css';

import iconImg from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: iconImg,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Available Tile Layers
const TILE_LAYERS = {
    street: {
        name: 'Street View',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 20
    },
    satellite: {
        name: 'Satellite HD',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 19
    },
    osm: {
        name: 'OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }
};

/* ─── Helper: Parse Coordinates from string ─────────────────────── */
function parseCoordinatesFromString(str) {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();

    // Match Google Maps @lat,lng format
    const gmapMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (gmapMatch) {
        return { lat: parseFloat(gmapMatch[1]), lng: parseFloat(gmapMatch[2]) };
    }

    // Match simple "lat, lng" or "lat lng" format
    const coordMatch = trimmed.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (coordMatch) {
        return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
    }

    return null;
}

/* ─── Reverse Geocode Utility ──────────────────────────────────── */
async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        if (!res.ok) return null;
        const data = await res.json();
        return data?.display_name || null;
    } catch {
        return null;
    }
}

/* ─── Small inline map (embedded in modal) ─────────────────────── */
function InlineMap({ lat, lng, radius = 100, onCoordinateChange, onOpenLarge }) {
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const markerRef = useRef(null);
    const circleRef = useRef(null);
    const tileLayerRef = useRef(null);

    const [activeLayer, setActiveLayer] = useState('street');
    const [resolvedAddress, setResolvedAddress] = useState('');
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [copied, setCopied] = useState(false);

    const updateTileLayer = (layerKey) => {
        if (!mapRef.current) return;
        if (tileLayerRef.current) {
            mapRef.current.removeLayer(tileLayerRef.current);
        }
        const cfg = TILE_LAYERS[layerKey] || TILE_LAYERS.street;
        tileLayerRef.current = L.tileLayer(cfg.url, {
            attribution: cfg.attribution,
            maxZoom: cfg.maxZoom
        }).addTo(mapRef.current);
        setActiveLayer(layerKey);
    };

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const defaultLat = lat || 10.850518;
        const defaultLng = lng || 76.271080;
        const defaultZoom = (lat && lng) ? 15 : 7;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false
        }).setView([defaultLat, defaultLng], defaultZoom);
        mapRef.current = map;

        // Add zoom control top-right
        L.control.zoom({ position: 'topright' }).addTo(map);

        const cfg = TILE_LAYERS.street;
        tileLayerRef.current = L.tileLayer(cfg.url, {
            attribution: cfg.attribution,
            maxZoom: cfg.maxZoom
        }).addTo(map);

        setTimeout(() => map.invalidateSize(), 150);

        if (lat && lng) {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
            circleRef.current = L.circle([lat, lng], {
                radius: radius || 100,
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '4, 4'
            }).addTo(map);

            markerRef.current.on('dragend', (e) => {
                const pos = e.target.getLatLng();
                if (circleRef.current) circleRef.current.setLatLng(pos);
                onCoordinateChange(pos.lat, pos.lng);
                lookupAddress(pos.lat, pos.lng);
            });

            lookupAddress(lat, lng);
        }

        map.on('click', (e) => {
            const { lat: cLat, lng: cLng } = e.latlng;
            placeMarker(cLat, cLng, map);
        });

        return () => {
            map.remove();
        };
    }, []);

    // Sync external lat/lng changes
    useEffect(() => {
        if (!mapRef.current || lat == null || lng == null) return;
        const map = mapRef.current;

        if (!markerRef.current) {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
            circleRef.current = L.circle([lat, lng], {
                radius: radius || 100,
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '4, 4'
            }).addTo(map);

            markerRef.current.on('dragend', (e) => {
                const pos = e.target.getLatLng();
                if (circleRef.current) circleRef.current.setLatLng(pos);
                onCoordinateChange(pos.lat, pos.lng);
                lookupAddress(pos.lat, pos.lng);
            });
        } else {
            markerRef.current.setLatLng([lat, lng]);
            if (circleRef.current) {
                circleRef.current.setLatLng([lat, lng]);
                circleRef.current.setRadius(radius || 100);
            }
        }
        map.setView([lat, lng], Math.max(map.getZoom(), 15));
        lookupAddress(lat, lng);
    }, [lat, lng, radius]);

    const lookupAddress = async (tLat, tLng) => {
        const addr = await reverseGeocode(tLat, tLng);
        if (addr) setResolvedAddress(addr);
    };

    const placeMarker = (newLat, newLng, map) => {
        if (!markerRef.current) {
            markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(map);
            circleRef.current = L.circle([newLat, newLng], {
                radius: radius || 100,
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '4, 4'
            }).addTo(map);

            markerRef.current.on('dragend', (e) => {
                const pos = e.target.getLatLng();
                if (circleRef.current) circleRef.current.setLatLng(pos);
                onCoordinateChange(pos.lat, pos.lng);
                lookupAddress(pos.lat, pos.lng);
            });
        } else {
            markerRef.current.setLatLng([newLat, newLng]);
            if (circleRef.current) circleRef.current.setLatLng([newLat, newLng]);
        }
        map.setView([newLat, newLng], Math.max(map.getZoom(), 15));
        onCoordinateChange(newLat, newLng);
        lookupAddress(newLat, newLng);
    };

    // Locate device position
    const handleLocateMe = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (mapRef.current) {
                    placeMarker(latitude, longitude, mapRef.current);
                }
            },
            (err) => {
                console.warn('Geolocation failed:', err.message);
            },
            { enableHighAccuracy: true }
        );
    };

    // Search or parse input
    useEffect(() => {
        const timer = setTimeout(() => {
            const parsed = parseCoordinatesFromString(query);
            if (parsed) {
                if (mapRef.current) placeMarker(parsed.lat, parsed.lng, mapRef.current);
                setShowDropdown(false);
                return;
            }

            if (query.trim().length >= 3) {
                searchNominatim(query.trim());
            } else {
                setSuggestions([]);
                setShowDropdown(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [query]);

    const searchNominatim = async (q) => {
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`);
            const data = await res.json();
            setSuggestions(data || []);
            setShowDropdown(true);
        } catch {
            setSuggestions([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSuggestionClick = (s) => {
        const sLat = parseFloat(s.lat);
        const sLng = parseFloat(s.lon);
        setQuery(s.display_name);
        setShowDropdown(false);
        if (mapRef.current) placeMarker(sLat, sLng, mapRef.current);
    };

    const handleCopyCoords = () => {
        if (lat == null || lng == null) return;
        navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="location-picker">
            {/* Search Bar with direct coordinate paste support */}
            <div className="location-search-container">
                <div className="search-input-wrapper">
                    <Search size={16} className="search-icon-adornment" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => { if (suggestions.length) setShowDropdown(true); }}
                        placeholder="Search landmark, address, or paste GPS coords..."
                        className="location-search-input"
                    />
                    {query && (
                        <button type="button" className="clear-search-btn" onClick={() => setQuery('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {showDropdown && (
                    <div className="location-suggestions">
                        {isSearching && <div className="suggestion-item text-muted">Searching locations...</div>}
                        {!isSearching && suggestions.length === 0 && (
                            <div className="suggestion-item text-muted">No matches found. Try entering coordinates directly.</div>
                        )}
                        {!isSearching && suggestions.map((s, i) => (
                            <div key={i} className="suggestion-item" onClick={() => handleSuggestionClick(s)}>
                                <MapPin size={13} className="suggestion-icon" />
                                <span>{s.display_name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Map Canvas with interactive controls */}
            <div className="map-wrapper-relative">
                <div ref={mapContainerRef} className="map-container" />

                {/* Layer Switcher Pill */}
                <div className="map-floating-layer-switcher">
                    <button
                        type="button"
                        className={`layer-pill ${activeLayer === 'street' ? 'active' : ''}`}
                        onClick={() => updateTileLayer('street')}
                    >
                        Street
                    </button>
                    <button
                        type="button"
                        className={`layer-pill ${activeLayer === 'satellite' ? 'active' : ''}`}
                        onClick={() => updateTileLayer('satellite')}
                    >
                        Satellite HD
                    </button>
                </div>

                {/* Quick Action Overlay Buttons */}
                <div className="map-floating-quick-actions">
                    <button
                        type="button"
                        className="map-action-btn"
                        onClick={handleLocateMe}
                        title="Pin My Current GPS Location"
                    >
                        <Crosshair size={15} />
                    </button>
                    <button
                        type="button"
                        className="map-action-btn"
                        onClick={onOpenLarge}
                        title="Expand Fullscreen Editor"
                    >
                        <Maximize2 size={15} />
                    </button>
                </div>

                {/* Geofence indicator chip */}
                {lat != null && lng != null && (
                    <div className="map-geofence-chip">
                        <span className="pulse-dot" />
                        <span>{radius || 100}m Geofence Boundary</span>
                    </div>
                )}
            </div>

            {/* Coordinates & Resolved Address Footer */}
            {lat != null && lng != null && (
                <div className="map-coords-bar">
                    <div className="coords-text-group">
                        <span className="coords-val">
                            <MapPin size={12} className="text-primary" />
                            <strong>{lat.toFixed(6)}</strong>, <strong>{lng.toFixed(6)}</strong>
                        </span>
                        {resolvedAddress && (
                            <span className="address-snippet" title={resolvedAddress}>
                                {resolvedAddress}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        className="copy-coords-btn"
                        onClick={handleCopyCoords}
                        title="Copy GPS coordinates"
                    >
                        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─── Fullscreen map overlay (portal) ──────────────────────────── */
function FullscreenMapOverlay({ lat, lng, radius = 100, onConfirm, onClose }) {
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const markerRef = useRef(null);
    const circleRef = useRef(null);
    const tileLayerRef = useRef(null);

    const [pendingLat, setPendingLat] = useState(lat || 10.850518);
    const [pendingLng, setPendingLng] = useState(lng || 76.271080);
    const [customRadius, setCustomRadius] = useState(radius || 100);
    const [activeLayer, setActiveLayer] = useState('street');
    const [resolvedAddress, setResolvedAddress] = useState('');

    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Coordinate inputs
    const [inputLat, setInputLat] = useState(lat ? lat.toFixed(6) : '');
    const [inputLng, setInputLng] = useState(lng ? lng.toFixed(6) : '');

    const updateTileLayer = (layerKey) => {
        if (!mapRef.current) return;
        if (tileLayerRef.current) {
            mapRef.current.removeLayer(tileLayerRef.current);
        }
        const cfg = TILE_LAYERS[layerKey] || TILE_LAYERS.street;
        tileLayerRef.current = L.tileLayer(cfg.url, {
            attribution: cfg.attribution,
            maxZoom: cfg.maxZoom
        }).addTo(mapRef.current);
        setActiveLayer(layerKey);
    };

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const defaultLat = pendingLat;
        const defaultLng = pendingLng;
        const defaultZoom = (lat && lng) ? 16 : 8;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false
        }).setView([defaultLat, defaultLng], defaultZoom);
        mapRef.current = map;

        L.control.zoom({ position: 'topright' }).addTo(map);

        const cfg = TILE_LAYERS.street;
        tileLayerRef.current = L.tileLayer(cfg.url, {
            attribution: cfg.attribution,
            maxZoom: cfg.maxZoom
        }).addTo(map);

        setTimeout(() => map.invalidateSize(), 150);

        if (lat && lng) {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
            circleRef.current = L.circle([lat, lng], {
                radius: customRadius,
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.18,
                weight: 2,
                dashArray: '5, 5'
            }).addTo(map);

            markerRef.current.on('dragend', (e) => {
                const pos = e.target.getLatLng();
                if (circleRef.current) circleRef.current.setLatLng(pos);
                setPendingLat(pos.lat);
                setPendingLng(pos.lng);
                setInputLat(pos.lat.toFixed(6));
                setInputLng(pos.lng.toFixed(6));
                lookupAddress(pos.lat, pos.lng);
            });

            lookupAddress(lat, lng);
        }

        map.on('click', (e) => {
            const { lat: cLat, lng: cLng } = e.latlng;
            placeMarker(cLat, cLng, map);
        });

        // Close on Escape
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);

        return () => {
            map.remove();
            window.removeEventListener('keydown', handleEsc);
        };
    }, []);

    const lookupAddress = async (tLat, tLng) => {
        const addr = await reverseGeocode(tLat, tLng);
        if (addr) setResolvedAddress(addr);
    };

    const placeMarker = (newLat, newLng, map = mapRef.current) => {
        if (!map) return;
        if (!markerRef.current) {
            markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(map);
            circleRef.current = L.circle([newLat, newLng], {
                radius: customRadius,
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.18,
                weight: 2,
                dashArray: '5, 5'
            }).addTo(map);

            markerRef.current.on('dragend', (e) => {
                const pos = e.target.getLatLng();
                if (circleRef.current) circleRef.current.setLatLng(pos);
                setPendingLat(pos.lat);
                setPendingLng(pos.lng);
                setInputLat(pos.lat.toFixed(6));
                setInputLng(pos.lng.toFixed(6));
                lookupAddress(pos.lat, pos.lng);
            });
        } else {
            markerRef.current.setLatLng([newLat, newLng]);
            if (circleRef.current) circleRef.current.setLatLng([newLat, newLng]);
        }
        map.setView([newLat, newLng], Math.max(map.getZoom(), 16));
        setPendingLat(newLat);
        setPendingLng(newLng);
        setInputLat(newLat.toFixed(6));
        setInputLng(newLng.toFixed(6));
        lookupAddress(newLat, newLng);
    };

    // Update radius
    useEffect(() => {
        if (circleRef.current) {
            circleRef.current.setRadius(customRadius);
        }
    }, [customRadius]);

    // Handle Locate Me
    const handleLocateMe = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                placeMarker(latitude, longitude);
            },
            (err) => console.warn('Locate me failed:', err.message),
            { enableHighAccuracy: true }
        );
    };

    // Search query listener
    useEffect(() => {
        const timer = setTimeout(() => {
            const parsed = parseCoordinatesFromString(query);
            if (parsed) {
                placeMarker(parsed.lat, parsed.lng);
                setShowDropdown(false);
                return;
            }

            if (query.trim().length >= 3) {
                searchNominatim(query.trim());
            } else {
                setSuggestions([]);
                setShowDropdown(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [query]);

    const searchNominatim = async (q) => {
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`);
            const data = await res.json();
            setSuggestions(data || []);
            setShowDropdown(true);
        } catch {
            setSuggestions([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSuggestionClick = (s) => {
        const sLat = parseFloat(s.lat);
        const sLng = parseFloat(s.lon);
        setQuery(s.display_name);
        setShowDropdown(false);
        placeMarker(sLat, sLng);
    };

    const handleApplyManualCoords = () => {
        const parsedLat = parseFloat(inputLat);
        const parsedLng = parseFloat(inputLng);
        if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
            placeMarker(parsedLat, parsedLng);
        }
    };

    const handleConfirm = () => {
        if (pendingLat != null && pendingLng != null) {
            onConfirm(pendingLat, pendingLng, customRadius);
        }
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fullscreen-map-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="fullscreen-map-panel">
                {/* Header */}
                <div className="fullscreen-map-header">
                    <div className="header-title-wrapper">
                        <div className="header-icon-box">
                            <MapPin size={20} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="modal-title">Interactive Project Map Editor</h3>
                            <p className="modal-subtitle">Pin site coordinates & preview geofence boundaries</p>
                        </div>
                    </div>
                    <button type="button" className="fullscreen-map-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="fullscreen-map-toolbar">
                    {/* Search bar */}
                    <div className="fullscreen-search-box">
                        <Search size={16} className="search-icon-adornment" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => { if (suggestions.length) setShowDropdown(true); }}
                            placeholder="Search landmark, address, or paste GPS coordinates..."
                            className="location-search-input"
                            autoFocus
                        />
                        {query && (
                            <button type="button" className="clear-search-btn" onClick={() => setQuery('')}>
                                <X size={14} />
                            </button>
                        )}
                        {showDropdown && (
                            <div className="location-suggestions">
                                {isSearching && <div className="suggestion-item text-muted">Searching...</div>}
                                {!isSearching && suggestions.length === 0 && (
                                    <div className="suggestion-item text-muted">No matches. You can enter lat/long directly.</div>
                                )}
                                {!isSearching && suggestions.map((s, i) => (
                                    <div key={i} className="suggestion-item" onClick={() => handleSuggestionClick(s)}>
                                        <MapPin size={13} className="suggestion-icon" />
                                        <span>{s.display_name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick GPS button */}
                    <button
                        type="button"
                        className="toolbar-btn locate-btn"
                        onClick={handleLocateMe}
                        title="Locate Current Position"
                    >
                        <Crosshair size={16} />
                        <span>Locate Me</span>
                    </button>

                    {/* Layer Switcher */}
                    <div className="toolbar-layer-switcher">
                        <button
                            type="button"
                            className={`layer-toggle-btn ${activeLayer === 'street' ? 'active' : ''}`}
                            onClick={() => updateTileLayer('street')}
                        >
                            Street
                        </button>
                        <button
                            type="button"
                            className={`layer-toggle-btn ${activeLayer === 'satellite' ? 'active' : ''}`}
                            onClick={() => updateTileLayer('satellite')}
                        >
                            Satellite HD
                        </button>
                        <button
                            type="button"
                            className={`layer-toggle-btn ${activeLayer === 'osm' ? 'active' : ''}`}
                            onClick={() => updateTileLayer('osm')}
                        >
                            OSM
                        </button>
                    </div>
                </div>

                {/* Map Body */}
                <div className="fullscreen-map-content-area">
                    <div ref={mapContainerRef} className="fullscreen-map-body" />

                    {/* Geofence Radius Slider Card (Floating overlay) */}
                    <div className="floating-radius-card">
                        <div className="radius-card-header">
                            <span className="radius-label">
                                <Sliders size={13} />
                                <span>Geofence Radius:</span>
                            </span>
                            <span className="radius-val">{customRadius}m</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="1000"
                            step="25"
                            value={customRadius}
                            onChange={(e) => setCustomRadius(parseInt(e.target.value) || 100)}
                            className="radius-range-slider"
                        />
                        <div className="radius-presets">
                            {[50, 100, 200, 500].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    className={`preset-btn ${customRadius === preset ? 'active' : ''}`}
                                    onClick={() => setCustomRadius(preset)}
                                >
                                    {preset}m
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Coordinate Inputs & Info Footer */}
                <div className="fullscreen-map-bottom-bar">
                    <div className="coords-inputs-group">
                        <div className="coord-field">
                            <label>Latitude</label>
                            <input
                                type="number"
                                step="0.000001"
                                value={inputLat}
                                onChange={(e) => setInputLat(e.target.value)}
                                placeholder="10.850518"
                            />
                        </div>
                        <div className="coord-field">
                            <label>Longitude</label>
                            <input
                                type="number"
                                step="0.000001"
                                value={inputLng}
                                onChange={(e) => setInputLng(e.target.value)}
                                placeholder="76.271080"
                            />
                        </div>
                        <button
                            type="button"
                            className="btn-apply-coords"
                            onClick={handleApplyManualCoords}
                        >
                            Set Pin
                        </button>
                    </div>

                    {resolvedAddress && (
                        <div className="resolved-address-box">
                            <span className="resolved-label">Resolved Address:</span>
                            <span className="resolved-text" title={resolvedAddress}>{resolvedAddress}</span>
                        </div>
                    )}

                    <div className="fullscreen-map-actions">
                        <button type="button" className="btn secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn primary"
                            onClick={handleConfirm}
                            disabled={pendingLat == null || pendingLng == null}
                        >
                            <Check size={16} />
                            <span>Confirm Location ({pendingLat?.toFixed(4)}, {pendingLng?.toFixed(4)})</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

/* ─── Main LocationPicker export ───────────────────────────────── */
export default function LocationPicker({ lat, lng, radius = 100, onChange }) {
    const [showFullscreen, setShowFullscreen] = useState(false);

    const handleCoordinateChange = useCallback((newLat, newLng) => {
        onChange(newLat, newLng);
    }, [onChange]);

    const handleFullscreenConfirm = useCallback((newLat, newLng, newRadius) => {
        onChange(newLat, newLng, newRadius);
    }, [onChange]);

    return (
        <div className="location-picker-root">
            <InlineMap
                lat={lat}
                lng={lng}
                radius={radius}
                onCoordinateChange={handleCoordinateChange}
                onOpenLarge={() => setShowFullscreen(true)}
            />

            <div className="location-picker-controls">
                <button
                    type="button"
                    className="map-enlarge-btn"
                    onClick={() => setShowFullscreen(true)}
                >
                    <Maximize2 size={13} />
                    <span>Expand High-Resolution Map Editor</span>
                </button>
            </div>

            {showFullscreen && (
                <FullscreenMapOverlay
                    lat={lat}
                    lng={lng}
                    radius={radius}
                    onConfirm={handleFullscreenConfirm}
                    onClose={() => setShowFullscreen(false)}
                />
            )}
        </div>
    );
}
