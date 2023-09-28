export const configs = [
    {
        name: "1_of_2",
        guardianSets: [
            [1, [3, 6]],
            [4, [5, 6]],
            [8, [6, 7]],
            [10, [8, 9]]
        ],
        tallers: [6, 8],
        config: {
            size: 10,
            options: 4,
            guardiansSize: 2,
            guardiansThreshold: 1,
            skipProofs: false,
            sequential: true,
            weshnet: false,
        }
    },
    {
        name: "2_of_3",
        guardianSets: [
            [1, [2, 3, 6]],
            [4, [3, 5, 6]],
            [8, [5, 6, 7]],
            [10, [7, 8, 9]]
        ],
        tallers: [3, 6, 7, 8],
        config: {
            size: 10,
            options: 4,
            guardiansSize: 3,
            guardiansThreshold: 2,
            skipProofs: false,
            sequential: true,
            weshnet: false,
        }
    },
    {
        name: "3_of_4",
        guardianSets: [
            [1, [1, 2, 3, 6]],
            [4, [4, 3, 5, 6]],
            [8, [8, 5, 6, 7]],
            [10, [10, 7, 8, 9]]
        ],
        tallers: [1, 6, 7, 3, 8, 5, 10],
        config: {
            size: 10,
            options: 4,
            guardiansSize: 4,
            guardiansThreshold: 3,
            skipProofs: false,
            sequential: true,
            weshnet: false,
        }
    },
]