use h3o::{CellIndex, LatLng, Resolution};
use rand::Rng;
use std::f64::consts::PI;
extern crate nav_types;
use log::{info, trace};
use nav_types::{ECEF, ENU, WGS84};
use rand::thread_rng;
use rand_distr::Distribution;
use rand_distr::Normal;

pub fn h3_to_ecef(h3_index: CellIndex) -> ECEF<f64> {
    let lat_lng = LatLng::from(h3_index);

    let position: ECEF<f64> =
        WGS84::from_radians_and_meters(lat_lng.lat_radians(), lat_lng.lng_radians(), 0.0).into();
    position
}

// Convert an ECEF position to an H3 index
pub fn ecef_to_h3(position: ECEF<f64>, resolution: Resolution) -> CellIndex {
    let wgs84 = WGS84::from(position);
    trace!("ecef_position: {:#?}, wgs84 latlng: {:#?}", position, wgs84);
    let lat_lng = LatLng::from_radians(wgs84.latitude_radians(), wgs84.longitude_radians())
        .expect("invalid position");
    let cell = lat_lng.to_cell(resolution);
    cell
}

// Clamp ECEF coordinates to the surface of the WGS84 ellipsoid
// This is an approximation only suitable for the earth's surface
// TODO: simplify? Should this be a constraint within the state / meas model?
// pub fn clamp_ecef_to_ellipsoid(ecef_coords: ECEF<f64>) -> ECEF<f64> {
//     let lat_lng = WGS84::from(ecef_coords);
//     let lat_lng_clamped = WGS84::from_radians_and_meters(
//         lat_lng.latitude_radians(),
//         lat_lng.longitude_radians(),
//         0.0,
//     );
//     lat_lng_clamped.into()
// }

// get a random H3 index drawing from a uniform distribution over the earth's surface
pub fn uniform_h3_index(resolution: Resolution) -> CellIndex {
    let mut rng = rand::thread_rng();
    let u: f64 = rng.gen_range(0.0..=1.0);
    let v: f64 = rng.gen_range(0.0..=1.0);

    let theta = 2.0 * PI * u;
    let phi = (2.0 * v - 1.0).asin();

    let lat = phi;
    let lng = theta;

    let lat_lng =
        LatLng::from_radians(lat, lng).expect("Failed to convert ECEF position to H3 index");
    let cell = lat_lng.to_cell(resolution);
    cell
}

pub fn normal_neighbor_index(mean: CellIndex, variance: f64, resolution: Resolution) -> CellIndex {
    let mean_lat_lng = LatLng::from(mean);

    let mean_ecef: ECEF<f64> =
        WGS84::from_radians_and_meters(mean_lat_lng.lat_radians(), mean_lat_lng.lng_radians(), 0.0)
            .into();

    let diff_enu = en_gaussian_sample(ENU::new(0.0, 0.0, 0.0), variance.sqrt());

    let neighbor_ecef = mean_ecef + diff_enu;

    ecef_to_h3(neighbor_ecef, resolution)
}

// draw a point from a 2D Gaussian distribution
fn en_gaussian_sample(mean: ENU<f64>, sigma: f64) -> ENU<f64> {
    let mut rng = thread_rng();
    let normal_dist = Normal::new(0.0, sigma).expect("could not create normal distribution");

    let x = normal_dist.sample(&mut rng);
    let y = normal_dist.sample(&mut rng);

    ENU::new(mean.east() + x, mean.north() + y, 0.0)
}
