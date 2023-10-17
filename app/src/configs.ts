export interface Simulation {
  name: string,
  nodeIndicies: number[],
  guardianSets: [number, number[]][],
  tallers: number[],
  config: VotingConfig,
}

export interface VotingConfig {
  size: number
  options: number
  guardiansSize: number
  guardiansThreshold: number
  skipProofs: boolean
  sequential: boolean
}

const nodeIndicies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
export const configs: Simulation[] = [
  // {
  //   name: '1_of_2',
  //   nodeIndicies,
  //   guardianSets: [
  //     [1, [3, 6]],
  //     [4, [5, 6]],
  //     [8, [6, 7]],
  //     [10, [8, 9]]
  //   ],
  //   tallers: [6, 8],
  //   config: {
  //     size: 10,
  //     options: 4,
  //     guardiansSize: 2,
  //     guardiansThreshold: 1,
  //     skipProofs: false,
  //     sequential: true,
  //   }
  // },
  // {
  //   name: '2_of_3',
  //   nodeIndicies,
  //   guardianSets: [
  //     [1, [2, 3, 6]],
  //     [4, [3, 5, 6]],
  //     [8, [5, 6, 7]],
  //     [10, [7, 8, 9]]
  //   ],
  //   tallers: [3, 6, 7, 8],
  //   config: {
  //     size: 10,
  //     options: 4,
  //     guardiansSize: 3,
  //     guardiansThreshold: 2,
  //     skipProofs: false,
  //     sequential: true,
  //   }
  // },
  {
    name: '3_of_4',
    nodeIndicies,
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
    }
  }
]
