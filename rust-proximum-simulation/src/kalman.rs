use adskalman::{ObservationModel, TransitionModelLinearNoControl};
use nalgebra::{DimMin, Vector2};

use nalgebra::{
    allocator::Allocator,
    convert,
    dimension::{U1, U2},
    DefaultAllocator, OMatrix, RealField,
};

// State update model
pub struct StationaryNode2DModel<R>
where
    R: RealField,
    DefaultAllocator: Allocator<R, U2, U2>,
    DefaultAllocator: Allocator<R, U2>,
{
    pub transition_model: OMatrix<R, U2, U2>,
    pub transition_model_transpose: OMatrix<R, U2, U2>,
    pub transition_noise_covariance: OMatrix<R, U2, U2>,
}

impl<R> StationaryNode2DModel<R>
where
    R: RealField + Copy,
{
    pub fn new(noise_scale: R) -> Self {
        let one = convert(1.0);
        let zero = convert(0.0);

        // Transition model is the identity matrix - the node does not move.
        #[rustfmt::skip]
        let transition_model = OMatrix::<R, U2, U2>::new(
            one, zero,
            zero, one,
        );

        let transition_noise_covariance = OMatrix::<R, U2, U2>::identity() * noise_scale;

        Self {
            transition_model,
            transition_model_transpose: transition_model.transpose(),
            transition_noise_covariance,
        }
    }
}

impl<R> TransitionModelLinearNoControl<R, U2> for StationaryNode2DModel<R>
where
    R: RealField,
    DefaultAllocator: Allocator<R, U2, U2>,
    DefaultAllocator: Allocator<R, U2>,
{
    fn F(&self) -> &OMatrix<R, U2, U2> {
        &self.transition_model
    }

    fn FT(&self) -> &OMatrix<R, U2, U2> {
        &self.transition_model_transpose
    }

    fn Q(&self) -> &OMatrix<R, U2, U2> {
        &self.transition_noise_covariance
    }
}

// Observation model
pub struct DistanceObservationModel<R: RealField>
where
    DefaultAllocator: Allocator<R, U2, U2>,
    DefaultAllocator: Allocator<R, U1, U2>,
    DefaultAllocator: Allocator<R, U2, U1>,
    DefaultAllocator: Allocator<R, U1, U1>,
    DefaultAllocator: Allocator<R, U2>,
{
    pub observation_matrix: OMatrix<R, U1, U2>,
    pub observation_matrix_transpose: OMatrix<R, U2, U1>,
    pub observation_noise_covariance: OMatrix<R, U1, U1>,
}

impl<R: RealField + Copy> DistanceObservationModel<R> {
    pub fn new(var: R) -> Self {
        let one = convert(1.0);

        // Create observation model. We observe the distance between nodes.
        let observation_matrix = OMatrix::<R, U1, U2>::new(one, one);

        let observation_noise_covariance = OMatrix::<R, U1, U1>::new(var);

        Self {
            observation_matrix,
            observation_matrix_transpose: observation_matrix.transpose(),
            observation_noise_covariance,
        }
    }

    // Update the observation matrix based on the current positions of the two nodes
    pub fn update_observation_matrix(&mut self, node1_pos: &Vector2<R>, node2_pos: &Vector2<R>) {
        let dx = node2_pos[0] - node1_pos[0];
        let dy = node2_pos[1] - node1_pos[1];
        let distance = (dx * dx + dy * dy).sqrt();

        let h1 = -dx / distance;
        let h2 = -dy / distance;

        self.observation_matrix = OMatrix::<R, U1, U2>::new(h1, h2);
        self.observation_matrix_transpose = self.observation_matrix.transpose();
    }
}

impl<R: RealField> ObservationModel<R, U2, U1> for DistanceObservationModel<R>
where
    DefaultAllocator: Allocator<R, U2, U2>,
    DefaultAllocator: Allocator<R, U1, U2>,
    DefaultAllocator: Allocator<R, U2, U1>,
    DefaultAllocator: Allocator<R, U1, U1>,
    DefaultAllocator: Allocator<R, U2>,
    DefaultAllocator: Allocator<R, U1>,
    DefaultAllocator: Allocator<(usize, usize), U1>,
    U1: DimMin<U1, Output = U1>,
{
    fn H(&self) -> &OMatrix<R, U1, U2> {
        &self.observation_matrix
    }

    fn HT(&self) -> &OMatrix<R, U2, U1> {
        &self.observation_matrix_transpose
    }

    fn R(&self) -> &OMatrix<R, U1, U1> {
        &self.observation_noise_covariance
    }
}
