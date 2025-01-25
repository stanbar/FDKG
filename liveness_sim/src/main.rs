use indicatif::{ProgressBar, ProgressStyle};
use rand::Rng;
use rayon::prelude::*;
use std::error::Error;
use std::fs::File;
use std::io::Write;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

#[derive(Debug, Clone, Copy)]
enum NetworkModel {
    BarabasiAlbert,
    RandomGraph,
}

struct Config {
    nodes: usize,
    guardians: usize,
    threshold: usize,
    fdkg_pct: f64,
    tallier_ret_pct: f64,
    tallier_new_pct: f64,
}

struct ExperimentResult {
    nodes: usize,
    guardians: usize,
    threshold: usize,
    fdkg_percentage: f64,
    tallier_ret_pct: f64,
    tallier_new_pct: f64,
    success_rate: f64,
}

struct NetworkSimulation {
    number_of_nodes: usize,
    number_of_guardians: usize,
    threshold: usize,
    network_model: NetworkModel,

    fdkg_array: Vec<bool>,
    talliers_array: Vec<bool>,
    adjacency_list: Vec<Vec<usize>>,
    degrees: Vec<usize>,
}

fn main() -> Result<(), Box<dyn Error>> {
    let node_ranges = [10, 100, 1_000, 10_000, 100_000];

    // Example parameter sets
    // let guardian_ranges = [1, 2, 3, 4, 5, 6, 7, 8];
    let fdkg_percentages = [0.2, 0.4, 0.6, 0.8, 1.0];
    let tallier_returning_percentages = [0.5, 0.7, 0.9, 1.0];
    let tallier_new_percentages = [0.0]; 

    let network_model = NetworkModel::BarabasiAlbert;
    let iterations_per_config = 1000;

    let mut results = Vec::new();

    for &nodes in &node_ranges {
        println!("Starting simulations for {} nodes...", nodes);

        let mut configurations = Vec::new();
        for guardians in 1..=std::cmp::min(nodes-1, 100) {
            for threshold in 1..=guardians {
            for &fdkg_pct in &fdkg_percentages {
                for &tallier_ret_pct in &tallier_returning_percentages {
                for &tallier_new_pct in &tallier_new_percentages {
                    configurations.push(Config {
                    nodes,
                    guardians,
                    threshold,
                    fdkg_pct,
                    tallier_ret_pct,
                    tallier_new_pct,
                    });
                }
                }
            }
            }
        }

        // Set up a progress bar for all configs * iterations
        let total_work = configurations.len() * iterations_per_config;
        let pb = ProgressBar::new(total_work as u64);
        pb.set_style(ProgressStyle::with_template(
            "[{elapsed_precise}] [{bar:40.cyan/blue}] {pos:>7}/{len:7} ({percent}%) ETA: {eta_precise}"
        ).unwrap());

        let progress_count = Arc::new(AtomicUsize::new(0));

        // Process configurations in parallel
        let chunk_results: Vec<ExperimentResult> = configurations
            .par_iter()
            .map(|config| {
                let success_count: usize = (0..iterations_per_config)
                    .into_par_iter()
                    .map(|_| {
                        let mut simulation = NetworkSimulation::new(
                            config.nodes,
                            config.guardians,
                            config.threshold,
                            network_model,
                        );
                        simulation.select_fdkg_set(config.fdkg_pct);
                        simulation.select_talliers_set(config.tallier_ret_pct, config.tallier_new_pct);
                        let res = if simulation.check_decipherability() { 1 } else { 0 };

                        // Increment progress
                        progress_count.fetch_add(1, Ordering::Relaxed);
                        pb.inc(1);

                        res
                    })
                    .sum();

                ExperimentResult {
                    nodes: config.nodes,
                    guardians: config.guardians,
                    threshold: config.threshold,
                    fdkg_percentage: config.fdkg_pct,
                    tallier_ret_pct: config.tallier_ret_pct,
                    tallier_new_pct: config.tallier_new_pct,
                    success_rate: success_count as f64 / iterations_per_config as f64,
                }
            })
            .collect();

        pb.finish_with_message("Done!");

        results.extend(chunk_results);

        let network_model_name = match network_model {
            NetworkModel::BarabasiAlbert => "BarabasiAlbert",
            NetworkModel::RandomGraph => "RandomGraph",
        };
        let intermediate_file_name = format!("full_simulation_results_nodes_{}_{}.csv", network_model_name, nodes);
        let mut file = File::create(&intermediate_file_name)?;
        writeln!(file, "nodes,guardians,threshold,fdkgPercentage,tallierRetPct,tallierNewPct,successRate")?;
        for r in &results {
            writeln!(
                file,
                "{},{},{},{},{},{},{}",
                r.nodes,
                r.guardians,
                r.threshold,
                r.fdkg_percentage,
                r.tallier_ret_pct,
                r.tallier_new_pct,
                r.success_rate
            )?;
        }

        println!("Intermediate results saved to {}", intermediate_file_name);
    }

    Ok(())
}

impl NetworkSimulation {
    fn new(
        number_of_nodes: usize,
        number_of_guardians: usize,
        threshold: usize,
        network_model: NetworkModel,
    ) -> Self {
        let fdkg_array = vec![false; number_of_nodes];
        let talliers_array = vec![false; number_of_nodes];

        let (adjacency_list, degrees) = match network_model {
            NetworkModel::BarabasiAlbert => generate_barabasi_albert_graph(number_of_nodes, number_of_guardians),
            NetworkModel::RandomGraph => generate_random_graph(number_of_nodes, number_of_guardians),
        };

        NetworkSimulation {
            number_of_nodes,
            number_of_guardians,
            threshold,
            network_model,
            fdkg_array,
            talliers_array,
            adjacency_list,
            degrees,
        }
    }

    fn check_decipherability(&self) -> bool {
        let threshold = self.threshold;
        if threshold == 0 {
            return false;
        }

        for node_id in 0..self.number_of_nodes {
            if !self.fdkg_array[node_id] {
                continue;
            }
            if self.talliers_array[node_id] {
                // Already a tallier, no need for guardians
                continue;
            }

            let guardians = &self.adjacency_list[node_id];
            let mut participating_count = 0;
            for &guardian_id in guardians {
                if self.talliers_array[guardian_id] {
                    participating_count += 1;
                    if participating_count >= threshold {
                        break;
                    }
                }
            }

            if participating_count < threshold {
                return false;
            }
        }

        true
    }

    fn select_fdkg_set(&mut self, fdkg_pct: f64) {
        let size = (self.degrees.len() as f64 * fdkg_pct).floor() as usize;
        let new_fdkg_set = select_nodes_by_degree(&self.degrees, size);
        self.fdkg_array.fill(false);
        for &node_id in &new_fdkg_set {
            self.fdkg_array[node_id] = true;
        }
    }

    fn select_talliers_set(&mut self, ret_pct: f64, new_pct: f64) {
        let mut fdkg_indices = Vec::with_capacity(self.fdkg_array.len());
        let mut non_fdkg_indices = Vec::with_capacity(self.fdkg_array.len());

        for (i, &is_fdkg) in self.fdkg_array.iter().enumerate() {
            if is_fdkg {
                fdkg_indices.push(i);
            } else {
                non_fdkg_indices.push(i);
            }
        }

        let ret_size = (fdkg_indices.len() as f64 * ret_pct).floor() as usize;
        let talliers_from_fdkg_set = select_nodes_by_degree_subset(&fdkg_indices, &self.degrees, ret_size);

        let new_size = (non_fdkg_indices.len() as f64 * new_pct).floor() as usize;
        let talliers_from_non_fdkg_set = select_nodes_by_degree_subset(&non_fdkg_indices, &self.degrees, new_size);

        self.talliers_array.fill(false);
        for &id in &talliers_from_fdkg_set {
            self.talliers_array[id] = true;
        }
        for &id in &talliers_from_non_fdkg_set {
            self.talliers_array[id] = true;
        }
    }
}

fn generate_barabasi_albert_graph(
    number_of_nodes: usize,
    number_of_guardians: usize,
) -> (Vec<Vec<usize>>, Vec<usize>) {
    let mut edges: Vec<(usize, usize)> = Vec::with_capacity(number_of_nodes * number_of_guardians);
    let mut degrees = vec![0; number_of_nodes];
    let mut degree_list = Vec::with_capacity(2 * number_of_nodes * number_of_guardians);
    let mut rng = rand::thread_rng();

    // Initial fully connected subnetwork
    if number_of_guardians == 1 && number_of_nodes > 1 {
        // Connect the single guardian to node 1
        let i = 0;
        let j = 1;
        edges.push((i, j));
        edges.push((j, i));
        degrees[i] += 1;
        degrees[j] += 1;
        degree_list.push(i);
        degree_list.push(j);
    } else {
        for i in 0..number_of_guardians {
            for j in 0..number_of_guardians {
                if i != j {
                    edges.push((i, j));
                    degrees[i] += 1;
                    degrees[j] += 1;
                    degree_list.push(i);
                    degree_list.push(j);
                }
            }
        }
    }

    // Add new nodes
    for new_node in number_of_guardians..number_of_nodes {
        let mut targets = std::collections::HashSet::with_capacity(number_of_guardians);
        while targets.len() < number_of_guardians {
            let random_index = rng.gen_range(0..degree_list.len());
            let target_node = degree_list[random_index];
            if target_node != new_node && !targets.contains(&target_node) {
                targets.insert(target_node);
                edges.push((new_node, target_node));
                degrees[new_node] += 1;
                degrees[target_node] += 1;
                degree_list.push(new_node);
                degree_list.push(target_node);
            }
        }
    }

    let adjacency_list = build_adjacency_list(&edges, number_of_nodes);
    (adjacency_list, degrees)
}

fn generate_random_graph(
    number_of_nodes: usize,
    number_of_guardians: usize,
) -> (Vec<Vec<usize>>, Vec<usize>) {
    let mut edges: Vec<(usize, usize)> = Vec::with_capacity(number_of_nodes * number_of_guardians * 2);
    let mut degrees = vec![0; number_of_nodes];
    let mut rng = rand::thread_rng();

    for i in 0..number_of_nodes {
        let mut connections = std::collections::HashSet::with_capacity(number_of_guardians);
        while connections.len() < number_of_guardians {
            let j = rng.gen_range(0..number_of_nodes);
            if j != i && !connections.contains(&j) {
                connections.insert(j);
                edges.push((i, j));
                edges.push((j, i));
                degrees[i] += 1;
                degrees[j] += 1;
            }
        }
    }

    let adjacency_list = build_adjacency_list(&edges, number_of_nodes);
    (adjacency_list, degrees)
}

fn build_adjacency_list(edges: &[(usize, usize)], number_of_nodes: usize) -> Vec<Vec<usize>> {
    let mut adjacency_list: Vec<Vec<usize>> = vec![Vec::new(); number_of_nodes];
    for &(source, target) in edges {
        adjacency_list[source].push(target);
    }
    adjacency_list
}

fn select_nodes_by_degree(degrees: &[usize], number_of_nodes_to_select: usize) -> Vec<usize> {
    if number_of_nodes_to_select == 0 {
        return Vec::new();
    }
    let (cumulative_degrees, total_degree) = build_cumulative_degrees(degrees);
    let mut rng = rand::thread_rng();
    let mut selected_nodes = std::collections::HashSet::with_capacity(number_of_nodes_to_select);

    while selected_nodes.len() < number_of_nodes_to_select {
        let rand_val = rng.gen_range(0..total_degree);
        let selected_node = binary_search_cumulative(&cumulative_degrees, rand_val);
        selected_nodes.insert(selected_node);
    }

    selected_nodes.into_iter().collect()
}

fn select_nodes_by_degree_subset(
    subset_indices: &[usize],
    degrees: &[usize],
    number_of_nodes_to_select: usize,
) -> Vec<usize> {
    if number_of_nodes_to_select == 0 {
        return Vec::new();
    }

    let mut total_degree = 0;
    let mut cumulative = Vec::with_capacity(subset_indices.len());
    for &idx in subset_indices {
        total_degree += degrees[idx];
        cumulative.push(total_degree);
    }

    let mut rng = rand::thread_rng();
    let mut selected = std::collections::HashSet::with_capacity(number_of_nodes_to_select);
    while selected.len() < number_of_nodes_to_select {
        let rand_val = rng.gen_range(0..total_degree);
        let local_selected = binary_search_cumulative(&cumulative, rand_val);
        let global_node = subset_indices[local_selected];
        selected.insert(global_node);
    }

    selected.into_iter().collect()
}

fn build_cumulative_degrees(degrees: &[usize]) -> (Vec<usize>, usize) {
    let mut total_degree = 0;
    let mut cumulative_degrees = Vec::with_capacity(degrees.len());
    for &d in degrees {
        total_degree += d;
        cumulative_degrees.push(total_degree);
    }
    (cumulative_degrees, total_degree)
}

fn binary_search_cumulative(cumulative_degrees: &[usize], val: usize) -> usize {
    let mut left = 0;
    let mut right = cumulative_degrees.len() - 1;
    while left < right {
        let mid = (left + right) / 2;
        if cumulative_degrees[mid] > val {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    left
}
