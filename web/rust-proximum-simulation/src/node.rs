use crate::geometry::{ecef_to_h3, h3_to_ecef};
extern crate nav_types;
use crate::kalman::{normalize_state, SS, STATE_FACTOR};
use crate::types::Node;
use adskalman::StateAndCovariance;
use h3o::{CellIndex, Resolution};
use log::trace;
use nalgebra::{Const, Matrix3, OMatrix, OVector, Vector3};
use nav_types::{ECEF, WGS84};

// Track each node in the network
impl Node {
    pub fn new(
        id: usize,
        true_index: CellIndex,
        asserted_index: CellIndex,
        true_beta: f64,
        true_tau: f64,
        kf_model_position_variance: f64,
        kf_model_beta: f64,
        kf_model_beta_variance: f64,
        kf_model_tau: f64,
        kf_model_tau_variance: f64,
    ) -> Self {
        let true_position = h3_to_ecef(true_index);
        let asserted_position = h3_to_ecef(asserted_index);

        // start with the asserted position and generic channel speed & latency parameters as a reasonable guess
        let state = OVector::<f64, SS>::new(
            asserted_position.x(),
            asserted_position.y(),
            asserted_position.z(),
            kf_model_beta,
            kf_model_tau,
        )
        // convert normalized real units into internal units
        .component_div(&STATE_FACTOR);

        // let covariance = OMatrix::<f64, SS, SS>::from_diagonal(&state_covariance_diagonal);
        let covariance = OMatrix::<f64, SS, SS>::identity() * 1.0;

        trace!("id: {}, beta: {}, tau: {}, kf_model_position_variance: {}, kf_model_beta: {}, kf_model_beta_variance: {}, kf_model_tau: {}, kf_model_tau_variance: {}",
        id,
        true_beta,
        true_tau,
        kf_model_position_variance,
        kf_model_beta,
        kf_model_beta_variance,
        kf_model_tau,
        kf_model_tau_variance,
      );

        trace!(
            "Initial state: {:#?}, initial state covariance: {:#?}",
            state,
            covariance
        );

        // Note that we initialize the estimated position with the asserted position!

        Node {
            id,
            // true locations
            true_index,
            true_position,
            true_wgs84: WGS84::from(true_position),
            true_beta,
            true_tau,
            // asserted locations
            asserted_index,
            asserted_position,
            asserted_wgs84: WGS84::from(asserted_position),
            // least-squares estimates
            ls_estimated_index: asserted_index,
            ls_estimated_position: asserted_position,
            ls_estimated_wgs84: WGS84::from(asserted_position),
            // kalman filter estimates
            kf_estimated_index: asserted_index,
            kf_estimated_position: asserted_position,
            kf_estimated_wgs84: WGS84::from(asserted_position),
            kf_estimated_beta: kf_model_beta,
            kf_estimated_tau: kf_model_tau,
            kf_en_variance_semimajor_axis: OVector::<f64, Const<2>>::zeros(),
            kf_en_variance_semimajor_axis_length: 0.0,
            kf_en_variance_semiminor_axis_length: 0.0,
            kf_state_and_covariance: StateAndCovariance::new(state, covariance),
        }
    }

    pub fn log_ls_estimated_positions(&mut self) {
        let position = self.ls_estimated_position;
        self.ls_estimated_wgs84 = WGS84::from(position);
        self.ls_estimated_index = ecef_to_h3(position, Resolution::try_from(10).unwrap())
    }

    pub fn log_kf_estimated_positions(&mut self) {
        let state = normalize_state(self.kf_state_and_covariance.state());

        // update positions in various reference frames
        let kf_estimated_position = ECEF::new(state.x, state.y, state.z);
        self.kf_estimated_position = kf_estimated_position;
        self.kf_estimated_beta = state[3];
        self.kf_estimated_tau = state[4];
        self.kf_estimated_wgs84 = WGS84::from(kf_estimated_position);
        // TODO: find source of NaNs eg with an ECEF of     [0.19173311262112122, -0.6806804671657253,-0.6952455384399419],
        self.kf_estimated_index =
            ecef_to_h3(kf_estimated_position, Resolution::try_from(10).unwrap());
        // get the variance in ECEF coordinates and project eigenvectors/values onto EN coordinates to plot confidence ellipse.
        let ecef_covariance = self
            .kf_state_and_covariance
            .covariance()
            .view((0, 0), (3, 3))
            * (STATE_FACTOR[0]);

        trace!("Covariance: {:#?}", ecef_covariance);
        let eigendecomposition = ecef_covariance.symmetric_eigen();
        let eigenvectors = eigendecomposition.eigenvectors;
        let eigenvalues = eigendecomposition.eigenvalues;

        // TODO: sort eigenvalues, fix issue returning zeros
        // TODO: surely there is some way to do this transformation in nav_types?

        let lat = self.kf_estimated_wgs84.latitude_radians();
        let lon = self.kf_estimated_wgs84.longitude_radians();

        // Calculate sine and cosine of latitude and longitude
        let sin_lat = lat.sin();
        let cos_lat = lat.cos();
        let sin_lon = lon.sin();
        let cos_lon = lon.cos();

        // Construct the ENU transformation matrix
        let ecef_to_enu_matrix = Matrix3::new(
            -sin_lon,
            cos_lon,
            0.0,
            -sin_lat * cos_lon,
            -sin_lat * sin_lon,
            cos_lat,
            cos_lat * cos_lon,
            cos_lat * sin_lon,
            sin_lat,
        );

        let enu_eigenvectors = ecef_to_enu_matrix * eigenvectors;

        let en_semimajor_axis_projection =
            Vector3::new(enu_eigenvectors[(0, 0)], enu_eigenvectors[(1, 0)], 0.0);

        let en_semiminor_axis_projection =
            Vector3::new(enu_eigenvectors[(0, 1)], enu_eigenvectors[(1, 1)], 0.0);

        let en_semimajor_length_projection = (en_semimajor_axis_projection[0].powi(2)
            + en_semimajor_axis_projection[1].powi(2))
        .sqrt()
            * eigenvalues[0].sqrt();

        let en_semiminor_length_projection = (en_semiminor_axis_projection[0].powi(2)
            + en_semiminor_axis_projection[1].powi(2))
        .sqrt()
            * eigenvalues[1].sqrt();

        // Project the ENU eigenvectors onto the East-North plane
        self.kf_en_variance_semimajor_axis =
            OVector::<f64, Const<2>>::new(enu_eigenvectors[(0, 0)], enu_eigenvectors[(1, 0)]);

        self.kf_en_variance_semimajor_axis_length = en_semimajor_length_projection;
        self.kf_en_variance_semiminor_axis_length = en_semiminor_length_projection;
    }
}
