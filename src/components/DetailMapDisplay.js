import React, { useMemo } from "react";
import { GoogleMap, useJsApiLoader, Polygon } from "@react-google-maps/api";

const libraries = ["drawing", "places", "geometry"];

// Simple map component for displaying polygon in detail/modal views
const DetailMapDisplay = ({ geometry, status, height = "250px" }) => {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
        libraries: libraries,
    });

    // Convert GeoJSON to Google Maps paths
    const paths = useMemo(() => {
        if (!geometry || !geometry.coordinates || !geometry.coordinates.length || !geometry.coordinates[0]) {
            return [];
        }
        return geometry.coordinates[0]
            .filter(coord => Array.isArray(coord) && coord.length >= 2 && !isNaN(coord[0]) && !isNaN(coord[1]))
            .map(coord => ({
                lat: Number(coord[1]),
                lng: Number(coord[0])
            }));
    }, [geometry]);

    // Calculate center for initial view
    const center = useMemo(() => {
        if (!paths || paths.length === 0) return { lat: 0, lng: 0 };
        return paths.reduce((acc, point) => ({
            lat: acc.lat + point.lat / paths.length,
            lng: acc.lng + point.lng / paths.length,
        }), { lat: 0, lng: 0 });
    }, [paths]);

    if (!isLoaded || !geometry) {
        return (
            <div
                style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}
                className="text-muted"
            >
                {!geometry ? "Lokasi tidak tersedia" : "Memuat peta..."}
            </div>
        );
    }

    // Determine color based on status
    const getColor = () => {
        if (status === "Dimiliki/Dikuasai") return "#28a745";
        if (status === "Tidak Dimiliki/Tidak Dikuasai" || status === "TIdak Dimiliki/Dikuasai") return "#dc3545";
        return "#ffc107";
    };

    const onMapLoad = (map) => {
        const bounds = new window.google.maps.LatLngBounds();
        paths.forEach(point => {
            if (point && typeof point.lat === 'number' && typeof point.lng === 'number' && !isNaN(point.lat) && !isNaN(point.lng)) {
                bounds.extend(point);
            }
        });
        if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 20 });
        }
    };

    return (
        <GoogleMap
            mapContainerStyle={{ height, width: "100%" }}
            center={center}
            zoom={14}
            onLoad={onMapLoad}
            options={{
                mapTypeControl: true,
                mapTypeControlOptions: {
                    position: window.google?.maps?.ControlPosition?.TOP_RIGHT,
                    mapTypeIds: ['roadmap', 'satellite'],
                },
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: true,
            }}
        >
            <Polygon
                paths={paths}
                options={{
                    fillColor: getColor(),
                    fillOpacity: 0.6,
                    strokeColor: getColor(),
                    strokeWeight: 2,
                    strokeOpacity: 1,
                }}
            />
        </GoogleMap>
    );
};

export default DetailMapDisplay;
