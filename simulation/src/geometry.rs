use h3o::{CellIndex, LatLng, Resolution};
use nalgebra::{Vector2, Vector3};
use rand::Rng;
use std::f64::consts::PI;

// Earth's authalic radius in meters (radius of sphere with same surface acre as reference ellipsoid in WGS84)
// const AUTHALIC_RADIUS: f64 = 6_371_007.2;

// WGS84 ellipsoid parameters
const SEMI_MAJOR_AXIS: f64 = 6_378_137.0; // WGS84 semi-major axis in meters
const FLATTENING: f64 = 1.0 / 298.257223563; // WGS84 flattening
const SEMI_MINOR_AXIS: f64 = SEMI_MAJOR_AXIS * (1.0 - FLATTENING); // WGS84 semi-minor axis in meters

pub fn ecef_to_lat_lng(position: Vector3<f64>) -> LatLng {
    let lat = position[2].asin();
    let lon = position[1].atan2(position[0]);

    let lat_lng =
        LatLng::from_radians(lat, lon).expect("Failed to convert ECEF position to H3 index");
    lat_lng
}

pub fn h3_to_ecef(h3_index: CellIndex) -> Vector3<f64> {
    let lat_lng = LatLng::from(h3_index);
    let lat_rad = lat_lng.lat_radians();
    let lon_rad = lat_lng.lng_radians();

    let cos_lat = lat_rad.cos();
    let sin_lat = lat_rad.sin();
    let cos_lon = lon_rad.cos();
    let sin_lon = lon_rad.sin();

    let x = cos_lat * cos_lon;
    let y = cos_lat * sin_lon;
    let z = sin_lat;

    Vector3::new(x, y, z)
}

// Convert an ECEF position to an H3 index
pub fn ecef_to_h3(position: Vector3<f64>, resolution: Resolution) -> CellIndex {
    let lat_lng = ecef_to_lat_lng(position);
    let cell = lat_lng.to_cell(resolution);
    cell
}

pub fn ecef_to_enu(global_pos: &Vector3<f64>, enu_origin: &Vector3<f64>) -> Vector2<f64> {
    let p = (enu_origin[0].powi(2) + enu_origin[1].powi(2)).sqrt();
    let lat_rad = (enu_origin[2] / p).atan(); // Simplified, not accounting for Earth's flattening
    let lon_rad = enu_origin[1].atan2(enu_origin[0]);

    let cos_lat = lat_rad.cos();
    let sin_lat = lat_rad.sin();
    let cos_lon = lon_rad.cos();
    let sin_lon = lon_rad.sin();

    let dx = global_pos[0] - enu_origin[0];
    let dy = global_pos[1] - enu_origin[1];
    let dz = global_pos[2] - enu_origin[2];

    let east = -sin_lon * dx + cos_lon * dy;
    let north = -sin_lat * cos_lon * dx - sin_lat * sin_lon * dy + cos_lat * dz;

    Vector2::new(east, north)
}

pub fn enu_to_ecef(enu_pos: &Vector2<f64>, enu_origin: &Vector3<f64>) -> Vector3<f64> {
    let p = (enu_origin[0].powi(2) + enu_origin[1].powi(2)).sqrt();
    let lat_rad = (enu_origin[2] / p).atan(); // Simplified, not accounting for Earth's flattening
    let lon_rad = enu_origin[1].atan2(enu_origin[0]);

    let cos_lat = lat_rad.cos();
    let sin_lat = lat_rad.sin();
    let cos_lon = lon_rad.cos();
    let sin_lon = lon_rad.sin();

    let east = enu_pos[0];
    let north = enu_pos[1];

    let x = -sin_lon * east - sin_lat * cos_lon * north + cos_lon * north + enu_origin[0];
    let y = cos_lon * east - sin_lat * sin_lon * north + sin_lon * north + enu_origin[1];
    let z = cos_lat * north + enu_origin[2];

    Vector3::new(x, y, z)
}

// Clamp ECEF coordinates to the surface of the WGS84 ellipsoid
// This is an approximation only suitable for the earth's surface
pub fn clamp_ecef_to_ellipsoid(ecef_coords: &Vector3<f64>) -> Vector3<f64> {
    let p = (ecef_coords[0].powi(2) + ecef_coords[1].powi(2)).sqrt();
    let theta = (ecef_coords[2] * SEMI_MAJOR_AXIS).atan2(p * SEMI_MINOR_AXIS);
    let z_surf = SEMI_MINOR_AXIS * (theta.sin());
    let p_surf = SEMI_MAJOR_AXIS * (theta.cos());

    // Project point onto the ellipsoid surface
    let x_proj = ecef_coords[0] / p * p_surf;
    let y_proj = ecef_coords[1] / p * p_surf;
    let z_proj = ecef_coords[2] / (ecef_coords[2].abs()) * z_surf;

    Vector3::new(x_proj, y_proj, z_proj)
}

// get a random H3 index drawing from a uniform distribution over the earth's surface
pub fn random_h3_index(resolution: Resolution) -> CellIndex {
    let mut rng = rand::thread_rng();

    let u: f64 = rng.gen_range(0.0..=1.0);
    let v: f64 = rng.gen_range(0.0..=1.0);

    let theta = 2.0 * PI * u;
    let phi = (2.0 * v - 1.0).acos();

    let lat_lng =
        LatLng::from_radians(phi, theta).expect("Failed to convert ECEF position to H3 index");

    let cell = lat_lng.to_cell(resolution);

    cell
}

// Calculate the Euclidean distance between two 3D positions
pub fn euclidean_distance(position1: &Vector3<f64>, position2: &Vector3<f64>) -> f64 {
    let diff = position1 - position2;
    diff.dot(&diff).sqrt()
}
