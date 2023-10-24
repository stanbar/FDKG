use super::is_decoded_match;

use babyjubjub_rs::PointProjective;
use num_bigint::ToBigInt;

pub fn base_search2(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let base1 = bases[0] as u128;
    let base2 = bases[1] as u128;
    for x_1 in 0u128..=voters {
        for x_2 in 0u128..=voters - x_1 {
            let one = base1 * x_1;
            let two = base2 * x_2;
            let sum = one + two;

            if is_decoded_match(&sum.to_bigint().unwrap(), &m_affine) {
                return vec![x_1, x_2];
            }
        }
    }
    panic!("Could not decrypt results");
}

pub fn base_search3(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let base1 = bases[0] as u128;
    let base2 = bases[1] as u128;
    let base3 = bases[2] as u128;
    for x_1 in 0u128..=voters {
        for x_2 in 0u128..=voters - x_1 {
            for x_3 in 0u128..=voters - x_1 - x_2 {
                let one = base1 * x_1;
                let two = base2 * x_2;
                let three = base3 * x_3;
                let sum = one + two + three;

                if is_decoded_match(&sum.to_bigint().unwrap(), &m_affine) {
                    return vec![x_1, x_2, x_3];
                }
            }
        }
    }
    panic!("Could not decrypt results");
}

pub fn base_search4(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4) = (bases[0], bases[1], bases[2], bases[3]);
    for x_1 in 0u128..=voters {
        for x_2 in 0u128..=voters - x_1 {
            for x_3 in 0u128..=voters - x_1 - x_2 {
                for x_4 in 0u128..=voters - x_1 - x_2 - x_3 {
                    let sum = base1 * x_1 + base2 * x_2 + base3 * x_3 + base4 * x_4;
                    if is_decoded_match(&sum.to_bigint().unwrap(), &m_affine) {
                        return vec![x_1, x_2, x_3, x_4];
                    }
                }
            }
        }
    }
    panic!("Could not decrypt results");
}

pub fn base_search5(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5) = (bases[0], bases[1], bases[2], bases[3], bases[4]);
    for x_1 in 0u128..=voters {
        for x_2 in 0u128..=voters - x_1 {
            for x_3 in 0u128..=voters - x_1 - x_2 {
                for x_4 in 0u128..=voters - x_1 - x_2 - x_3 {
                    for x_5 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 {
                        let sum =
                            base1 * x_1 + base2 * x_2 + base3 * x_3 + base4 * x_4 + base5 * x_5;
                        if is_decoded_match(&sum.to_bigint().unwrap(), &m_affine) {
                            return vec![x_1, x_2, x_3, x_4, x_5];
                        }
                    }
                }
            }
        }
    }
    panic!("Could not decrypt results");
}

pub fn base_search6(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5, base6) =
        (bases[0], bases[1], bases[2], bases[3], bases[4], bases[5]);
    for x_1 in 0u128..=voters {
        for x_2 in 0u128..=voters - x_1 {
            for x_3 in 0u128..=voters - x_1 - x_2 {
                for x_4 in 0u128..=voters - x_1 - x_2 - x_3 {
                    for x_5 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 {
                        for x_6 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 {
                            let sum = base1 * x_1
                                + base2 * x_2
                                + base3 * x_3
                                + base4 * x_4
                                + base5 * x_5
                                + base6 * x_6;
                            if is_decoded_match(&sum.to_bigint().unwrap(), &m_affine) {
                                return vec![x_1, x_2, x_3, x_4, x_5, x_6];
                            }
                        }
                    }
                }
            }
        }
    }
    panic!("Could not decrypt results");
}

pub fn base_search7(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5, base6, base7) = (
        bases[0], bases[1], bases[2], bases[3], bases[4], bases[5], bases[6],
    );
    for x_1 in 0u128..=voters {
        for x_2 in 0u128..=voters - x_1 {
            for x_3 in 0u128..=voters - x_1 - x_2 {
                for x_4 in 0u128..=voters - x_1 - x_2 - x_3 {
                    for x_5 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 {
                        for x_6 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 {
                            for x_7 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 {
                                let sum = base1 * x_1
                                    + base2 * x_2
                                    + base3 * x_3
                                    + base4 * x_4
                                    + base5 * x_5
                                    + base6 * x_6
                                    + base7 * x_7;
                                if is_decoded_match(&sum.to_bigint().unwrap(), &m_affine) {
                                    return vec![x_1, x_2, x_3, x_4, x_5, x_6, x_7];
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    panic!("Could not decrypt results");
}

pub fn base_search8(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5, base6, base7, base8) = (
        bases[0], bases[1], bases[2], bases[3], bases[4], bases[5], bases[6], bases[7],
    );
    for x_1 in 0u128..=voters {
        for x_2 in 0u128..=voters - x_1 {
            for x_3 in 0u128..=voters - x_1 - x_2 {
                for x_4 in 0u128..=voters - x_1 - x_2 - x_3 {
                    for x_5 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 {
                        for x_6 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 {
                            for x_7 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 {
                                for x_8 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 - x_7 {
                                    let sum = base1 * x_1
                                        + base2 * x_2
                                        + base3 * x_3
                                        + base4 * x_4
                                        + base5 * x_5
                                        + base6 * x_6
                                        + base7 * x_7
                                        + base8 * x_8;
                                    if is_decoded_match(&sum.to_bigint().unwrap(), &m_affine) {
                                        return vec![x_1, x_2, x_3, x_4, x_5, x_6, x_7, x_8];
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    panic!("Could not decrypt results");
}

pub fn base_search9(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5, base6, base7, base8, base9) = (
        bases[0], bases[1], bases[2], bases[3], bases[4], bases[5], bases[6], bases[7], bases[8],
    );
    for x_1 in 0u128..=voters {
        for x_2 in 0u128..=voters - x_1 {
            for x_3 in 0u128..=voters - x_1 - x_2 {
                for x_4 in 0u128..=voters - x_1 - x_2 - x_3 {
                    for x_5 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 {
                        for x_6 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 {
                            for x_7 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 {
                                for x_8 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 - x_7 {
                                    for x_9 in 0u128..=voters
                                        - x_1
                                        - x_2
                                        - x_3
                                        - x_4
                                        - x_5
                                        - x_6
                                        - x_7
                                        - x_8
                                    {
                                        let sum = base1 * x_1
                                            + base2 * x_2
                                            + base3 * x_3
                                            + base4 * x_4
                                            + base5 * x_5
                                            + base6 * x_6
                                            + base7 * x_7
                                            + base8 * x_8
                                            + base9 * x_9;
                                        if is_decoded_match(&sum.to_bigint().unwrap(), &m_affine) {
                                            return vec![
                                                x_1, x_2, x_3, x_4, x_5, x_6, x_7, x_8, x_9,
                                            ];
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
    panic!("Could not decrypt results");
}

pub fn base_search10(m: PointProjective, voters: u32, bases: &Vec<u128>) -> Vec<u128> {
    let voters = voters as u128;
    let m_affine = m.affine();
    let (base1, base2, base3, base4, base5, base6, base7, base8, base9, base10) = (
        bases[0], bases[1], bases[2], bases[3], bases[4], bases[5], bases[6], bases[7], bases[8],
        bases[9],
    );
    for x_1 in 0u128..=voters {
        for x_2 in 0u128..=voters - x_1 {
            for x_3 in 0u128..=voters - x_1 - x_2 {
                for x_4 in 0u128..=voters - x_1 - x_2 - x_3 {
                    for x_5 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 {
                        for x_6 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 {
                            for x_7 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 {
                                for x_8 in 0u128..=voters - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 - x_7 {
                                    for x_9 in 0u128..=voters
                                        - x_1
                                        - x_2
                                        - x_3
                                        - x_4
                                        - x_5
                                        - x_6
                                        - x_7
                                        - x_8
                                    {
                                        for x_10 in 0u128..=voters
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
                                                return vec![
                                                    x_1, x_2, x_3, x_4, x_5, x_6, x_7, x_8, x_9,
                                                    x_10,
                                                ];
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
    }
    panic!("Could not decrypt results");
}