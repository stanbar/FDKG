pub mod multithreaded;
pub mod single;

use ff::{Field, PrimeField};
use lazy_static::lazy_static;
use num_bigint::{BigInt, RandBigInt};
use std::io::prelude::*;
use std::{
    fs::{File, OpenOptions},
    str::FromStr,
    time::Instant,
};

use babyjubjub_rs::{Fr, Point, PointProjective};

lazy_static! {
    static ref B8: Point = Point {
        x: Fr::from_str(
            "5299619240641551281634865583518297030282874472190772894086521144482721001553",
        )
        .unwrap(),
        y: Fr::from_str(
            "16950150798460657717958625567821834550301663161624707787222815936182638968203",
        )
        .unwrap(),
    };
    static ref SNARK_FIELD_SIZE: BigInt = BigInt::from_str(
        "21888242871839275222246405745257275088548364400416034343698204186575808495617",
    )
    .unwrap();
}
const MULTI_THREADING: bool = true;

pub fn main() {
    let mut file = OpenOptions::new()
        .write(true)
        .append(true)
        .create(true)
        .open("results.csv")
        .unwrap();

    if let Err(e) = writeln!(file, "Voters,Options,Time") {
        eprintln!("Couldn't write to file: {}", e);
    }

    let sk = babyjubjub_rs::new_key();
    let pk = sk.public();

    for options in 6..=10 {
        for voters in (10..(3000u32.wrapping_div(options as u32 * options as u32))).step_by(10) {
            encrypt_decrypt(options, voters, &pk, &sk, &file);
        }
    }
}

pub fn encrypt_decrypt(
    options: usize,
    voters: u32,
    pk: &Point,
    sk: &babyjubjub_rs::PrivateKey,
    file: &File,
) {
    let mut c1s = vec![];
    let mut c2s = vec![];
    let mut casts = vec![0u128; options as usize];
    let mut rng = rand::thread_rng();
    for i in 0usize..(voters as usize) {
        let index = i % options;
        let current = casts[index];
        casts[index] = current + 1;

        let r = rng.gen_bigint(32);
        let (c1, c2) = encrypt_ballot(pk, index as u32, &r, voters);
        c1s.push(c1);
        c2s.push(c2);
    }

    // reduce c1s and c2s by applying add_point function
    let mut c1 = c1s[0].clone();
    let mut c2 = c2s[0].clone();
    for i in 1..c1s.len() {
        c1 = add_point(&c1, &c1s[i]);
        c2 = add_point(&c2, &c2s[i]);
    }
    let c1r = mul_base_escalar(&c1.affine(), &sk.scalar_key());
    let ecrypted_casts = decrypt_results(&c1r, &c2, voters, options as u128, file);
    assert_eq!(casts, ecrypted_casts);
}

pub fn encrypt_ballot(
    voting_pub_key: &Point,
    cast: u32,
    r: &BigInt,
    voters: u32,
) -> (PointProjective, PointProjective) {
    let c1 = mul_base_escalar(&B8, r);
    let c2 = encode_ballot_cast(voting_pub_key, cast, r, voters);

    (c1.projective(), c2)
}

fn add_point(point1: &PointProjective, point2: &PointProjective) -> PointProjective {
    point1.add(point2)
}

pub fn find_m_bits(voters: u32) -> u32 {
    let n = voters;
    let mut m: u32 = 0;
    let mut val: u32 = 1;
    while val <= n {
        val *= 2;
        m += 1;
    }
    m
}

fn mul_base_escalar(point: &Point, x: &BigInt) -> Point {
    point.mul_scalar(x)
}

pub fn encode_ballot_cast(
    voting_pub_key: &Point,
    cast: u32,
    r: &BigInt,
    voters: u32,
) -> PointProjective {
    let m_bits = find_m_bits(voters);

    let exponent = BigInt::from(cast) * BigInt::from(m_bits);
    let message = BigInt::from(2u8).modpow(&BigInt::from(exponent), &SNARK_FIELD_SIZE);

    let m_g = mul_base_escalar(&B8, &message);
    let r_p = mul_base_escalar(voting_pub_key, r);
    let c2 = add_point(&m_g.projective(), &r_p.projective());
    c2
}

fn decrypt_results(
    c1r: &Point,
    c2: &PointProjective,
    voters: u32,
    options: u128,
    file: &File,
) -> Vec<u128> {
    let mut x_neg = c1r.x.clone();
    x_neg.negate();

    let m_g = add_point(
        c2,
        &Point {
            x: x_neg,
            y: c1r.y.clone(),
        }
        .projective(),
    );
    exhaustive_search(m_g, voters, options, file)
}

fn exhaustive_search(
    m: PointProjective, // Assuming BabyJubPoint is defined
    voters: u32,
    options: u128,
    mut file: &File,
) -> Vec<u128> {
    let m_bits = find_m_bits(voters);
    let option_bases: Vec<u128> = (0..options as u32)
        .map(|idx| {
            // let exponent = BigInt::from(idx) * m_bits;
            let exponent = idx * m_bits;
            let exped = 2u128.checked_pow(exponent).unwrap();
            exped
        })
        .collect();

    let start = Instant::now();

    let result = if MULTI_THREADING {
        match options {
            2 => multithreaded::base_search2_mul(m, voters, &option_bases),
            3 => multithreaded::base_search3_mul(m, voters, &option_bases),
            4 => multithreaded::base_search4_mul(m, voters, &option_bases),
            5 => multithreaded::base_search5_mul(m, voters, &option_bases),
            6 => multithreaded::base_search6_mul(m, voters, &option_bases),
            7 => multithreaded::base_search7_mul(m, voters, &option_bases),
            8 => multithreaded::base_search8_mul(m, voters, &option_bases),
            9 => multithreaded::base_search9_mul(m, voters, &option_bases),
            10 => multithreaded::base_search10_mul(m, voters, &option_bases),
            _ => panic!("Invalid number of options"),
        }
    } else {
        match options {
            2 => single::base_search2(m, voters, &option_bases),
            3 => single::base_search3(m, voters, &option_bases),
            4 => single::base_search4(m, voters, &option_bases),
            5 => single::base_search5(m, voters, &option_bases),
            6 => single::base_search6(m, voters, &option_bases),
            7 => single::base_search7(m, voters, &option_bases),
            8 => single::base_search8(m, voters, &option_bases),
            9 => single::base_search9(m, voters, &option_bases),
            10 => single::base_search10(m, voters, &option_bases),
            _ => panic!("Invalid number of options"),
        }
    };

    let end = start.elapsed();
    let time = end.as_millis();
    println!("{}, {}, {}", voters, options, time);
    if let Err(e) = writeln!(file, "{voters},{options},{time}") {
        eprintln!("Couldn't write to file: {}", e);
    }
    result
}

// Helper function for your elliptic curve check
pub fn is_decoded_match(sum: &BigInt, m: &Point) -> bool {
    let decoded = B8.mul_scalar(sum);
    decoded.equals(m.clone())
}