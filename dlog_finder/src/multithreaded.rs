use super::is_decoded_match;

use babyjubjub_rs::PointProjective;
use num_bigint::BigInt;
use num_bigint::ToBigInt;
use rayon::prelude::IntoParallelIterator;
use rayon::prelude::ParallelIterator;
use std::sync::atomic::AtomicBool;
use std::sync::atomic::Ordering;
use std::sync::Arc;

pub(crate) fn base_search2_mul(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2) = (bases[0], bases[1]);

    let found = Arc::new(AtomicBool::new(false));

    let result: Option<Vec<u128>> = (0u128..=voters).into_par_iter().find_map_any(|x_1| {
        if found.load(Ordering::Relaxed) {
            return None;
        }
        for x_2 in 0u128..=voters - x_1 {
            let sum = base1 * x_1 + base2 * x_2;
            if is_decoded_match(&sum.to_bigint().unwrap(), &m_affine) {
                found.store(true, Ordering::Relaxed);
                return Some(vec![x_1, x_2]);
            }
        }
        None
    });

    match result {
        Some(vec) => vec,
        None => panic!("Could not decrypt results"),
    }
}

pub(crate) fn base_search3_mul(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3) = (bases[0], bases[1], bases[2]);

    let found = Arc::new(AtomicBool::new(false));

    let result: Option<Vec<u128>> = (0u128..=voters).into_par_iter().find_map_any(|x_1| {
        if found.load(Ordering::Relaxed) {
            return None;
        }
        for x_2 in 0u128..=voters - x_1 {
            for x_3 in 0u128..=voters - x_1 - x_2 {
                let sum = base1 * x_1 + base2 * x_2 + base3 * x_3;
                if is_decoded_match(&sum.to_bigint().unwrap(), &m_affine) {
                    found.store(true, Ordering::Relaxed);
                    return Some(vec![x_1, x_2, x_3]);
                }
            }
        }
        None
    });

    match result {
        Some(vec) => vec,
        None => panic!("Could not decrypt results"),
    }
}

pub(crate) fn base_search4_mul(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4) = (
        bases[0] as u128,
        bases[1] as u128,
        bases[2] as u128,
        bases[3] as u128,
    );

    let found = Arc::new(AtomicBool::new(false));

    let result: Option<Vec<u128>> = (0u128..=voters).into_par_iter().find_map_any(|x_1| {
        for x_2 in 0u128..=voters - x_1 {
            if found.load(Ordering::Relaxed) {
                return None;
            }
            for x_3 in 0u128..=voters - x_1 - x_2 {
                for x_4 in 0u128..=voters - x_1 - x_2 - x_3 {
                    let sum = base1 * x_1 + base2 * x_2 + base3 * x_3 + base4 * x_4;
                    if is_decoded_match(&sum.to_bigint().unwrap(), &m_affine) {
                        found.store(true, Ordering::Relaxed);
                        return Some(vec![x_1, x_2, x_3, x_4]);
                    }
                }
            }
        }
        None
    });

    match result {
        Some(vec) => vec,
        None => panic!("Could not decrypt results"),
    }
}

pub fn base_search5_mul(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5) = (
        bases[0] as u128,
        bases[1] as u128,
        bases[2] as u128,
        bases[3] as u128,
        bases[4] as u128,
    );
    let found = Arc::new(AtomicBool::new(false));

    let result: Option<Vec<u128>> = (0u128..=voters).into_par_iter().find_map_any(|x_1| {
        let b1 = base1.checked_mul(x_1).unwrap();
        for x_2 in 0u128..=voters - x_1 {
            let b2 = base2.checked_mul(x_2).unwrap();
            for x_3 in 0u128..=voters - x_1 - x_2 {
                let b3 = base3.checked_mul(x_3).unwrap();
                if found.load(Ordering::Relaxed) {
                    return None;
                }
                for x_4 in 0u128..=voters - x_1 - x_2 - x_3 {
                    let b4 = base4.checked_mul(x_4).unwrap();
                    for x_5 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 {
                        let b5 = base5.checked_mul(x_5).unwrap();
                        let sum = b1
                            .checked_add(b2)
                            .unwrap()
                            .checked_add(b3)
                            .unwrap()
                            .checked_add(b4)
                            .unwrap()
                            .checked_add(b5)
                            .unwrap();
                        if is_decoded_match(&BigInt::from(sum), &m_affine) {
                            found.store(true, Ordering::Relaxed);
                            return Some(vec![x_1, x_2, x_3, x_4, x_5]);
                        }
                    }
                }
            }
        }
        None
    });
    match result {
        Some(vec) => vec,
        None => panic!("Could not decrypt results"),
    }
}

pub fn base_search6_mul(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5, base6) =
        (bases[0], bases[1], bases[2], bases[3], bases[4], bases[5]);
    let found = Arc::new(AtomicBool::new(false));

    let result: Option<Vec<u128>> = (0u128..=voters).into_par_iter().find_map_any(|x_1| {
        let b1 = base1.checked_mul(x_1).unwrap();
        for x_2 in 0u128..=voters - x_1 {
            let b2 = base2.checked_mul(x_2).unwrap();
            for x_3 in 0u128..=voters - x_1 - x_2 {
                let b3 = base3.checked_mul(x_3).unwrap();
                if found.load(Ordering::Relaxed) {
                    return None;
                }
                for x_4 in 0u128..=voters - x_1 - x_2 - x_3 {
                    let b4 = base4.checked_mul(x_4).unwrap();
                    for x_5 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 {
                        let b5 = base5.checked_mul(x_5).unwrap();
                        for x_6 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 {
                            let b6 = base6.checked_mul(x_6).unwrap();
                            let sum = b1
                                .checked_add(b2)
                                .unwrap()
                                .checked_add(b3)
                                .unwrap()
                                .checked_add(b4)
                                .unwrap()
                                .checked_add(b5)
                                .unwrap()
                                .checked_add(b6)
                                .unwrap();
                            if is_decoded_match(&BigInt::from(sum), &m_affine) {
                                found.store(true, Ordering::Relaxed);
                                return Some(vec![x_1, x_2, x_3, x_4, x_5, x_6]);
                            }
                        }
                    }
                }
            }
        }
        None
    });
    match result {
        Some(vec) => vec,
        None => panic!("Could not decrypt results"),
    }
}

pub fn base_search7_mul(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5, base6, base7) = (
        bases[0], bases[1], bases[2], bases[3], bases[4], bases[5], bases[6],
    );

    let found = Arc::new(AtomicBool::new(false));

    let result: Option<Vec<u128>> = (0u128..=voters).into_par_iter().find_map_any(|x_1| {
        let b1 = base1.checked_mul(x_1).unwrap();
        let voters_rem = voters - x_1;
        for x_2 in 0u128..=voters_rem {
            if found.load(Ordering::Relaxed) {
                return None;
            }
            let b2 = base2.checked_mul(x_2).unwrap();
            let voters_rem = voters_rem - x_2;
            for x_3 in 0u128..=voters_rem {
                let b3 = base3.checked_mul(x_3).unwrap();
                let voters_rem = voters_rem - x_3;
                for x_4 in 0u128..=voters_rem {
                    let b4 = base4.checked_mul(x_4).unwrap();
                    let voters_rem = voters_rem - x_4;
                    for x_5 in 0u128..=voters_rem {
                        let b5 = base5.checked_mul(x_5).unwrap();
                        let voters_rem = voters_rem - x_5;
                        for x_6 in 0u128..=voters - voters_rem {
                            let b6 = base6.checked_mul(x_6).unwrap();
                            let voters_rem = voters_rem - x_6;
                            for x_7 in 0u128..=voters_rem {
                                let b7 = base7.checked_mul(x_7).unwrap();
                                let sum = b1
                                    .checked_add(b2)
                                    .unwrap()
                                    .checked_add(b3)
                                    .unwrap()
                                    .checked_add(b4)
                                    .unwrap()
                                    .checked_add(b5)
                                    .unwrap()
                                    .checked_add(b6)
                                    .unwrap()
                                    .checked_add(b7)
                                    .unwrap();
                                if is_decoded_match(&BigInt::from(sum), &m_affine) {
                                    found.store(true, Ordering::Relaxed);
                                    return Some(vec![x_1, x_2, x_3, x_4, x_5, x_6, x_7]);
                                }
                            }
                        }
                    }
                }
            }
        }
        None
    });
    match result {
        Some(vec) => vec,
        None => panic!("Could not decrypt results"),
    }
}

pub fn base_search8_mul(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5, base6, base7, base8) = (
        bases[0], bases[1], bases[2], bases[3], bases[4], bases[5], bases[6], bases[7],
    );
    let found = Arc::new(AtomicBool::new(false));

    let result: Option<Vec<u128>> = (0u128..=voters).into_par_iter().find_map_any(|x_1| {
        let b1 = base1.checked_mul(x_1).unwrap();
        let voters_rem = voters - x_1;
        for x_2 in 0u128..=voters_rem {
            if found.load(Ordering::Relaxed) {
                return None;
            }
            let b2 = base2.checked_mul(x_2).unwrap();
            let mut sum = b1.checked_add(b2).unwrap();
            let voters_rem = voters_rem - x_2;
            for x_3 in 0u128..=voters_rem {
                let b3 = base3.checked_mul(x_3).unwrap();
                sum = sum.checked_add(b3).unwrap();
                let voters_rem = voters_rem - x_3;
                for x_4 in 0u128..=voters_rem {
                    let b4 = base4.checked_mul(x_4).unwrap();
                    sum = sum.checked_add(b4).unwrap();
                    let voters_rem = voters_rem - x_4;
                    for x_5 in 0u128..=voters_rem {
                        let b5 = base5.checked_mul(x_5).unwrap();
                        sum = sum.checked_add(b5).unwrap();
                        let voters_rem = voters_rem - x_5;
                        for x_6 in 0u128..=voters - voters_rem {
                            let b6 = base6.checked_mul(x_6).unwrap();
                            sum = sum.checked_add(b6).unwrap();
                            let voters_rem = voters_rem - x_6;
                            for x_7 in 0u128..=voters_rem {
                                let b7 = base7.checked_mul(x_7).unwrap();
                                sum = sum.checked_add(b7).unwrap();
                                let voters_rem = voters_rem - x_7;
                                for x_8 in 0u128..=voters_rem {
                                    let b8 = base8.checked_mul(x_8).unwrap();
                                    sum = sum.checked_add(b8).unwrap();
                                    if is_decoded_match(&BigInt::from(sum), &m_affine) {
                                        found.store(true, Ordering::Relaxed);
                                        return Some(vec![x_1, x_2, x_3, x_4, x_5, x_6, x_7]);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        None
    });
    match result {
        Some(vec) => vec,
        None => panic!("Could not decrypt results"),
    }
}

pub fn base_search9_mul(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5, base6, base7, base8, base9) = (
        bases[0], bases[1], bases[2], bases[3], bases[4], bases[5], bases[6], bases[7], bases[8],
    );
    let found = Arc::new(AtomicBool::new(false));

    let result: Option<Vec<u128>> = (0u128..=voters).into_par_iter().find_map_any(|x_1| {
        let b1 = base1.checked_mul(x_1).unwrap();
        let voters_rem = voters - x_1;
        for x_2 in 0u128..=voters_rem {
            if found.load(Ordering::Relaxed) {
                return None;
            }
            let b2 = base2.checked_mul(x_2).unwrap();
            let mut sum = b1.checked_add(b2).unwrap();
            let voters_rem = voters_rem - x_2;
            for x_3 in 0u128..=voters_rem {
                let b3 = base3.checked_mul(x_3).unwrap();
                sum = sum.checked_add(b3).unwrap();
                let voters_rem = voters_rem - x_3;
                for x_4 in 0u128..=voters_rem {
                    let b4 = base4.checked_mul(x_4).unwrap();
                    sum = sum.checked_add(b4).unwrap();
                    let voters_rem = voters_rem - x_4;
                    for x_5 in 0u128..=voters_rem {
                        let b5 = base5.checked_mul(x_5).unwrap();
                        sum = sum.checked_add(b5).unwrap();
                        let voters_rem = voters_rem - x_5;
                        for x_6 in 0u128..=voters - voters_rem {
                            let b6 = base6.checked_mul(x_6).unwrap();
                            sum = sum.checked_add(b6).unwrap();
                            let voters_rem = voters_rem - x_6;
                            for x_7 in 0u128..=voters_rem {
                                let b7 = base7.checked_mul(x_7).unwrap();
                                sum = sum.checked_add(b7).unwrap();
                                let voters_rem = voters_rem - x_7;
                                for x_8 in 0u128..=voters_rem {
                                    let b8 = base8.checked_mul(x_8).unwrap();
                                    sum = sum.checked_add(b8).unwrap();
                                    let voters_rem = voters_rem - x_8;
                                    for x_9 in 0u128..=voters_rem {
                                        let b9 = base9.checked_mul(x_9).unwrap();
                                        sum = sum.checked_add(b9).unwrap();
                                        if is_decoded_match(&BigInt::from(sum), &m_affine) {
                                            found.store(true, Ordering::Relaxed);
                                            return Some(vec![
                                                x_1, x_2, x_3, x_4, x_5, x_6, x_7, x_8,
                                            ]);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        None
    });
    match result {
        Some(vec) => vec,
        None => panic!("Could not decrypt results"),
    }
}

pub fn base_search10_mul(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5, base6, base7, base8, base9, base10) = (
        bases[0], bases[1], bases[2], bases[3], bases[4], bases[5], bases[6], bases[7], bases[8],
        bases[9],
    );
    let found = Arc::new(AtomicBool::new(false));

    let result: Option<Vec<u128>> = (0u128..=voters).into_par_iter().find_map_any(|x_1| {
        for x_2 in 0u128..=voters - x_1 {
            for x_3 in 0u128..=voters - x_1 - x_2 {
                for x_4 in 0u128..=voters - x_1 - x_2 - x_3 {
                    for x_5 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 {
                        for x_6 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 {
                            for x_7 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 {
                                if found.load(Ordering::Relaxed) {
                                    return None;
                                }
                                for x_8 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 - x_7
                                {
                                    for x_9 in 0u128
                                        ..=voters - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 - x_7 - x_8
                                    {
                                        for x_10 in 0u128
                                            ..=voters
                                                - x_1
                                                - x_2
                                                - x_3
                                                - x_4
                                                - x_5
                                                - x_6
                                                - x_7
                                                - x_8
                                                - x_9
                                        {
                                            let sum = base1 * x_1
                                                + base2 * x_2
                                                + base3 * x_3
                                                + base4 * x_4
                                                + base5 * x_5
                                                + base6 * x_6
                                                + base7 * x_7
                                                + base8 * x_8
                                                + base9 * x_9
                                                + base10 * x_10;
                                            if is_decoded_match(
                                                &sum.to_bigint().unwrap(),
                                                &m_affine,
                                            ) {
                                                found.store(true, Ordering::Relaxed);
                                                return Some(vec![
                                                    x_1, x_2, x_3, x_4, x_5, x_6, x_7, x_8, x_9,
                                                ]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        None
    });
    match result {
        Some(vec) => vec,
        None => panic!("Could not decrypt results"),
    }
}
