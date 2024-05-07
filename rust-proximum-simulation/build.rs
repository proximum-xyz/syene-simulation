fn main() {
    // the number of nodes with positions estimated by Kalman filter state
    let n_nodes = 10;
    // The number of distance measurements between nodes per Kalman filter observation
    let n_measurements = 10;

    println!("cargo:rustc-cfg=n_nodes=\"{}\"", n_nodes);
    println!("cargo:rustc-cfg=n_measurements=\"{}\"", n_measurements);
}
